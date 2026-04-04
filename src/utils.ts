import { App, TFile } from "obsidian";
import type { ApiFormat } from "./types";

export interface OllamaModel {
    name: string;
    sizeGB: number;
    isEmbedding: boolean;
}

export async function fetchOllamaModels(url: string): Promise<OllamaModel[]> {
    try {
        const resp = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!resp.ok) return [];
        const data = await resp.json();
        return (data.models ?? []).map((m: { name: string; size: number }) => ({
            name: m.name,
            sizeGB: m.size / 1e9,
            isEmbedding: /embed/i.test(m.name),
        }));
    } catch {
        return [];
    }
}

export async function checkOllama(url: string): Promise<boolean> {
    try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return resp.ok;
    } catch {
        return false;
    }
}

export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

export function stripFrontmatter(content: string): string {
    if (!content.startsWith("---")) return content;
    const end = content.indexOf("---", 3);
    if (end === -1) return content;
    return content.slice(end + 3).trim();
}

function buildHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    return headers;
}

function truncateError(text: string, max = 200): string {
    return text.length > max ? text.slice(0, max) + "..." : text;
}

export async function embedText(
    text: string,
    url: string,
    model: string,
    format: ApiFormat,
    signal?: AbortSignal,
    apiKey?: string,
): Promise<number[]> {
    const results = await embedTexts([text], url, model, format, signal, apiKey);
    return results[0] ?? [];
}

export async function embedTexts(
    texts: string[],
    url: string,
    model: string,
    format: ApiFormat,
    signal?: AbortSignal,
    apiKey?: string,
): Promise<number[][]> {
    if (texts.length === 0) return [];

    if (format === "openai") {
        const resp = await fetch(`${url}/v1/embeddings`, {
            method: "POST",
            headers: buildHeaders(apiKey),
            body: JSON.stringify({ model, input: texts }),
            signal,
        });
        if (!resp.ok) throw new Error(`API ${resp.status}: ${truncateError(await resp.text())}`);
        const data = await resp.json();
        // OpenAI returns {data: [{embedding: [...]}, ...]} sorted by index
        return (data.data ?? [])
            .sort((a: {index: number}, b: {index: number}) => a.index - b.index)
            .map((d: {embedding: number[]}) => d.embedding ?? []);
    }

    // Ollama format — supports input as string[]
    const resp = await fetch(`${url}/api/embed`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({ model, input: texts }),
        signal,
    });
    if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${truncateError(await resp.text())}`);
    const data = await resp.json();
    return data.embeddings ?? [];
}

export function splitChunks(text: string, size: number, overlap: number): string[] {
    if (text.length <= size) return [text];
    const step = size - overlap;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += step) {
        chunks.push(text.slice(i, i + size));
        if (i + size >= text.length) break;
    }
    return chunks;
}

export function searchNoteScore(queryVec: number[], entry: import("./types").NoteEntry): number {
    if (entry.chunks && entry.chunks.length > 0) {
        let maxScore = 0;
        for (const chunk of entry.chunks) {
            if (chunk.length === 0) continue;
            const s = cosineSimilarity(queryVec, chunk);
            if (s > maxScore) maxScore = s;
        }
        return maxScore;
    }
    if (!entry.embedding || entry.embedding.length === 0) return 0;
    return cosineSimilarity(queryVec, entry.embedding);
}

export async function getContentPreview(app: App, file: TFile, maxChars = 100): Promise<string> {
    const cache = app.metadataCache.getFileCache(file);
    const desc = cache?.frontmatter?.description;
    if (desc) return desc;

    const raw = await app.vault.cachedRead(file);
    let body = stripFrontmatter(raw);
    body = body.replace(/^#+\s+.*\n?/, "").trim();
    if (body.length > maxChars) body = body.slice(0, maxChars) + "…";
    return body;
}
