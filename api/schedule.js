const { execFile } = require("child_process");
const { promisify } = require("util");

const TIMEZONE = "Europe/Minsk";
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DAYS_WINDOW = 8;
const SOURCE_DISCOVERY_TTL_MS = 20 * 60 * 1000;
const SITEMAP_URL = "https://www.polessu.by/sitemap.xml";
const FETCH_TIMEOUT_MS = 10 * 1000;
const SCHEMA_VERSION = 3;
const CURL_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const CURL_FALLBACK_TLS_CODES = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);
const execFileAsync = promisify(execFile);

const siteChangesUtils = require("../shared/site_changes.js");

const FACILITIES = [
  {
    id: "ice_arena",
    parserId: "ice_arena",
    name: "Ледовая арена",
    emoji: "❄️",
    mode: "dated",
    sourceUrls: [
      "https://www.polessu.by/%D0%BB%D0%B5%D0%B4%D0%BE%D0%B2%D0%B0%D1%8F-%D0%B0%D1%80%D0%B5%D0%BD%D0%B0-%D0%BF%D0%BE%D0%BB%D0%B5%D1%81%D0%B3%D1%83",
      "http://www.polessu.by/%D0%BB%D0%B5%D0%B4%D0%BE%D0%B2%D0%B0%D1%8F-%D0%B0%D1%80%D0%B5%D0%BD%D0%B0-%D0%BF%D0%BE%D0%BB%D0%B5%D1%81%D0%B3%D1%83",
    ],
    discoveryKeywords: ["ледов", "арен", "полесг"],
    defaults: {
      activity: "Массовое катание",
    },
  },
  {
    id: "sports_pool",
    parserId: "sports_pool",
    name: "Большой бассейн",
    emoji: "🏊",
    mode: "dated",
    sourceUrls: [
      "https://www.polessu.by/%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
      "http://www.polessu.by/%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
    ],
    discoveryKeywords: ["больш", "басс"],
    defaults: {
      activity: "Свободное плавание",
    },
  },
  {
    id: "small_pool",
    parserId: "small_pool",
    name: "Малый бассейн",
    emoji: "🌊",
    mode: "dated",
    sourceUrls: [
      "https://www.polessu.by/%D0%BC%D0%B0%D0%BB%D1%8B%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
      "http://www.polessu.by/%D0%BC%D0%B0%D0%BB%D1%8B%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
    ],
    discoveryKeywords: ["мал", "басс"],
    defaults: {
      activity: "Сеанс",
    },
  },
  {
    id: "rowing_base",
    parserId: "rowing_base",
    name: "Гребная база",
    emoji: "🚣",
    mode: "dailyTemplate",
    sourceUrls: [
      "https://www.polessu.by/%D1%80%D0%B0%D1%81%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5-%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D1%8B-%D1%82%D1%80%D0%B5%D0%BD%D0%B0%D0%B6%D0%B5%D1%80%D0%BD%D0%BE%D0%B3%D0%BE-%D0%B7%D0%B0%D0%BB%D0%B0-%D0%B8-%D0%B7%D0%B0%D0%BB%D0%B0-%D1%88%D1%82%D0%B0%D0%BD%D0%B3%D0%B8-%D0%B3%D1%80%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F-%D0%B1%D0%B0%D0%B7%D0%B0-%E2%84%961",
      "http://www.polessu.by/%D1%80%D0%B0%D1%81%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5-%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D1%8B-%D1%82%D1%80%D0%B5%D0%BD%D0%B0%D0%B6%D0%B5%D1%80%D0%BD%D0%BE%D0%B3%D0%BE-%D0%B7%D0%B0%D0%BB%D0%B0-%D0%B8-%D0%B7%D0%B0%D0%BB%D0%B0-%D1%88%D1%82%D0%B0%D0%BD%D0%B3%D0%B8-%D0%B3%D1%80%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F-%D0%B1%D0%B0%D0%B7%D0%B0-%E2%84%961",
    ],
    discoveryKeywords: ["греб", "баз", "расписан"],
    defaults: {
      activity: "Тренажерный зал",
    },
  },
];

let memoryCache = {
  at: 0,
  payload: null,
};

let sourceDiscoveryCache = {
  at: 0,
  urls: [],
};

const FACILITY_PARSERS = {
  ice_arena: {
    id: "ice_arena",
    parse: parseIceArenaFacility,
  },
  sports_pool: {
    id: "sports_pool",
    parse: parseSportsPoolFacility,
  },
  small_pool: {
    id: "small_pool",
    parse: parseSmallPoolFacility,
  },
  rowing_base: {
    id: "rowing_base",
    parse: parseRowingBaseFacility,
  },
};

module.exports = async function handler(req, res) {
  try {
    const force = String(req.query?.refresh || req.query?.force || "").trim() === "1";

    if (!force && memoryCache.payload && Date.now() - memoryCache.at < CACHE_TTL_MS) {
      return respond(res, 200, memoryCache.payload, true);
    }

    const previousFacilities = toFacilityMap(memoryCache.payload?.facilities);
    const facilityResults = await Promise.all(
      FACILITIES.map((facility) => parseFacilityWithFallback(facility, previousFacilities.get(facility.id) || null))
    );

    const checkedAt = new Date().toISOString();
    const enrichedFacilities = facilityResults.map(enrichFacilityForTracking);
    const sourceIssues = siteChangesUtils.buildSourceIssueDetails({
      facilities: enrichedFacilities,
    });
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: checkedAt,
      sourceCheckedAt: checkedAt,
      timezone: TIMEZONE,
      snapshotHash: siteChangesUtils.buildScheduleSnapshotHash({
        schemaVersion: SCHEMA_VERSION,
        timezone: TIMEZONE,
        facilities: enrichedFacilities,
      }),
      facilities: enrichedFacilities,
      meta: {
        cached: false,
        sourceCount: FACILITIES.length,
        sourceIssueCount: sourceIssues.length,
        sourceIssues,
      },
    };

    memoryCache = {
      at: Date.now(),
      payload,
    };

    return respond(res, 200, payload, false);
  } catch (error) {
    return respond(
      res,
      500,
      {
        error: "Internal parsing failure",
        message: error instanceof Error ? error.message : String(error),
      },
      false
    );
  }
};

function respond(res, statusCode, payload, fromCache) {
  const body = {
    ...payload,
    meta: {
      ...(payload.meta || {}),
      cached: Boolean(fromCache),
    },
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.status(statusCode).send(JSON.stringify(body));
}

function enrichFacilityForTracking(facility) {
  const tracking = siteChangesUtils.buildFacilityTrackingMeta(facility);

  return {
    ...facility,
    comparisonMode: tracking.comparisonMode,
    dataQuality: tracking.dataQuality,
    facilityHash: tracking.facilityHash,
    templateHash: tracking.templateHash,
    changeTrackingHash: tracking.changeTrackingHash,
    sourceCheckedAt: facility.sourceCheckedAt || facility.updatedAt || null,
    windowStart: tracking.windowStart || null,
    windowEnd: tracking.windowEnd || null,
    template: tracking.template,
  };
}

async function parseFacilityWithFallback(facility, previousFacility) {
  const startedAt = new Date().toISOString();
  const directUrls = normalizeFacilitySourceUrls(facility);
  const attempted = new Set();
  const errors = [];

  for (const sourceUrl of directUrls) {
    attempted.add(sourceUrl);
    try {
      const parsed = await parseFacilityFromUrl(facility, sourceUrl);
      return {
        id: facility.id,
        name: facility.name,
        emoji: facility.emoji,
        sourceUrl,
        mode: facility.mode,
        sourceCheckedAt: startedAt,
        updatedAt: startedAt,
        ...parsed,
        warnings: uniq(parsed.warnings || []),
        error: null,
        fetchState: "ok",
        sourceIssue: null,
      };
    } catch (error) {
      errors.push({ sourceUrl, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  const discoveredUrls = await discoverFacilitySourceUrls(facility, attempted);
  for (const sourceUrl of discoveredUrls) {
    attempted.add(sourceUrl);
    try {
      const parsed = await parseFacilityFromUrl(facility, sourceUrl);
      return {
        id: facility.id,
        name: facility.name,
        emoji: facility.emoji,
        sourceUrl,
        mode: facility.mode,
        sourceCheckedAt: startedAt,
        updatedAt: startedAt,
        ...parsed,
        warnings: uniq([...(parsed.warnings || []), "Источник найден автоматически через sitemap"]),
        error: null,
        fetchState: "ok",
        sourceIssue: null,
      };
    } catch (error) {
      errors.push({ sourceUrl, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  const sourceIssue = buildSourceIssueMessage(errors);
  const fallbackSourceUrl = previousFacility?.sourceUrl || directUrls[0] || null;

  if (canReusePreviousFacility(previousFacility)) {
    const previousWarnings = Array.isArray(previousFacility.warnings)
      ? previousFacility.warnings.filter((item) => !/^Источник недоступен/i.test(String(item || "")))
      : [];

    return {
      id: facility.id,
      name: facility.name,
      emoji: facility.emoji,
      sourceUrl: fallbackSourceUrl,
      mode: facility.mode,
      sourceCheckedAt: startedAt,
      updatedAt: startedAt,
      days: deepClone(previousFacility.days || []),
      template: previousFacility?.template ? deepClone(previousFacility.template) : null,
      extraPrograms: Array.isArray(previousFacility?.extraPrograms) ? deepClone(previousFacility.extraPrograms) : [],
      notes: deepClone(previousFacility.notes || []),
      warnings: uniq([...previousWarnings, "Источник недоступен, показаны последние сохранённые данные"]),
      error: sourceIssue,
      fetchState: "stale_cache",
      sourceIssue,
    };
  }

  return {
    id: facility.id,
    name: facility.name,
    emoji: facility.emoji,
    sourceUrl: fallbackSourceUrl,
    mode: facility.mode,
    sourceCheckedAt: startedAt,
    updatedAt: startedAt,
    days: [],
    template: null,
    extraPrograms: [],
    notes: [],
    warnings: ["Не удалось получить актуальные данные со страницы расписания"],
    error: sourceIssue,
    fetchState: "error",
    sourceIssue,
  };
}

async function parseFacilityFromUrl(facility, sourceUrl) {
  const html = await fetchHtml(sourceUrl);
  const parser = resolveFacilityParser(facility);
  if (!parser) {
    throw new Error(`Не найден parserId для объекта ${facility?.id || "unknown"}`);
  }

  const context = buildFacilityParserContext(html);
  const parsed = parser.parse(context, facility);

  if (!isParsedResultUsable(parsed)) {
    throw new Error("На странице нет пригодного расписания");
  }

  return {
    ...parsed,
    parserId: parser.id,
  };
}

function isParsedResultUsable(parsed) {
  const days = Array.isArray(parsed?.days) ? parsed.days : [];
  if (!days.length) {
    return Boolean(String(parsed?.serviceNotice?.message || "").trim());
  }
  return days.some((day) => (
    (Array.isArray(day?.sessions) && day.sessions.length > 0)
    || Boolean(String(day?.closedReason || "").trim())
  ));
}

function resolveFacilityParser(facility) {
  const parserId = String(facility?.parserId || facility?.id || "").trim();
  return parserId ? FACILITY_PARSERS[parserId] || null : null;
}

function buildFacilityParserContext(html) {
  const contentHtml = extractFieldContent(html);
  return {
    html,
    contentHtml,
    lines: htmlToLines(contentHtml),
  };
}

function canReusePreviousFacility(previousFacility) {
  if (!previousFacility || typeof previousFacility !== "object") {
    return false;
  }
  const days = Array.isArray(previousFacility.days) ? previousFacility.days : [];
  return days.length > 0;
}

function buildSourceIssueMessage(errors) {
  if (!Array.isArray(errors) || !errors.length) {
    return "Источник недоступен";
  }
  const chunks = errors.slice(0, 2).map((item) => {
    const source = String(item.sourceUrl || "");
    const reason = String(item.reason || "Ошибка");
    return `${source} (${reason})`;
  });
  return chunks.join(" | ").slice(0, 420);
}

function normalizeFacilitySourceUrls(facility) {
  const configured = Array.isArray(facility?.sourceUrls) ? facility.sourceUrls : facility?.sourceUrl ? [facility.sourceUrl] : [];
  return uniq(configured.map(normalizeSourceUrl).filter(Boolean));
}

async function discoverFacilitySourceUrls(facility, excludedUrls) {
  const keywords = Array.isArray(facility?.discoveryKeywords)
    ? facility.discoveryKeywords.map(normalizeDiscoveryToken).filter(Boolean)
    : [];
  if (!keywords.length) {
    return [];
  }

  const sitemapUrls = await loadSitemapUrls();
  if (!sitemapUrls.length) {
    return [];
  }

  const minScore = Math.min(2, keywords.length);
  return sitemapUrls
    .map((sourceUrl) => ({ sourceUrl, score: scoreSitemapUrl(sourceUrl, keywords) }))
    .filter((item) => item.score >= minScore && !excludedUrls.has(item.sourceUrl))
    .sort((a, b) => b.score - a.score || a.sourceUrl.length - b.sourceUrl.length)
    .slice(0, 6)
    .map((item) => item.sourceUrl);
}

async function loadSitemapUrls() {
  if (sourceDiscoveryCache.urls.length && Date.now() - sourceDiscoveryCache.at < SOURCE_DISCOVERY_TTL_MS) {
    return sourceDiscoveryCache.urls;
  }

  try {
    const xml = await fetchHtml(SITEMAP_URL, {
      accept: "application/xml,text/xml,text/html;q=0.8,*/*;q=0.5",
    });
    const parsed = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi))
      .map((match) => normalizeSourceUrl(match[1]))
      .filter(Boolean);
    sourceDiscoveryCache = {
      at: Date.now(),
      urls: uniq(parsed),
    };
    return sourceDiscoveryCache.urls;
  } catch {
    sourceDiscoveryCache = {
      at: Date.now(),
      urls: [],
    };
    return [];
  }
}

function scoreSitemapUrl(sourceUrl, keywords) {
  const haystack = normalizeDiscoveryToken(sourceUrl);
  return keywords.reduce((score, keyword) => (haystack.includes(keyword) ? score + 1 : score), 0);
}

function normalizeSourceUrl(value) {
  if (!value) {
    return "";
  }
  try {
    const normalized = new URL(String(value).trim(), "https://www.polessu.by/");
    normalized.protocol = "https:";
    normalized.hash = "";
    normalized.search = "";
    normalized.pathname = normalized.pathname.replace(/\/+$/, "") || "/";
    return normalized.toString();
  } catch {
    return "";
  }
}

function normalizeDiscoveryToken(value) {
  if (!value) {
    return "";
  }
  let decoded = String(value);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep source as-is
  }
  return decoded.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function toFacilityMap(facilities) {
  const result = new Map();
  for (const facility of facilities || []) {
    const id = String(facility?.id || "");
    if (!id) {
      continue;
    }
    result.set(id, facility);
  }
  return result;
}

function deepClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

async function fetchHtml(url, options = {}) {
  const { accept = "text/html,application/xhtml+xml" } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: accept,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } catch (error) {
    if (shouldRetryWithCurl(error)) {
      return fetchHtmlWithCurl(url, accept);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetryWithCurl(error) {
  let current = error;
  while (current && typeof current === "object") {
    const code = typeof current.code === "string" ? current.code : "";
    if (CURL_FALLBACK_TLS_CODES.has(code)) {
      return true;
    }
    current = current.cause;
  }

  const message = String(error?.message || "").toLowerCase();
  return /issuer certificate|self-signed certificate|unable to verify/i.test(message);
}

async function fetchHtmlWithCurl(url, accept) {
  const args = [
    "--silent",
    "--show-error",
    "--fail",
    "--location",
    "--compressed",
    "--max-time",
    String(Math.ceil(FETCH_TIMEOUT_MS / 1000)),
    "-H",
    "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "-H",
    `Accept: ${accept}`,
    url,
  ];

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: CURL_MAX_BUFFER_BYTES,
  });

  return stdout;
}

function extractFieldContent(html) {
  const match = html.match(
    /<div class="field-item even"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i
  );

  return match ? match[1] : html;
}

function htmlToLines(html) {
  const withBreaks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|h\d|div|li|tr|table)>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n");

  const noTags = withBreaks.replace(/<[^>]+>/g, " ");

  const decoded = decodeHtml(noTags)
    .replace(/\u00a0/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+\.\s+/g, ".")
    .replace(/(\d)\s+(\d)\s*\.\s*(\d{2})/g, "$1$2.$3")
    .replace(/(\d)\s*\.\s*(\d{2})/g, "$1.$2")
    .replace(/[ \t]+/g, " ");

  return decoded
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-");
}

function parseIceArenaFacility(context, facility) {
  const lines = Array.isArray(context?.lines) ? context.lines : [];
  const dayMap = new Map();
  const notes = [];
  const warnings = [];
  let currentDate = null;
  let currentWeekday = null;
  let pendingClosureRange = null;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/^Расписание массового катания$/i.test(line)) {
      continue;
    }

    const closureRange = extractClosureRangeHeader(line);
    if (closureRange) {
      pendingClosureRange = closureRange;
      continue;
    }

    const datedHeader = extractDatedHeader(line);
    if (datedHeader) {
      currentDate = datedHeader.date;
      currentWeekday = datedHeader.weekday;
      ensureDay(dayMap, currentDate, currentWeekday);
      if (datedHeader.tail) {
        appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => ({
          activity: facility.defaults.activity,
          note: sanitizeNote(range.note),
        }));
      }
      continue;
    }

    if (pendingClosureRange && /не работает|санитарный|техническим причинам/i.test(line)) {
      for (const date of expandDateRange(pendingClosureRange.startDate, pendingClosureRange.endDate)) {
        const day = ensureDay(dayMap, date, weekdayNameRu(date));
        day.closedReason = line;
      }
      pendingClosureRange = null;
      continue;
    }

    if (!currentDate) {
      if (/изменени|уточнения информации|обращаться по номеру/i.test(line)) {
        notes.push(line);
      }
      continue;
    }

    if (isPostScheduleSection(line)) {
      currentDate = null;
      currentWeekday = null;
      notes.push(line);
      continue;
    }

    if (/санитарный день|не работает|техническим причинам/i.test(line)) {
      const day = ensureDay(dayMap, currentDate, currentWeekday || weekdayNameRu(currentDate));
      day.closedReason = line;
      continue;
    }

    const added = appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => ({
      activity: facility.defaults.activity,
      note: sanitizeNote(range.note),
    }));
    if (!added && /изменени/i.test(line)) {
      notes.push(line);
    }
  }

  const days = finalizeDayMap(dayMap);
  if (!days.length) {
    warnings.push("На странице ледовой арены не найдено расписание сеансов");
  }

  return {
    days,
    template: null,
    extraPrograms: [],
    notes: uniq(notes),
    warnings,
    comparisonMode: "dated",
  };
}

function parseSportsPoolFacility(context, facility) {
  const lines = Array.isArray(context?.lines) ? context.lines : [];
  const dayMap = new Map();
  const notes = [];
  const warnings = [];
  const extraPrograms = extractSupplementaryPrograms(lines);
  const prefaceLines = [];
  let currentDate = null;
  let currentWeekday = null;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/^Расписание работы большого плавательного бассейна$/i.test(line)) {
      continue;
    }

    const datedHeader = extractDatedHeader(line);
    if (datedHeader) {
      currentDate = datedHeader.date;
      currentWeekday = datedHeader.weekday;
      ensureDay(dayMap, currentDate, currentWeekday);
      if (datedHeader.tail) {
        appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => ({
          activity: facility.defaults.activity,
          note: sanitizeNote(range.note),
        }));
      }
      continue;
    }

    if (!currentDate) {
      if (/расписан|абонемент|оплат/i.test(line)) {
        notes.push(line);
      } else if (!isPostScheduleSection(line) && !extractRangesFromLine(line).length) {
        prefaceLines.push(line);
      }
      continue;
    }

    if (isPostScheduleSection(line)) {
      currentDate = null;
      currentWeekday = null;
      notes.push(line);
      continue;
    }

    if (/санитарный день|не работает|техническим причинам/i.test(line)) {
      const day = ensureDay(dayMap, currentDate, currentWeekday || weekdayNameRu(currentDate));
      day.closedReason = line;
      continue;
    }

    const added = appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => ({
      activity: facility.defaults.activity,
      note: sanitizeNote(range.note),
    }));
    if (!added && /расписан|абонемент|оплат/i.test(line)) {
      notes.push(line);
    }
  }

  const days = finalizeDayMap(dayMap);
  const serviceNotice = buildFacilityServiceNotice(prefaceLines, {
    facilityName: facility?.name,
    hasSchedule: days.length > 0,
  });
  if (!days.length) {
    warnings.push(serviceNotice?.message || "На странице большого бассейна не найдено расписание");
  }

  return {
    days,
    template: null,
    extraPrograms,
    notes: uniq(notes),
    warnings: uniq(warnings),
    serviceNotice,
    dataQuality: serviceNotice && !days.length ? "notice" : "exact",
    comparisonMode: "dated",
  };
}

function parseSmallPoolFacility(context, facility) {
  const lines = Array.isArray(context?.lines) ? context.lines : [];
  const dayMap = new Map();
  const notes = [];
  const warnings = [];
  const extraPrograms = extractSupplementaryPrograms(lines);
  const prefaceLines = [];
  let currentDate = null;
  let currentWeekday = null;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/^Расписание малого бассейна$/i.test(line)) {
      continue;
    }

    const datedHeader = extractDatedHeader(line);
    if (datedHeader) {
      currentDate = datedHeader.date;
      currentWeekday = datedHeader.weekday;
      ensureDay(dayMap, currentDate, currentWeekday);
      if (datedHeader.tail) {
        appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => normalizeSmallPoolRange(range, facility));
      }
      continue;
    }

    if (!currentDate) {
      if (/расписан|абонемент|оплат|стоимость/i.test(line)) {
        notes.push(line);
      } else if (!isPostScheduleSection(line) && !extractRangesFromLine(line).length) {
        prefaceLines.push(line);
      }
      continue;
    }

    if (isPostScheduleSection(line)) {
      currentDate = null;
      currentWeekday = null;
      notes.push(line);
      continue;
    }

    if (/санитарный день|не работает|техническим причинам/i.test(line)) {
      const day = ensureDay(dayMap, currentDate, currentWeekday || weekdayNameRu(currentDate));
      day.closedReason = line;
      continue;
    }

    const added = appendSessionsFromLine(dayMap, currentDate, currentWeekday, line, (range) => normalizeSmallPoolRange(range, facility));
    if (!added && /расписан|абонемент|оплат|стоимость/i.test(line)) {
      notes.push(line);
    }
  }

  const days = finalizeDayMap(dayMap);
  const serviceNotice = buildFacilityServiceNotice(prefaceLines, {
    facilityName: facility?.name,
    hasSchedule: days.length > 0,
  });
  if (!days.length) {
    warnings.push(serviceNotice?.message || "На странице малого бассейна не найдено расписание");
  }

  return {
    days,
    template: null,
    extraPrograms,
    notes: uniq(notes),
    warnings: uniq(warnings),
    serviceNotice,
    dataQuality: serviceNotice && !days.length ? "notice" : "exact",
    comparisonMode: "dated",
  };
}

function parseRowingBaseFacility(context, facility) {
  const lines = Array.isArray(context?.lines) ? context.lines : [];
  const notes = [
    "Источник публикует только интервалы без конкретных дат и дней недели; применен шаблон на ближайшие дни",
  ];
  const warnings = [];
  const templateSessions = [];
  let scheduleStarted = false;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/ТРЕНАЖЕРНОГО ЗАЛА.*ЗАЛА СИЛОВОЙ ПОДГОТОВКИ/i.test(line)) {
      scheduleStarted = true;
      continue;
    }

    if (isPostScheduleSection(line)) {
      break;
    }

    const ranges = extractRangesFromLine(line);
    if (ranges.length) {
      scheduleStarted = true;
      for (const range of ranges) {
        templateSessions.push({
          start: range.start,
          end: range.end,
          activity: facility.defaults.activity,
          note: sanitizeNote(range.note),
          sourceLine: line,
        });
      }
      continue;
    }

    if (scheduleStarted && !/^расписание/i.test(line)) {
      notes.push(line);
    }
  }

  const uniqueTemplate = dedupeSessions(templateSessions)
    .map((session) => ({
      start: session.start,
      end: session.end,
      activity: session.activity,
      note: session.note || null,
    }))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));

  if (!uniqueTemplate.length) {
    warnings.push("На странице гребной базы не найдены интервалы работы");
  }

  const templateModel = buildTemplateDays(uniqueTemplate, DEFAULT_DAYS_WINDOW, {
    closedWeekdays: [],
  });

  return {
    days: templateModel.days,
    template: {
      sessions: uniqueTemplate,
      closedWeekdays: [],
      windowStart: templateModel.windowStart,
      windowEnd: templateModel.windowEnd,
    },
    extraPrograms: [],
    notes: uniq(notes),
    warnings,
    comparisonMode: "template",
  };
}

function buildFacilityServiceNotice(lines, options = {}) {
  const facilityName = String(options?.facilityName || "").trim().toLowerCase();
  const compactLines = compactNoticeLines(lines)
    .filter((line) => line.toLowerCase() !== facilityName)
    .filter((line) => !/^расписание\b/i.test(line))
    .filter((line) => !/^уважаемые посетители!?$/i.test(line));
  const meaningfulLines = compactLines.filter((line) => !/^приносим свои извинения[.!]?$/i.test(line));
  if (!meaningfulLines.length) {
    return null;
  }

  const message = compactLines.join(" ").replace(/\s+/g, " ").trim();
  if (!message) {
    return null;
  }

  const kind = classifyFacilityServiceNotice(message);
  const dates = extractIsoDatesFromText(message);
  const startDate = dates[0] || null;
  const endDate = dates[1] || null;
  const hasSchedule = Boolean(options?.hasSchedule);
  const blocksSchedule = kind !== "notice" || !hasSchedule;

  return {
    kind,
    tone: blocksSchedule ? "warning" : "info",
    badge: resolveFacilityServiceNoticeBadge(kind, blocksSchedule),
    summary: buildFacilityServiceNoticeSummary(kind, startDate, blocksSchedule),
    message,
    startDate,
    endDate,
    blocksSchedule,
    lines: compactLines,
  };
}

function compactNoticeLines(lines) {
  const result = [];

  for (const rawLine of lines || []) {
    const line = sanitizeFacilityNoticeLine(rawLine);
    if (!line) {
      continue;
    }

    if (!result.length) {
      result.push(line);
      continue;
    }

    const previous = result[result.length - 1];
    const shouldMerge = !/[.!?…:]$/.test(previous) || /^[а-яё(]/i.test(line);
    if (shouldMerge) {
      result[result.length - 1] = `${previous} ${line}`.replace(/\s+/g, " ").trim();
    } else {
      result.push(line);
    }
  }

  return result;
}

function sanitizeFacilityNoticeLine(line) {
  return normalizeLine(String(line || ""))
    .replace(/^объявление[:\s-]*/i, "")
    .replace(/^уважаемые посетители!?[\s:-]*/i, "")
    .trim();
}

function classifyFacilityServiceNotice(message) {
  const text = String(message || "").toLowerCase();
  if (/ремонт|техничес|профилактик|аварийн|внепланов/i.test(text)) {
    return "maintenance";
  }
  if (/не работает|приостанов|закрыт|закрыта|закрыто|отмен/i.test(text)) {
    return "closure";
  }
  return "notice";
}

function resolveFacilityServiceNoticeBadge(kind, blocksSchedule) {
  if (kind === "maintenance") {
    return "Техработы";
  }
  if (kind === "closure") {
    return "Закрыто";
  }
  return blocksSchedule ? "Внимание" : "Сообщение";
}

function buildFacilityServiceNoticeSummary(kind, startDate, blocksSchedule) {
  const formattedDate = formatIsoDateRu(startDate);
  if (kind === "maintenance") {
    return formattedDate ? `Техработы с ${formattedDate}` : "Идут техработы";
  }
  if (kind === "closure") {
    return formattedDate ? `Работа приостановлена с ${formattedDate}` : "Работа временно приостановлена";
  }
  return blocksSchedule ? "На сайте опубликовано служебное сообщение" : "На сайте опубликовано информационное сообщение";
}

function extractIsoDatesFromText(text) {
  const source = String(text || "");
  const result = [];
  const digitRegex = /(\d{2}\.\d{2}\.\d{4})/g;
  const wordRegex =
    /\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})\b/gi;
  const monthMap = {
    января: "01",
    февраля: "02",
    марта: "03",
    апреля: "04",
    мая: "05",
    июня: "06",
    июля: "07",
    августа: "08",
    сентября: "09",
    октября: "10",
    ноября: "11",
    декабря: "12",
  };

  for (const match of source.matchAll(digitRegex)) {
    const iso = ddmmyyyyToIso(match[1]);
    if (iso) {
      result.push(iso);
    }
  }

  for (const match of source.matchAll(wordRegex)) {
    const day = String(match[1]).padStart(2, "0");
    const month = monthMap[String(match[2] || "").toLowerCase()];
    const year = String(match[3] || "");
    if (month && year) {
      result.push(`${year}-${month}-${day}`);
    }
  }

  return uniq(result);
}

function formatIsoDateRu(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) {
    return "";
  }

  const date = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function extractDatedHeader(line) {
  const match = String(line || "").match(/^(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})(.*)$/u);
  if (!match) {
    return null;
  }

  return {
    weekday: capitalizeWord(match[1]),
    date: ddmmyyyyToIso(match[2]),
    tail: normalizeLine(match[3] || ""),
  };
}

function extractClosureRangeHeader(line) {
  const match = String(line || "").match(
    /^(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})\s*[-]\s*(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})$/u
  );
  if (!match) {
    return null;
  }

  return {
    startDate: ddmmyyyyToIso(match[2]),
    endDate: ddmmyyyyToIso(match[4]),
  };
}

function appendSessionsFromLine(dayMap, date, weekday, line, buildSession) {
  const ranges = extractRangesFromLine(line);
  if (!ranges.length) {
    return 0;
  }

  const day = ensureDay(dayMap, date, weekday || weekdayNameRu(date));
  const nextSessions = [];

  for (const range of ranges) {
    const sessionMeta = typeof buildSession === "function" ? buildSession(range, line) : null;
    if (!sessionMeta || !sessionMeta.activity) {
      continue;
    }

    nextSessions.push({
      date,
      weekday: day.weekday,
      start: range.start,
      end: range.end,
      activity: sessionMeta.activity,
      note: sessionMeta.note || null,
      sourceLine: line,
    });
  }

  if (!nextSessions.length) {
    return 0;
  }

  day.sessions = dedupeSessions([...day.sessions, ...nextSessions]);
  return nextSessions.length;
}

function normalizeSmallPoolRange(range, facility) {
  const label = sanitizeNote(range?.note);
  if (!label) {
    return {
      activity: facility.defaults.activity,
      note: null,
    };
  }

  const trainingMatch = label.match(/^(Обучение плаванию)(?:\s*\((.*?)\))?$/i);
  if (trainingMatch) {
    return {
      activity: trainingMatch[1],
      note: sanitizeNote(trainingMatch[2] || ""),
    };
  }

  return {
    activity: label,
    note: null,
  };
}

function finalizeDayMap(dayMap) {
  return Array.from(dayMap.values())
    .map((day) => ({
      ...day,
      sessions: day.sessions.sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildTemplateDays(templateSessions, daysWindow, options = {}) {
  const today = todayIsoInTimezone(TIMEZONE);
  const closedWeekdays = Array.isArray(options?.closedWeekdays) ? options.closedWeekdays : [];
  const days = [];

  for (let index = 0; index < daysWindow; index += 1) {
    const date = addDays(today, index);
    const weekday = weekdayNameRu(date);
    const weekdayIndex = getIsoWeekdayIndex(date);
    const isClosed = closedWeekdays.includes(weekdayIndex);

    days.push({
      date,
      weekday,
      sessions: isClosed
        ? []
        : templateSessions.map((session) => ({
            ...session,
            date,
            weekday,
          })),
      closedReason: isClosed ? "Выходной день" : null,
      sourceType: "template",
    });
  }

  return {
    days,
    windowStart: days[0]?.date || null,
    windowEnd: days[days.length - 1]?.date || null,
  };
}

function getIsoWeekdayIndex(isoDate) {
  const text = String(isoDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return -1;
  }

  const date = new Date(text + "T12:00:00Z");
  return Number.isNaN(date.getTime()) ? -1 : date.getUTCDay();
}

function ensureDay(dayMap, date, weekday) {
  if (!dayMap.has(date)) {
    dayMap.set(date, {
      date,
      weekday,
      sessions: [],
      closedReason: null,
      sourceType: "dated",
    });
  }

  return dayMap.get(date);
}

function extractRangesFromLine(line) {
  const clean = line
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*\.\s*(\d{2})/g, "$1.$2")
    .trim();

  const ranges = [];
  const regex = timeRangeRegex();
  const matches = Array.from(clean.matchAll(regex));

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];

    const start = normalizeTime(current[1]);
    const end = normalizeTime(current[2]);

    if (!start || !end) {
      continue;
    }

    const noteRaw = clean.slice(current.index + current[0].length, next ? next.index : clean.length).trim();
    const note = sanitizeNote(noteRaw);

    ranges.push({ start, end, note });
  }

  return ranges;
}

function dedupeSessions(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = [item.date || "*", item.start, item.end, item.activity || "", item.note || ""].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

function sanitizeNote(note) {
  if (!note) {
    return null;
  }

  let cleaned = note
    .replace(/^[-,.;:\s]+/, "")
    .replace(/[-,.;:\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  if (!cleaned) {
    return null;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function extractSupplementaryPrograms(lines) {
  const programs = [];
  let currentProgram = null;
  let currentWeekdays = [];

  for (const rawLine of lines || []) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/^обучение плаванию/i.test(line)) {
      finalizeSupplementaryProgram(programs, currentProgram);
      currentProgram = {
        title: line.replace(/:+$/, "").trim(),
        schedule: [],
        notes: [],
      };
      currentWeekdays = [];
      continue;
    }

    if (!currentProgram) {
      continue;
    }

    if (/^(расписание|срок действия абонементов|оплатить услуги|оплата услуг|стоимость услуг|желаем вам|в расписании возможны изменения)/i.test(line)) {
      finalizeSupplementaryProgram(programs, currentProgram);
      currentProgram = null;
      currentWeekdays = [];
      continue;
    }

    const weekdayPrefix = extractWeekdayPrefix(line);
    let lineToParse = line;

    if (weekdayPrefix.weekdays.length) {
      currentWeekdays = weekdayPrefix.weekdays;
      lineToParse = weekdayPrefix.tail;
    }

    const ranges = extractRangesFromLine(lineToParse);
    if (ranges.length) {
      for (const range of ranges) {
        currentProgram.schedule.push({
          weekdays: currentWeekdays.slice(),
          start: range.start,
          end: range.end,
          note: range.note || null,
        });
      }
      continue;
    }

    if (lineToParse) {
      currentProgram.notes.push(lineToParse);
    }
  }

  finalizeSupplementaryProgram(programs, currentProgram);
  return programs;
}

function finalizeSupplementaryProgram(programs, program) {
  if (!program || !program.title) {
    return;
  }

  const schedule = dedupeProgramSchedule(program.schedule || []);
  if (!schedule.length) {
    return;
  }

  programs.push({
    title: program.title,
    schedule,
    notes: uniq(program.notes || []),
  });
}

function dedupeProgramSchedule(items) {
  const seen = new Set();
  const result = [];

  for (const item of items || []) {
    const weekdays = Array.isArray(item?.weekdays)
      ? Array.from(new Set(item.weekdays.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6))).sort((a, b) => a - b)
      : [];
    const start = normalizeTime(item?.start);
    const end = normalizeTime(item?.end);
    const note = sanitizeNote(item?.note || "");

    if (!start || !end) {
      continue;
    }

    const normalized = {
      weekdays,
      start,
      end,
      note,
    };
    const key = [weekdays.join(","), start, end, note || ""].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result.sort((a, b) => {
    const weekdaysDiff = a.weekdays.join(",").localeCompare(b.weekdays.join(","));
    if (weekdaysDiff !== 0) {
      return weekdaysDiff;
    }
    return toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end);
  });
}

function extractWeekdayPrefix(line) {
  const weekdayPattern = "(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)";
  const matcher = new RegExp(`^(${weekdayPattern}(?:\\s*,\\s*${weekdayPattern})*)(.*)$`, "iu");
  const match = String(line || "").match(matcher);
  if (!match) {
    return { weekdays: [], tail: line };
  }

  return {
    weekdays: parseWeekdayList(match[1]),
    tail: normalizeLine(match[3] || ""),
  };
}

function parseWeekdayList(value) {
  const labels = String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const map = {
    "воскресенье": 0,
    "понедельник": 1,
    "вторник": 2,
    "среда": 3,
    "четверг": 4,
    "пятница": 5,
    "суббота": 6,
  };

  return Array.from(
    new Set(
      labels
        .map((label) => map[label])
        .filter((value) => Number.isInteger(value))
    )
  ).sort((a, b) => a - b);
}

function normalizeLine(line) {
  return line
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isTechnicalOrServiceLine(line) {
  return /^(оплата услуг|стоимость услуг|желаем вам|приносим свои извинения)$/i.test(
    line.toLowerCase()
  );
}

function isPostScheduleSection(line) {
  return /^(обучение плаванию|срок действия абонементов|оплатить услуги|оплата услуг|стоимость услуг|желаем вам|в расписании возможны изменения)/i.test(
    line
  );
}

function timeRangeRegex() {
  return /(\d{1,2}\s*[.:]\s*\d{2})\s*[-]\s*(\d{1,2}\s*[.:]\s*\d{2})/g;
}

function normalizeTime(value) {
  if (!value) {
    return null;
  }

  const match = value.replace(/\s+/g, "").match(/^(\d{1,2})[.:](\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function ddmmyyyyToIso(value) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function todayIsoInTimezone(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate, delta) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function isWeekendIso(isoDate) {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function expandDateRange(startIso, endIso) {
  if (!startIso || !endIso) {
    return [];
  }

  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const result = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function weekdayNameRu(isoDate) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const raw = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(date);

  return capitalizeWord(raw);
}

function capitalizeWord(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
