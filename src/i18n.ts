export interface Locale {
    // Settings
    ollamaUrl: string;
    ollamaUrlDesc: string;
    apiFormat: string;
    apiFormatDesc: string;
    apiFormatOllama: string;
    apiFormatOpenAI: string;
    embeddingModel: string;
    embeddingModelDesc: string;
    topResults: string;
    topResultsDesc: string;
    minScore: string;
    minScoreDesc: string;
    maxEmbedChars: string;
    maxEmbedCharsDesc: string;
    hotDays: string;
    hotDaysDesc: string;
    searchScope: string;
    searchScopeDesc: string;
    scopeHot: string;
    scopeAll: string;
    excludePatterns: string;
    excludePatternsDesc: string;
    autoIndex: string;
    autoIndexDesc: string;
    synonymsLabel: string;
    synonymsDesc: string;
    chunkingMode: string;
    chunkingModeDesc: string;
    chunkingOff: string;
    chunkingSmart: string;
    chunkingAll: string;
    chunkSize: string;
    chunkSizeDesc: string;
    chunkOverlap: string;
    chunkOverlapDesc: string;
    llmModel: string;
    llmModelDesc: string;
    minDescLength: string;
    minDescLengthDesc: string;
    actions: string;
    rebuildIndex: string;
    rebuildIndexDesc: string;
    rebuildBtn: string;
    indexingBtn: string;
    updateIndex: string;
    updateIndexDesc: string;
    updateBtn: string;
    updatingBtn: string;
    indexStats: string;
    totalNotes: string;
    hot: string;
    cold: string;
    model: string;
    dimensions: string;
    lastIndexed: string;
    // Search
    searchPlaceholder: string;
    searchResults: (n: number) => string;
    indexEmpty: string;
    searchFailed: string;
    searching: string;
    // Commands
    cmdSemanticSearch: string;
    cmdOpenPanel: string;
    cmdFindSimilar: string;
    cmdRebuild: string;
    cmdUpdate: string;
    cmdDescPreview: string;
    cmdDescApply: string;
    ollamaNotReady: string;
    noSimilar: string;
    notIndexed: string;
    similarTo: (title: string) => string;
    descPreviewDone: (total: number, gen: number, rewrite: number, skeleton: number, skip: number) => string;
    descApplyDone: (n: number) => string;
    descNoReport: string;
    descGenerating: (done: number, total: number) => string;
    // Settings sections
    sectionSearch: string;
    sectionDesc: string;
    descStats: string;
    descGood: string;
    descShort: string;
    descMissing: string;
    descNoFm: string;
    previewBtn: string;
    previewingBtn: string;
    applyBtn: string;
    applyingBtn: string;
    // Notices
    noticeIndexEmpty: string;
    noticeIndexing: (done: number, total: number) => string;
    noticeIndexDone: (total: number, hot: number, cold: number, failed: number) => string;
    noticeUpToDate: string;
    noticeUpdated: (updated: number, total: number, hot: number) => string;
}

const en: Locale = {
    ollamaUrl: "Server URL",
    ollamaUrlDesc: "Embedding server address",
    apiFormat: "API format",
    apiFormatDesc: "Ollama for Ollama; OpenAI-compatible for llama.cpp, LM Studio, MLX, vLLM, OpenAI, etc.",
    apiFormatOllama: "Ollama",
    apiFormatOpenAI: "OpenAI-compatible",
    embeddingModel: "Embedding model",
    embeddingModelDesc: "Model name (e.g. qwen3-embedding:0.6b, nomic-embed-text, text-embedding-3-small)",
    topResults: "Top results",
    topResultsDesc: "Number of results to show in search",
    minScore: "Minimum score",
    minScoreDesc: "Hide results below this cosine similarity threshold (0.0 – 1.0)",
    maxEmbedChars: "Max embed characters",
    maxEmbedCharsDesc: "Truncate note content for embedding (rebuild index after changing)",
    hotDays: "Hot days",
    hotDaysDesc: "Notes created within this many days are considered 'hot'",
    searchScope: "Default search scope",
    searchScopeDesc: "Search only 'hot' notes (linked/recent) or all notes",
    scopeHot: "Hot only",
    scopeAll: "All notes",
    excludePatterns: "Exclude patterns",
    excludePatternsDesc: "Folder prefixes to exclude from indexing (one per line)",
    autoIndex: "Auto-index on change",
    autoIndexDesc: "Automatically re-embed notes when they are modified",
    chunkingMode: "Chunking mode",
    chunkingModeDesc: "Split long notes into overlapping chunks for better search on long documents",
    chunkingOff: "Off",
    chunkingSmart: "Smart (skip notes with description)",
    chunkingAll: "All notes",
    chunkSize: "Chunk size",
    chunkSizeDesc: "Characters per chunk (rebuild index after changing)",
    chunkOverlap: "Chunk overlap",
    chunkOverlapDesc: "Overlapping characters between chunks",
    synonymsLabel: "Synonyms",
    synonymsDesc: "One per line: keyword = synonym1, synonym2",
    llmModel: "LLM model",
    llmModelDesc: "Ollama model for generating descriptions (e.g. gemma4-e4b-q3)",
    minDescLength: "Min description length",
    minDescLengthDesc: "Descriptions shorter than this are considered low quality and will be rewritten",
    actions: "Actions",
    rebuildIndex: "Rebuild index",
    rebuildIndexDesc: "Re-embed all notes from scratch",
    rebuildBtn: "Rebuild",
    indexingBtn: "Indexing...",
    updateIndex: "Update index",
    updateIndexDesc: "Only re-embed new or modified notes",
    updateBtn: "Update",
    updatingBtn: "Updating...",
    indexStats: "Index stats",
    totalNotes: "Total notes",
    hot: "Hot",
    cold: "Cold",
    model: "Model",
    dimensions: "Dimensions",
    lastIndexed: "Last indexed",
    searchPlaceholder: "Semantic search...",
    searchResults: (n) => `${n} results`,
    indexEmpty: "Index is empty. Run 'Rebuild index' first.",
    searchFailed: "Search failed",
    searching: "Searching...",
    cmdSemanticSearch: "Semantic search (modal)",
    cmdOpenPanel: "Open search panel",
    cmdFindSimilar: "Find similar notes",
    cmdRebuild: "Rebuild index",
    cmdUpdate: "Update index",
    cmdDescPreview: "Generate descriptions (preview)",
    cmdDescApply: "Apply descriptions",
    ollamaNotReady: "Cannot connect to Ollama. Please ensure Ollama is running.",
    noSimilar: "No similar notes found",
    notIndexed: "This note is not indexed",
    similarTo: (title) => `Similar to: ${title}`,
    descPreviewDone: (total, gen, rewrite, skeleton, skip) =>
        `Preview complete: ${total} notes scanned — ${gen} new, ${rewrite} rewrite, ${skeleton} skeleton, ${skip} skipped`,
    descApplyDone: (n) => `Applied descriptions to ${n} notes`,
    descNoReport: "No preview report found. Run 'Generate descriptions (preview)' first.",
    descGenerating: (done, total) => `Generating descriptions: ${done}/${total}...`,
    sectionSearch: "Search & Index",
    sectionDesc: "Description Generator",
    descStats: "Description stats",
    descGood: "Good",
    descShort: "Too short",
    descMissing: "Missing",
    descNoFm: "No frontmatter",
    previewBtn: "Preview",
    previewingBtn: "Generating...",
    applyBtn: "Apply",
    applyingBtn: "Applying...",
    noticeIndexEmpty: "Vault Search: Index is empty. Run 'Rebuild index' first",
    noticeIndexing: (done, total) => `Vault Search: Indexing ${done}/${total}...`,
    noticeIndexDone: (total, hot, cold, failed) => {
        const f = failed > 0 ? `, ${failed} failed` : "";
        return `Vault Search: Done — ${total} notes (${hot} hot, ${cold} cold${f})`;
    },
    noticeUpToDate: "Vault Search: Index up to date",
    noticeUpdated: (updated, total, hot) =>
        `Vault Search: Updated ${updated} notes (total: ${total}, hot: ${hot})`,
};

const zhTW: Locale = {
    ollamaUrl: "伺服器網址",
    ollamaUrlDesc: "Embedding 伺服器位址",
    apiFormat: "API 格式",
    apiFormatDesc: "Ollama 用於 Ollama；OpenAI-compatible 用於 llama.cpp、LM Studio、MLX、vLLM、OpenAI 等",
    apiFormatOllama: "Ollama",
    apiFormatOpenAI: "OpenAI-compatible",
    embeddingModel: "Embedding 模型",
    embeddingModelDesc: "模型名稱（例如 qwen3-embedding:0.6b、nomic-embed-text、text-embedding-3-small）",
    topResults: "顯示筆數",
    topResultsDesc: "搜尋結果最多顯示幾筆",
    minScore: "最低分數",
    minScoreDesc: "低於此門檻的結果不顯示（0.0 – 1.0）",
    maxEmbedChars: "最大 Embed 字數",
    maxEmbedCharsDesc: "每篇筆記取前幾個字做 embedding（修改後需重建索引）",
    hotDays: "Hot 天數",
    hotDaysDesc: "近幾天內建立的筆記視為 hot",
    searchScope: "預設搜尋範圍",
    searchScopeDesc: "只搜 hot 筆記（有連結/近期）或搜全部",
    scopeHot: "僅 Hot",
    scopeAll: "全部",
    excludePatterns: "排除路徑",
    excludePatternsDesc: "不索引的資料夾前綴（每行一個）",
    autoIndex: "自動更新索引",
    autoIndexDesc: "筆記修改時自動重新 embed",
    chunkingMode: "Chunking 模式",
    chunkingModeDesc: "將長文切成重疊片段，提升長文搜尋品質",
    chunkingOff: "關閉",
    chunkingSmart: "智慧（有 description 的跳過）",
    chunkingAll: "全部筆記",
    chunkSize: "Chunk 大小",
    chunkSizeDesc: "每個 chunk 的字數（修改後需重建索引）",
    chunkOverlap: "Chunk 重疊",
    chunkOverlapDesc: "相鄰 chunk 重疊的字數",
    synonymsLabel: "同義詞",
    synonymsDesc: "每行一組：關鍵字 = 同義詞1, 同義詞2",
    llmModel: "LLM 模型",
    llmModelDesc: "用於生成 description 的 Ollama 模型（例如 gemma4-e4b-q3）",
    minDescLength: "最短 description 字數",
    minDescLengthDesc: "低於此字數的 description 視為品質不足，將重新生成",
    actions: "操作",
    rebuildIndex: "重建索引",
    rebuildIndexDesc: "全部重新 embed",
    rebuildBtn: "重建",
    indexingBtn: "建立中...",
    updateIndex: "更新索引",
    updateIndexDesc: "只 embed 新增或修改的筆記",
    updateBtn: "更新",
    updatingBtn: "更新中...",
    indexStats: "索引統計",
    totalNotes: "筆記總數",
    hot: "Hot",
    cold: "Cold",
    model: "模型",
    dimensions: "向量維度",
    lastIndexed: "上次索引",
    searchPlaceholder: "語意搜尋...",
    searchResults: (n) => `${n} 筆結果`,
    indexEmpty: "索引為空，請先執行「重建索引」",
    searchFailed: "搜尋失敗",
    searching: "搜尋中...",
    cmdSemanticSearch: "語意搜尋（彈窗）",
    cmdOpenPanel: "開啟搜尋面板",
    cmdFindSimilar: "尋找相似筆記",
    cmdRebuild: "重建索引",
    cmdUpdate: "更新索引",
    cmdDescPreview: "生成 description（預覽）",
    cmdDescApply: "套用 description",
    ollamaNotReady: "無法連線 Ollama，請確認 Ollama 已啟動",
    noSimilar: "找不到相似筆記",
    notIndexed: "此筆記尚未索引",
    similarTo: (title) => `與「${title}」相似`,
    descPreviewDone: (total, gen, rewrite, skeleton, skip) =>
        `預覽完成：掃描 ${total} 篇 — ${gen} 篇新增、${rewrite} 篇重寫、${skeleton} 篇建骨架、${skip} 篇跳過`,
    descApplyDone: (n) => `已套用 ${n} 篇 description`,
    descNoReport: "找不到預覽報告，請先執行「生成 description（預覽）」",
    descGenerating: (done, total) => `生成 description：${done}/${total}...`,
    sectionSearch: "搜尋與索引",
    sectionDesc: "Description 生成器",
    descStats: "Description 統計",
    descGood: "完整",
    descShort: "過短",
    descMissing: "缺少",
    descNoFm: "無 frontmatter",
    previewBtn: "預覽",
    previewingBtn: "生成中...",
    applyBtn: "套用",
    applyingBtn: "套用中...",
    noticeIndexEmpty: "Vault Search：索引為空，請先執行「重建索引」",
    noticeIndexing: (done, total) => `Vault Search：索引中 ${done}/${total}...`,
    noticeIndexDone: (total, hot, cold, failed) => {
        const f = failed > 0 ? `，${failed} 篇失敗` : "";
        return `Vault Search：完成 — ${total} 篇（${hot} hot、${cold} cold${f}）`;
    },
    noticeUpToDate: "Vault Search：索引已是最新",
    noticeUpdated: (updated, total, hot) =>
        `Vault Search：已更新 ${updated} 篇（共 ${total} 篇，${hot} hot）`,
};

const locales: Record<string, Locale> = { en, "zh-TW": zhTW };

export function getLocale(): Locale {
    // Obsidian stores language in localStorage
    const lang = localStorage.getItem("language") || "en";
    if (lang.startsWith("zh")) return zhTW;
    return locales[lang] ?? en;
}

export const t = getLocale();
