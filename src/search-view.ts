import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type VaultSearchPlugin from "./main";
import { SearchResult } from "./types";
import { checkOllama, cosineSimilarity, embedText, getContentPreview } from "./utils";
import { t } from "./i18n";
import { expandQuery } from "./synonyms";

export const VIEW_TYPE_SEARCH = "vault-search-view";

export class SearchView extends ItemView {
    plugin: VaultSearchPlugin;
    private inputEl!: HTMLInputElement;
    private resultsEl!: HTMLDivElement;
    private statusEl!: HTMLDivElement;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private abortController: AbortController | null = null;
    private lastResults: SearchResult[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: VaultSearchPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_SEARCH; }
    getDisplayText() { return "Vault Search"; }
    getIcon() { return "search"; }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass("vault-search-panel");

        const searchBar = container.createDiv({ cls: "vault-search-bar" });
        this.inputEl = searchBar.createEl("input", {
            type: "text",
            placeholder: t.searchPlaceholder,
            cls: "vault-search-input",
        });
        this.inputEl.addEventListener("input", () => {
            this.scheduleSearch(this.inputEl.value);
        });

        this.statusEl = container.createDiv({ cls: "vault-search-status" });
        this.resultsEl = container.createDiv({ cls: "vault-search-results" });
    }

    focusInput() {
        this.inputEl?.focus();
    }

    showResults(results: SearchResult[], label: string) {
        this.lastResults = results;
        this.inputEl.value = "";
        this.statusEl.setText(`${label} — ${t.searchResults(results.length)}`);
        this.renderResults();
    }

    async onClose() {
        if (this.abortController) this.abortController.abort();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
    }

    private scheduleSearch(query: string) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (!query || query.length < 2) {
            this.resultsEl.empty();
            this.statusEl.setText("");
            return;
        }
        this.statusEl.setText(t.searching);
        this.debounceTimer = setTimeout(() => this.executeSearch(query), 300);
    }

    private async executeSearch(query: string) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        if (!this.plugin.index) {
            this.statusEl.setText(t.indexEmpty);
            return;
        }

        const { ollamaUrl, ollamaModel, searchScope, minScore, topResults } = this.plugin.settings;

        try {
            if (!await checkOllama(ollamaUrl)) {
                this.statusEl.setText(t.ollamaNotReady);
                return;
            }
            const queryVec = await embedText(
                expandQuery(query, this.plugin.settings),
                ollamaUrl, ollamaModel, this.plugin.settings.apiFormat,
                this.abortController.signal,
            );
            if (!queryVec || queryVec.length === 0) return;

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
            this.renderResults();
            this.statusEl.setText(t.searchResults(this.lastResults.length));
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                this.statusEl.setText(t.searchFailed);
                console.error("Vault Search:", e);
            }
        }
    }

    private renderResults() {
        this.resultsEl.empty();
        for (const result of this.lastResults) {
            const item = this.resultsEl.createDiv({ cls: "vault-search-result-item" });
            item.addEventListener("click", () => {
                const file = this.app.vault.getAbstractFileByPath(result.path);
                if (file instanceof TFile) {
                    this.app.workspace.getLeaf(false).openFile(file);
                }
            });

            const titleRow = item.createDiv({ cls: "vault-search-title-row" });
            titleRow.createSpan({ text: result.title, cls: "vault-search-title" });
            titleRow.createSpan({ text: result.score.toFixed(3), cls: "vault-search-score" });

            const file = this.app.vault.getAbstractFileByPath(result.path);
            if (file instanceof TFile) {
                getContentPreview(this.app, file).then(preview => {
                    if (preview) item.createDiv({ text: preview, cls: "vault-search-desc" });
                });
            }

            const metaRow = item.createDiv({ cls: "vault-search-meta" });
            if (result.tags.length > 0) {
                metaRow.createSpan({ text: result.tags.join(", "), cls: "vault-search-tags" });
            }
            const folder = result.path.substring(0, result.path.lastIndexOf("/"));
            if (folder) {
                metaRow.createSpan({ text: folder, cls: "vault-search-folder" });
            }
        }
    }
}
