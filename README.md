<p align="center">
  <h1 align="center">Vault Search</h1>
  <p align="center">Semantic search for Obsidian, powered by local embeddings</p>
</p>

<p align="center">
  <a href="https://github.com/notoriouslab/vault-search/releases"><img src="https://img.shields.io/github/v/release/notoriouslab/vault-search?style=flat-square" alt="Release"></a>
  <a href="https://github.com/notoriouslab/vault-search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/notoriouslab/vault-search?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Obsidian-Desktop-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Desktop">
  <img src="https://img.shields.io/badge/Ollama-Local_AI-000?style=flat-square" alt="Ollama">
</p>

<p align="center">
  <a href="./README.zh-TW.md">繁體中文</a>
</p>

---

No cloud services. No API keys. No subscription fees. Your notes never leave your machine.

![Search Panel](./docs/search-panel.png)

## Features

- **Semantic Search** — Find notes by meaning, not just keywords
- **Sidebar Panel** — Persistent results in the right sidebar
- **Quick Modal** — Cmd/Ctrl+P for fast note jumping
- **Find Similar** — Discover related notes instantly (zero API calls)
- **Smart Indexing** — Incremental updates, auto-indexes on file changes
- **Hot/Cold Tiers** — Prioritize linked and recent notes
- **Description Generator** — Local LLM generates frontmatter descriptions for better search quality
- **Synonym Expansion** — Define synonyms to improve recall
- **Multi-format API** — Ollama + OpenAI-compatible (LM Studio, llama.cpp, vLLM)
- **Bilingual UI** — English & Traditional Chinese

## Requirements

- [Ollama](https://ollama.com/) installed and running
- An embedding model (e.g., `ollama pull qwen3-embedding:0.6b`)
- Obsidian desktop (not mobile)

## Installation

### BRAT (recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repository: `notoriouslab/vault-search`
3. Enable "Vault Search" in Community plugins

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/notoriouslab/vault-search/releases)
2. Copy to `.obsidian/plugins/vault-search/` in your vault
3. Enable in Settings → Community plugins

## Quick Start

1. **Settings → Vault Search** → Select your embedding model
2. Click **Rebuild** to index your vault
3. **Cmd/Ctrl+P → "Semantic search"** or click the ribbon icon

## Settings

<details>
<summary><strong>Search & Index</strong></summary>

![Settings - Search](./docs/settings-search.png)

| Setting | Default | Description |
|---|---|---|
| Server URL | `http://localhost:11434` | Ollama or OpenAI-compatible server |
| API format | Ollama | Ollama or OpenAI-compatible |
| Embedding model | `qwen3-embedding:0.6b` | Model for vector embeddings |
| Top results | 10 | Max results shown |
| Min score | 0.5 | Cosine similarity threshold (0–1) |
| Max embed chars | 2000 | Content truncation for embedding |
| Hot days | 90 | Recent notes threshold |
| Search scope | Hot only | Hot only or all notes |
| Exclude patterns | `_templates/` `.trash/` `.obsidian/` | Folders to skip |
| Synonyms | — | `keyword = syn1, syn2` per line |
| Auto-index | On | Re-embed on file change |

</details>

<details>
<summary><strong>Description Generator</strong></summary>

![Settings - Description](./docs/settings-description.png)

| Setting | Default | Description |
|---|---|---|
| LLM model | `qwen3:1.7b` | Model for generating descriptions |
| Min description length | 30 | Shorter descriptions get rewritten |

</details>

## Commands

All commands are prefixed with **Vault Search:** in the Command Palette (Cmd/Ctrl+P).

![Commands](./docs/commands.png)

| Command | Description |
|---|---|
| `Vault Search: Semantic search (modal)` | Quick search with keyboard navigation |
| `Vault Search: Open search panel` | Sidebar with persistent results |
| `Vault Search: Find similar notes` | Related notes for current file |
| `Vault Search: Rebuild index` | Full re-index |
| `Vault Search: Update index` | Incremental update |
| `Vault Search: Generate descriptions (preview)` | LLM generates descriptions → report |
| `Vault Search: Apply descriptions` | Write previewed descriptions to frontmatter |

## How It Works

```
┌─────────────┐     ┌──────────┐     ┌──────────────┐
│  Your Notes │────▶│  Ollama  │────▶│ Vector Index │
│  (.md)      │     │ Embed API│     │ (plugin data)│
└─────────────┘     └──────────┘     └──────┬───────┘
                                            │
┌─────────────┐     ┌──────────┐            │
│  Your Query │────▶│  Ollama  │──── cosine similarity
│             │     │ Embed API│            │
└─────────────┘     └──────────┘     ┌──────▼───────┐
                                     │   Results    │
                                     │ (ranked)     │
                                     └──────────────┘
```

1. **Index** — Note content → embedding model → vector stored locally
2. **Search** — Query → same model → cosine similarity → ranked results
3. **Hot/Cold** — Linked/recent = hot (default). Orphan = cold (opt-in)
4. **Descriptions** — Local LLM summarizes notes → stored in frontmatter → used for embedding

## Recommended Models

| Model | Size | Use | Notes |
|---|---|---|---|
| `qwen3-embedding:0.6b` | 639MB | Embedding | Best for Chinese + English |
| `nomic-embed-text` | 274MB | Embedding | Lighter, English-focused |
| `qwen3:1.7b` | 1.4GB | LLM | Good quality, 2000+ chars input |
| `gemma3:1b` | 815MB | LLM | Lighter, but unstable > 500 chars |

## Development

```bash
git clone https://github.com/notoriouslab/vault-search.git
cd vault-search
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

[MIT](./LICENSE)
