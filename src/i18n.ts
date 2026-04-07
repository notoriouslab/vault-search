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
    descAllGood: string;
    descNoEntries: string;
    descApplying: (done: number, total: number) => string;
    chunkingProgress: (done: number, total: number) => string;
    apiKeyLabel: string;
    apiKeyDesc: string;
    urlPlaceholder: string;
    apiKeyPlaceholder: string;
    remoteWarning: string;
    selectModel: string;
    // Discover
    tabSearch: string;
    tabDiscover: string;
    discoverCurrentNote: string;
    discoverGlobal: string;
    discoverRelatedTo: (title: string) => string;
    discoverEmpty: string;
    discoverGlobalEmpty: string;
    discoverNoIndex: string;
    discoverComputing: string;
    discoverGlobalDesc: string;
    discoverProgress: (done: number, total: number) => string;
    generateMoc: string;
    mocCreated: (path: string) => string;
    mocNoResults: string;
    cmdGlobalDiscover: string;
    scopeCold: string;
    // Settings sections
    sectionSearch: string;
    sectionDesc: string;
    descStats: string;
    descGood: string;
    descShort: string;
    descMissing: string;
    descNoFm: string;
    descPreviewDesc: string;
    descApplyDesc: string;
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
    noticeIndexCorrupt: string;
    instructNav: string;
    instructOpen: string;
    instructDismiss: string;
    llmPrompt: (title: string, content: string) => string;
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
    topResultsDesc: "Max results to show in search and Discover",
    minScore: "Minimum score",
    minScoreDesc: "Hide results below this similarity threshold (0.0 – 1.0). Lower = more results, higher = stricter match.",
    maxEmbedChars: "Max embed characters",
    maxEmbedCharsDesc: "Truncate note content for embedding. Notes with a description use the description instead. Rebuild index after changing.",
    hotDays: "Hot days",
    hotDaysDesc: "Notes created within this many days are considered Hot (active). Hot notes have links or were recently created; Cold notes are isolated and surfaced by Discover.",
    searchScope: "Default search scope",
    searchScopeDesc: "Hot = linked or recent notes. Cold = isolated notes (great for rediscovery). All = everything.",
    scopeHot: "Hot only",
    scopeAll: "All notes",
    excludePatterns: "Exclude patterns",
    excludePatternsDesc: "Folder prefixes to exclude from indexing and Discover (one per line, e.g. 3_wiki/)",
    autoIndex: "Auto-index on change",
    autoIndexDesc: "Automatically re-embed notes when modified. Keeps Discover results fresh.",
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
    llmModelDesc: "Ollama model for generating descriptions. Recommended: qwen3:1.7b (fast, good quality).",
    minDescLength: "Min description length",
    minDescLengthDesc: "Descriptions shorter than this are rewritten. Good descriptions improve both search accuracy and Discover results.",
    actions: "Actions",
    rebuildIndex: "Rebuild index",
    rebuildIndexDesc: "Re-embed all notes from scratch. Required after adding many new files or changing embedding model.",
    rebuildBtn: "Rebuild",
    indexingBtn: "Indexing...",
    updateIndex: "Update index",
    updateIndexDesc: "Only re-embed new or modified notes. Faster than full rebuild.",
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
    descAllGood: "All notes already have good descriptions",
    descNoEntries: "No entries to apply",
    descApplying: (done, total) => `Applying: ${done}/${total}...`,
    chunkingProgress: (done, total) => `Chunking: ${done}/${total}...`,
    apiKeyLabel: "API key",
    apiKeyDesc: "Optional — for servers that require authentication",
    urlPlaceholder: "http://localhost:11434",
    apiKeyPlaceholder: "sk-...",
    remoteWarning: "\u26a0 Remote server — note content will be sent outside your machine",
    selectModel: "Select a model",
    tabSearch: "Search",
    tabDiscover: "Discover",
    discoverCurrentNote: "Current note",
    discoverGlobal: "Global",
    discoverRelatedTo: (title) => `Related to: ${title}`,
    discoverEmpty: "No related notes found",
    discoverGlobalEmpty: "No Cold notes found. Cold notes are isolated (no links, not recent) — they appear when you add unlinked files to your vault.",
    discoverNoIndex: "Build index first",
    discoverComputing: "Computing...",
    discoverGlobalDesc: "Notes most related to your active thinking but not yet explored",
    discoverProgress: (done, total) => `Computing: ${done}/${total}...`,
    generateMoc: "Generate MOC",
    mocCreated: (path) => `MOC created: ${path}`,
    mocNoResults: "No results to generate MOC from",
    cmdGlobalDiscover: "Discover related Cold notes",
    scopeCold: "Cold only",
    sectionSearch: "Search & index",
    sectionDesc: "Description generator",
    descStats: "Description stats",
    descGood: "Good",
    descShort: "Too short",
    descMissing: "Missing",
    descNoFm: "No frontmatter",
    descPreviewDesc: "Scan all notes and generate descriptions for those missing or too short. Creates a preview report.",
    descApplyDesc: "Write previewed descriptions into note frontmatter.",
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
    noticeIndexCorrupt: "Vault Search: Index file is corrupted. Please rebuild index.",
    instructNav: "navigate",
    instructOpen: "open note",
    instructDismiss: "dismiss",
    llmPrompt: (title, content) => `Task: Generate a description and tags for this note.

Rules:
1. Description in English, 50-100 words
2. Description must describe specific content, never repeat the title
3. Tags in English, 3-5 tags, no # prefix, no spaces
4. Reply only in JSON

{"description": "...", "tags": ["...", "...", "..."]}

Note title: ${title}

Note content:
${content}`,
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
    topResultsDesc: "搜尋和 Discover 最多顯示幾筆結果",
    minScore: "最低分數",
    minScoreDesc: "低於此門檻的結果不顯示（0.0 – 1.0）。越低結果越多，越高越嚴格。",
    maxEmbedChars: "最大 Embed 字數",
    maxEmbedCharsDesc: "每篇筆記取前幾個字做 embedding。有 description 的筆記會優先用 description。修改後需重建索引。",
    hotDays: "Hot 天數",
    hotDaysDesc: "近幾天內建立的筆記視為 Hot（活躍）。Hot 筆記有連結或近期建立；Cold 筆記是孤立的，會被 Discover 發掘出來。",
    searchScope: "預設搜尋範圍",
    searchScopeDesc: "Hot = 有連結或近期的筆記。Cold = 孤立筆記（適合重新發現）。全部 = 不篩選。",
    scopeHot: "僅 Hot",
    scopeAll: "全部",
    excludePatterns: "排除路徑",
    excludePatternsDesc: "不索引也不 Discover 的資料夾前綴（每行一個，例如 3_wiki/）",
    autoIndex: "自動更新索引",
    autoIndexDesc: "筆記修改時自動重新 embed，保持 Discover 結果即時。",
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
    llmModelDesc: "用於生成 description 的 Ollama 模型。推薦：qwen3:1.7b（快速、品質好）。",
    minDescLength: "最短 description 字數",
    minDescLengthDesc: "低於此字數的 description 會重新生成。好的 description 能提升搜尋和 Discover 的準確度。",
    actions: "操作",
    rebuildIndex: "重建索引",
    rebuildIndexDesc: "全部重新 embed。大量新增檔案或更換 embedding 模型後需要執行。",
    rebuildBtn: "重建",
    indexingBtn: "建立中...",
    updateIndex: "更新索引",
    updateIndexDesc: "只 embed 新增或修改的筆記，比全部重建快。",
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
    descAllGood: "所有筆記都已有完整 description",
    descNoEntries: "沒有需要套用的項目",
    descApplying: (done, total) => `套用中：${done}/${total}...`,
    chunkingProgress: (done, total) => `Chunking：${done}/${total}...`,
    apiKeyLabel: "API key",
    apiKeyDesc: "選填 — 用於需要認證的伺服器",
    urlPlaceholder: "http://localhost:11434",
    apiKeyPlaceholder: "sk-...",
    remoteWarning: "\u26a0 遠端伺服器 — 筆記內容將傳送至外部機器",
    selectModel: "選擇模型",
    tabSearch: "搜尋",
    tabDiscover: "發掘",
    discoverCurrentNote: "當前筆記",
    discoverGlobal: "全域",
    discoverRelatedTo: (title) => `相關於：${title}`,
    discoverEmpty: "找不到相關筆記",
    discoverGlobalEmpty: "沒有 Cold 筆記。Cold 筆記是孤立的（無連結、非近期）——將未整理的檔案加入 vault 後就會出現。",
    discoverNoIndex: "請先建立索引",
    discoverComputing: "計算中...",
    discoverGlobalDesc: "與你目前思路最相關但尚未探索的筆記",
    discoverProgress: (done, total) => `計算中：${done}/${total}...`,
    generateMoc: "生成 MOC",
    mocCreated: (path) => `MOC 已建立：${path}`,
    mocNoResults: "沒有結果可生成 MOC",
    cmdGlobalDiscover: "發掘相關的 Cold 筆記",
    scopeCold: "僅 Cold",
    sectionSearch: "搜尋與索引",
    sectionDesc: "Description 生成器",
    descStats: "Description 統計",
    descGood: "完整",
    descShort: "過短",
    descMissing: "缺少",
    descNoFm: "無 frontmatter",
    descPreviewDesc: "掃描所有筆記，為缺少或過短的 description 生成預覽報告。",
    descApplyDesc: "將預覽的 description 寫入筆記的 frontmatter。",
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
    noticeIndexCorrupt: "Vault Search：索引檔案已損壞，請重建索引。",
    instructNav: "瀏覽",
    instructOpen: "開啟筆記",
    instructDismiss: "關閉",
    llmPrompt: (title, content) => `任務：為筆記產生 description 和 tags。

規則：
1. description 用繁體中文，50-100 字
2. description 必須描述具體內容，禁止重複標題
3. tags 用繁體中文，3-5 個，不要 # 前綴，不能有空格
4. 只回覆 JSON

{"description": "...", "tags": ["...", "...", "..."]}

筆記標題：${title}

筆記內容：
${content}`,
};

const locales: Record<string, Locale> = { en, "zh-TW": zhTW };

export function getLocale(): Locale {
    // Use moment locale set by Obsidian (avoids direct localStorage access)
    const lang = window.moment?.locale?.() ?? "en";
    if (lang.startsWith("zh")) return zhTW;
    return locales[lang] ?? en;
}

export const t = getLocale();
