import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultSearchPlugin from "./main";
import { fetchOllamaModels } from "./utils";
import { t } from "./i18n";

export class VaultSearchSettingTab extends PluginSettingTab {
    plugin: VaultSearchPlugin;

    constructor(app: App, plugin: VaultSearchPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // ============================
        // Section 1: Search & Index
        // ============================
        containerEl.createEl("h2", { text: t.sectionSearch });

        const urlSetting = new Setting(containerEl)
            .setName(t.ollamaUrl)
            .setDesc(t.ollamaUrlDesc)
            .addText(text => {
                text.setPlaceholder("http://localhost:11434");
                text.setValue(this.plugin.settings.ollamaUrl);
                text.onChange(async (val) => {
                    this.plugin.settings.ollamaUrl = val.trim();
                    await this.plugin.saveSettings();
                    this.updateRemoteWarning(urlSetting, val.trim());
                });
            });
        this.updateRemoteWarning(urlSetting, this.plugin.settings.ollamaUrl);

        new Setting(containerEl)
            .setName(t.apiFormat)
            .setDesc(t.apiFormatDesc)
            .addDropdown(drop => {
                drop.addOption("ollama", t.apiFormatOllama);
                drop.addOption("openai", t.apiFormatOpenAI);
                drop.setValue(this.plugin.settings.apiFormat);
                drop.onChange(async (val) => {
                    this.plugin.settings.apiFormat = val as "ollama" | "openai";
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("API Key")
            .setDesc("Optional — for OpenAI-compatible servers that require authentication")
            .addText(text => {
                text.setPlaceholder("sk-...");
                text.setValue(this.plugin.settings.apiKey);
                text.inputEl.type = "password";
                text.onChange(async (val) => {
                    this.plugin.settings.apiKey = val.trim();
                    await this.plugin.saveSettings();
                });
            });

        const embSetting = new Setting(containerEl)
            .setName(t.embeddingModel)
            .setDesc(t.embeddingModelDesc);
        this.addModelDropdown(embSetting, this.plugin.settings.ollamaModel, async (val) => {
            this.plugin.settings.ollamaModel = val;
            await this.plugin.saveSettings();
        }, "embedding");

        new Setting(containerEl)
            .setName(t.topResults)
            .setDesc(t.topResultsDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.topResults));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n > 0) {
                        this.plugin.settings.topResults = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.minScore)
            .setDesc(t.minScoreDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.minScore));
                text.onChange(async (val) => {
                    const n = parseFloat(val);
                    if (!isNaN(n) && n >= 0 && n <= 1) {
                        this.plugin.settings.minScore = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.maxEmbedChars)
            .setDesc(t.maxEmbedCharsDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.maxEmbedChars));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n > 0) {
                        this.plugin.settings.maxEmbedChars = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.hotDays)
            .setDesc(t.hotDaysDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.hotDays));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n > 0) {
                        this.plugin.settings.hotDays = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.searchScope)
            .setDesc(t.searchScopeDesc)
            .addDropdown(drop => {
                drop.addOption("hot", t.scopeHot);
                drop.addOption("all", t.scopeAll);
                drop.setValue(this.plugin.settings.searchScope);
                drop.onChange(async (val) => {
                    this.plugin.settings.searchScope = val as "hot" | "all";
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t.excludePatterns)
            .setDesc(t.excludePatternsDesc)
            .addTextArea(text => {
                text.setValue(this.plugin.settings.excludePatterns.join("\n"));
                text.onChange(async (val) => {
                    this.plugin.settings.excludePatterns = val
                        .split("\n")
                        .map(s => s.trim())
                        .filter(Boolean);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t.synonymsLabel)
            .setDesc(t.synonymsDesc)
            .addTextArea(text => {
                const lines = Object.entries(this.plugin.settings.synonyms)
                    .map(([k, v]) => `${k} = ${v.join(", ")}`);
                text.setValue(lines.join("\n"));
                text.inputEl.rows = 6;
                text.inputEl.style.width = "100%";
                text.onChange(async (val) => {
                    const result: Record<string, string[]> = {};
                    for (const line of val.split("\n")) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.includes("=")) continue;
                        const [key, rest] = trimmed.split("=", 2);
                        const k = key.trim();
                        if (!k || !rest) continue;
                        result[k] = rest.split(",").map(s => s.trim()).filter(Boolean);
                    }
                    this.plugin.settings.synonyms = result;
                    await this.plugin.saveSettings();
                });
            });

        // Chunking
        new Setting(containerEl)
            .setName(t.chunkingMode)
            .setDesc(t.chunkingModeDesc)
            .addDropdown(drop => {
                drop.addOption("off", t.chunkingOff);
                drop.addOption("smart", t.chunkingSmart);
                drop.addOption("all", t.chunkingAll);
                drop.setValue(this.plugin.settings.chunkingMode);
                drop.onChange(async (val) => {
                    this.plugin.settings.chunkingMode = val as "off" | "smart" | "all";
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t.chunkSize)
            .setDesc(t.chunkSizeDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.chunkSize));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n >= 200) {
                        this.plugin.settings.chunkSize = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.chunkOverlap)
            .setDesc(t.chunkOverlapDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.chunkOverlap));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n >= 0 && n < this.plugin.settings.chunkSize) {
                        this.plugin.settings.chunkOverlap = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        new Setting(containerEl)
            .setName(t.autoIndex)
            .setDesc(t.autoIndexDesc)
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.autoIndex);
                toggle.onChange(async (val) => {
                    this.plugin.settings.autoIndex = val;
                    await this.plugin.saveSettings();
                });
            });

        // Index actions
        containerEl.createEl("h3", { text: t.actions });

        new Setting(containerEl)
            .setName(t.rebuildIndex)
            .setDesc(t.rebuildIndexDesc)
            .addButton(btn => {
                btn.setButtonText(t.rebuildBtn);
                btn.setCta();
                btn.onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText(t.indexingBtn);
                    await this.plugin.rebuildIndex();
                    btn.setDisabled(false);
                    btn.setButtonText(t.rebuildBtn);
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName(t.updateIndex)
            .setDesc(t.updateIndexDesc)
            .addButton(btn => {
                btn.setButtonText(t.updateBtn);
                btn.onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText(t.updatingBtn);
                    await this.plugin.updateIndex();
                    btn.setDisabled(false);
                    btn.setButtonText(t.updateBtn);
                    this.display();
                });
            });

        // Index stats
        const index = this.plugin.index;
        if (index) {
            containerEl.createEl("h3", { text: t.indexStats });
            const stats = containerEl.createDiv({ cls: "vault-search-stats" });
            const notes = Object.values(index.notes);
            const hot = notes.filter(n => n.tier === "hot").length;
            const cold = notes.filter(n => n.tier === "cold").length;
            stats.createEl("p", { text: `${t.totalNotes}: ${index.meta.count}` });
            stats.createEl("p", { text: `${t.hot}: ${hot} / ${t.cold}: ${cold}` });
            stats.createEl("p", { text: `${t.model}: ${index.meta.model}` });
            stats.createEl("p", { text: `${t.dimensions}: ${index.meta.dim}` });
            stats.createEl("p", { text: `${t.lastIndexed}: ${index.meta.indexedAt}` });
        }

        // ============================
        // Section 2: Description Generator
        // ============================
        containerEl.createEl("h2", { text: t.sectionDesc });

        const llmSetting = new Setting(containerEl)
            .setName(t.llmModel)
            .setDesc(t.llmModelDesc);
        this.addModelDropdown(llmSetting, this.plugin.settings.llmModel, async (val) => {
            this.plugin.settings.llmModel = val;
            await this.plugin.saveSettings();
        }, "llm");

        new Setting(containerEl)
            .setName(t.minDescLength)
            .setDesc(t.minDescLengthDesc)
            .addText(text => {
                text.setValue(String(this.plugin.settings.minDescLength));
                text.onChange(async (val) => {
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n > 0) {
                        this.plugin.settings.minDescLength = n;
                        await this.plugin.saveSettings();
                    }
                });
            });

        // Description actions
        containerEl.createEl("h3", { text: t.actions });

        new Setting(containerEl)
            .setName(t.cmdDescPreview)
            .setDesc(t.rebuildIndexDesc)
            .addButton(btn => {
                btn.setButtonText(t.previewBtn);
                btn.setCta();
                btn.onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText(t.previewingBtn);
                    await this.plugin.descGenerator.preview();
                    btn.setDisabled(false);
                    btn.setButtonText(t.previewBtn);
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName(t.cmdDescApply)
            .setDesc(t.updateIndexDesc)
            .addButton(btn => {
                btn.setButtonText(t.applyBtn);
                btn.onClick(async () => {
                    btn.setDisabled(true);
                    btn.setButtonText(t.applyingBtn);
                    await this.plugin.descGenerator.apply();
                    btn.setDisabled(false);
                    btn.setButtonText(t.applyBtn);
                    this.display();
                });
            });

        // Description stats
        const descStats = this.plugin.descGenerator.getStats();
        containerEl.createEl("h3", { text: t.descStats });
        const dStatsEl = containerEl.createDiv({ cls: "vault-search-stats" });
        dStatsEl.createEl("p", { text: `${t.totalNotes}: ${descStats.total}` });
        dStatsEl.createEl("p", { text: `${t.descGood}: ${descStats.good}` });
        dStatsEl.createEl("p", { text: `${t.descShort}: ${descStats.short}` });
        dStatsEl.createEl("p", { text: `${t.descMissing}: ${descStats.missing}` });
        dStatsEl.createEl("p", { text: `${t.descNoFm}: ${descStats.noFrontmatter}` });

        // Async: populate model dropdowns
        this.loadModelOptions();
    }

    private addModelDropdown(setting: Setting, currentValue: string, onChange: (val: string) => Promise<void>, filterType?: "embedding" | "llm") {
        setting.addDropdown(drop => {
            drop.addOption("", "Loading...");
            if (currentValue) drop.addOption(currentValue, currentValue);
            drop.setValue(currentValue);
            drop.onChange(onChange);
            drop.selectEl.dataset.modelDropdown = filterType ?? "all";
        });
    }

    private updateRemoteWarning(setting: Setting, url: string) {
        const existing = setting.settingEl.querySelector(".vault-search-remote-warn");
        if (existing) existing.remove();
        try {
            const parsed = new URL(url);
            const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname);
            if (!isLocal) {
                const warn = setting.settingEl.createDiv({ cls: "vault-search-remote-warn" });
                warn.setText("⚠ Remote server — note content will be sent outside your machine");
                warn.style.color = "var(--text-error)";
                warn.style.fontSize = "0.85em";
                warn.style.marginTop = "4px";
            }
        } catch { /* invalid URL, ignore */ }
    }

    private async loadModelOptions() {
        const models = await fetchOllamaModels(this.plugin.settings.ollamaUrl);
        if (models.length === 0) return;

        const dropdowns = this.containerEl.querySelectorAll("select[data-model-dropdown]");
        dropdowns.forEach((selectEl) => {
            const select = selectEl as HTMLSelectElement;
            const currentValue = select.value;
            const filterType = select.dataset.modelDropdown;

            select.empty();
            select.createEl("option", { value: "", text: "-- Select model --" });

            // Filter: only show relevant models
            const filtered = models.filter(m => {
                if (filterType === "embedding") return m.isEmbedding;
                if (filterType === "llm") return !m.isEmbedding;
                return true;
            });

            for (const m of filtered) {
                const sizeLabel = m.sizeGB < 1 ? `${(m.sizeGB * 1000).toFixed(0)}MB` : `${m.sizeGB.toFixed(1)}GB`;
                const label = `${m.name} (${sizeLabel})`;
                select.createEl("option", { value: m.name, text: label });
            }
            select.value = currentValue;
        });
    }
}
