import { SuggestModal } from "obsidian";
import type VaultSearchPlugin from "./main";
import { SearchResult } from "./types";
import { checkOllama, embedText, rankNotes, renderResultItem } from "./utils";
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
        renderResultItem(container, result, this.app);
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

        const { ollamaUrl, ollamaModel } = this.plugin.settings;

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

            this.lastResults = rankNotes(queryVec, this.plugin.index, this.plugin.settings);
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
