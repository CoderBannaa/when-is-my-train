import { Station } from '../data/stations';
import { CorridorTrain } from '../data/trainsBetweenStations';

// Pre-indexed station representation for zero-allocation searching
interface IndexedStation {
  station: Station;
  code: string;
  name: string;
  city: string;
  state: string;
  words: string[];
  isPopular: boolean;
}

// Pre-indexed train representation
interface IndexedTrain {
  train: CorridorTrain;
  number: string;
  name: string;
  nameWords: string[];
  originCode: string;
  destCode: string;
  originName: string;
  destName: string;
  stops: { code: string; name: string }[];
}

// Global WeakMaps to cache indexed representations
const indexedStationsMap = new WeakMap<Station[], IndexedStation[]>();
const indexedTrainsMap = new WeakMap<CorridorTrain[], IndexedTrain[]>();

// Fast LRU / Bounded Query Caches (prevents memory bloat with maximum 100 entries)
const MAX_CACHE_SIZE = 100;
const stationSearchCache = new Map<string, Station[]>();
const trainSearchCache = new Map<string, CorridorTrain[]>();

function getIndexedStations(stations: Station[]): IndexedStation[] {
  let indexed = indexedStationsMap.get(stations);
  if (!indexed) {
    indexed = stations.map((s) => ({
      station: s,
      code: s.code.toLowerCase(),
      name: s.name.toLowerCase(),
      city: s.city.toLowerCase(),
      state: s.state.toLowerCase(),
      words: s.name.toLowerCase().split(/\s+/),
      isPopular: !!s.isPopular,
    }));
    indexedStationsMap.set(stations, indexed);
  }
  return indexed;
}

function getIndexedTrains(trains: CorridorTrain[]): IndexedTrain[] {
  let indexed = indexedTrainsMap.get(trains);
  if (!indexed) {
    indexed = trains.map((t) => ({
      train: t,
      number: t.number.toLowerCase(),
      name: t.name.toLowerCase(),
      nameWords: t.name.toLowerCase().split(/\s+/),
      originCode: t.originCode.toLowerCase(),
      destCode: t.destCode.toLowerCase(),
      originName: t.originName.toLowerCase(),
      destName: t.destName.toLowerCase(),
      stops: (t.stops || []).map((s) => ({
        code: s.code.toLowerCase(),
        name: s.name.toLowerCase(),
      })),
    }));
    indexedTrainsMap.set(trains, indexed);
  }
  return indexed;
}

function calcLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Intelligent relevance scoring engine for Stations search with indexing & caching.
 */
export function searchAndRankStations(query: string, stations: Station[]): Station[] {
  // Handle extra spaces, leading/trailing spaces, and case-insensitivity
  const cleanQ = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!cleanQ) {
    return stations;
  }

  // Check query cache
  const cached = stationSearchCache.get(cleanQ);
  if (cached) {
    return cached;
  }

  const indexedStations = getIndexedStations(stations);
  const scored: { station: Station; score: number }[] = [];
  const queryTokens = cleanQ.includes(' ') ? cleanQ.split(' ').filter(Boolean) : null;

  for (let i = 0; i < indexedStations.length; i++) {
    const item = indexedStations[i];
    let score = 0;

    // 0. Multi-word query matching (e.g. "new del", "del cantt", "agra cantt")
    if (queryTokens && queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every((tok) =>
        item.words.some((w) => w.startsWith(tok)) ||
        item.city.startsWith(tok) ||
        item.code.startsWith(tok)
      );
      if (allTokensMatch) {
        score += 1700;
      }
    }

    // 1. Exact or Prefix Station Code match
    if (item.code === cleanQ) {
      score += 2000;
    } else if (item.code.startsWith(cleanQ)) {
      score += 1500;
    } else if (item.code.includes(cleanQ)) {
      score += 800;
    }

    // 2. Station Name matches
    if (item.name === cleanQ) {
      score += 1900;
    } else if (item.name.startsWith(cleanQ)) {
      const lenDiff = Math.max(0, item.name.length - cleanQ.length);
      score += 1400 - Math.min(lenDiff * 10, 300);
    } else {
      const words = item.words;
      let wordMatched = false;
      for (let w = 0; w < words.length; w++) {
        if (words[w].startsWith(cleanQ)) {
          score += 1200;
          wordMatched = true;
          break;
        }
      }
      if (!wordMatched && item.name.includes(cleanQ)) {
        score += 700;
      }
    }

    // 3. City matches
    if (item.city === cleanQ) {
      score += 900;
      if (item.name.includes(cleanQ)) score += 400;
    } else if (item.city.startsWith(cleanQ)) {
      score += 650;
      if (item.name.includes(cleanQ)) score += 350;
    } else if (item.city.includes(cleanQ)) {
      score += 350;
    }

    // 4. State matches
    if (item.state.startsWith(cleanQ)) {
      score += 200;
    } else if (item.state.includes(cleanQ)) {
      score += 100;
    }

    // 5. Spelling Mistake / Typo Tolerance (e.g. "dheli" -> delhi, "knapur" -> kanpur)
    if (score === 0 && cleanQ.length >= 4) {
      for (let w = 0; w < item.words.length; w++) {
        const word = item.words[w];
        if (word.length >= 4) {
          const sliceLen = Math.min(word.length, cleanQ.length + 1);
          const dist = calcLevenshtein(cleanQ, word.slice(0, sliceLen));
          if (dist === 1) {
            score += 620;
            break;
          }
        }
      }
      if (score === 0 && item.city.length >= 4) {
        const sliceLen = Math.min(item.city.length, cleanQ.length + 1);
        const dist = calcLevenshtein(cleanQ, item.city.slice(0, sliceLen));
        if (dist === 1) {
          score += 580;
        }
      }
    }

    // 6. Popularity bonus
    if (item.isPopular && score > 0) {
      score += 150;
    }

    if (score > 0) {
      scored.push({ station: item.station, score });
    }
  }

  // Sort descending by relevance score, then by popularity, then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.station.isPopular !== b.station.isPopular) {
      return a.station.isPopular ? -1 : 1;
    }
    return a.station.name.localeCompare(b.station.name);
  });

  const results = scored.map((s) => s.station);

  // Cache result
  if (stationSearchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = stationSearchCache.keys().next().value;
    if (firstKey) stationSearchCache.delete(firstKey);
  }
  stationSearchCache.set(cleanQ, results);

  return results;
}

/**
 * Intelligent relevance scoring engine for Train searches with indexing & caching.
 */
export function searchAndRankTrains(query: string, trains: CorridorTrain[]): CorridorTrain[] {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return trains;
  }

  // Check query cache
  const cached = trainSearchCache.get(cleanQ);
  if (cached) {
    return cached;
  }

  const indexedTrains = getIndexedTrains(trains);
  const scored: { train: CorridorTrain; score: number }[] = [];

  for (let i = 0; i < indexedTrains.length; i++) {
    const t = indexedTrains[i];
    let score = 0;

    // Train number match
    if (t.number === cleanQ) {
      score += 2000;
    } else if (t.number.startsWith(cleanQ)) {
      score += 1500;
    } else if (t.number.includes(cleanQ)) {
      score += 900;
    }

    // Train name match
    if (t.name.startsWith(cleanQ)) {
      score += 1300;
    } else {
      let wordMatched = false;
      const words = t.nameWords;
      for (let w = 0; w < words.length; w++) {
        if (words[w].startsWith(cleanQ)) {
          score += 1100;
          wordMatched = true;
          break;
        }
      }
      if (!wordMatched && t.name.includes(cleanQ)) {
        score += 700;
      }
    }

    // Origin/Destination match
    if (t.originCode === cleanQ || t.destCode === cleanQ) {
      score += 800;
    } else if (t.originName.includes(cleanQ) || t.destName.includes(cleanQ)) {
      score += 600;
    }

    // Intermediate stops match
    const stops = t.stops;
    for (let s = 0; s < stops.length; s++) {
      if (stops[s].code === cleanQ || stops[s].name.includes(cleanQ)) {
        score += 400;
        break;
      }
    }

    if (score > 0) {
      scored.push({ train: t.train, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.map((item) => item.train);

  // Cache result
  if (trainSearchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = trainSearchCache.keys().next().value;
    if (firstKey) trainSearchCache.delete(firstKey);
  }
  trainSearchCache.set(cleanQ, results);

  return results;
}
