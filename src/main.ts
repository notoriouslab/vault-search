import { Notice, Plugin, TFile } from "obsidian";
import {
    VaultSearchData,
    VaultSearchSettings,
    VaultSearchIndex,
    DEFAULT_SETTINGS,
} from "./types";
import { Indexer } from "./indexer";
import { SearchModal } from "./searcher";
import { SearchView, VIEW_TYPE_SEARCH } from "./search-view";
import { VaultSearchSettingTab } from "./settings";
import { cosineSimilarity } from "./utils";
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
        this.addRibbonIcon("search", "Vault Search", () => {
            this.activateView();
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
                this.findSimilar(file);
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

        console.log("Vault Search loaded");
    }

    onunload() {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        console.log("Vault Search unloaded");
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
            workspace.revealLeaf(leaf);
            // Focus the search input
            const view = leaf.view as SearchView;
            if (view.focusInput) view.focusInput();
        }
    }

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

        const results: import("./types").SearchResult[] = [];
        for (const [path, other] of Object.entries(this.index.notes)) {
            if (path === file.path) continue;
            if (!other.embedding || other.embedding.length === 0) continue;
            const score = cosineSimilarity(entry.embedding, other.embedding);
            if (score >= this.settings.minScore) {
                results.push({ path, title: other.title, tags: other.tags, score, tier: other.tier });
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
        if (!this.settings.autoIndex) return;
        if (!(file instanceof TFile) || file.extension !== "md") return;
        if (this.indexer.shouldExclude(file.path)) return;

        const existing = this.debounceTimers.get(file.path);
        if (existing) clearTimeout(existing);

        this.debounceTimers.set(
            file.path,
            setTimeout(async () => {
                this.debounceTimers.delete(file.path);
                if (type === "delete") {
                    this.indexer.removeFromIndex(file.path);
                } else {
                    await this.indexer.indexSingleFile(file);
                }
                await this.saveIndex();
            }, 2000)
        );
    }

    private onFileRename(file: unknown, oldPath: string) {
        if (!this.settings.autoIndex) return;
        if (!(file instanceof TFile) || file.extension !== "md") return;

        this.indexer.renameInIndex(oldPath, file.path);
        this.saveIndex();
    }

    async loadSettings() {
        const data: Partial<VaultSearchData> | null = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);
        this.index = data?.index ?? null;
    }

    async saveSettings() {
        await this.persist();
    }

    async saveIndex() {
        await this.persist();
    }

    private async persist() {
        await this.saveData({
            settings: this.settings,
            index: this.index,
        } as VaultSearchData);
    }
}
