<p align="center">
  <h1 align="center">Vault Search</h1>
  <p align="center">Obsidian 本地語意搜尋與發掘 — 簡單、隱私、中文友善</p>
</p>

<p align="center">
  <a href="https://github.com/notoriouslab/vault-search/releases"><img src="https://img.shields.io/github/v/release/notoriouslab/vault-search?style=flat-square" alt="Release"></a>
  <a href="https://github.com/notoriouslab/vault-search/releases"><img src="https://img.shields.io/github/downloads/notoriouslab/vault-search/total?style=flat-square&color=573E7A" alt="Downloads"></a>
  <a href="https://github.com/notoriouslab/vault-search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/notoriouslab/vault-search?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Obsidian-Desktop-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Desktop">
  <img src="https://img.shields.io/badge/Ollama-本地AI-000?style=flat-square" alt="Ollama">
  <a href="https://github.com/TfTHacker/obsidian42-brat"><img src="https://img.shields.io/badge/BRAT-可用-blue?style=flat-square" alt="BRAT"></a>
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

---

> *Vault Search 幫你**語意搜尋**，也幫你**重新發掘被遺忘的筆記**。*

不需要雲端服務、不需要 API Key、不需要付費訂閱。筆記不離開你的電腦。

![搜尋面板](./docs/search-panel.png)

## 為什麼選擇 Vault Search？

[Andrej Karpathy 分享了](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an/)他用 LLM 維護知識庫的願景 — 讓 AI「編譯」你的筆記成結構化 wiki。這是個很吸引人的做法，但前提是你願意把編輯權完全交給 LLM。

**Vault Search 則認為：** AI 應該幫你*看見*，而不是替你思考。最好的工具不是取代你的寫作，而是幫你**重新發現**你已經知道的東西，並浮出你遺漏的連結。

### 核心優勢

**發掘，而非整理** — 其他工具忙著幫你建 AI wiki 或自動摘要。Vault Search 找的是你*該去看*的筆記。「發掘」分頁會顯示你還沒連結過的相關筆記 — 特別是躲在 vault 裡的 Cold（孤立）筆記。

**Hot/Cold 智慧分層** — 有連結或近期活躍的筆記是 Hot。孤立的筆記是 Cold。「發掘」會浮出語意上與你目前思路相關的 Cold 筆記 — 你的盲區變得可見。

**MOC 生成** — 一鍵把搜尋或發掘結果匯出成 Map of Content 筆記，帶有 wikilink 和內容預覽。你來決定結構；AI 只負責蒐集素材。

**完全本地，真正隱私** — 所有 embedding、索引、搜尋、發掘都在你的電腦上完成。沒有資料離開你的機器。這不是一個開關選項，而是架構本身。

**極簡且高效** — 側邊欄有「搜尋」和「發掘」兩個分頁。Cmd/Ctrl+P 快速搜尋。右鍵結果可用 Obsidian 原生選單（加書籤等）。直接拖拉結果到 Canvas 做視覺化。

**專為中文優化** — 官方推薦 `qwen3-embedding:0.6b`，對繁體中文與英文的語意理解表現優秀。結合同義詞擴展，即使你用不同詞彙描述相同概念，也能找到想要的筆記。

**LLM 自動生成描述** — 用本地 LLM 為筆記產生 description frontmatter，讓 embedding 不再只看原始內容，而是包含高品質摘要。搜尋和發掘的相關性都會明顯更好。

**輕量，8GB 就能跑** — 設計極簡，記憶體與 CPU 佔用低。推薦模型在 MacBook M2 8GB 筆電上就可以使用。增量索引 + debounce 機制，日常使用幾乎感覺不到負擔。

**高度彈性** — 除了 Ollama，也支援 LM Studio、llama.cpp、vLLM 等 OpenAI-compatible 伺服器。自由選擇最適合你的模型。

> *「AI 幫你看見。你來決定它的意義。」*

## 功能

### 搜尋
- **語意搜尋** — 用模糊描述找到相關筆記，不只是關鍵字比對
- **側邊欄面板** — 搜尋和發掘兩個分頁，結果固定不消失
- **快速搜尋彈窗** — Cmd/Ctrl+P 快速跳轉
- **尋找相似筆記** — 打開任一筆記，即時發現相關筆記（不需呼叫 API）
- **智慧索引** — 增量更新，只重新 embed 變更的筆記
- **Hot/Cold 分層** — Hot = 有連結/近期，Cold = 孤立/遺忘
- **Chunking** — 可選的長文分段搜尋

### 發掘 (v0.3.0)
- **自動發掘** — 打開筆記時，側邊欄自動顯示相關筆記，Cold 筆記特別標示
- **全域發掘** — 找出與你整體 Hot 筆記最相關的 Cold 筆記
- **MOC 生成** — 搜尋或發掘結果一鍵匯出為 Map of Content 筆記
- **Cold 搜尋範圍** — 專用的「僅 Cold」搜尋模式，刻意挖掘
- **分層標記** — 視覺標記區分 Hot 和 Cold 結果
- **Canvas 整合** — 拖拉結果到 Canvas 做視覺化排列
- **右鍵選單** — 結果上右鍵可用 Obsidian 原生選單（加書籤等）

### Description 生成
- **LLM 描述** — 本地 LLM 生成 frontmatter 描述
- **同義詞擴展** — 自訂同義詞提升搜尋召回率
- **雙語介面** — 繁體中文與英文，自動偵測切換

## 需求

- [Ollama](https://ollama.com/) 已安裝並執行中
- 已下載 embedding 模型（例如 `ollama pull qwen3-embedding:0.6b`）
- 已下載 LLM 分析模型（例如 `ollama pull qwen3:1.7b`）（Description 生成選項）
- Obsidian 桌面版

## 安裝

### BRAT（社群審核中，推薦此方式安裝）

1. 安裝 [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. 新增本 repo：`notoriouslab/vault-search`
3. 在 Community plugins 啟用「Vault Search」

### 手動安裝

1. 從 [Releases](https://github.com/notoriouslab/vault-search/releases) 下載 `main.js`、`manifest.json`、`styles.css`
2. 複製到 vault 的 `.obsidian/plugins/vault-search/`
3. 在 Settings → Community plugins 啟用

> **提醒：** 如果 vault 使用 Git 管理，建議在 `.gitignore` 加入 `.obsidian/plugins/*/data.json`，避免意外提交 API key 或個人設定。

## 快速開始

1. **Settings → Vault Search** → 選擇 Embedding 模型
2. 按 **重建** 建立索引
3. **Cmd/Ctrl+P → 「語意搜尋」** 或點左側羅盤 icon
4. 切到**發掘**分頁，看看跟目前筆記相關的 Cold 筆記

### 推薦工作流

```
1. 生成 Description  →  2. 重建索引  →  3. 搜尋與發掘
   （LLM 彙整摘要）      （用 description embed）   （找到並重新發現）
```

**為什麼順序重要？** Indexer 會優先使用 frontmatter `description` 來做 embedding。先生成 description 再建索引，搜尋和發掘的品質都更好。

- **最簡模式**：跳過步驟 1，直接 Rebuild + 搜尋。
- **最佳品質**：先跑「生成 description（預覽）」→ 看報告 → 「套用 description」→ 再「重建索引」。

### 發掘工作流

發掘分頁有兩個模式：

- **當前筆記** — 顯示跟你正在讀的筆記相關的所有筆記。Cold 筆記會特別標示 — 這些是你的盲區。
- **全域** — 顯示跟你整個 Hot 池最相關的 Cold 筆記。大量匯入舊文章後，用這個找出被遺忘的好東西。

按「生成 MOC」可以把結果匯出成帶連結的筆記。

## 設定

<details>
<summary><strong>搜尋與索引</strong></summary>

| 設定 | 預設值 | 說明 |
|---|---|---|
| 伺服器網址 | `http://localhost:11434` | Ollama 或 OpenAI-compatible 伺服器 |
| API 格式 | Ollama | Ollama 或 OpenAI-compatible |
| API Key | — | 選填，用於需要認證的伺服器 |
| Embedding 模型 | `qwen3-embedding:0.6b` | 用於生成向量的模型 |
| 顯示筆數 | 10 | 搜尋和發掘結果上限 |
| 最低分數 | 0.5 | 相似度門檻（0–1）。越低結果越多 |
| 最大 Embed 字數 | 2000 | 每篇截取前 N 字。有 description 的優先用 description |
| Hot 天數 | 90 | 近 N 天建立的筆記視為 Hot |
| 搜尋範圍 | 僅 Hot | Hot / 全部 / Cold |
| Chunking 模式 | 關閉 | 關閉 / 智慧 / 全部 |
| Chunk 大小 | 1000 | 每個 chunk 的字數 |
| Chunk 重疊 | 200 | 相鄰 chunk 重疊的字數 |
| 排除路徑 | `_templates/` `.trash/` `3_wiki/` | 不索引也不發掘的資料夾 |
| 同義詞 | — | 每行一組：`關鍵字 = 同義詞1, 同義詞2` |
| 自動更新索引 | 開啟 | 檔案修改時自動重新 embed，保持發掘即時 |

</details>

<details>
<summary><strong>Description 生成器</strong></summary>

| 設定 | 預設值 | 說明 |
|---|---|---|
| LLM 模型 | `qwen3:1.7b` | 推薦：快速、品質好 |
| 最短 description 字數 | 30 | 低於此字數重新生成。好的 description 提升搜尋和發掘準確度 |

</details>

## 指令

所有指令都以 **Vault Search:** 為前綴，在 Command Palette（Cmd/Ctrl+P）中輸入即可。

| 指令 | 說明 |
|---|---|
| 語意搜尋（彈窗） | 快速搜尋，鍵盤導航 |
| 開啟搜尋面板 | 側邊欄，搜尋與發掘分頁 |
| 尋找相似筆記 | 目前筆記的相關筆記 |
| 發掘相關的 Cold 筆記 | 全域發掘 — 找出隱藏的好東西 |
| 重建索引 | 全部重新建立索引 |
| 更新索引 | 只處理新增或修改的筆記 |
| 生成 description（預覽） | LLM 生成描述，產出預覽報告 |
| 套用 description | 將預覽結果寫入 frontmatter |

## 運作原理

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  筆記     │────▶│  Ollama  │────▶│  向量索引     │
│  (.md)   │     │ Embed API│     │ (index.json) │
└──────────┘     └──────────┘     └──────┬───────┘
                                         │
┌──────────┐     ┌──────────┐            │
│  查詢     │────▶│  Ollama  │──── 餘弦相似度
│          │     │ Embed API│            │
└──────────┘     └──────────┘     ┌──────▼───────┐
                                  │   搜尋結果    │
                                  │  （排序）     │
                                  └──────┬───────┘
                                         │
                            ┌────────────▼────────────┐
                            │   發掘（不需 Ollama）     │
                            │   純向量運算，用已有的     │
                            │   embedding 找 Cold 筆記  │
                            └─────────────────────────┘
```

1. **建立索引** — 筆記內容（或 description）→ embedding 模型 → 向量存在 `index.json`
2. **搜尋** — 查詢（+ 同義詞擴展）→ 同一模型 → 餘弦相似度 → 排序顯示
3. **發掘** — 不呼叫 API。用已有的 embedding 向量比對，浮出相關的 Cold 筆記
4. **Hot/Cold** — 有連結/近期 = Hot。孤立 = Cold。發掘專門照亮你的盲區
5. **MOC** — 匯出結果為 Map of Content 筆記，帶 wikilink 和內容預覽
6. **Description** — 本地 LLM 彙整筆記 → 存入 frontmatter → 用於更好的 embedding

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
