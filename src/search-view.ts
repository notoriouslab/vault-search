import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type VaultSearchPlugin from "./main";
import { SearchResult } from "./types";
import { checkOllama, embedText, rankNotes, renderResultItem } from "./utils";
import { t } from "./i18n";
import { expandQuery } from "./synonyms";

export const VIEW_TYPE_SEARCH = "vault-search-view";

export class SearchView extends ItemView {
    plugin: VaultSearchPlugin;
    private inputEl!: HTMLInputElement;
    private resultsEl!: HTMLDivElement;
    private statusEl!: HTMLDivElement;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private currentQuery = "";
    private lastResults: SearchResult[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: VaultSearchPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_SEARCH; }
    getDisplayText() { return "Vault search"; }
    getIcon() { return "search"; }

    async onOpen() {
        await super.onOpen();
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
        await super.onClose();
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
        this.debounceTimer = setTimeout(() => { void this.executeSearch(query); }, 300);
    }

    private async executeSearch(query: string) {
        this.currentQuery = query;

        if (!this.plugin.index) {
            this.statusEl.setText(t.indexEmpty);
            return;
        }

        const { ollamaUrl, ollamaModel } = this.plugin.settings;

        try {
            if (!await checkOllama(ollamaUrl)) {
                this.statusEl.setText(t.ollamaNotReady);
                return;
            }
            if (query !== this.currentQuery) return;
            const queryVec = await embedText(
                expandQuery(query, this.plugin.settings),
                ollamaUrl, ollamaModel, this.plugin.settings.apiFormat,
                this.plugin.settings.apiKey,
            );
            if (!queryVec || queryVec.length === 0 || query !== this.currentQuery) return;

            this.lastResults = rankNotes(queryVec, this.plugin.index, this.plugin.settings);
            this.renderResults();
            this.statusEl.setText(t.searchResults(this.lastResults.length));
        } catch (e) {
            this.statusEl.setText(t.searchFailed);
            console.error("Vault Search:", e);
        }
    }

    private renderResults() {
        this.resultsEl.empty();
        for (const result of this.lastResults) {
            const item = this.resultsEl.createDiv({ cls: "vault-search-result-item" });
            item.addEventListener("click", () => {
                const file = this.app.vault.getAbstractFileByPath(result.path);
                if (file instanceof TFile) {
                    void this.app.workspace.getLeaf(false).openFile(file);
                }
            });
            renderResultItem(item, result, this.app);
        }
    }
}
