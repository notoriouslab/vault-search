import { ItemView, Menu, Notice, TFile, WorkspaceLeaf } from "obsidian";

// Obsidian's dragManager is not in public types but exists at runtime
declare module "obsidian" {
    interface App {
        dragManager: {
            handleDrag(el: HTMLElement, callback: (e: DragEvent) => unknown): void;
            dragFile(e: DragEvent, file: TFile, source?: string): unknown;
        };
    }
}
import type VaultSearchPlugin from "./main";
import { SearchResult } from "./types";
import { checkOllama, discoverForNote, embedText, formatLocalDateTime, getContentPreview, globalDiscover, rankNotes, renderResultItem } from "./utils";
import { t } from "./i18n";
import { expandQuery } from "./synonyms";

export const VIEW_TYPE_SEARCH = "vault-search-view";

type TabId = "search" | "discover";
type DiscoverMode = "current" | "global";

export class SearchView extends ItemView {
    plugin: VaultSearchPlugin;

    // Tab state
    private activeTab: TabId = "search";
    private searchContainer!: HTMLDivElement;
    private discoverContainer!: HTMLDivElement;
    private tabEls = {} as Record<TabId, HTMLDivElement>;

    // Search state
    private inputEl!: HTMLInputElement;
    private searchResultsEl!: HTMLDivElement;
    private searchStatusEl!: HTMLDivElement;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private currentQuery = "";
    private lastResults: SearchResult[] = [];

    // Discover state
    private discoverMode: DiscoverMode = "current";
    private discoverStatusEl!: HTMLDivElement;
    private discoverResultsEl!: HTMLDivElement;
    private modeEls = {} as Record<DiscoverMode, HTMLButtonElement>;
    private mocBtn!: HTMLButtonElement;
    private globalCancelled = { value: false };
    private lastDiscoverResults: SearchResult[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: VaultSearchPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_SEARCH; }
    getDisplayText() { return t.viewDisplayName; }
    getIcon() { return "compass"; }

    async onOpen() {
        await super.onOpen();
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass("vault-search-panel");

        // Tab bar
        const tabBar = container.createDiv({ cls: "vault-search-tab-bar" });
        this.tabEls.search = this.buildTab(tabBar, "search", t.tabSearch);
        this.tabEls.discover = this.buildTab(tabBar, "discover", t.tabDiscover);

        // Search content
        this.searchContainer = container.createDiv({ cls: "vault-search-tab-content" });
        this.buildSearchUI(this.searchContainer);

        // Discover content
        this.discoverContainer = container.createDiv({ cls: "vault-search-tab-content" });
        this.buildDiscoverUI(this.discoverContainer);

        this.switchTab("search");
    }

    // ── Tab management ─────────────────────────────────

    private buildTab(parent: HTMLElement, id: TabId, label: string): HTMLDivElement {
        const tab = parent.createDiv({ cls: "vault-search-tab", text: label });
        tab.addEventListener("click", () => this.switchTab(id));
        return tab;
    }

    private switchTab(id: TabId) {
        this.activeTab = id;

        this.tabEls.search.toggleClass("is-active", id === "search");
        this.tabEls.discover.toggleClass("is-active", id === "discover");

        this.searchContainer.style.display = id === "search" ? "" : "none";
        this.discoverContainer.style.display = id === "discover" ? "" : "none";

        if (id === "search") {
            this.inputEl?.focus();
        } else if (id === "discover" && this.discoverMode === "current") {
            // Trigger discovery for current file when switching to Discover tab
            const file = this.app.workspace.getActiveFile();
            if (file) this.discoverForFile(file);
        }
    }

    // ── Search UI ──────────────────────────────────────

    private buildSearchUI(container: HTMLDivElement) {
        const searchBar = container.createDiv({ cls: "vault-search-bar" });
        this.inputEl = searchBar.createEl("input", {
            type: "text",
            placeholder: t.searchPlaceholder,
            cls: "vault-search-input",
        });
        this.inputEl.addEventListener("input", () => {
            this.scheduleSearch(this.inputEl.value);
        });

        const searchActions = container.createDiv({ cls: "vault-search-mode-toggle" });
        searchActions.createEl("button", {
            text: t.generateMoc,
            cls: "vault-search-mode-btn vault-search-moc-btn",
        }).addEventListener("click", () => void this.generateMocFromSearch());

        this.searchStatusEl = container.createDiv({ cls: "vault-search-status" });
        this.searchResultsEl = container.createDiv({ cls: "vault-search-results" });
    }

    focusInput() {
        if (this.activeTab === "search") {
            this.inputEl?.focus();
        }
    }

    showResults(results: SearchResult[], label: string) {
        this.lastResults = results;
        this.lastDiscoverResults = results;
        this.inputEl.value = "";
        this.switchTab("discover");
        this.setDiscoverMode("current");
        this.discoverStatusEl.setText(label);
        this.renderDiscoverResults(results);
    }

    async onClose() {
        await super.onClose();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.globalCancelled.value = true;
    }

    private scheduleSearch(query: string) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (!query || query.length < 2) {
            this.searchResultsEl.empty();
            this.searchStatusEl.setText("");
            return;
        }
        this.searchStatusEl.setText(t.searching);
        this.debounceTimer = setTimeout(() => { void this.executeSearch(query); }, 300);
    }

    private async executeSearch(query: string) {
        this.currentQuery = query;

        if (!this.plugin.index) {
            this.searchStatusEl.setText(t.indexEmpty);
            return;
        }

        const { ollamaUrl, ollamaModel } = this.plugin.settings;

        try {
            if (!await checkOllama(ollamaUrl)) {
                this.searchStatusEl.setText(t.ollamaNotReady);
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
            this.renderSearchResults();
            this.searchStatusEl.setText(t.searchResults(this.lastResults.length));
        } catch (e) {
            this.searchStatusEl.setText(t.searchFailed);
            console.error("Vault Search:", e);
        }
    }

    private renderSearchResults() {
        this.searchResultsEl.empty();
        for (const result of this.lastResults) {
            this.createResultItem(this.searchResultsEl, result);
        }
    }

    // ── Discover UI ────────────────────────────────────

    private buildDiscoverUI(container: HTMLDivElement) {
        // Mode toggle
        const modeBar = container.createDiv({ cls: "vault-search-mode-toggle" });
        this.modeEls.current = modeBar.createEl("button", {
            text: t.discoverCurrentNote,
            cls: "vault-search-mode-btn",
        });
        this.modeEls.global = modeBar.createEl("button", {
            text: t.discoverGlobal,
            cls: "vault-search-mode-btn",
        });
        this.mocBtn = modeBar.createEl("button", {
            text: t.generateMoc,
            cls: "vault-search-mode-btn vault-search-moc-btn",
        });
        this.modeEls.current.addEventListener("click", () => this.setDiscoverMode("current"));
        this.modeEls.global.addEventListener("click", () => this.setDiscoverMode("global"));
        this.mocBtn.addEventListener("click", () => void this.generateMoc());

        this.discoverStatusEl = container.createDiv({ cls: "vault-search-status" });
        this.discoverResultsEl = container.createDiv({ cls: "vault-search-results" });

        this.setDiscoverMode("current");
    }

    private setDiscoverMode(mode: DiscoverMode) {
        this.globalCancelled.value = true; // Cancel any running global computation
        this.discoverMode = mode;
        this.modeEls.current.toggleClass("is-active", mode === "current");
        this.modeEls.global.toggleClass("is-active", mode === "global");

        if (mode === "current") {
            const file = this.app.workspace.getActiveFile();
            if (file) {
                this.discoverForFile(file);
            } else {
                this.discoverStatusEl.setText("");
                this.discoverResultsEl.empty();
            }
        } else {
            void this.runGlobalDiscover();
        }
    }

    // ── Public methods for main.ts ─────────────────────

    isDiscoverTabActive(): boolean {
        return this.activeTab === "discover";
    }

    showGlobalDiscover() {
        this.switchTab("discover");
        this.setDiscoverMode("global");
    }

    discoverForFile(file: TFile) {
        if (!this.plugin.index) {
            this.discoverStatusEl.setText(t.discoverNoIndex);
            this.discoverResultsEl.empty();
            return;
        }

        const entry = this.plugin.index.notes[file.path];
        if (!entry) {
            this.discoverStatusEl.setText(t.notIndexed);
            this.discoverResultsEl.empty();
            return;
        }

        const results = discoverForNote(file.path, this.plugin.index, this.plugin.settings);
        this.discoverStatusEl.setText(
            results.length > 0
                ? t.discoverRelatedTo(entry.title)
                : t.discoverEmpty
        );
        this.renderDiscoverResults(results);
    }

    private async runGlobalDiscover() {
        if (!this.plugin.index) {
            this.discoverStatusEl.setText(t.discoverNoIndex);
            this.discoverResultsEl.empty();
            return;
        }

        this.globalCancelled.value = false;
        this.discoverStatusEl.setText(t.discoverComputing);
        this.discoverResultsEl.empty();

        const results = await globalDiscover(
            this.plugin.index,
            this.plugin.settings.topResults,
            this.plugin.settings.minScore,
            (done, total) => {
                if (!this.globalCancelled.value) {
                    this.discoverStatusEl.setText(t.discoverProgress(done, total));
                }
            },
            this.globalCancelled,
        );

        if (this.globalCancelled.value) return;

        this.discoverStatusEl.setText(
            results.length > 0
                ? t.discoverGlobalDesc
                : t.discoverGlobalEmpty
        );
        this.renderDiscoverResults(results);
    }

    private renderDiscoverResults(results: SearchResult[]) {
        this.lastDiscoverResults = results;
        this.discoverResultsEl.empty();
        for (const result of results) {
            this.createResultItem(this.discoverResultsEl, result);
        }
    }

    // ── MOC generation ───────────────────────────────────

    private async generateMocFromSearch() {
        await this.buildMoc(this.lastResults, "search");
    }

    private async generateMoc() {
        await this.buildMoc(this.lastDiscoverResults, `discover-${this.discoverMode}`);
    }

    private async buildMoc(results: SearchResult[], source: string) {
        if (results.length === 0) {
            new Notice(t.mocNoResults);
            return;
        }

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
        const fileName = `MOC-${dateStr}-${timeStr}.md`;

        // Build a descriptive title from source context
        let mocTitle = `MOC ${now.toISOString().slice(0, 10)}`;
        let mocDesc = "";
        if (source === "search" && this.currentQuery) {
            mocTitle = t.mocTitleSearch(this.currentQuery);
            mocDesc = t.mocDescSearch(this.currentQuery);
        } else if (source.startsWith("discover-current")) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const entry = this.plugin.index?.notes[activeFile.path];
                const noteTitle = entry?.title ?? activeFile.basename;
                mocTitle = t.mocTitleRelated(noteTitle);
                mocDesc = t.mocDescRelated(noteTitle);
            }
        } else if (source === "discover-global") {
            mocTitle = t.mocTitleGlobal;
            mocDesc = t.mocDescGlobal;
        }

        // Build MOC content
        const lines: string[] = [];
        lines.push("---");
        lines.push(`title: ${JSON.stringify(mocTitle)}`);
        lines.push(`description: ${JSON.stringify(mocDesc)}`);
        lines.push(`pubDate: ${formatLocalDateTime(now)}`);
        lines.push("category: MOC");
        lines.push("tags:");
        lines.push("  - MOC");
        lines.push(`  - ${source}`);
        lines.push("---");
        lines.push("");
        lines.push(`# ${mocTitle}`);
        lines.push("");

        // Group by tier
        const hot = results.filter(r => r.tier === "hot");
        const cold = results.filter(r => r.tier === "cold");

        if (hot.length > 0) {
            lines.push("## Hot");
            lines.push("");
            for (const r of hot) {
                const preview = await this.getPreviewForResult(r);
                const safeTitle = r.title.replace(/\|/g, "｜");
                lines.push(`- [[${r.path.replace(/\.md$/, "")}|${safeTitle}]] (${r.score.toFixed(2)}) — ${preview}`);
                lines.push("");
            }
        }

        if (cold.length > 0) {
            lines.push("## Cold");
            lines.push("");
            for (const r of cold) {
                const preview = await this.getPreviewForResult(r);
                const safeTitle = r.title.replace(/\|/g, "｜");
                lines.push(`- [[${r.path.replace(/\.md$/, "")}|${safeTitle}]] (${r.score.toFixed(2)}) — ${preview}`);
                lines.push("");
            }
        }

        // Write file
        const content = lines.join("\n");
        const existingFile = this.app.vault.getAbstractFileByPath(fileName);
        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, content);
        } else {
            await this.app.vault.create(fileName, content);
        }

        new Notice(t.mocCreated(fileName));

        // Open the MOC
        const file = this.app.vault.getAbstractFileByPath(fileName);
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file);
        }
    }

    private async getPreviewForResult(result: SearchResult): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (!(file instanceof TFile)) return "";
        return await getContentPreview(this.app, file, 80);
    }

    // ── Shared result item (click + right-click menu + drag to Canvas) ──

    private createResultItem(parent: HTMLElement, result: SearchResult) {
        const item = parent.createDiv({ cls: "vault-search-result-item" });

        // Click → open file
        item.addEventListener("click", () => {
            const file = this.app.vault.getAbstractFileByPath(result.path);
            if (file instanceof TFile) {
                void this.app.workspace.getLeaf(false).openFile(file);
            }
        });

        // Right-click → native file context menu (Bookmark, Open in new tab, etc.)
        item.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = this.app.vault.getAbstractFileByPath(result.path);
            if (!(file instanceof TFile)) return;
            const menu = new Menu();
            this.app.workspace.trigger("file-menu", menu, file, "vault-search", this.leaf);
            menu.showAtMouseEvent(e);
        });

        // Drag → Canvas / other drop targets (dragManager is not in public API)
        const file = this.app.vault.getAbstractFileByPath(result.path);
        if (file instanceof TFile && this.app.dragManager) {
            this.app.dragManager.handleDrag(item, (dragEvent: DragEvent) => {
                return this.app.dragManager.dragFile(dragEvent, file, "vault-search");
            });
        }

        renderResultItem(item, result, this.app);
    }
}
