// ============================================================
// vault-search types
// ============================================================

export type ApiFormat = "ollama" | "openai";
export type ChunkingMode = "off" | "smart" | "all";

export interface VaultSearchSettings {
    ollamaUrl: string;
    ollamaModel: string;
    apiFormat: ApiFormat;
    apiKey: string;
    topResults: number;
    minScore: number;
    maxEmbedChars: number;
    hotDays: number;
    searchScope: "hot" | "all";
    excludePatterns: string[];
    autoIndex: boolean;
    synonyms: Record<string, string[]>;
    llmModel: string;
    minDescLength: number;
    chunkingMode: ChunkingMode;
    chunkSize: number;
    chunkOverlap: number;
}

export const DEFAULT_SETTINGS: VaultSearchSettings = {
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "qwen3-embedding:0.6b",
    apiFormat: "ollama" as ApiFormat,
    apiKey: "",
    topResults: 10,
    minScore: 0.5,
    maxEmbedChars: 2000,
    hotDays: 90,
    searchScope: "hot",
    excludePatterns: ["_templates/", "templates/", ".trash/", ".obsidian/", "_description_report.md"],
    autoIndex: true,
    synonyms: {},
    llmModel: "qwen3:1.7b",
    minDescLength: 30,
    chunkingMode: "off" as ChunkingMode,
    chunkSize: 1000,
    chunkOverlap: 200,
};

export interface NoteEntry {
    title: string;
    tags: string[];
    tier: "hot" | "cold";
    mtime: number;
    embedding: number[];
    chunks?: number[][];
}

export interface IndexMeta {
    model: string;
    dim: number;
    indexedAt: string;
    count: number;
}

export interface VaultSearchIndex {
    meta: IndexMeta;
    notes: Record<string, NoteEntry>;
}

export interface VaultSearchData {
    settings: VaultSearchSettings;
    index: VaultSearchIndex | null;
}

export interface SearchResult {
    path: string;
    title: string;
    tags: string[];
    score: number;
    tier: "hot" | "cold";
}
