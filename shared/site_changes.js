(function (root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
    return;
  }

  root.SiteChangesUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function trimText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeDiffText(value) {
    return trimText(value).toLowerCase();
  }

  function sanitizeHttpUrl(value) {
    const text = trimText(value);
    if (!text) {
      return "";
    }

    try {
      const parsed = new URL(text);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }
      return parsed.toString();
    } catch {
      return "";
    }
  }

  function normalizeTime(value) {
    const match = String(value || "")
      .replace(/\s+/g, "")
      .match(/^(\d{1,2})[.:](\d{2})$/);
    if (!match) {
      return "";
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "";
    }

    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }

  function toMinutes(hhmm) {
    const parts = String(hhmm || "").split(":").map(Number);
    if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
      return -1;
    }
    return parts[0] * 60 + parts[1];
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return "[" + value.map(stableStringify).join(",") + "]";
    }

    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map(function (key) {
          return JSON.stringify(key) + ":" + stableStringify(value[key]);
        })
        .join(",") +
      "}"
    );
  }

  function stableHash(value) {
    const text = stableStringify(value);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return "h" + (hash >>> 0).toString(16).padStart(8, "0");
  }

  function normalizeSessionForComparison(session) {
    const start = normalizeTime(session && session.start);
    const end = normalizeTime(session && session.end);

    return {
      start: start,
      end: end,
      activity: trimText(session && session.activity),
      note: trimText(session && session.note),
    };
  }

  function sortSessions(a, b) {
    const diff = toMinutes(a.start) - toMinutes(b.start);
    if (diff !== 0) {
      return diff;
    }
    return toMinutes(a.end) - toMinutes(b.end);
  }

  function normalizeClosedWeekdays(value) {
    const values = Array.isArray(value) ? value : [];
    return Array.from(
      new Set(
        values
          .map(function (item) {
            return Number(item);
          })
          .filter(function (item) {
            return Number.isInteger(item) && item >= 0 && item <= 6;
          })
      )
    ).sort(function (a, b) {
      return a - b;
    });
  }

  function normalizeProgramScheduleItem(item) {
    const weekdays = normalizeClosedWeekdays(item && item.weekdays);
    const start = normalizeTime(item && item.start);
    const end = normalizeTime(item && item.end);
    const note = trimText(item && item.note);

    if (!start || !end) {
      return null;
    }

    return {
      weekdays: weekdays,
      start: start,
      end: end,
      note: note,
    };
  }

  function buildExtraProgramsForComparison(extraPrograms) {
    return (Array.isArray(extraPrograms) ? extraPrograms : [])
      .map(function (program) {
        const title = trimText(program && program.title);
        const schedule = (Array.isArray(program && program.schedule) ? program.schedule : [])
          .map(normalizeProgramScheduleItem)
          .filter(Boolean)
          .sort(function (a, b) {
            const weekdayDiff = a.weekdays.join(",").localeCompare(b.weekdays.join(","));
            if (weekdayDiff !== 0) {
              return weekdayDiff;
            }
            return toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end);
          });

        if (!title || !schedule.length) {
          return null;
        }

        return {
          title: title,
          schedule: schedule,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a.title.localeCompare(b.title, "ru");
      });
  }

  function buildTemplateDefinition(facility) {
    const existing = facility && facility.template && typeof facility.template === "object" ? facility.template : null;
    const existingSessions = Array.isArray(existing && existing.sessions)
      ? existing.sessions.map(normalizeSessionForComparison).filter(isComparableSession)
      : [];

    if (existingSessions.length || normalizeClosedWeekdays(existing && existing.closedWeekdays).length) {
      return {
        sessions: existingSessions.sort(sortSessions),
        closedWeekdays: normalizeClosedWeekdays(existing.closedWeekdays),
        windowStart: trimText(existing.windowStart || facility.windowStart),
        windowEnd: trimText(existing.windowEnd || facility.windowEnd),
      };
    }

    const days = Array.isArray(facility && facility.days) ? facility.days : [];
    const firstOpenDay = days.find(function (day) {
      return Array.isArray(day && day.sessions) && day.sessions.length > 0;
    });
    const closedWeekdays = [];

    for (const day of days) {
      const weekdayIndex = inferWeekdayIndex(day && day.date);
      if (
        weekdayIndex !== -1 &&
        trimText(day && day.closedReason) &&
        (!Array.isArray(day && day.sessions) || day.sessions.length === 0)
      ) {
        closedWeekdays.push(weekdayIndex);
      }
    }

    return {
      sessions: firstOpenDay
        ? firstOpenDay.sessions.map(normalizeSessionForComparison).filter(isComparableSession).sort(sortSessions)
        : [],
      closedWeekdays: normalizeClosedWeekdays(closedWeekdays),
      windowStart: trimText(days[0] && days[0].date),
      windowEnd: trimText(days[days.length - 1] && days[days.length - 1].date),
    };
  }

  function inferWeekdayIndex(isoDate) {
    const text = trimText(isoDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return -1;
    }

    const date = new Date(text + "T12:00:00Z");
    if (Number.isNaN(date.getTime())) {
      return -1;
    }

    return date.getUTCDay();
  }

  function isComparableSession(session) {
    return Boolean(session && session.start && session.end);
  }

  function buildDatedDaysForComparison(days) {
    return (Array.isArray(days) ? days : [])
      .map(function (day) {
        return {
          date: trimText(day && day.date),
          closedReason: trimText(day && day.closedReason),
          sessions: (Array.isArray(day && day.sessions) ? day.sessions : [])
            .map(normalizeSessionForComparison)
            .filter(isComparableSession)
            .sort(sortSessions),
        };
      })
      .filter(function (day) {
        return day.date;
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });
  }

  function inferComparisonMode(facility) {
    const explicit = trimText(facility && facility.comparisonMode);
    if (explicit === "dated" || explicit === "template") {
      return explicit;
    }

    if (trimText(facility && facility.mode) === "dailyTemplate") {
      return "template";
    }

    return "dated";
  }

  function inferDataQuality(facility) {
    const explicit = trimText(facility && facility.dataQuality);
    if (explicit) {
      return explicit;
    }

    const fetchState = trimText(facility && facility.fetchState).toLowerCase();
    if (fetchState === "error") {
      return "error";
    }
    if (fetchState === "stale_cache") {
      return "stale";
    }

    return inferComparisonMode(facility) === "template" ? "derived" : "exact";
  }

  function buildFacilityTrackingMeta(facility) {
    const comparisonMode = inferComparisonMode(facility);
    const dataQuality = inferDataQuality(facility);
    const datedDays = buildDatedDaysForComparison(facility && facility.days);
    const template = comparisonMode === "template" ? buildTemplateDefinition(facility) : null;
    const programs = buildExtraProgramsForComparison(facility && facility.extraPrograms);
    const warningList = (Array.isArray(facility && facility.warnings) ? facility.warnings : [])
      .map(trimText)
      .filter(Boolean);
    const noteList = (Array.isArray(facility && facility.notes) ? facility.notes : [])
      .map(trimText)
      .filter(Boolean);
    const issueText = trimText((facility && facility.sourceIssue) || (facility && facility.error));
    const fetchState = trimText(facility && facility.fetchState).toLowerCase();

    const facilityHash = stableHash({
      id: trimText(facility && facility.id),
      comparisonMode: comparisonMode,
      dataQuality: dataQuality,
      fetchState: fetchState,
      issueText: issueText,
      warnings: warningList,
      notes: noteList,
      programs: programs,
      days: datedDays,
      template: template
        ? {
            sessions: template.sessions,
            closedWeekdays: template.closedWeekdays,
            windowStart: template.windowStart,
            windowEnd: template.windowEnd,
          }
        : null,
    });

    const templateHash = template
      ? stableHash({
          id: trimText(facility && facility.id),
          sessions: template.sessions,
          closedWeekdays: template.closedWeekdays,
        })
      : "";

    const changeTrackingHash =
      comparisonMode === "template"
        ? stableHash({
            id: trimText(facility && facility.id),
            templateHash: templateHash,
            programs: programs,
          })
        : stableHash({
            id: trimText(facility && facility.id),
            days: datedDays,
            programs: programs,
          });

    return {
      comparisonMode: comparisonMode,
      dataQuality: dataQuality,
      facilityHash: facilityHash,
      templateHash: templateHash,
      changeTrackingHash: changeTrackingHash,
      windowStart: template ? template.windowStart : trimText(datedDays[0] && datedDays[0].date),
      windowEnd: template ? template.windowEnd : trimText(datedDays[datedDays.length - 1] && datedDays[datedDays.length - 1].date),
      template: template,
      programs: programs,
    };
  }

  function resolveFacilityTrackingMeta(facility) {
    const built = buildFacilityTrackingMeta(facility || {});
    return {
      comparisonMode: trimText(facility && facility.comparisonMode) || built.comparisonMode,
      dataQuality: trimText(facility && facility.dataQuality) || built.dataQuality,
      facilityHash: trimText(facility && facility.facilityHash) || built.facilityHash,
      templateHash: trimText(facility && facility.templateHash) || built.templateHash,
      changeTrackingHash: trimText(facility && facility.changeTrackingHash) || built.changeTrackingHash,
      windowStart: trimText(facility && facility.windowStart) || built.windowStart,
      windowEnd: trimText(facility && facility.windowEnd) || built.windowEnd,
      template: built.template,
      programs: built.programs,
    };
  }

  function buildScheduleSnapshotHash(payload) {
    const facilities = Array.isArray(payload && payload.facilities) ? payload.facilities : [];
    return stableHash({
      schemaVersion: Number(payload && payload.schemaVersion) || 0,
      timezone: trimText(payload && payload.timezone),
      facilities: facilities
        .map(function (facility) {
          const meta = resolveFacilityTrackingMeta(facility);
          return {
            id: trimText(facility && facility.id),
            changeTrackingHash: meta.changeTrackingHash,
            fetchState: trimText(facility && facility.fetchState).toLowerCase(),
            sourceIssue: trimText((facility && facility.sourceIssue) || (facility && facility.error)),
            dataQuality: meta.dataQuality,
          };
        })
        .sort(function (a, b) {
          return a.id.localeCompare(b.id);
        }),
    });
  }

  function buildSourceIssueDetailFromFacility(facility) {
    if (!isFacilitySourceUnavailable(facility)) {
      return null;
    }

    return {
      facilityId: trimText(facility && facility.id),
      facilityName: trimText(facility && facility.name),
      description: getFacilitySourceIssueText(facility),
      fetchState: trimText(facility && facility.fetchState).toLowerCase() || "error",
      sourceUrl: sanitizeHttpUrl(facility && facility.sourceUrl),
      dataQuality: inferDataQuality(facility),
    };
  }

  function buildSourceIssueDetails(payload) {
    const facilities = Array.isArray(payload && payload.facilities) ? payload.facilities : [];
    return facilities
      .map(buildSourceIssueDetailFromFacility)
      .filter(Boolean)
      .sort(function (a, b) {
        return a.facilityName.localeCompare(b.facilityName, "ru");
      });
  }

  function toFacilityMap(facilities) {
    const map = new Map();
    for (const facility of facilities || []) {
      const id = trimText(facility && facility.id);
      if (!id) {
        continue;
      }
      map.set(id, facility);
    }
    return map;
  }

  function toDayMap(days) {
    const map = new Map();
    for (const day of days || []) {
      const date = trimText(day && day.date);
      if (!date) {
        continue;
      }
      map.set(date, day);
    }
    return map;
  }

  function toSessionMap(sessions) {
    const map = new Map();
    for (const session of sessions || []) {
      const normalized = normalizeSessionForComparison(session);
      if (!isComparableSession(normalized)) {
        continue;
      }
      map.set(normalized.start + "-" + normalized.end, normalized);
    }
    return map;
  }

  function formatSessionSnapshot(session) {
    if (!session) {
      return "Сеанс не указан.";
    }

    const normalized = normalizeSessionForComparison(session);
    const timeLabel = normalized.start && normalized.end ? normalized.start + " — " + normalized.end : "Время не указано";
    const details = Array.from(
      new Set([normalized.activity, normalized.note].map(trimText).filter(Boolean))
    ).join(" · ");
    return details ? timeLabel + " · " + details : timeLabel;
  }

  function formatClosedWeekdays(closedWeekdays) {
    const labels = normalizeClosedWeekdays(closedWeekdays).map(function (weekday) {
      return ["воскресенье", "понедельник", "вторник", "среду", "четверг", "пятницу", "субботу"][weekday] || "";
    });
    if (!labels.length) {
      return "выходных правил нет";
    }
    return "закрыто в " + labels.join(", ");
  }

  function isFacilitySourceUnavailable(facility) {
    const fetchState = trimText(facility && facility.fetchState).toLowerCase();
    if (fetchState === "error" || fetchState === "stale_cache") {
      return true;
    }
    return Boolean(trimText(facility && facility.error) && getFacilityDayCount(facility) === 0);
  }

  function hasFacilityBrokenData(facility) {
    const fetchState = trimText(facility && facility.fetchState).toLowerCase();
    if (fetchState === "error") {
      return true;
    }
    return Boolean(trimText(facility && facility.error) && getFacilityDayCount(facility) === 0);
  }

  function getFacilityDayCount(facility) {
    return Array.isArray(facility && facility.days) ? facility.days.length : 0;
  }

  function getFacilitySourceIssueText(facility) {
    const sourceIssue = trimText((facility && facility.sourceIssue) || (facility && facility.error));
    if (sourceIssue) {
      return sourceIssue.slice(0, 240);
    }
    const warning = Array.isArray(facility && facility.warnings) ? trimText(facility.warnings[0]) : "";
    if (warning) {
      return warning.slice(0, 240);
    }
    return "Источник временно недоступен.";
  }

  function collectSourceIssueEvents(previousPayload, nextPayload) {
    const nextFacilities = toFacilityMap(nextPayload && nextPayload.facilities);
    const previousFacilities = toFacilityMap(previousPayload && previousPayload.facilities);
    const events = [];

    for (const entry of nextFacilities.entries()) {
      const facilityId = entry[0];
      const nextFacility = entry[1];
      const previousFacility = previousFacilities.get(facilityId) || null;

      if (!isFacilitySourceUnavailable(nextFacility)) {
        continue;
      }

      events.push({
        type: "source_issue",
        severity: "warning",
        scope: "source",
        facilityId: facilityId,
        facilityName: trimText((nextFacility && nextFacility.name) || (previousFacility && previousFacility.name) || facilityId),
        sourceUrl: sanitizeHttpUrl((nextFacility && nextFacility.sourceUrl) || (previousFacility && previousFacility.sourceUrl)),
        date: null,
        title: "Ошибка источника",
        description: getFacilitySourceIssueText(nextFacility),
        beforeText: "Источник работал штатно.",
        afterText: getFacilitySourceIssueText(nextFacility),
      });
    }

    return events.sort(compareSiteChangeEvent);
  }

  function diffSchedulePayload(previousPayload, nextPayload) {
    const events = [];
    const previousFacilities = toFacilityMap(previousPayload && previousPayload.facilities);
    const nextFacilities = toFacilityMap(nextPayload && nextPayload.facilities);
    const facilityIds = Array.from(new Set(Array.from(previousFacilities.keys()).concat(Array.from(nextFacilities.keys())))).sort();

    for (const facilityId of facilityIds) {
      const previousFacility = previousFacilities.get(facilityId) || null;
      const nextFacility = nextFacilities.get(facilityId) || null;
      const facilityName = trimText((nextFacility && nextFacility.name) || (previousFacility && previousFacility.name) || facilityId);
      const sourceUrl = sanitizeHttpUrl((nextFacility && nextFacility.sourceUrl) || (previousFacility && previousFacility.sourceUrl));

      if (hasFacilityBrokenData(previousFacility) || hasFacilityBrokenData(nextFacility)) {
        continue;
      }

      if (!previousFacility && nextFacility) {
        events.push({
          type: "facility_added",
          severity: "positive",
          scope: "facility",
          facilityId: facilityId,
          facilityName: facilityName,
          sourceUrl: sourceUrl,
          date: null,
          title: "Добавлен объект",
          description: "Объект «" + facilityName + "» появился в данных расписания.",
          beforeText: "Объект отсутствовал в расписании.",
          afterText: "Объект «" + facilityName + "» добавлен.",
        });
        continue;
      }

      if (previousFacility && !nextFacility) {
        events.push({
          type: "facility_removed",
          severity: "warning",
          scope: "facility",
          facilityId: facilityId,
          facilityName: facilityName,
          sourceUrl: sourceUrl,
          date: null,
          title: "Удалён объект",
          description: "Объект «" + facilityName + "» пропал из данных расписания.",
          beforeText: "Объект «" + facilityName + "» присутствовал в расписании.",
          afterText: "Объект удалён из расписания.",
        });
        continue;
      }

      const previousMeta = resolveFacilityTrackingMeta(previousFacility);
      const nextMeta = resolveFacilityTrackingMeta(nextFacility);
      if (previousMeta.changeTrackingHash && previousMeta.changeTrackingHash === nextMeta.changeTrackingHash) {
        continue;
      }

      if (nextMeta.comparisonMode === "template" || previousMeta.comparisonMode === "template") {
        events.push.apply(
          events,
          diffTemplateFacility(previousFacility, nextFacility, {
            facilityId: facilityId,
            facilityName: facilityName,
            sourceUrl: sourceUrl,
          })
        );
        continue;
      }

      events.push.apply(
        events,
        diffDatedFacility(previousFacility, nextFacility, {
          facilityId: facilityId,
          facilityName: facilityName,
          sourceUrl: sourceUrl,
        })
      );
    }

    return events.sort(compareSiteChangeEvent);
  }

  function diffDatedFacility(previousFacility, nextFacility, meta) {
    const events = [];
    const previousMeta = resolveFacilityTrackingMeta(previousFacility);
    const nextMeta = resolveFacilityTrackingMeta(nextFacility);
    const previousDays = toDayMap(previousFacility && previousFacility.days);
    const nextDays = toDayMap(nextFacility && nextFacility.days);
    const dates = Array.from(new Set(Array.from(previousDays.keys()).concat(Array.from(nextDays.keys())))).sort();
    const overlapWindow = resolveComparableDateWindow(previousFacility, nextFacility);

    for (const date of dates) {
      const previousDay = previousDays.get(date) || null;
      const nextDay = nextDays.get(date) || null;

      if (!previousDay && nextDay) {
        if (!shouldCompareWindowEdgeDate(date, overlapWindow)) {
          continue;
        }
        const sessionsCount = Array.isArray(nextDay.sessions) ? nextDay.sessions.length : 0;
        events.push({
          type: "day_added",
          severity: "positive",
          scope: "day",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: date,
          title: "Добавлены сутки",
          description: trimText(nextDay.closedReason)
            ? "Для даты добавлен статус закрытия."
            : "Новых сеансов: " + String(sessionsCount) + ".",
          beforeText: "Дата отсутствовала.",
          afterText: trimText(nextDay.closedReason)
            ? "Добавлен статус закрытия: " + trimText(nextDay.closedReason) + "."
            : "Добавлено сеансов: " + String(sessionsCount) + ".",
        });
        continue;
      }

      if (previousDay && !nextDay) {
        if (!shouldCompareWindowEdgeDate(date, overlapWindow)) {
          continue;
        }
        const sessionsCount = Array.isArray(previousDay.sessions) ? previousDay.sessions.length : 0;
        events.push({
          type: "day_removed",
          severity: "warning",
          scope: "day",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: date,
          title: "Удалены сутки",
          description: "Дата удалена из расписания (было сеансов: " + String(sessionsCount) + ").",
          beforeText: trimText(previousDay.closedReason)
            ? "Дата была закрыта (" + trimText(previousDay.closedReason) + ")."
            : "Было сеансов: " + String(sessionsCount) + ".",
          afterText: "Дата удалена из расписания.",
        });
        continue;
      }

      const previousClosed = normalizeDiffText(previousDay && previousDay.closedReason);
      const nextClosed = normalizeDiffText(nextDay && nextDay.closedReason);
      if (previousClosed !== nextClosed) {
        let title = "Изменён статус суток";
        let description = "Статус закрытия на дату изменился.";
        let severity = "info";

        if (!previousClosed && nextClosed) {
          title = "Объект закрыт";
          description = "Появилась причина: " + nextClosed + ".";
          severity = "warning";
        } else if (previousClosed && !nextClosed) {
          title = "Объект открыт";
          description = "Ранее закрытые сутки снова открыты.";
          severity = "positive";
        }

        events.push({
          type: "closure_changed",
          severity: severity,
          scope: "day",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: date,
          title: title,
          description: description,
          beforeText: previousClosed ? "Было: " + previousClosed + "." : "Было: объект открыт.",
          afterText: nextClosed ? "Стало: " + nextClosed + "." : "Стало: объект открыт.",
        });
      }

      const previousSessions = toSessionMap(previousDay && previousDay.sessions);
      const nextSessions = toSessionMap(nextDay && nextDay.sessions);
      const sessionKeys = Array.from(new Set(Array.from(previousSessions.keys()).concat(Array.from(nextSessions.keys())))).sort();

      for (const sessionKey of sessionKeys) {
        const previousSession = previousSessions.get(sessionKey) || null;
        const nextSession = nextSessions.get(sessionKey) || null;

        if (!previousSession && nextSession) {
          events.push({
            type: "session_added",
            severity: "positive",
            scope: "session",
            facilityId: meta.facilityId,
            facilityName: meta.facilityName,
            sourceUrl: meta.sourceUrl,
            date: date,
            title: "Добавлен сеанс",
            description: formatSessionSnapshot(nextSession),
            beforeText: "Сеанс отсутствовал.",
            afterText: formatSessionSnapshot(nextSession),
            start: nextSession.start,
            end: nextSession.end,
          });
          continue;
        }

        if (previousSession && !nextSession) {
          events.push({
            type: "session_removed",
            severity: "warning",
            scope: "session",
            facilityId: meta.facilityId,
            facilityName: meta.facilityName,
            sourceUrl: meta.sourceUrl,
            date: date,
            title: "Удалён сеанс",
            description: formatSessionSnapshot(previousSession),
            beforeText: formatSessionSnapshot(previousSession),
            afterText: "Сеанс удалён.",
            start: previousSession.start,
            end: previousSession.end,
          });
          continue;
        }

        if (
          normalizeDiffText(previousSession && previousSession.activity) !== normalizeDiffText(nextSession && nextSession.activity) ||
          normalizeDiffText(previousSession && previousSession.note) !== normalizeDiffText(nextSession && nextSession.note)
        ) {
          events.push({
            type: "session_updated",
            severity: "info",
            scope: "session",
            facilityId: meta.facilityId,
            facilityName: meta.facilityName,
            sourceUrl: meta.sourceUrl,
            date: date,
            title: "Изменён сеанс",
            description: nextSession.start + " — " + nextSession.end + " · обновлено описание/тип.",
            beforeText: formatSessionSnapshot(previousSession),
            afterText: formatSessionSnapshot(nextSession),
            start: nextSession.start,
            end: nextSession.end,
          });
        }
      }
    }

    events.push.apply(events, diffSupplementaryPrograms(previousMeta.programs, nextMeta.programs, meta));
    return events;
  }

  function resolveComparableDateWindow(previousFacility, nextFacility) {
    const previousMeta = resolveFacilityTrackingMeta(previousFacility);
    const nextMeta = resolveFacilityTrackingMeta(nextFacility);
    const previousStart = trimText(previousMeta.windowStart);
    const previousEnd = trimText(previousMeta.windowEnd);
    const nextStart = trimText(nextMeta.windowStart);
    const nextEnd = trimText(nextMeta.windowEnd);

    if (!previousStart || !previousEnd || !nextStart || !nextEnd) {
      return {
        isKnown: false,
        hasOverlap: true,
        start: "",
        end: "",
      };
    }

    const start = previousStart > nextStart ? previousStart : nextStart;
    const end = previousEnd < nextEnd ? previousEnd : nextEnd;

    return {
      isKnown: true,
      hasOverlap: start <= end,
      start: start <= end ? start : "",
      end: start <= end ? end : "",
    };
  }

  function shouldCompareWindowEdgeDate(date, overlapWindow) {
    const text = trimText(date);
    if (!text) {
      return false;
    }
    if (!overlapWindow || !overlapWindow.isKnown) {
      return true;
    }
    if (!overlapWindow.hasOverlap) {
      return false;
    }
    return text >= overlapWindow.start && text <= overlapWindow.end;
  }

  function diffTemplateFacility(previousFacility, nextFacility, meta) {
    const events = [];
    const previousMeta = resolveFacilityTrackingMeta(previousFacility);
    const nextMeta = resolveFacilityTrackingMeta(nextFacility);
    const previousTemplate = previousMeta.template || { sessions: [], closedWeekdays: [] };
    const nextTemplate = nextMeta.template || { sessions: [], closedWeekdays: [] };
    const previousSessions = toSessionMap(previousTemplate.sessions);
    const nextSessions = toSessionMap(nextTemplate.sessions);
    const sessionKeys = Array.from(new Set(Array.from(previousSessions.keys()).concat(Array.from(nextSessions.keys())))).sort();

    for (const sessionKey of sessionKeys) {
      const previousSession = previousSessions.get(sessionKey) || null;
      const nextSession = nextSessions.get(sessionKey) || null;

      if (!previousSession && nextSession) {
        events.push({
          type: "template_session_added",
          severity: "positive",
          scope: "template_session",
          template: true,
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          title: "Добавлен интервал в шаблоне",
          description: formatSessionSnapshot(nextSession),
          beforeText: "Интервал отсутствовал.",
          afterText: formatSessionSnapshot(nextSession),
          start: nextSession.start,
          end: nextSession.end,
        });
        continue;
      }

      if (previousSession && !nextSession) {
        events.push({
          type: "template_session_removed",
          severity: "warning",
          scope: "template_session",
          template: true,
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          title: "Удалён интервал из шаблона",
          description: formatSessionSnapshot(previousSession),
          beforeText: formatSessionSnapshot(previousSession),
          afterText: "Интервал удалён.",
          start: previousSession.start,
          end: previousSession.end,
        });
        continue;
      }

      if (
        normalizeDiffText(previousSession && previousSession.activity) !== normalizeDiffText(nextSession && nextSession.activity) ||
        normalizeDiffText(previousSession && previousSession.note) !== normalizeDiffText(nextSession && nextSession.note)
      ) {
        events.push({
          type: "template_session_updated",
          severity: "info",
          scope: "template_session",
          template: true,
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          title: "Изменён интервал в шаблоне",
          description: nextSession.start + " — " + nextSession.end + " · обновлено описание/тип.",
          beforeText: formatSessionSnapshot(previousSession),
          afterText: formatSessionSnapshot(nextSession),
          start: nextSession.start,
          end: nextSession.end,
        });
      }
    }

    const previousClosedSignature = normalizeClosedWeekdays(previousTemplate.closedWeekdays).join(",");
    const nextClosedSignature = normalizeClosedWeekdays(nextTemplate.closedWeekdays).join(",");
    if (previousClosedSignature !== nextClosedSignature) {
      events.push({
        type: "template_closure_changed",
        severity: "info",
        scope: "template_rule",
        template: true,
        facilityId: meta.facilityId,
        facilityName: meta.facilityName,
        sourceUrl: meta.sourceUrl,
        date: null,
        title: "Изменён шаблон выходных",
        description: "Обновлены правила закрытия для шаблонного источника.",
        beforeText: "Было: " + formatClosedWeekdays(previousTemplate.closedWeekdays) + ".",
        afterText: "Стало: " + formatClosedWeekdays(nextTemplate.closedWeekdays) + ".",
      });
    }

    events.push.apply(events, diffSupplementaryPrograms(previousMeta.programs, nextMeta.programs, meta));
    return events;
  }

  function toProgramMap(programs) {
    const map = new Map();
    for (const program of programs || []) {
      const title = trimText(program && program.title);
      if (!title) {
        continue;
      }
      map.set(title, program);
    }
    return map;
  }

  function formatWeekdayRule(weekdays) {
    const labels = normalizeClosedWeekdays(weekdays).map(function (weekday) {
      return ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"][weekday] || "";
    }).filter(Boolean);
    return labels.join(", ");
  }

  function formatProgramSnapshot(program) {
    if (!program || !Array.isArray(program.schedule) || !program.schedule.length) {
      return "Детали программы не указаны.";
    }

    const previews = program.schedule.slice(0, 4).map(function (item) {
      const weekdayLabel = formatWeekdayRule(item.weekdays);
      const timeLabel = item.start + " — " + item.end;
      const note = trimText(item.note);
      const suffix = note ? " (" + note + ")" : "";
      return weekdayLabel ? weekdayLabel + ": " + timeLabel + suffix : timeLabel + suffix;
    });

    if (program.schedule.length > previews.length) {
      previews.push("и ещё " + String(program.schedule.length - previews.length));
    }

    return previews.join("; ");
  }

  function diffSupplementaryPrograms(previousPrograms, nextPrograms, meta) {
    const events = [];
    const previousMap = toProgramMap(previousPrograms);
    const nextMap = toProgramMap(nextPrograms);
    const titles = Array.from(new Set(Array.from(previousMap.keys()).concat(Array.from(nextMap.keys())))).sort(function (a, b) {
      return a.localeCompare(b, "ru");
    });

    for (const title of titles) {
      const previousProgram = previousMap.get(title) || null;
      const nextProgram = nextMap.get(title) || null;

      if (!previousProgram && nextProgram) {
        events.push({
          type: "program_added",
          severity: "positive",
          scope: "program",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          programTitle: title,
          title: "Добавлена программа",
          description: title,
          beforeText: "Программа отсутствовала.",
          afterText: formatProgramSnapshot(nextProgram),
        });
        continue;
      }

      if (previousProgram && !nextProgram) {
        events.push({
          type: "program_removed",
          severity: "warning",
          scope: "program",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          programTitle: title,
          title: "Удалена программа",
          description: title,
          beforeText: formatProgramSnapshot(previousProgram),
          afterText: "Программа удалена.",
        });
        continue;
      }

      if (stableHash(previousProgram.schedule) !== stableHash(nextProgram.schedule)) {
        events.push({
          type: "program_updated",
          severity: "info",
          scope: "program",
          facilityId: meta.facilityId,
          facilityName: meta.facilityName,
          sourceUrl: meta.sourceUrl,
          date: null,
          programTitle: title,
          title: "Обновлена программа",
          description: title,
          beforeText: formatProgramSnapshot(previousProgram),
          afterText: formatProgramSnapshot(nextProgram),
        });
      }
    }

    return events;
  }

  function summarizeChangeEvents(events) {
    const filtered = (events || []).filter(function (event) {
      return !String(event && event.type || "").startsWith("source_");
    });

    const summary = {
      total: filtered.length,
      added: 0,
      removed: 0,
      updated: 0,
    };

    for (const event of filtered) {
      const type = trimText(event && event.type);
      if (type.endsWith("_added")) {
        summary.added += 1;
        continue;
      }
      if (type.endsWith("_removed")) {
        summary.removed += 1;
        continue;
      }
      summary.updated += 1;
    }

    return summary;
  }

  function buildSourceIssueSignature(sourceIssues) {
    if (!Array.isArray(sourceIssues) || !sourceIssues.length) {
      return "";
    }

    return sourceIssues
      .map(function (item) {
        return trimText(item && item.facilityId) + ":" + normalizeDiffText((item && item.description) || (item && item.title));
      })
      .sort()
      .join("|");
  }

  function buildSiteChangesSignature(summary, events, sourceIssues, options) {
    const normalizedOptions = options || {};
    const summaryPart =
      String(Number(summary && summary.total || 0)) +
      ":" +
      String(Number(summary && summary.added || 0)) +
      ":" +
      String(Number(summary && summary.removed || 0)) +
      ":" +
      String(Number(summary && summary.updated || 0));
    const issuePart = buildSourceIssueSignature(sourceIssues);
    const eventPart = (events || [])
      .slice(0, 10)
      .map(function (event) {
        return [
          trimText(event && event.type),
          trimText(event && event.facilityId),
          trimText(event && event.date),
          normalizeDiffText((event && event.beforeText) || ""),
          normalizeDiffText((event && event.afterText) || (event && event.description) || ""),
        ].join(":");
      })
      .join("|");

    return [
      trimText(normalizedOptions.entryType),
      normalizedOptions.hasChanges ? "1" : "0",
      normalizedOptions.hasSourceIssues ? "1" : "0",
      summaryPart,
      issuePart,
      eventPart,
    ].join("#");
  }

  function compareSiteChangeEvent(a, b) {
    const dateA = trimText(a && a.date) || "9999-12-31";
    const dateB = trimText(b && b.date) || "9999-12-31";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    const facilityA = trimText(a && a.facilityName);
    const facilityB = trimText(b && b.facilityName);
    if (facilityA !== facilityB) {
      return facilityA.localeCompare(facilityB, "ru");
    }

    return trimText(a && a.title).localeCompare(trimText(b && b.title), "ru");
  }

  function countAffectedMetrics(events, sourceIssues) {
    const facilityIds = new Set();
    const dates = new Set();

    for (const item of (events || []).concat(sourceIssues || [])) {
      const facilityId = trimText(item && item.facilityId);
      if (facilityId) {
        facilityIds.add(facilityId);
      }
      const date = trimText(item && item.date);
      if (date) {
        dates.add(date);
      }
    }

    return {
      affectedFacilityCount: facilityIds.size,
      affectedDateCount: dates.size,
    };
  }

  function buildScheduleComparison(previousPayload, nextPayload) {
    const sourceIssues = collectSourceIssueEvents(previousPayload, nextPayload);
    const events = diffSchedulePayload(previousPayload, nextPayload);
    const summary = summarizeChangeEvents(events);
    const hasChanges = summary.total > 0;
    const hasSourceIssues = sourceIssues.length > 0;
    const entryType = hasSourceIssues ? (hasChanges ? "schedule_with_source_issues" : "source_error") : "schedule_diff";
    const metrics = countAffectedMetrics(events, sourceIssues);

    return {
      events: events,
      sourceIssues: sourceIssues,
      summary: summary,
      hasChanges: hasChanges,
      hasSourceIssues: hasSourceIssues,
      entryType: entryType,
      signature: buildSiteChangesSignature(summary, events, sourceIssues, {
        hasChanges: hasChanges,
        hasSourceIssues: hasSourceIssues,
        entryType: entryType,
      }),
      metrics: metrics,
    };
  }

  return {
    buildFacilityTrackingMeta: buildFacilityTrackingMeta,
    buildScheduleComparison: buildScheduleComparison,
    buildScheduleSnapshotHash: buildScheduleSnapshotHash,
    buildSiteChangesSignature: buildSiteChangesSignature,
    buildSourceIssueDetails: buildSourceIssueDetails,
    buildSourceIssueSignature: buildSourceIssueSignature,
    collectSourceIssueEvents: collectSourceIssueEvents,
    compareSiteChangeEvent: compareSiteChangeEvent,
    diffSchedulePayload: diffSchedulePayload,
    formatSessionSnapshot: formatSessionSnapshot,
    getFacilitySourceIssueText: getFacilitySourceIssueText,
    hasFacilityBrokenData: hasFacilityBrokenData,
    isFacilitySourceUnavailable: isFacilitySourceUnavailable,
    normalizeDiffText: normalizeDiffText,
    normalizeTime: normalizeTime,
    sanitizeHttpUrl: sanitizeHttpUrl,
    stableHash: stableHash,
    summarizeChangeEvents: summarizeChangeEvents,
    toMinutes: toMinutes,
    trimText: trimText,
  };
});
