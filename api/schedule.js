const TIMEZONE = "Europe/Minsk";
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DAYS_WINDOW = 8;
const SOURCE_DISCOVERY_TTL_MS = 20 * 60 * 1000;
const SITEMAP_URL = "https://www.polessu.by/sitemap.xml";
const FETCH_TIMEOUT_MS = 10 * 1000;
const SCHEMA_VERSION = 3;

const siteChangesUtils = require("../shared/site_changes.js");

const FACILITIES = [
  {
    id: "ice_arena",
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
  const lines = htmlToLines(extractFieldContent(html));
  const parsed =
    facility.mode === "dated" ? parseDated(lines, facility) : parseDailyTemplate(lines, facility, DEFAULT_DAYS_WINDOW);

  if (!isParsedResultUsable(parsed)) {
    const warning = Array.isArray(parsed?.warnings) ? parsed.warnings.find((item) => /не найдено/i.test(String(item || ""))) : "";
    throw new Error(String(warning || "На странице нет пригодного расписания"));
  }

  return parsed;
}

function isParsedResultUsable(parsed) {
  const days = Array.isArray(parsed?.days) ? parsed.days : [];
  if (!days.length) {
    return false;
  }
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings : [];
  return !warnings.some((item) => /не найдено (датированного расписания|шаблонных интервалов времени)/i.test(String(item || "")));
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
  } finally {
    clearTimeout(timeout);
  }
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

function parseDated(lines, facility) {
  const dayMap = new Map();
  const notes = [];
  const warnings = [];
  const extraPrograms = extractSupplementaryPrograms(lines);

  let currentDate = null;
  let currentWeekday = null;
  let pendingClosureRange = null;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      continue;
    }

    if (isTechnicalOrServiceLine(line)) {
      continue;
    }

    const rangeHeader = line.match(
      /^(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})\s*[-]\s*(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})$/u
    );
    if (rangeHeader) {
      pendingClosureRange = {
        startDate: ddmmyyyyToIso(rangeHeader[2]),
        endDate: ddmmyyyyToIso(rangeHeader[4]),
        weekdayStart: rangeHeader[1],
        weekdayEnd: rangeHeader[3],
      };
      continue;
    }

    const datedHeader = line.match(/^(\p{L}+?)\s+(\d{2}\.\d{2}\.\d{4})(.*)$/u);
    if (datedHeader) {
      currentWeekday = capitalizeWord(datedHeader[1]);
      currentDate = ddmmyyyyToIso(datedHeader[2]);
      ensureDay(dayMap, currentDate, currentWeekday);

      const tail = normalizeLine(datedHeader[3]);
      if (tail) {
        upsertTimeRangesFromLine(dayMap, currentDate, facility, tail);
      }
      continue;
    }

    if (pendingClosureRange && /не работает|санитарный|техническим причинам/i.test(line)) {
      const closureDates = expandDateRange(pendingClosureRange.startDate, pendingClosureRange.endDate);
      for (const date of closureDates) {
        const weekday = weekdayNameRu(date);
        const day = ensureDay(dayMap, date, weekday);
        day.closedReason = line;
      }
      pendingClosureRange = null;
      continue;
    }

    if (!currentDate) {
      if (/расписан/i.test(line)) {
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

    const rangesAdded = upsertTimeRangesFromLine(dayMap, currentDate, facility, line);
    if (!rangesAdded && /расписан|изменени|обучени|абонемент|оплат/i.test(line)) {
      notes.push(line);
    }
  }

  const days = Array.from(dayMap.values())
    .map((day) => ({
      ...day,
      sessions: day.sessions.sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (days.length === 0) {
    warnings.push("На странице не найдено датированного расписания");
  }

  return {
    days,
    template: null,
    extraPrograms,
    notes: uniq(notes),
    warnings,
  };
}

function parseDailyTemplate(lines, facility, daysWindow) {
  const notes = [];
  const warnings = [];

  const templateSessions = [];

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line || isTechnicalOrServiceLine(line)) {
      continue;
    }

    if (/расписан/i.test(line) && !timeRangeRegex().test(line)) {
      notes.push(line);
      continue;
    }

    const ranges = extractRangesFromLine(line);
    if (ranges.length === 0) {
      if (/ерип|стоимост|впечатлен/i.test(line)) {
        continue;
      }
      notes.push(line);
      continue;
    }

    for (const range of ranges) {
      templateSessions.push({
        start: range.start,
        end: range.end,
        activity: range.note || facility.defaults.activity,
        note: range.note || null,
        sourceLine: line,
      });
    }
  }

  const uniqueTemplate = dedupeSessions(templateSessions);

  if (uniqueTemplate.length === 0) {
    warnings.push("На странице не найдено шаблонных интервалов времени");
  }

  const today = todayIsoInTimezone(TIMEZONE);
  const days = [];
  const closedWeekdays = facility.id === "rowing_base" ? [0, 6] : [];

  for (let i = 0; i < daysWindow; i += 1) {
    const date = addDays(today, i);
    const weekday = weekdayNameRu(date);
    const isRowingWeekendClosed = closedWeekdays.length > 0 && isWeekendIso(date);

    days.push({
      date,
      weekday,
      sessions: isRowingWeekendClosed
        ? []
        : uniqueTemplate.map((session) => ({
            ...session,
            date,
            weekday,
          })),
      closedReason: isRowingWeekendClosed ? "Выходной день" : null,
      sourceType: "template",
    });
  }

  notes.unshift("Источник публикует интервалы без конкретных дат; применен шаблон на ближайшие дни");
  if (facility.id === "rowing_base") {
    notes.unshift("Для гребной базы суббота и воскресенье отмечаются как выходные дни");
  }

  return {
    days,
    template: {
      sessions: uniqueTemplate.map((session) => ({
        start: session.start,
        end: session.end,
        activity: session.activity,
        note: session.note || null,
      })),
      closedWeekdays,
      windowStart: days[0]?.date || null,
      windowEnd: days[days.length - 1]?.date || null,
    },
    extraPrograms: [],
    notes: uniq(notes),
    warnings,
  };
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

function upsertTimeRangesFromLine(dayMap, date, facility, line) {
  const ranges = extractRangesFromLine(line);
  if (ranges.length === 0) {
    return 0;
  }

  const day = dayMap.get(date);
  for (const range of ranges) {
    day.sessions.push({
      date,
      weekday: day.weekday,
      start: range.start,
      end: range.end,
      activity: range.note || facility.defaults.activity,
      note: range.note || null,
      sourceLine: line,
    });
  }

  day.sessions = dedupeSessions(day.sessions);
  return ranges.length;
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
