import { Notice, TFile } from "obsidian";
import type VaultSearchPlugin from "./main";
import { NoteEntry } from "./types";
import { checkOllama, embedText, stripFrontmatter } from "./utils";
import { t } from "./i18n";

const BATCH_SIZE = 5;

export class Indexer {
    constructor(private plugin: VaultSearchPlugin) {}

    shouldExclude(path: string): boolean {
        return this.plugin.settings.excludePatterns.some(p => path.startsWith(p));
    }

    private getMarkdownFiles(): TFile[] {
        return this.plugin.app.vault
            .getMarkdownFiles()
            .filter(f => !this.shouldExclude(f.path));
    }

    private extractTitle(file: TFile): string {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        return (
            cache?.frontmatter?.title ??
            cache?.headings?.find(h => h.level === 1)?.heading ??
            file.basename
        );
    }

    private extractTags(file: TFile): string[] {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        const raw = cache?.frontmatter?.tags;
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === "string") return raw.split(",").map(t => t.trim()).filter(Boolean);
        return [];
    }

    private computeTier(file: TFile): "hot" | "cold" {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        const hasOutgoing = (cache?.links?.length ?? 0) > 0 || (cache?.embeds?.length ?? 0) > 0;

        const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks;
        let hasIncoming = false;
        for (const [src, targets] of Object.entries(resolvedLinks)) {
            if (src !== file.path && file.path in targets) {
                hasIncoming = true;
                break;
            }
        }

        const created = cache?.frontmatter?.created;
        const createdTs = created ? new Date(created).getTime() : file.stat.ctime;
        const hotMs = this.plugin.settings.hotDays * 24 * 60 * 60 * 1000;
        const isRecent = Date.now() - createdTs < hotMs;

        return (hasOutgoing || hasIncoming || isRecent) ? "hot" : "cold";
    }

    private async buildEmbedText(file: TFile): Promise<string> {
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        const content = await this.plugin.app.vault.cachedRead(file);
        const title = this.extractTitle(file);
        const tags = this.extractTags(file);
        const description: string = cache?.frontmatter?.description ?? "";
        const maxChars = this.plugin.settings.maxEmbedChars;

        let full: string;
        if (description) {
            full = [title, tags.join(" "), description].filter(Boolean).join("\n");
        } else {
            const body = stripFrontmatter(content);
            full = [title, tags.join(" "), body].filter(Boolean).join("\n");
        }
        return full.length > maxChars ? full.slice(0, maxChars) : full;
    }

    private buildNoteEntry(file: TFile, embedding: number[]): NoteEntry {
        return {
            title: this.extractTitle(file),
            tags: this.extractTags(file),
            tier: this.computeTier(file),
            mtime: file.stat.mtime,
            embedding,
        };
    }

    async rebuild() {
        if (!await checkOllama(this.plugin.settings.ollamaUrl)) {
            new Notice(t.ollamaNotReady);
            return;
        }
        const files = this.getMarkdownFiles();
        const progress = new Notice(t.noticeIndexing(0, files.length), 0);

        const notes: Record<string, NoteEntry> = {};
        let dim = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            const texts = await Promise.all(batch.map(f => this.buildEmbedText(f)));
            const embeddings = await this.embedBatch(texts);

            for (let j = 0; j < batch.length; j++) {
                const emb = embeddings[j];
                if (!emb || emb.length === 0) { failed++; continue; }
                if (dim === 0) dim = emb.length;
                notes[batch[j].path] = this.buildNoteEntry(batch[j], emb);
            }

            progress.setMessage(t.noticeIndexing(Math.min(i + BATCH_SIZE, files.length), files.length));
        }

        progress.hide();

        this.plugin.index = {
            meta: {
                model: this.plugin.settings.ollamaModel,
                dim,
                indexedAt: new Date().toISOString(),
                count: Object.keys(notes).length,
            },
            notes,
        };

        const hotCount = Object.values(notes).filter(n => n.tier === "hot").length;
        const coldCount = Object.values(notes).filter(n => n.tier === "cold").length;
        new Notice(t.noticeIndexDone(Object.keys(notes).length, hotCount, coldCount, failed), 10000);
        console.log(`Vault Search: rebuild complete — ${Object.keys(notes).length} notes, ${failed} failed`);
    }

    async update() {
        if (!await checkOllama(this.plugin.settings.ollamaUrl)) {
            new Notice(t.ollamaNotReady);
            return;
        }
        const files = this.getMarkdownFiles();
        const existing = this.plugin.index?.notes ?? {};
        const toEmbed: TFile[] = [];

        for (const file of files) {
            const entry = existing[file.path];
            if (!entry || entry.mtime !== file.stat.mtime) {
                toEmbed.push(file);
            }
        }

        // Remove deleted files
        const currentPaths = new Set(files.map(f => f.path));
        for (const path of Object.keys(existing)) {
            if (!currentPaths.has(path)) {
                delete existing[path];
            }
        }

        if (toEmbed.length === 0) {
            new Notice(t.noticeUpToDate);
            return;
        }

        const progress = new Notice(t.noticeIndexing(0, toEmbed.length), 0);

        for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
            const batch = toEmbed.slice(i, i + BATCH_SIZE);
            const texts = await Promise.all(batch.map(f => this.buildEmbedText(f)));
            const embeddings = await this.embedBatch(texts);

            for (let j = 0; j < batch.length; j++) {
                const emb = embeddings[j];
                if (!emb || emb.length === 0) continue;
                existing[batch[j].path] = this.buildNoteEntry(batch[j], emb);
            }

            progress.setMessage(t.noticeIndexing(Math.min(i + BATCH_SIZE, toEmbed.length), toEmbed.length));
        }

        progress.hide();

        // Update tiers for all files (links may have changed)
        for (const file of files) {
            if (existing[file.path]) {
                existing[file.path].tier = this.computeTier(file);
            }
        }

        this.plugin.index = {
            meta: {
                model: this.plugin.settings.ollamaModel,
                dim: Object.values(existing)[0]?.embedding.length ?? 0,
                indexedAt: new Date().toISOString(),
                count: Object.keys(existing).length,
            },
            notes: existing,
        };

        const hotCount = Object.values(existing).filter(n => n.tier === "hot").length;
        new Notice(t.noticeUpdated(toEmbed.length, Object.keys(existing).length, hotCount), 10000);
    }

    async indexSingleFile(file: TFile) {
        if (!this.plugin.index) return;
        const text = await this.buildEmbedText(file);

        try {
            const [emb] = await this.embedBatch([text]);
            if (emb && emb.length > 0) {
                this.plugin.index.notes[file.path] = this.buildNoteEntry(file, emb);
                this.plugin.index.meta.count = Object.keys(this.plugin.index.notes).length;
            }
        } catch (e) {
            console.warn(`Vault Search: failed to index ${file.path}`, e);
        }
    }

    removeFromIndex(path: string) {
        if (!this.plugin.index) return;
        delete this.plugin.index.notes[path];
        this.plugin.index.meta.count = Object.keys(this.plugin.index.notes).length;
    }

    renameInIndex(oldPath: string, newPath: string) {
        if (!this.plugin.index) return;
        const entry = this.plugin.index.notes[oldPath];
        if (entry) {
            this.plugin.index.notes[newPath] = entry;
            delete this.plugin.index.notes[oldPath];
        }
    }

    private async embedBatch(texts: string[]): Promise<number[][]> {
        const { ollamaUrl, ollamaModel, apiFormat } = this.plugin.settings;
        return Promise.all(texts.map(async (text) => {
            try {
                return await embedText(text, ollamaUrl, ollamaModel, apiFormat, undefined, this.plugin.settings.apiKey);
            } catch (e) {
                console.warn("Vault Search: embed failed", e);
                return [];
            }
        }));
    }
}
