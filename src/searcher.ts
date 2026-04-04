import { SuggestModal, TFile } from "obsidian";
import type VaultSearchPlugin from "./main";
import { SearchResult } from "./types";
import { checkOllama, cosineSimilarity, embedText, getContentPreview } from "./utils";
import { t } from "./i18n";
import { expandQuery } from "./synonyms";

export class SearchModal extends SuggestModal<SearchResult> {
    private plugin: VaultSearchPlugin;
    private lastResults: SearchResult[] = [];
    private lastQuery = "";
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private abortController: AbortController | null = null;

    constructor(app: typeof SuggestModal.prototype.app, plugin: VaultSearchPlugin) {
        super(app);
        this.plugin = plugin;
        this.setPlaceholder(t.searchPlaceholder);
        this.setInstructions([
            { command: "↑↓", purpose: "navigate" },
            { command: "↵", purpose: "open note" },
            { command: "esc", purpose: "dismiss" },
        ]);
    }

    getSuggestions(query: string): SearchResult[] {
        if (!query || query.length < 2) {
            this.lastResults = [];
            return [];
        }
        if (query !== this.lastQuery) {
            this.lastQuery = query;
            this.scheduleSearch(query);
        }
        return this.lastResults;
    }

    renderSuggestion(result: SearchResult, el: HTMLElement) {
        const container = el.createDiv({ cls: "vault-search-result" });

        const titleRow = container.createDiv({ cls: "vault-search-title-row" });
        titleRow.createSpan({ text: result.title, cls: "vault-search-title" });
        titleRow.createSpan({ text: result.score.toFixed(3), cls: "vault-search-score" });

        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (file instanceof TFile) {
            getContentPreview(this.app, file).then(preview => {
                if (preview) container.createDiv({ text: preview, cls: "vault-search-desc" });
            });
        }

        const metaRow = container.createDiv({ cls: "vault-search-meta" });
        if (result.tags.length > 0) {
            metaRow.createSpan({ text: result.tags.join(", "), cls: "vault-search-tags" });
        }
        const folder = result.path.substring(0, result.path.lastIndexOf("/"));
        if (folder) {
            metaRow.createSpan({ text: folder, cls: "vault-search-folder" });
        }
    }

    onChooseSuggestion(result: SearchResult) {
        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
        }
    }

    private scheduleSearch(query: string) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.executeSearch(query), 300);
    }

    private async executeSearch(query: string) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        if (!this.plugin.index) return;

        const { ollamaUrl, ollamaModel, searchScope, minScore, topResults } = this.plugin.settings;

        try {
            if (!await checkOllama(ollamaUrl)) {
                console.warn("Vault Search:", t.ollamaNotReady);
                return;
            }
            const queryVec = await embedText(
                expandQuery(query, this.plugin.settings),
                ollamaUrl, ollamaModel, this.plugin.settings.apiFormat,
                this.abortController.signal, this.plugin.settings.apiKey,
            );
            if (!queryVec || queryVec.length === 0 || query !== this.lastQuery) return;

            const results: SearchResult[] = [];
            for (const [path, entry] of Object.entries(this.plugin.index.notes)) {
                if (searchScope === "hot" && entry.tier !== "hot") continue;
                if (!entry.embedding || entry.embedding.length === 0) continue;
                const score = cosineSimilarity(queryVec, entry.embedding);
                if (score >= minScore) {
                    results.push({ path, title: entry.title, tags: entry.tags, score, tier: entry.tier });
                }
            }

            results.sort((a, b) => b.score - a.score);
            this.lastResults = results.slice(0, topResults);
            this.inputEl.dispatchEvent(new Event("input"));
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error("Vault Search: search failed", e);
            }
        }
    }

    onClose() {
        if (this.abortController) this.abortController.abort();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
    }
}
