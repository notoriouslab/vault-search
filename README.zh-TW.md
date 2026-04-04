<p align="center">
  <h1 align="center">Vault Search</h1>
  <p align="center">Obsidian 語意搜尋，使用本地 Embedding 模型</p>
</p>

<p align="center">
  <a href="https://github.com/notoriouslab/vault-search/releases"><img src="https://img.shields.io/github/v/release/notoriouslab/vault-search?style=flat-square" alt="Release"></a>
  <a href="https://github.com/notoriouslab/vault-search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/notoriouslab/vault-search?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Obsidian-Desktop-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Desktop">
  <img src="https://img.shields.io/badge/Ollama-本地AI-000?style=flat-square" alt="Ollama">
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

不需要雲端服務、不需要 API Key、不需要付費訂閱。筆記不離開你的電腦。

![搜尋面板](./docs/search-panel.png)

## 功能

- **語意搜尋** — 用模糊描述找到相關筆記，不只是關鍵字比對。描述越多，找到的文件越精準
- **側邊欄面板** — 搜尋結果固定在右側，點開筆記不會消失
- **快速搜尋彈窗** — Cmd/Ctrl+P 快速跳轉
- **尋找相似筆記** — 打開任一筆記，即時發現相關筆記（不需呼叫 API）
- **智慧索引** — 增量更新，只重新 embed 變更的筆記，檔案修改時自動觸發
- **Hot/Cold 分層** — 有連結、近期建立的筆記優先顯示；孤立筆記預設隱藏但可搜尋
- **Description 生成器** — 用本地 LLM 為筆記生成 frontmatter 描述，提升搜尋品質
- **同義詞擴展** — 自訂同義詞提升搜尋召回率
- **多格式 API** — 支援 Ollama 和 OpenAI-compatible（LM Studio、llama.cpp、vLLM 等）
- **雙語介面** — 繁體中文與英文，根據 Obsidian 語言設定自動切換

## 需求

- [Ollama](https://ollama.com/) 已安裝並執行中
- 已下載 embedding 模型（例如 `ollama pull qwen3-embedding:0.6b`）
- Obsidian 桌面版（不支援手機）

## 安裝

### BRAT（推薦）

1. 安裝 [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. 新增本 repo：`notoriouslab/vault-search`
3. 在 Community plugins 啟用「Vault Search」

### 手動安裝

1. 從 [Releases](https://github.com/notoriouslab/vault-search/releases) 下載 `main.js`、`manifest.json`、`styles.css`
2. 複製到 vault 的 `.obsidian/plugins/vault-search/`
3. 在 Settings → Community plugins 啟用

## 快速開始

1. **Settings → Vault Search** → 選擇 Embedding 模型
2. 按 **重建** 建立索引
3. **Cmd/Ctrl+P → 「Vault Search: 語意搜尋」** 或點左側 ribbon icon

## 設定

<details>
<summary><strong>搜尋與索引</strong></summary>

![設定 - 搜尋](./docs/settings-search.png)

| 設定 | 預設值 | 說明 |
|---|---|---|
| 伺服器網址 | `http://localhost:11434` | Ollama 或 OpenAI-compatible 伺服器 |
| API 格式 | Ollama | Ollama 或 OpenAI-compatible |
| Embedding 模型 | `qwen3-embedding:0.6b` | 用於生成向量的模型（從 Ollama 自動列出） |
| 顯示筆數 | 10 | 搜尋結果上限 |
| 最低分數 | 0.5 | 餘弦相似度門檻（0–1） |
| 最大 Embed 字數 | 2000 | 每篇筆記截取前 N 字做 embedding |
| Hot 天數 | 90 | 近 N 天建立的筆記視為 hot |
| 搜尋範圍 | 僅 Hot | 僅 Hot 或全部 |
| 排除路徑 | `_templates/` `.trash/` `.obsidian/` | 不索引的資料夾 |
| 同義詞 | — | 每行一組：`關鍵字 = 同義詞1, 同義詞2` |
| 自動更新索引 | 開啟 | 檔案修改時自動重新 embed |

![設定 - 同義詞](./docs/settings-synonyms.png)

</details>

<details>
<summary><strong>Description 生成器</strong></summary>

![設定 - Description](./docs/settings-description.png)

| 設定 | 預設值 | 說明 |
|---|---|---|
| LLM 模型 | `qwen3:1.7b` | 用於生成 description 的模型（從 Ollama 自動列出，過濾非 embedding 模型） |
| 最短 description 字數 | 30 | 低於此字數視為品質不足，將重新生成 |

</details>

## 指令

所有指令都以 **Vault Search:** 為前綴，在 Command Palette（Cmd/Ctrl+P）中輸入 `vault search` 即可找到。

![指令列表](./docs/commands.png)

| 指令 | 說明 |
|---|---|
| `Vault Search: Semantic search (modal)` | 快速搜尋彈窗，鍵盤導航 |
| `Vault Search: Open search panel` | 開啟右側固定搜尋面板 |
| `Vault Search: Find similar notes` | 尋找與目前筆記相似的筆記 |
| `Vault Search: Rebuild index` | 全部重新建立索引 |
| `Vault Search: Update index` | 只處理新增或修改的筆記 |
| `Vault Search: Generate descriptions (preview)` | LLM 生成描述，產出預覽報告 |
| `Vault Search: Apply descriptions` | 將預覽結果寫入 frontmatter |

## 運作原理

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  筆記     │────▶│  Ollama  │────▶│  向量索引     │
│  (.md)   │     │ Embed API│     │ (plugin data)│
└──────────┘     └──────────┘     └──────┬───────┘
                                         │
┌──────────┐     ┌──────────┐            │
│  查詢     │────▶│  Ollama  │──── 餘弦相似度
│          │     │ Embed API│            │
└──────────┘     └──────────┘     ┌──────▼───────┐
                                  │   搜尋結果    │
                                  │  （排序）     │
                                  └──────────────┘
```

1. **建立索引** — 筆記內容（title + tags + body 或 description）→ embedding 模型 → 向量存在本地
2. **搜尋** — 查詢 → 同一模型 → 餘弦相似度 → 排序顯示
3. **Hot/Cold** — 有連結或近期建立 = hot（預設搜尋）；孤立 = cold（`--all` 才搜）
4. **Description** — 本地 LLM 彙整筆記 → 存入 frontmatter → 優先用於 embedding，提升長文搜尋品質

## 推薦模型

| 模型 | 大小 | 用途 | 備註 |
|---|---|---|---|
| `qwen3-embedding:0.6b` | 639MB | Embedding | 中英文最佳平衡 |
| `nomic-embed-text` | 274MB | Embedding | 更輕量，英文為主 |
| `qwen3:1.7b` | 1.4GB | LLM | 品質好，支援 2000+ 字 input |
| `gemma3:1b` | 815MB | LLM | 更輕量，但 input 超過 500 字不穩定 |

> 8GB RAM 的機器建議使用 `qwen3-embedding:0.6b` + `qwen3:1.7b` 的組合。

## 開發

```bash
git clone https://github.com/notoriouslab/vault-search.git
cd vault-search
npm install
npm run dev    # watch mode
npm run build  # production build
```

## 授權

[MIT](./LICENSE)
