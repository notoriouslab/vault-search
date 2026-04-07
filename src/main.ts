import { normalizePath, Notice, Plugin, TFile } from "obsidian";
import {
    VaultSearchData,
    VaultSearchDataLegacy,
    VaultSearchSettings,
    VaultSearchIndex,
    DEFAULT_SETTINGS,
} from "./types";
import { Indexer } from "./indexer";
import { SearchModal } from "./searcher";
import { SearchView, VIEW_TYPE_SEARCH } from "./search-view";
import { VaultSearchSettingTab } from "./settings";
import { searchNoteScore } from "./utils";
import { DescriptionGenerator } from "./description-generator";
import { t } from "./i18n";

export default class VaultSearchPlugin extends Plugin {
    settings!: VaultSearchSettings;
    index: VaultSearchIndex | null = null;
    indexer!: Indexer;
    descGenerator!: DescriptionGenerator;
    private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    async onload() {
        await this.loadSettings();
        this.indexer = new Indexer(this);
        this.descGenerator = new DescriptionGenerator(this);

        // Register sidebar view
        this.registerView(VIEW_TYPE_SEARCH, (leaf) => new SearchView(leaf, this));

        // Ribbon icon to open sidebar
        this.addRibbonIcon("compass", "Vault search", () => {
            void this.activateView();
        });

        // Register commands
        this.addCommand({
            id: "semantic-search",
            name: t.cmdSemanticSearch,
            callback: () => {
                if (!this.index || Object.keys(this.index.notes).length === 0) {
                    new Notice(t.noticeIndexEmpty);
                    return;
                }
                new SearchModal(this.app, this).open();
            },
        });

        this.addCommand({
            id: "open-search-panel",
            name: t.cmdOpenPanel,
            callback: () => this.activateView(),
        });

        this.addCommand({
            id: "find-similar",
            name: t.cmdFindSimilar,
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (!file || !this.index) return false;
                if (checking) return true;
                void this.findSimilar(file);
                return true;
            },
        });

        this.addCommand({
            id: "rebuild-index",
            name: t.cmdRebuild,
            callback: () => this.rebuildIndex(),
        });

        this.addCommand({
            id: "update-index",
            name: t.cmdUpdate,
            callback: () => this.updateIndex(),
        });

        this.addCommand({
            id: "desc-preview",
            name: t.cmdDescPreview,
            callback: () => this.descGenerator.preview(),
        });

        this.addCommand({
            id: "desc-apply",
            name: t.cmdDescApply,
            callback: () => this.descGenerator.apply(),
        });

        this.addCommand({
            id: "global-discover",
            name: t.cmdGlobalDiscover,
            callback: () => void this.openGlobalDiscover(),
        });

        // Active Discovery: file-open listener
        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                if (!file || !this.index) return;
                this.onActiveFileChange(file);
            })
        );

        // Register vault events for auto-indexing
        this.registerEvent(
            this.app.vault.on("modify", (file) => this.onFileChange(file, "modify"))
        );
        this.registerEvent(
            this.app.vault.on("create", (file) => this.onFileChange(file, "create"))
        );
        this.registerEvent(
            this.app.vault.on("delete", (file) => this.onFileChange(file, "delete"))
        );
        this.registerEvent(
            this.app.vault.on("rename", (file, oldPath) => this.onFileRename(file, oldPath))
        );

        // Settings tab
        this.addSettingTab(new VaultSearchSettingTab(this.app, this));

        console.debug("Vault Search loaded");
    }

    onunload() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        if (this.activeDiscoverTimer) clearTimeout(this.activeDiscoverTimer);
        console.debug("Vault Search unloaded");
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_SEARCH)[0];
        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_SEARCH, active: true });
            }
        }
        if (leaf) {
            void workspace.revealLeaf(leaf);
            // Focus the search input
            const view = leaf.view as SearchView;
            if (view.focusInput) view.focusInput();
        }
    }

    // ── Active Discovery ────────────────────────────────

    private activeDiscoverTimer: ReturnType<typeof setTimeout> | null = null;
    private lastDiscoverPath: string | null = null;

    private onActiveFileChange(file: TFile) {
        if (file.extension !== "md") return;
        if (file.path === this.lastDiscoverPath) return;
        if (this.activeDiscoverTimer) clearTimeout(this.activeDiscoverTimer);
        this.activeDiscoverTimer = setTimeout(() => {
            this.lastDiscoverPath = file.path;
            const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEARCH)[0];
            if (!leaf) return;
            const view = leaf.view as SearchView;
            if (view.isDiscoverTabActive()) {
                view.discoverForFile(file);
            }
        }, 500);
    }

    private async openGlobalDiscover() {
        if (!this.index) {
            new Notice(t.discoverNoIndex);
            return;
        }
        await this.activateView();
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEARCH)[0];
        if (!leaf) return;
        const view = leaf.view as SearchView;
        view.showGlobalDiscover();
    }

    // ── Find Similar ─────────────────────────────────

    async findSimilar(file: TFile) {
        if (!this.index) {
            new Notice(t.noticeIndexEmpty);
            return;
        }
        const entry = this.index.notes[file.path];
        if (!entry || !entry.embedding || entry.embedding.length === 0) {
            new Notice(t.notIndexed);
            return;
        }

        // Collect all query vectors: main embedding + chunks
        const queryVecs: number[][] = [entry.embedding];
        if (entry.chunks) {
            for (const chunk of entry.chunks) {
                if (chunk.length > 0) queryVecs.push(chunk);
            }
        }

        const results: import("./types").SearchResult[] = [];
        for (const [path, other] of Object.entries(this.index.notes)) {
            if (path === file.path) continue;
            let maxScore = 0;
            for (const qv of queryVecs) {
                const s = searchNoteScore(qv, other);
                if (s > maxScore) maxScore = s;
            }
            if (maxScore >= this.settings.minScore) {
                results.push({ path, title: other.title, tags: other.tags, score: maxScore, tier: other.tier });
            }
        }
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, this.settings.topResults);

        if (topResults.length === 0) {
            new Notice(t.noSimilar);
            return;
        }

        // Show in sidebar
        await this.activateView();
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SEARCH)[0];
        if (leaf) {
            const view = leaf.view as SearchView;
            view.showResults(topResults, t.similarTo(entry.title));
        }
    }

    async rebuildIndex() {
        await this.indexer.rebuild();
        await this.saveIndex();
    }

    async updateIndex() {
        await this.indexer.update();
        await this.saveIndex();
    }

    private onFileChange(file: unknown, type: string) {
        if (!this.settings.autoIndex || this.migrating) return;
        if (!(file instanceof TFile) || file.extension !== "md") return;
        if (this.indexer.shouldExclude(file.path)) return;

        const existing = this.debounceTimers.get(file.path);
        if (existing) clearTimeout(existing);

        this.debounceTimers.set(
            file.path,
            setTimeout(() => {
                this.debounceTimers.delete(file.path);
                if (type === "delete") {
                    this.indexer.removeFromIndex(file.path);
                    void this.saveIndex();
                } else {
                    void this.indexer.indexSingleFile(file).then(() => this.saveIndex());
                }
            }, 2000)
        );
    }

    private async onFileRename(file: unknown, oldPath: string) {
        if (!this.settings.autoIndex) return;
        if (!(file instanceof TFile) || file.extension !== "md") return;

        this.indexer.renameInIndex(oldPath, file.path);
        await this.saveIndex();
    }

    private migrating = false;

    private indexPath(): string {
        return normalizePath(
            `${this.app.vault.configDir}/plugins/${this.manifest.id}/index.json`
        );
    }

    async loadSettings() {
        const data = await this.loadData() as Partial<VaultSearchDataLegacy> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);

        // Migration: v0.2.0 stored index in data.json, v0.3.0 uses index.json
        if (data?.index) {
            this.migrating = true;
            this.index = data.index;
            await this.saveIndex();
            await this.saveData({ settings: this.settings } as VaultSearchData);
            this.migrating = false;
        } else {
            this.index = await this.loadIndex();
        }
    }

    private async loadIndex(): Promise<VaultSearchIndex | null> {
        try {
            const raw = await this.app.vault.adapter.read(this.indexPath());
            return JSON.parse(raw) as VaultSearchIndex;
        } catch (e) {
            // File not found is normal (first run), parse error is not
            if (await this.app.vault.adapter.exists(this.indexPath())) {
                console.error("Vault Search: Failed to parse index.json", e);
                new Notice(t.noticeIndexCorrupt);
            }
            return null;
        }
    }

    async saveSettings() {
        await this.saveData({ settings: this.settings } as VaultSearchData);
    }

    async saveIndex() {
        if (!this.index) return;
        await this.app.vault.adapter.write(
            this.indexPath(),
            JSON.stringify(this.index)
        );
    }
}
