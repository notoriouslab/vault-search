# Vault Search — Obsidian 語意搜尋 Plugin

## 摘要

Obsidian community plugin，為個人 vault 提供語意搜尋。透過 ai-providers plugin 呼叫本地 Ollama embedding，預建向量 index，SuggestModal 即時搜尋。可發佈給其他使用者。

## D1: 架構總覽

```
Obsidian
├── ai-providers plugin     ← 管理 Ollama/OpenAI 等 provider 設定
├── vault-search plugin     ← 本 plugin
│   ├── Indexer             ← 掃描 vault → 呼叫 ai-providers embed() → 存 index
│   ├── Searcher            ← cosine similarity → SuggestModal
│   └── plugin.saveData()   ← 持久化 index（JSON）
└── Ollama (localhost)      ← Qwen3-Embedding-0.6b 或使用者自選模型
```

**依賴：** ai-providers plugin（必裝）。不直接呼叫 Ollama API，一律透過 ai-providers SDK。

**SDK 來源：** 從 [pfrankov/obsidian-ai-providers](https://github.com/pfrankov/obsidian-ai-providers) `packages/sdk/types.d.ts` 複製型別定義。SDK version check: `aiProviders.checkCompatibility(3)`。

## D2: Embedding 策略

### Provider 選擇

使用者在 ai-providers 設定 embedding provider（Ollama、OpenAI、Gemini 等）。本 plugin 不綁定特定模型或 provider。

### Embed text 組合

```typescript
const embedText = [title, tags.join(" "), contentWithoutFrontmatter].filter(Boolean).join("\n");
```

不截斷。交給使用者選的模型處理 token 上限。

### Title 提取優先順序

`frontmatter.title` → MetadataCache `headings` 第一個 level=1 → `file.basename`

```typescript
const cache = app.metadataCache.getFileCache(file);
const title = cache?.frontmatter?.title
    ?? cache?.headings?.find(h => h.level === 1)?.heading
    ?? file.basename;
```

### Tags 處理

frontmatter `tags` 可能是 `string[]` 或 `string`（逗號分隔）。統一轉為 `string[]`：

```typescript
const raw = cache?.frontmatter?.tags;
const tags = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",").map(t => t.trim()) : [];
```

### 呼叫方式

```typescript
const aiProviders = await waitForAIProviders(app, plugin);
const provider = plugin.settings.embeddingProvider; // 使用者在 plugin 設定選的
const embeddings = await aiProviders.embed({
    input: [text1, text2, ...],  // batch
    provider
});
// embeddings: number[][] — 每篇一個向量
```

## D3: Index 儲存

### 格式

`plugin.saveData()` / `plugin.loadData()` 存 JSON。

```typescript
interface VaultSearchData {
    settings: VaultSearchSettings;
    index: {
        meta: {
            model: string;       // e.g. "qwen3-embedding:0.6b"
            dim: number;         // e.g. 1024
            indexedAt: string;
            count: number;
        };
        notes: Record<string, NoteEntry>;  // key = file path
    };
}

interface NoteEntry {
    title: string;
    tags: string[];
    tier: "hot" | "cold";
    mtime: number;
    embedding: number[];
}
```

### 大小估算

334 篇 × 1024 dim × 8 bytes (JSON number) ≈ 2.7MB。可接受。
未來若超過 2000 篇，遷 IndexedDB（結構 1:1）。

### 增量更新

- `vault.on('modify')` → 比對 mtime，只重新 embed 變更檔案
- `vault.on('create')` → embed 新檔案
- `vault.on('delete')` → 從 index 移除
- `vault.on('rename')` → 更新 key

## D4: Hot/Cold Tier

### 資料來源

直接用 Obsidian `MetadataCache`，不自己解析 wikilink：

```typescript
// outgoing links（LinkCache[] 和 EmbedCache[]）
const cache = app.metadataCache.getFileCache(file);
const hasOutgoing = (cache?.links?.length ?? 0) > 0 || (cache?.embeds?.length ?? 0) > 0;

// incoming backlinks
// resolvedLinks: Record<sourcePath, Record<targetPath, count>>
const resolvedLinks = app.metadataCache.resolvedLinks;
const hasIncoming = Object.entries(resolvedLinks).some(
    ([src, targets]) => src !== file.path && file.path in targets
);
```

### Tier 判定

- `hot`：有 incoming backlink OR 有 outgoing link OR 近 N 天建立（N = 設定值，預設 90）
- `cold`：不滿足以上任何條件

### 搜尋行為

預設只搜 hot。設定可改為預設搜全部。搜尋 modal 有 toggle 切換。

## D5: 排除規則

預設排除（使用者可在設定自訂）：

```typescript
const DEFAULT_EXCLUDES = [
    "_templates/",
    ".trash/",
    ".obsidian/",
];
```

排除邏輯：路徑 startsWith 任一 exclude pattern 即跳過。

## D6: 搜尋 UI — SuggestModal

### 觸發方式

Command Palette: `Vault Search: Semantic search`（可綁 hotkey）

### Modal 行為

1. 使用者輸入查詢（有 debounce 300ms）
2. 呼叫 ai-providers embed() 取得 query vector（支援 AbortController 取消前次呼叫）
3. cosine similarity 排序
4. 顯示 top-N 結果（N = 設定值，預設 10）

### Async 處理

SuggestModal.getSuggestions() 是同步的。策略：
- getSuggestions() 啟動 async embed，立即回傳 `this.lastResults`
- async 完成後更新 `this.lastResults`，透過 `this.inputEl.dispatchEvent(new Event('input'))` 觸發重新渲染
- 新 query 進來時，用 AbortController abort 上一次 embed

### 每筆結果顯示

```
宣教與植堂的張力                    0.847
tags: 宣教, 植堂    |    1_notes/
```

Title + score + tags + 資料夾路徑。

### 選取行為

點擊或 Enter → 直接開啟該筆記。

### Cosine Similarity（JS 實作）

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

334 × 1024 純 JS < 5ms，不需要 WASM。

## D7: 設定頁面

Obsidian SettingTab，項目：

| 設定 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| Embedding Provider | dropdown | （ai-providers 清單） | 從 ai-providers 取可用 provider |
| Default top results | number | 10 | 搜尋回傳筆數 |
| Hot days | number | 90 | 近 N 天建立算 hot |
| Search scope | toggle | hot only | 預設搜 hot 或全部 |
| Exclude patterns | text list | `_templates/`, `.trash/`, `.obsidian/` | 排除路徑 |
| Auto-index on change | toggle | true | 檔案變更時自動更新 index |

## D8: 專案結構

```
vault-search/
├── openspec/
├── src/
│   ├── main.ts              ← Plugin 入口、command 註冊、vault 事件監聽
│   ├── indexer.ts            ← 掃描 vault + embed + tier 計算 + 持久化
│   ├── searcher.ts           ← cosine similarity + SuggestModal
│   ├── settings.ts           ← SettingTab UI
│   └── types.ts              ← 共用型別定義
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── .gitignore
```

## D9: 安裝方式

1. **開發期**：`npm run dev` → 手動 symlink 或複製到 vault `.obsidian/plugins/vault-search/`
2. **發佈前**：BRAT plugin 安裝測試
3. **正式發佈**：提交 Obsidian community plugins

## 不做的項目

- Chat / RAG 功能
- 分詞（CKIP / jieba）
- Reranker
- Sidebar view（第一版只做 SuggestModal，未來可加）
- 筆記內容預覽 / excerpt（第一版只顯示 title + tags）
