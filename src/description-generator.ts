import { Notice, TFile } from "obsidian";
import type VaultSearchPlugin from "./main";
import { checkOllama, stripFrontmatter } from "./utils";

const LLM_TIMEOUT_MS = 60000;
import { t } from "./i18n";

interface DescAction {
    path: string;
    title: string;
    action: "generate" | "rewrite" | "skeleton" | "skip";
    oldDesc?: string;
    newDesc?: string;
    newTags?: string[];
    error?: string;
}

const REPORT_PATH = "_description_report.md";

export class DescriptionGenerator {
    constructor(private plugin: VaultSearchPlugin) {}

    getStats(): { total: number; good: number; short: number; missing: number; noFrontmatter: number } {
        const { minDescLength } = this.plugin.settings;
        const files = this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.plugin.indexer.shouldExclude(f.path))
            .filter(f => f.path !== REPORT_PATH);

        let good = 0, short = 0, missing = 0, noFrontmatter = 0;
        for (const file of files) {
            const cache = this.plugin.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) { noFrontmatter++; continue; }
            const desc = cache.frontmatter.description ?? "";
            if (!desc) missing++;
            else if (desc.length < minDescLength) short++;
            else good++;
        }
        return { total: files.length, good, short, missing, noFrontmatter };
    }

    async preview() {
        const { ollamaUrl, llmModel, minDescLength } = this.plugin.settings;

        if (!await checkOllama(ollamaUrl)) {
            new Notice(t.ollamaNotReady);
            return;
        }

        const files = this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.plugin.indexer.shouldExclude(f.path))
            .filter(f => f.path !== REPORT_PATH);

        const actions: DescAction[] = [];
        const toProcess: { file: TFile; action: DescAction }[] = [];

        // Classify each file
        for (const file of files) {
            const cache = this.plugin.app.metadataCache.getFileCache(file);
            const fm = cache?.frontmatter;
            const desc = fm?.description ?? "";
            const hasFrontmatter = !!fm;
            const title = fm?.title
                ?? cache?.headings?.find(h => h.level === 1)?.heading
                ?? file.basename;

            if (!hasFrontmatter) {
                const action: DescAction = { path: file.path, title, action: "skeleton" };
                actions.push(action);
                toProcess.push({ file, action });
            } else if (!desc) {
                const action: DescAction = { path: file.path, title, action: "generate" };
                actions.push(action);
                toProcess.push({ file, action });
            } else if (desc.length < minDescLength) {
                const action: DescAction = { path: file.path, title, action: "rewrite", oldDesc: desc };
                actions.push(action);
                toProcess.push({ file, action });
            } else {
                actions.push({ path: file.path, title, action: "skip", oldDesc: desc });
            }
        }

        if (toProcess.length === 0) {
            new Notice(t.descAllGood);
            return;
        }

        // Generate descriptions with LLM
        const progress = new Notice(t.descGenerating(0, toProcess.length), 0);

        for (let i = 0; i < toProcess.length; i++) {
            const { file, action } = toProcess[i];
            try {
                const content = await this.plugin.app.vault.cachedRead(file);
                const body = stripFrontmatter(content).slice(0, 2000);
                const cache = this.plugin.app.metadataCache.getFileCache(file);
                const existingTags: string[] = (() => {
                    const raw = cache?.frontmatter?.tags;
                    if (Array.isArray(raw)) return raw.map(String);
                    if (typeof raw === "string") return raw.split(",").map((t: string) => t.trim()).filter(Boolean);
                    return [];
                })();

                const result = await this.callLLM(ollamaUrl, llmModel, action.title, body);
                // Reject if description is just the title
                if (result.description && result.description.replace(/[_\-\s]/g, "") === action.title.replace(/[_\-\s]/g, "")) {
                    action.error = "LLM returned title as description, retrying...";
                    // Retry once
                    const retry = await this.callLLM(ollamaUrl, llmModel, action.title, body);
                    if (retry.description && retry.description.replace(/[_\-\s]/g, "") !== action.title.replace(/[_\-\s]/g, "")) {
                        action.newDesc = retry.description;
                        action.error = undefined;
                    } else {
                        action.error = "LLM returned title as description (2 attempts)";
                        continue;
                    }
                } else {
                    action.newDesc = result.description;
                }
                // Merge tags: existing + AI generated, deduplicated
                if (result.tags && result.tags.length > 0) {
                    const normalized = new Set(existingTags.map(t => t.toLowerCase().replace(/^#/, "")));
                    const newTags = result.tags.filter(t => !normalized.has(t.toLowerCase()));
                    if (newTags.length > 0) {
                        action.newTags = [...existingTags, ...newTags];
                    }
                }
            } catch (e) {
                action.error = String(e);
                console.warn(`Vault Search: LLM failed for ${file.path}`, e);
            }
            progress.setMessage(t.descGenerating(i + 1, toProcess.length));
        }

        progress.hide();

        // Write report
        await this.writeReport(actions);

        const gen = actions.filter(a => a.action === "generate" && a.newDesc).length;
        const rewrite = actions.filter(a => a.action === "rewrite" && a.newDesc).length;
        const skeleton = actions.filter(a => a.action === "skeleton" && a.newDesc).length;
        const skip = actions.filter(a => a.action === "skip").length;
        new Notice(t.descPreviewDone(files.length, gen, rewrite, skeleton, skip), 15000);

        // Open report
        const reportFile = this.plugin.app.vault.getAbstractFileByPath(REPORT_PATH);
        if (reportFile instanceof TFile) {
            await this.plugin.app.workspace.getLeaf().openFile(reportFile);
        }
    }

    async apply() {
        const reportFile = this.plugin.app.vault.getAbstractFileByPath(REPORT_PATH);
        if (!(reportFile instanceof TFile)) {
            new Notice(t.descNoReport);
            return;
        }

        const reportContent = await this.plugin.app.vault.read(reportFile);
        const entries = this.parseReport(reportContent);

        if (entries.length === 0) {
            new Notice(t.descNoEntries);
            return;
        }

        let applied = 0;
        const progress = new Notice(`Applying: 0/${entries.length}...`, 0);

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const file = this.plugin.app.vault.getAbstractFileByPath(entry.path);
            if (!(file instanceof TFile)) continue;

            try {
                await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
                    // Set title if skeleton
                    if (entry.action === "skeleton" && !fm.title) {
                        fm.title = entry.title;
                    }
                    // Set description
                    if (entry.newDesc) {
                        fm.description = entry.newDesc;
                    }
                    // Set merged tags if provided
                    if (entry.newTags && entry.newTags.length > 0) {
                        fm.tags = entry.newTags;
                    }
                    // Set pubDate if skeleton and not existing
                    if (entry.action === "skeleton" && !fm.pubDate) {
                        const d = new Date(file.stat.ctime);
                        const tzOffset = -d.getTimezoneOffset();
                        const sign = tzOffset >= 0 ? "+" : "-";
                        const tzH = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0");
                        const tzM = String(Math.abs(tzOffset) % 60).padStart(2, "0");
                        fm.pubDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${sign}${tzH}:${tzM}`;
                    }
                });
                applied++;
            } catch (e) {
                console.warn(`Vault Search: failed to apply ${entry.path}`, e);
            }

            progress.setMessage(t.descApplying(i + 1, entries.length));
        }

        progress.hide();
        new Notice(t.descApplyDone(applied), 10000);
    }

    private async callLLM(
        url: string,
        model: string,
        title: string,
        content: string,
    ): Promise<{ description: string; tags?: string[] }> {
        const prompt = `任務：為筆記產生 description 和 tags。

規則：
1. description 用繁體中文，50-100 字
2. description 必須描述具體內容，禁止重複標題
3. tags 用繁體中文，3-5 個，不要 # 前綴，不能有空格
4. 只回覆 JSON

{"description": "...", "tags": ["...", "...", "..."]}

筆記標題：${title}

筆記內容：
${content}`;

        const apiKey = this.plugin.settings.apiKey;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

        const abortController = new AbortController();
        const timer = setTimeout(() => abortController.abort(), LLM_TIMEOUT_MS);

        let resp: Response;
        try {
            resp = await fetch(`${url}/api/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    stream: false,
                    format: "json",
                    think: false,
                }),
                signal: abortController.signal,
            });
        } finally {
            clearTimeout(timer);
        }

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Ollama ${resp.status}: ${errText.length > 200 ? errText.slice(0, 200) + "..." : errText}`);
        }

        const data = await resp.json();
        const raw = data.message?.content ?? "";
        return this.parseGeneratedJSON(raw);
    }

    private parseGeneratedJSON(raw: string): { description: string; tags?: string[] } {
        const tryParse = (text: string): { description: string; tags?: string[] } | null => {
            try {
                const parsed = JSON.parse(text);
                const desc = parsed.description ?? parsed.summary ?? "";
                const tags = Array.isArray(parsed.tags)
                    ? parsed.tags
                        .map(String)
                        .map((t: string) => t.replace(/\s+/g, "_"))
                        .filter((t: string) => t !== "..." && t !== "\u2026" && t.length > 0)
                    : undefined;
                return { description: desc, tags };
            } catch { return null; }
        };

        return tryParse(raw)
            ?? tryParse(raw.replace(/```json\n?|\n?```/g, "").trim())
            ?? { description: raw.slice(0, 200) };
    }

    private async writeReport(actions: DescAction[]) {
        const lines: string[] = [
            "---",
            "title: Description Generation Report",
            `generated_at: ${new Date().toISOString()}`,
            "---",
            "",
            "# Description Generation Report",
            "",
        ];

        const groups = {
            generate: actions.filter(a => a.action === "generate" && a.newDesc),
            rewrite: actions.filter(a => a.action === "rewrite" && a.newDesc),
            skeleton: actions.filter(a => a.action === "skeleton" && a.newDesc),
            failed: actions.filter(a => ["generate", "rewrite", "skeleton"].includes(a.action) && !a.newDesc),
            skipped: actions.filter(a => a.action === "skip"),
        };

        const wikilink = (path: string) => `[[${path.replace(/\.md$/, "")}]]`;

        if (groups.generate.length > 0) {
            lines.push(`## New descriptions (${groups.generate.length})`);
            lines.push("");
            for (const a of groups.generate) {
                lines.push(`### ${wikilink(a.path)}`);
                lines.push(`- path: \`${a.path}\``);
                lines.push(`- **generated**: ${a.newDesc}`);
                if (a.newTags) lines.push(`- tags: ${a.newTags.join(", ")}`);
                lines.push("");
            }
        }

        if (groups.rewrite.length > 0) {
            lines.push(`## Rewritten descriptions (${groups.rewrite.length})`);
            lines.push("");
            for (const a of groups.rewrite) {
                lines.push(`### ${wikilink(a.path)}`);
                lines.push(`- path: \`${a.path}\``);
                lines.push(`- **before**: ${a.oldDesc}`);
                lines.push(`- **after**: ${a.newDesc}`);
                if (a.newTags) lines.push(`- tags: ${a.newTags.join(", ")}`);
                lines.push("");
            }
        }

        if (groups.skeleton.length > 0) {
            lines.push(`## New frontmatter skeleton (${groups.skeleton.length})`);
            lines.push("");
            for (const a of groups.skeleton) {
                lines.push(`### ${wikilink(a.path)}`);
                lines.push(`- path: \`${a.path}\``);
                lines.push(`- **generated**: ${a.newDesc}`);
                if (a.newTags) lines.push(`- tags: ${a.newTags.join(", ")}`);
                lines.push("");
            }
        }

        if (groups.failed.length > 0) {
            lines.push(`## Failed (${groups.failed.length})`);
            lines.push("");
            for (const a of groups.failed) {
                lines.push(`- ${wikilink(a.path)}: ${a.error ?? "unknown error"}`);
            }
            lines.push("");
        }

        if (groups.skipped.length > 0) {
            lines.push(`## Skipped (${groups.skipped.length})`);
            lines.push("");
            for (const a of groups.skipped) {
                lines.push(`- ${wikilink(a.path)}`);
            }
            lines.push("");
        }

        const reportFile = this.plugin.app.vault.getAbstractFileByPath(REPORT_PATH);
        if (reportFile instanceof TFile) {
            await this.plugin.app.vault.modify(reportFile, lines.join("\n"));
        } else {
            await this.plugin.app.vault.create(REPORT_PATH, lines.join("\n"));
        }
    }

    private parseReport(content: string): DescAction[] {
        const entries: DescAction[] = [];
        const lines = content.split("\n");

        let currentAction: DescAction | null = null;
        let currentSection: "generate" | "rewrite" | "skeleton" | null = null;

        for (const line of lines) {
            if (line.startsWith("## New descriptions")) { currentSection = "generate"; continue; }
            if (line.startsWith("## Rewritten descriptions")) { currentSection = "rewrite"; continue; }
            if (line.startsWith("## New frontmatter skeleton")) { currentSection = "skeleton"; continue; }
            if (line.startsWith("## Failed") || line.startsWith("## Skipped")) { currentSection = null; continue; }

            if (!currentSection) continue;

            if (line.startsWith("### ")) {
                if (currentAction && currentAction.newDesc) entries.push(currentAction);
                currentAction = {
                    path: "",
                    title: line.slice(4).trim(),
                    action: currentSection,
                };
            } else if (currentAction) {
                if (line.startsWith("- path: `")) {
                    currentAction.path = line.match(/`([^`]+)`/)?.[1] ?? "";
                } else if (line.startsWith("- **generated**: ") || line.startsWith("- **after**: ")) {
                    currentAction.newDesc = line.replace(/^- \*\*(generated|after)\*\*: /, "");
                } else if (line.startsWith("- tags: ")) {
                    currentAction.newTags = line.slice(8).split(",").map(s => s.trim()).filter(Boolean);
                }
            }
        }
        if (currentAction && currentAction.newDesc) entries.push(currentAction);

        return entries;
    }
}
