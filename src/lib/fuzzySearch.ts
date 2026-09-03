/**
 * Fuzzy Search Engine — Pure client-side search with intelligent matching.
 *
 * Supports:
 * - Exact match (highest score)
 * - Prefix/partial match
 * - Keyword & synonym matching
 * - Levenshtein edit-distance fuzzy matching (typo tolerance)
 * - Bigram similarity for partial word overlap
 * - Multi-word query decomposition
 * - Priority-weighted ranking
 *
 * No external dependencies. No API calls.
 */

import { SEARCH_INDEX, type SearchEntry } from "./adminSearchIndex";

export interface SearchResult {
  entry: SearchEntry;
  score: number;
  matchedTerms: string[];
}

// ─── Scoring weights ───
const WEIGHT_EXACT_NAME = 100;
const WEIGHT_NAME_PREFIX = 60;
const WEIGHT_NAME_CONTAINS = 40;
const WEIGHT_KEYWORD_EXACT = 50;
const WEIGHT_KEYWORD_PREFIX = 30;
const WEIGHT_KEYWORD_CONTAINS = 20;
const WEIGHT_SYNONYM_EXACT = 35;
const WEIGHT_SYNONYM_PREFIX = 22;
const WEIGHT_SYNONYM_CONTAINS = 15;
const WEIGHT_DESCRIPTION = 10;
const WEIGHT_FUZZY = 12;
const WEIGHT_BIGRAM = 8;
const WEIGHT_PRIORITY_MULTIPLIER = 0.5;

// ─── Levenshtein edit distance ───
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Bigram similarity (Dice coefficient) ───
function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.substring(i, i + 2));
  }
  return set;
}

function bigramSimilarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const biA = bigrams(a);
  const biB = bigrams(b);
  let intersection = 0;
  biA.forEach((bg) => { if (biB.has(bg)) intersection++; });
  return (2 * intersection) / (biA.size + biB.size);
}

// ─── Normalize text for comparison ───
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

// ─── Score a single query term against a single target string ───
function scoreTermAgainstString(
  queryTerm: string,
  target: string,
  exactWeight: number,
  prefixWeight: number,
  containsWeight: number,
): { score: number; matched: boolean } {
  const nTarget = normalize(target);
  const nQuery = normalize(queryTerm);

  if (!nQuery) return { score: 0, matched: false };

  // Exact match
  if (nTarget === nQuery) return { score: exactWeight, matched: true };

  // Prefix match
  if (nTarget.startsWith(nQuery)) return { score: prefixWeight, matched: true };

  // Contains match
  if (nTarget.includes(nQuery)) return { score: containsWeight, matched: true };

  // Word-boundary match (query matches start of any word in target)
  const words = nTarget.split(/\s+/);
  for (const w of words) {
    if (w === nQuery) return { score: exactWeight * 0.9, matched: true };
    if (w.startsWith(nQuery)) return { score: prefixWeight * 0.8, matched: true };
  }

  return { score: 0, matched: false };
}

// ─── Score a single entry against the full query ───
function scoreEntry(query: string, entry: SearchEntry): SearchResult {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { entry, score: 0, matchedTerms: [] };

  let totalScore = 0;
  const matchedTerms = new Set<string>();

  // Split query into individual terms for multi-word matching
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  // Also try the full query as a single phrase
  const allQueries = [normalizedQuery, ...queryTerms];
  const uniqueQueries = [...new Set(allQueries)];

  for (const q of uniqueQueries) {
    // 1. Match against name
    const nameResult = scoreTermAgainstString(q, entry.name, WEIGHT_EXACT_NAME, WEIGHT_NAME_PREFIX, WEIGHT_NAME_CONTAINS);
    if (nameResult.matched) {
      totalScore += nameResult.score;
      matchedTerms.add(q);
    }

    // 2. Match against keywords
    for (const kw of entry.keywords) {
      const kwResult = scoreTermAgainstString(q, kw, WEIGHT_KEYWORD_EXACT, WEIGHT_KEYWORD_PREFIX, WEIGHT_KEYWORD_CONTAINS);
      if (kwResult.matched) {
        totalScore += kwResult.score;
        matchedTerms.add(kw);
      }
    }

    // 3. Match against synonyms
    for (const syn of entry.synonyms) {
      const synResult = scoreTermAgainstString(q, syn, WEIGHT_SYNONYM_EXACT, WEIGHT_SYNONYM_PREFIX, WEIGHT_SYNONYM_CONTAINS);
      if (synResult.matched) {
        totalScore += synResult.score;
        matchedTerms.add(syn);
      }
    }

    // 4. Match against description
    const descResult = scoreTermAgainstString(q, entry.description, WEIGHT_DESCRIPTION, WEIGHT_DESCRIPTION * 0.7, WEIGHT_DESCRIPTION * 0.5);
    if (descResult.matched) {
      totalScore += descResult.score;
      matchedTerms.add(q);
    }

    // 5. Fuzzy matching (only if no direct matches were found for this term)
    if (!nameResult.matched) {
      // Fuzzy against name words
      const nameWords = normalize(entry.name).split(/\s+/);
      for (const nw of nameWords) {
        if (nw.length >= 3 && q.length >= 3) {
          const dist = levenshtein(q, nw);
          const maxLen = Math.max(q.length, nw.length);
          if (dist <= Math.floor(maxLen * 0.35)) {
            totalScore += WEIGHT_FUZZY * (1 - dist / maxLen);
            matchedTerms.add(nw);
          }
        }
      }

      // Fuzzy against keywords
      for (const kw of entry.keywords) {
        const kwWords = normalize(kw).split(/\s+/);
        for (const kww of kwWords) {
          if (kww.length >= 3 && q.length >= 3) {
            const dist = levenshtein(q, kww);
            const maxLen = Math.max(q.length, kww.length);
            if (dist <= Math.floor(maxLen * 0.35)) {
              totalScore += WEIGHT_FUZZY * 0.8 * (1 - dist / maxLen);
              matchedTerms.add(kw);
            }
          }
        }
      }

      // Fuzzy against synonyms
      for (const syn of entry.synonyms) {
        const synWords = normalize(syn).split(/\s+/);
        for (const sw of synWords) {
          if (sw.length >= 3 && q.length >= 3) {
            const dist = levenshtein(q, sw);
            const maxLen = Math.max(q.length, sw.length);
            if (dist <= Math.floor(maxLen * 0.35)) {
              totalScore += WEIGHT_FUZZY * 0.6 * (1 - dist / maxLen);
              matchedTerms.add(syn);
            }
          }
        }
      }

      // Bigram similarity against name (catches partial overlaps)
      const biSim = bigramSimilarity(q, normalize(entry.name));
      if (biSim > 0.3) {
        totalScore += WEIGHT_BIGRAM * biSim;
        matchedTerms.add(entry.name.toLowerCase());
      }
    }
  }

  // Apply priority bonus
  totalScore += entry.priority * WEIGHT_PRIORITY_MULTIPLIER;

  return {
    entry,
    score: totalScore,
    matchedTerms: [...matchedTerms],
  };
}

/**
 * Search the admin index with intelligent fuzzy/semantic matching.
 * Returns results sorted by relevance score (highest first).
 */
export function searchAdmin(query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = SEARCH_INDEX
    .map((entry) => scoreEntry(trimmed, entry))
    .filter((r) => r.score > WEIGHT_PRIORITY_MULTIPLIER * 10 + 1) // Filter out priority-only matches
    .sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Get suggestion terms from the search index for "no results" state.
 * Returns up to `count` keyword suggestions related to the query.
 */
export function getSuggestions(query: string, count = 4): string[] {
  const q = normalize(query);
  if (!q) return [];

  // Collect all keywords and find those with some similarity
  const candidates: { term: string; sim: number }[] = [];

  for (const entry of SEARCH_INDEX) {
    // Check name
    const nameSim = bigramSimilarity(q, normalize(entry.name));
    if (nameSim > 0.15) {
      candidates.push({ term: entry.name, sim: nameSim + entry.priority * 0.01 });
    }

    // Check keywords
    for (const kw of entry.keywords) {
      const kwSim = bigramSimilarity(q, normalize(kw));
      if (kwSim > 0.15) {
        candidates.push({ term: kw, sim: kwSim });
      }
    }
  }

  // Deduplicate and sort by similarity
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.sim - a.sim)
    .filter((c) => {
      const key = c.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count)
    .map((c) => c.term);
}
