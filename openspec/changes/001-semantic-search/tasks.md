# Tasks

## Task 1: Plugin 骨架與建置環境

**建立 Obsidian plugin 專案結構，確認能載入。**

1. 初始化 npm 專案：
   ```json
   // package.json
   { "name": "vault-search", "version": "0.1.0",
     "devDependencies": { "obsidian": "latest", "esbuild": "latest", "typescript": "latest",
                          "@anthropic-ai/sdk": "..." } }
   ```
   注意：ai-providers SDK 從 npm `obsidian-ai-providers` 安裝或直接複製 types.d.ts。

2. 建立 `manifest.json`：
   ```json
   { "id": "vault-search", "name": "Vault Search",
     "version": "0.1.0", "minAppVersion": "1.0.0",
     "description": "Semantic search for your vault using local embeddings",
     "author": "Jacob Mei", "isDesktopOnly": true }
   ```

3. 建立 `tsconfig.json`（strict mode, ES2018 target）

4. 建立 `esbuild.config.mjs`（bundle src/main.ts → main.js, external: obsidian）

5. 建立 `src/types.ts`：
   - 複製 ai-providers SDK 的 `IAIProvidersService`、`IAIProvider`、`ExtendedApp` 等型別
   - 定義 `VaultSearchSettings`、`NoteEntry`、`VaultSearchData`、`SearchResult`

6. 建立 `src/main.ts` 骨架：
   - `onload()`：等待 ai-providers ready、載入 data、註冊 command
   - `onunload()`：清理事件

7. 建立 `.gitignore`：`node_modules/`, `main.js`, `data.json`

8. dev 環境：symlink `vault-search/` 到 vault 的 `.obsidian/plugins/vault-search/`
   （或 `npm run dev` 輸出到該目錄）

**驗證：**
1. `npm run build` 成功產出 `main.js`
2. Obsidian 重新載入後在 Community plugins 看到 "Vault Search"
3. 啟用 plugin 不報錯，console 印出 "Vault Search loaded"
4. ai-providers service 取得成功（console 印出 provider 清單）

---

## Task 2: Indexer — 建立語意索引

**掃描 vault、呼叫 ai-providers embed()、計算 tier、持久化。**

### 2a: Vault 掃描

1. `app.vault.getMarkdownFiles()` 取得所有 .md 檔
2. 排除 D5 定義的路徑（比對 `file.path.startsWith(pattern)`）
3. 讀取每篇內容：`app.vault.cachedRead(file)`
4. 解析 frontmatter：`app.metadataCache.getFileCache(file)?.frontmatter`
5. 提取 title（優先順序：`frontmatter.title` → `cache.headings` 第一個 level=1 → `file.basename`）
6. 提取 tags：frontmatter `tags` 可能是 `string[]` 或逗號分隔 `string`，統一轉 `string[]`
7. 組合 embed text：`[title, tags.join(" "), contentWithoutFrontmatter].filter(Boolean).join("\n")`
8. frontmatter 分割：找第一個 `---` 到第二個 `---`，取之後的內容

### 2b: Embedding 呼叫

1. 載入現有 index（`plugin.loadData()`）
2. 比對 mtime（`file.stat.mtime`）：只處理新增或變更的檔案
3. 呼叫 ai-providers：
   ```typescript
   const embeddings = await aiProviders.embed({
       input: batchTexts,  // string[]
       provider: settings.embeddingProvider
   });
   ```
4. 每批最多 20 篇（避免 timeout）
5. 進度回報：Obsidian `Notice` 顯示 "Indexing: 50/334..."
6. 失敗處理：整批 embed 呼叫 try/catch，若整批失敗則降為逐篇呼叫；逐篇仍失敗 log warning 並跳過
7. Command: `Vault Search: Rebuild index`（全量重建）
8. Command: `Vault Search: Update index`（增量更新）

### 2c: Hot/Cold Tier 計算

1. 利用 MetadataCache：
   ```typescript
   const cache = app.metadataCache.getFileCache(file);
   const hasOutgoing = (cache?.links?.length ?? 0) > 0 || (cache?.embeds?.length ?? 0) > 0;

   const resolvedLinks = app.metadataCache.resolvedLinks;
   const hasIncoming = Object.entries(resolvedLinks).some(
       ([sourcePath, targets]) => sourcePath !== file.path && file.path in targets
   );
   ```
2. Created 日期：frontmatter `created` → `file.stat.ctime`
3. Tier 判定：hot if (hasIncoming OR hasOutgoing OR createdWithinDays)
4. 存入 NoteEntry.tier

### 2d: 持久化

1. 合併新舊 index（保留未變更的 embedding）
2. 移除已刪除檔案的 entry
3. 更新 meta（model、dim、count、indexedAt）
4. `plugin.saveData(data)`
5. 完成後 `Notice`: "Index complete: 334 notes (280 hot, 54 cold)"

### 2e: 自動更新（vault 事件）

1. `vault.on('modify', file)` → 如果 file 在 index 中且 mtime 變了，重新 embed 該檔
2. `vault.on('create', file)` → embed + 加入 index
3. `vault.on('delete', file)` → 從 index 移除
4. `vault.on('rename', (file, oldPath))` → 更新 key
5. Debounce 2 秒（同一檔案連續修改不重複觸發）
6. 設定 `autoIndexOnChange` toggle 控制是否啟用

**驗證：**
1. `Vault Search: Rebuild index` 成功跑完，Notice 顯示正確數量
2. `plugin.loadData()` 回傳的 index 含所有筆記，embedding 維度正確
3. 再跑 `Update index`，0 篇需更新（增量正確）
4. 修改一篇筆記 → 自動重新 embed（console log 確認）
5. 刪除一篇 → index 自動移除
6. hot/cold 數量合理（有 link 的是 hot）

---

## Task 3: Searcher — SuggestModal 語意搜尋

**載入 index、embed 查詢、cosine similarity、SuggestModal 顯示。**

### 3a: SearchModal（extends SuggestModal）

```typescript
class SearchModal extends SuggestModal<SearchResult> {
    private query: string = "";
    private results: SearchResult[] = [];
    private debounceTimer: number | null = null;

    getSuggestions(query: string): SearchResult[] {
        // debounce 300ms，觸發 async 搜尋
        // 回傳上一次的 results（async 完成後 re-render）
    }

    renderSuggestion(result: SearchResult, el: HTMLElement): void {
        // title + score
        // tags + folder path
    }

    onChooseSuggestion(result: SearchResult, evt: MouseEvent | KeyboardEvent): void {
        // 開啟對應筆記
        const file = app.vault.getAbstractFileByPath(result.path);
        if (file instanceof TFile) {
            app.workspace.getLeaf().openFile(file);
        }
    }
}
```

### 3b: 搜尋邏輯

1. 呼叫 ai-providers embed() 取得 query vector（單一呼叫）
2. 從 index 載入筆記向量：
   - 預設只載入 `tier === "hot"`（除非設定或 toggle 為 all）
3. 計算 cosine similarity（純 JS Float32Array loop）
4. 排序取 top-N
5. 回傳 `SearchResult[]`：`{ path, title, tags, score, tier }`

### 3c: Debounce 與 async 處理

SuggestModal.getSuggestions() 是同步的，但 embed 是 async。處理方式：
1. getSuggestions() 啟動 async 搜尋，立即回傳 `this.lastResults`（上一次結果或空陣列）
2. async 完成後更新 `this.lastResults`，透過 `this.inputEl.dispatchEvent(new Event('input'))` 觸發 re-render
3. 新 query 進來時用 AbortController abort 上一次的 embed 呼叫（ai-providers embed() 支援 abortController 參數）
4. Debounce 300ms：用 `window.setTimeout` + `clearTimeout`

### 3d: Command 註冊

```typescript
this.addCommand({
    id: "semantic-search",
    name: "Semantic search",
    callback: () => new SearchModal(this.app, this).open()
});
```

**驗證：**
1. Cmd+P → "Vault Search: Semantic search" 開啟 modal
2. 輸入查詢 → 300ms 後顯示結果
3. 結果排序合理（相關筆記在前）
4. 點擊結果 → 正確開啟對應筆記
5. 搜尋延遲（含 embed）< 500ms
6. 快速連續輸入不會重複呼叫（debounce 正確）

---

## Task 4: Settings — 設定頁面

**SettingTab UI，讓使用者設定 provider 和搜尋參數。**

### 4a: SettingTab

1. **Embedding Provider**：dropdown，從 `aiProviders.providers` 取得清單
   - 只顯示有 embedding 能力的 provider（filter by type）
   - 選擇後存入 settings
2. **Default top results**：number input，預設 10
3. **Hot days**：number input，預設 90
4. **Search scope**：toggle，hot only / all
5. **Exclude patterns**：text area，每行一個 pattern
6. **Auto-index on change**：toggle，預設 on
7. **Actions**：
   - Button: "Rebuild index"（觸發全量重建）
   - Button: "Index stats"（顯示 count、hot/cold 比例、last indexed time）

### 4b: 預設值

```typescript
const DEFAULT_SETTINGS: VaultSearchSettings = {
    embeddingProviderId: "",   // 首次需要使用者選
    topResults: 10,
    hotDays: 90,
    searchScope: "hot",
    excludePatterns: ["_templates/", ".trash/", ".obsidian/"],
    autoIndex: true,
};
```

### 4c: 首次使用引導

Plugin 啟用後若 `embeddingProviderId` 為空：
1. 顯示 Notice: "Vault Search: Please select an embedding provider in settings"
2. 不自動開始 indexing
3. vault 事件監聽仍註冊但 handler 內檢查：無 provider 時直接 return（noop）
4. 搜尋 command 也檢查：無 provider 時顯示 Notice 並 return

**驗證：**
1. Settings 頁面正常顯示所有項目
2. Provider dropdown 列出 ai-providers 設定的 provider
3. 修改設定後 `plugin.saveData()` 正確存入
4. "Rebuild index" 按鈕觸發 indexing
5. "Index stats" 顯示正確統計
6. 首次啟用時顯示引導 Notice

---

## Task 5: 開發環境與發佈準備

**Dev workflow、README、發佈前檢查。**

1. `npm run dev`：watch mode，自動 build 到 vault plugins 目錄
2. `.hotreload` 檔案（Obsidian hot-reload plugin 支援）
3. `README.md`：
   - 功能說明（英文）
   - 截圖 / GIF
   - 安裝方式（BRAT → Community plugins）
   - 依賴說明（ai-providers required）
   - 設定說明
4. `LICENSE`（MIT）
5. GitHub release workflow（tag → build → attach main.js + manifest.json + styles.css）

**驗證：**
1. `npm run dev` watch mode 正常
2. 修改 .ts → 自動 rebuild → Obsidian hot-reload 生效
3. `npm run build` 產出 production main.js
4. README 完整且準確
