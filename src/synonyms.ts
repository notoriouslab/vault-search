import type { VaultSearchSettings } from "./types";

/**
 * Expand query with synonyms. If any key appears in the query,
 * append all its synonyms to improve embedding match.
 * E.g., query "靈糧堂" with synonyms {"靈糧堂": ["台北靈糧堂"]}
 * becomes "靈糧堂 台北靈糧堂"
 */
export function expandQuery(query: string, settings: VaultSearchSettings): string {
    const { synonyms } = settings;
    if (!synonyms || Object.keys(synonyms).length === 0) return query;

    const additions: string[] = [];
    for (const [key, values] of Object.entries(synonyms)) {
        if (query.includes(key)) {
            for (const v of values) {
                if (!query.includes(v)) {
                    additions.push(v);
                }
            }
        }
    }

    return additions.length > 0 ? `${query} ${additions.join(" ")}` : query;
}
