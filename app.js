const STORAGE = {
  settings: "polessu_schedule_settings_v2",
  cache: "polessu_schedule_cache_v2",
  myShifts: "polessu_schedule_my_shifts_v1",
  myShiftFormExpanded: "polessu_schedule_my_shift_form_expanded_v1",
};

const DEFAULT_SETTINGS = {
  theme: "light",
  autoRefreshMins: 0,
};

const FACILITY_ICON = {
  ice_arena: "ac_unit",
  sports_pool: "pool",
  small_pool: "waves",
  rowing_base: "fitness_center",
};

const state = {
  data: null,
  selectedFacilityId: null,
  selectedDate: null,
  view: "schedule",
  settings: loadSettings(),
  myShifts: loadMyShifts(),
  myScheduleMonth: currentMonthIso(),
  myShiftFormExpanded: loadMyShiftFormExpanded(),
  autoRefreshTimer: null,
  updatedAtTicker: null,
  expandedTimelineByFacility: {},
  scrollSpyRafId: null,
  initialDaySnapDone: false,
  fetchInFlight: false,
  refreshFeedbackTimers: {
    header: null,
    mySchedule: null,
  },
  myScheduleNoticeTimer: null,
  myCharts: {
    facility: null,
  },
  chartResizeRafId: null,
};

const el = {
  scheduleView: document.getElementById("scheduleView"),
  settingsView: document.getElementById("settingsView"),
  myScheduleView: document.getElementById("myScheduleView"),
  facilityDock: document.getElementById("facilityDock"),
  facilityMeta: document.getElementById("facilityMeta"),
  updatedAt: document.getElementById("updatedAt"),
  myScheduleUpdatedAt: document.getElementById("myScheduleUpdatedAt"),
  livePill: document.getElementById("livePill"),
  liveText: document.getElementById("liveText"),
  refreshButton: document.getElementById("refreshButton"),
  refreshIcon: document.getElementById("refreshIcon"),
  myScheduleRefreshButton: document.getElementById("myScheduleRefreshButton"),
  myScheduleRefreshIcon: document.getElementById("myScheduleRefreshIcon"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  openMyScheduleButton: document.getElementById("openMyScheduleButton"),
  backFromSettingsButton: document.getElementById("backFromSettingsButton"),
  backFromMyScheduleButton: document.getElementById("backFromMyScheduleButton"),
  facilityTabs: document.getElementById("facilityTabs"),
  dateTabs: document.getElementById("dateTabs"),
  closureBanner: document.getElementById("closureBanner"),
  timeline: document.getElementById("timeline"),
  emptyState: document.getElementById("emptyState"),
  themeSelector: document.getElementById("themeSelector"),
  autoRefreshSelect: document.getElementById("autoRefreshSelect"),
  settingsRefreshButton: document.getElementById("settingsRefreshButton"),
  exportMyShiftsButton: document.getElementById("exportMyShiftsButton"),
  importMyShiftsButton: document.getElementById("importMyShiftsButton"),
  importMyShiftsInput: document.getElementById("importMyShiftsInput"),
  myShiftsDataNotice: document.getElementById("myShiftsDataNotice"),
  sourceList: document.getElementById("sourceList"),
  myMonthTitle: document.getElementById("myMonthTitle"),
  myMonthSummary: document.getElementById("myMonthSummary"),
  myMonthInput: document.getElementById("myMonthInput"),
  myMonthPrevButton: document.getElementById("myMonthPrevButton"),
  myMonthNextButton: document.getElementById("myMonthNextButton"),
  myShiftForm: document.getElementById("myShiftForm"),
  myShiftDateInput: document.getElementById("myShiftDateInput"),
  myShiftFacilitySelect: document.getElementById("myShiftFacilitySelect"),
  myShiftStartInput: document.getElementById("myShiftStartInput"),
  myShiftEndInput: document.getElementById("myShiftEndInput"),
  myShiftNoteInput: document.getElementById("myShiftNoteInput"),
  myScheduleNotice: document.getElementById("myScheduleNotice"),
  myMetricShifts: document.getElementById("myMetricShifts"),
  myMetricAverageHours: document.getElementById("myMetricAverageHours"),
  myMetricNextShift: document.getElementById("myMetricNextShift"),
  myScheduleTimeline: document.getElementById("myScheduleTimeline"),
  myShiftToggleButton: document.getElementById("myShiftToggleButton"),
  myShiftToggleIcon: document.getElementById("myShiftToggleIcon"),
  myShiftFormContainer: document.getElementById("myShiftFormContainer"),
  myFacilityShareChart: document.getElementById("myFacilityShareChart"),
};

init();

function init() {
  applyTheme(state.settings.theme);
  hydrateSettingsUI();
  bindEvents();
  hydrateMyScheduleUI();
  loadFromLocalCache();
  setupUpdatedAtTicker();
  fetchSchedule(false, { source: "init" });
  setupAutoRefresh();
}

function bindEvents() {
  el.refreshButton.addEventListener("click", () => fetchSchedule(true, { source: "header" }));
  el.settingsRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "settings" }));
  if (el.myScheduleRefreshButton) {
    el.myScheduleRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "my_schedule" }));
  }

  el.openSettingsButton.addEventListener("click", () => setView("settings"));
  el.openMyScheduleButton.addEventListener("click", () => setView("my_schedule"));
  el.backFromSettingsButton.addEventListener("click", () => setView("schedule"));
  el.backFromMyScheduleButton.addEventListener("click", () => setView("schedule"));

  if (el.myMonthInput) {
    el.myMonthInput.addEventListener("change", () => {
      const month = String(el.myMonthInput.value || "");
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return;
      }
      state.myScheduleMonth = month;
      renderMySchedule();
    });
  }

  if (el.myMonthPrevButton) {
    el.myMonthPrevButton.addEventListener("click", () => {
      state.myScheduleMonth = shiftMonthKey(state.myScheduleMonth, -1);
      renderMySchedule();
    });
  }

  if (el.myMonthNextButton) {
    el.myMonthNextButton.addEventListener("click", () => {
      state.myScheduleMonth = shiftMonthKey(state.myScheduleMonth, 1);
      renderMySchedule();
    });
  }

  if (el.myShiftForm) {
    el.myShiftForm.addEventListener("submit", handleMyShiftSubmit);
  }

  if (el.myScheduleTimeline) {
    el.myScheduleTimeline.addEventListener("click", handleMyScheduleTimelineClick);
  }

  if (el.myShiftToggleButton) {
    el.myShiftToggleButton.addEventListener("click", () => {
      setMyShiftFormExpanded(!state.myShiftFormExpanded);
    });
  }

  if (el.exportMyShiftsButton) {
    el.exportMyShiftsButton.addEventListener("click", exportMyShiftsHistory);
  }

  if (el.importMyShiftsButton && el.importMyShiftsInput) {
    el.importMyShiftsButton.addEventListener("click", () => {
      el.importMyShiftsInput.click();
    });
  }

  if (el.importMyShiftsInput) {
    el.importMyShiftsInput.addEventListener("change", handleMyShiftsImport);
  }

  el.autoRefreshSelect.addEventListener("change", () => {
    state.settings.autoRefreshMins = Number(el.autoRefreshSelect.value || 0);
    saveSettings();
    setupAutoRefresh();
  });

  el.themeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-theme]");
    if (!button) {
      return;
    }

    state.settings.theme = button.dataset.theme;
    saveSettings();
    applyTheme(state.settings.theme);
    hydrateThemeButtons();
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.theme === "system") {
      applyTheme("system");
    }
  });

  window.addEventListener("scroll", handleScheduleScroll, { passive: true });
  window.addEventListener("resize", requestMyChartsResize, { passive: true });
}

function setView(view) {
  state.view = view;

  const showSchedule = view === "schedule";
  const showSettings = view === "settings";
  const showMySchedule = view === "my_schedule";

  el.scheduleView.hidden = !showSchedule;
  el.settingsView.hidden = !showSettings;
  el.myScheduleView.hidden = !showMySchedule;
  el.facilityDock.hidden = !showSchedule;

  if (showMySchedule) {
    renderMySchedule();
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function handleScheduleScroll() {
  if (state.view !== "schedule") {
    return;
  }

  const facility = getSelectedFacility();
  if (!facility) {
    return;
  }

  if (isTimelineExpanded(facility.id)) {
    requestActiveDateSync();
    return;
  }

  if (window.scrollY < 180) {
    return;
  }

  if (facility.days.length <= 1) {
    return;
  }

  state.expandedTimelineByFacility[facility.id] = true;
  renderDateTabs({ scrollBehavior: "auto" });
  renderTimeline();
  requestActiveDateSync();
}

function requestActiveDateSync() {
  if (state.scrollSpyRafId) {
    return;
  }

  state.scrollSpyRafId = window.requestAnimationFrame(() => {
    state.scrollSpyRafId = null;
    syncActiveDateByScroll();
  });
}

function syncActiveDateByScroll() {
  const facility = getSelectedFacility();
  if (!facility || !isTimelineExpanded(facility.id)) {
    return;
  }

  const sections = Array.from(el.timeline.querySelectorAll(".day-section[id^='day-']"));
  if (!sections.length) {
    return;
  }

  const header = document.getElementById("scheduleHeader");
  const markerOffset = (header ? header.getBoundingClientRect().height : 0) + 24;
  const markerY = window.scrollY + markerOffset;

  let activeSection = sections[0];
  for (const section of sections) {
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    if (sectionTop <= markerY) {
      activeSection = section;
      continue;
    }
    break;
  }

  const activeDate = activeSection.id.replace(/^day-/, "");
  if (activeDate && activeDate !== state.selectedDate) {
    state.selectedDate = activeDate;
    updateDateChipSelection("smooth");
  }
}

function loadFromLocalCache() {
  const raw = localStorage.getItem(STORAGE.cache);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.payload) {
      return;
    }

    state.data = parsed.payload;
    initializeSelection();
    renderAll();
    if (!state.initialDaySnapDone) {
      focusCurrentDateInTimeline({ behavior: "auto", block: "center" });
      state.initialDaySnapDone = true;
    }
    setLiveText("Показаны сохраненные данные", false);
  } catch {
    // ignore cache parse errors
  }
}

async function fetchSchedule(force, options = {}) {
  const { source = "auto" } = options;
  const isHeaderRefresh = source === "header";
  const isMyScheduleRefresh = source === "my_schedule";

  if (state.fetchInFlight) {
    if (isHeaderRefresh) {
      pulseRefreshButton(el.refreshButton);
    }
    if (isMyScheduleRefresh) {
      pulseRefreshButton(el.myScheduleRefreshButton);
    }
    return;
  }

  state.fetchInFlight = true;
  if (isHeaderRefresh) {
    setRefreshButtonLoading(true, {
      button: el.refreshButton,
      icon: el.refreshIcon,
    });
  }
  if (isMyScheduleRefresh) {
    setRefreshButtonLoading(true, {
      button: el.myScheduleRefreshButton,
      icon: el.myScheduleRefreshIcon,
    });
  }

  setLiveText("Обновляем расписание…", true);

  const query = force ? "?refresh=1" : "";

  try {
    const response = await fetch(`/api/schedule${query}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    state.data = payload;

    initializeSelection();
    renderAll();
    if (!state.initialDaySnapDone) {
      focusCurrentDateInTimeline({ behavior: "auto", block: "center" });
      state.initialDaySnapDone = true;
    }

    localStorage.setItem(
      STORAGE.cache,
      JSON.stringify({
        at: new Date().toISOString(),
        payload,
      })
    );

    setLiveText(payload.meta?.cached ? "Получено из кэша сервера" : "Данные актуальны", false);
    if (isHeaderRefresh) {
      showRefreshResult("success", {
        button: el.refreshButton,
        timerKey: "header",
      });
    }
    if (isMyScheduleRefresh) {
      showRefreshResult("success", {
        button: el.myScheduleRefreshButton,
        timerKey: "mySchedule",
      });
    }
  } catch (error) {
    setLiveText("Ошибка обновления", false);
    if (isHeaderRefresh) {
      showRefreshResult("error", {
        button: el.refreshButton,
        timerKey: "header",
      });
    }
    if (isMyScheduleRefresh) {
      showRefreshResult("error", {
        button: el.myScheduleRefreshButton,
        timerKey: "mySchedule",
      });
    }
    if (!state.data) {
      showErrorEmpty(error);
    }
  } finally {
    state.fetchInFlight = false;
    if (isHeaderRefresh) {
      setRefreshButtonLoading(false, {
        button: el.refreshButton,
        icon: el.refreshIcon,
      });
    }
    if (isMyScheduleRefresh) {
      setRefreshButtonLoading(false, {
        button: el.myScheduleRefreshButton,
        icon: el.myScheduleRefreshIcon,
      });
    }
  }
}

function initializeSelection() {
  if (!state.data?.facilities?.length) {
    return;
  }

  const selectedExists = state.data.facilities.some((f) => f.id === state.selectedFacilityId);
  if (!selectedExists) {
    state.selectedFacilityId = state.data.facilities[0].id;
  }

  const facility = getSelectedFacility();
  if (!facility) {
    return;
  }

  const dateExists = facility.days.some((day) => day.date === state.selectedDate);
  if (!dateExists) {
    state.selectedDate = pickDefaultDate(facility);
  }

  if (state.expandedTimelineByFacility[facility.id] === undefined) {
    state.expandedTimelineByFacility[facility.id] = true;
  }
}

function isTimelineExpanded(facilityId) {
  return Boolean(state.expandedTimelineByFacility[facilityId]);
}

function scrollToDaySection(isoDate, options = {}) {
  const { behavior = "smooth", block = "start" } = options;
  const target = document.getElementById(`day-${isoDate}`);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior, block });
}

function focusCurrentDateInTimeline(options = {}) {
  const { behavior = "auto", block = "center" } = options;
  const facility = getSelectedFacility();
  if (!facility) {
    return;
  }

  const today = todayIso();
  const targetDate = facility.days.some((day) => day.date === today) ? today : state.selectedDate;
  if (!targetDate) {
    return;
  }

  if (state.selectedDate !== targetDate) {
    state.selectedDate = targetDate;
    renderDateTabs({ scrollBehavior: "auto" });
    renderTimeline();
  }

  scrollToDaySection(targetDate, { behavior, block });
  requestActiveDateSync();
}

function ensureActiveDateChipVisible(behavior = "auto") {
  if (!el.dateTabs || !state.selectedDate) {
    return;
  }

  const activeChip = el.dateTabs.querySelector(`button[data-date="${state.selectedDate}"]`);
  if (!activeChip) {
    return;
  }

  const containerWidth = el.dateTabs.clientWidth;
  if (!containerWidth) {
    return;
  }

  const targetLeft = activeChip.offsetLeft - (containerWidth - activeChip.offsetWidth) / 2;
  const maxScroll = Math.max(0, el.dateTabs.scrollWidth - containerWidth);
  const clampedLeft = Math.min(maxScroll, Math.max(0, targetLeft));

  el.dateTabs.scrollTo({
    left: clampedLeft,
    behavior,
  });
}

function updateDateChipSelection(scrollBehavior = "auto") {
  const chips = Array.from(el.dateTabs.querySelectorAll("button[data-date]"));
  if (!chips.length) {
    return;
  }

  let hasActiveChip = false;

  chips.forEach((chip) => {
    const isActive = chip.dataset.date === state.selectedDate;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-selected", String(isActive));
    chip.tabIndex = isActive ? 0 : -1;
    hasActiveChip = hasActiveChip || isActive;
  });

  if (hasActiveChip) {
    ensureActiveDateChipVisible(scrollBehavior);
  }
}

function renderAll() {
  renderFacilityTabs();
  renderDateTabs({ scrollBehavior: "auto" });
  renderHeader();
  renderTimeline();
  renderSources();
  renderMySchedule();
}

function renderHeader() {
  const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
  el.updatedAt.textContent = freshness.mainText;
  if (el.myScheduleUpdatedAt) {
    el.myScheduleUpdatedAt.textContent = freshness.shortText;
    el.myScheduleUpdatedAt.title = freshness.tooltip;
  }

  const facility = getSelectedFacility();
  if (!facility) {
    return;
  }

  el.facilityMeta.textContent = facility.name;
}

function setupUpdatedAtTicker() {
  if (state.updatedAtTicker) {
    window.clearInterval(state.updatedAtTicker);
  }

  state.updatedAtTicker = window.setInterval(() => {
    if (!state.data?.generatedAt) {
      return;
    }
    renderHeader();
  }, 60_000);
}

function buildScheduleFreshnessState(generatedAtValue) {
  if (!generatedAtValue) {
    return {
      mainText: "Нет данных",
      shortText: "Нет данных",
      tooltip: "Данные ещё не загружены",
    };
  }

  const generatedAt = new Date(generatedAtValue);
  if (Number.isNaN(generatedAt.getTime())) {
    return {
      mainText: "Нет данных",
      shortText: "Нет данных",
      tooltip: "Не удалось определить время обновления",
    };
  }

  const timeText = generatedAt.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const relativeLong = formatRelativeAge(generatedAt, { compact: false });
  const relativeShort = formatRelativeAge(generatedAt, { compact: true });

  return {
    mainText: `Обновлено ${timeText}${relativeLong ? ` · ${relativeLong}` : ""}`,
    shortText: `${timeText}${relativeShort ? ` · ${relativeShort}` : ""}`,
    tooltip: `Обновлено ${generatedAt.toLocaleString("ru-RU")}${relativeLong ? ` (${relativeLong})` : ""}`,
  };
}

function formatRelativeAge(date, options = {}) {
  const { compact = false } = options;
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes <= 0) {
    return compact ? "сейчас" : "только что";
  }

  if (minutes < 60) {
    return compact ? `${minutes}м` : `${minutes} мин назад`;
  }

  if (hours < 24) {
    return compact ? `${hours}ч` : `${hours} ч назад`;
  }

  return compact ? `${days}д` : `${days} д назад`;
}

function renderFacilityTabs() {
  if (!state.data?.facilities) {
    el.facilityTabs.innerHTML = "";
    return;
  }

  el.facilityTabs.innerHTML = state.data.facilities
    .map((facility) => {
      const active = facility.id === state.selectedFacilityId;
      const icon = FACILITY_ICON[facility.id] || "event";
      const shortLabel = shortFacilityLabel(facility.name);

      return `
        <button class="facility-btn ${active ? "active" : ""}" type="button" data-facility="${escapeHtml(
          facility.id
        )}">
          <span class="material-symbols-outlined">${escapeHtml(icon)}</span>
          <span class="facility-label">${escapeHtml(shortLabel)}</span>
        </button>
      `;
    })
    .join("");

  el.facilityTabs.querySelectorAll("button[data-facility]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFacilityId = button.dataset.facility;
      const facility = getSelectedFacility();
      state.selectedDate = facility ? pickDefaultDate(facility) : null;
      if (facility) {
        state.expandedTimelineByFacility[facility.id] = true;
      }
      renderAll();
      focusCurrentDateInTimeline({ behavior: "auto", block: "center" });
    });
  });
}

function renderDateTabs(options = {}) {
  const { scrollBehavior = "auto" } = options;
  const facility = getSelectedFacility();
  if (!facility) {
    el.dateTabs.innerHTML = "";
    return;
  }

  const expanded = isTimelineExpanded(facility.id);
  const visibleDays = expanded
    ? facility.days
    : facility.days.filter((day) => day.date === state.selectedDate).slice(0, 1);

  el.dateTabs.innerHTML = visibleDays
    .map((day) => {
      const active = day.date === state.selectedDate;
      return `
        <button
          type="button"
          data-date="${escapeHtml(day.date)}"
          aria-selected="${active ? "true" : "false"}"
          class="date-chip h-9 px-4 rounded-lg text-[13px] whitespace-nowrap ${active ? "active" : ""}"
        >
          ${escapeHtml(formatDateChip(day.date, day.weekday))}
        </button>
      `;
    })
    .join("");

  el.dateTabs.querySelectorAll("button[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextDate = button.dataset.date;
      if (!nextDate) {
        return;
      }

      const changed = state.selectedDate !== nextDate;
      state.selectedDate = nextDate;

      if (changed) {
        updateDateChipSelection("smooth");
      } else {
        ensureActiveDateChipVisible("smooth");
      }

      if (expanded) {
        scrollToDaySection(nextDate, { behavior: "smooth", block: "start" });
      } else if (changed) {
        renderTimeline();
      }
    });
  });

  updateDateChipSelection(scrollBehavior);
}

function renderTimeline() {
  const facility = getSelectedFacility();
  if (!facility) {
    el.timeline.classList.remove("timeline-desktop-grid");
    el.timeline.innerHTML = "";
    el.emptyState.hidden = false;
    updateClosureBanner(null);
    return;
  }

  const expanded = isTimelineExpanded(facility.id);
  const day = facility.days.find((item) => item.date === state.selectedDate) || facility.days[0];
  if (!day) {
    el.timeline.classList.remove("timeline-desktop-grid");
    el.timeline.innerHTML = "";
    el.emptyState.hidden = false;
    updateClosureBanner(null);
    return;
  }

  if (expanded) {
    el.timeline.classList.remove("timeline-desktop-grid");
    updateClosureBanner(null);

    el.timeline.innerHTML = facility.days.map((item) => renderDaySection(item, facility.id)).join("");
    el.emptyState.hidden = facility.days.length > 0;
    return;
  }

  updateClosureBanner(day.closedReason);

  const sessions = [...day.sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  if (!sessions.length) {
    el.timeline.classList.remove("timeline-desktop-grid");
    el.timeline.innerHTML = "";
    el.emptyState.hidden = false;
    return;
  }

  const hasOverlaps = sessions.some((session, index) => {
    if (index === 0) {
      return false;
    }
    return toMinutes(session.start) < toMinutes(sessions[index - 1].end);
  });

  const useDesktopGrid = facility.id !== "rowing_base" && sessions.length >= 4 && !hasOverlaps;
  el.timeline.classList.toggle("timeline-desktop-grid", useDesktopGrid);

  el.emptyState.hidden = true;
  let timelineHtml = buildTimelineMarkup(sessions, facility.id, day.date);
  if (facility.days.length > 1) {
    timelineHtml += renderExpandHint();
  }
  el.timeline.innerHTML = timelineHtml;

  const expandButton = document.getElementById("expandTimelineButton");
  if (expandButton) {
    expandButton.addEventListener("click", () => {
      state.expandedTimelineByFacility[facility.id] = true;
      renderDateTabs({ scrollBehavior: "smooth" });
      renderTimeline();
    });
  }
}

function buildTimelineMarkup(sessions, facilityId, isoDate) {
  const nextIndex = findNextUpcomingIndex(sessions, isoDate);
  const rows = [];

  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    const status = getSessionStatus(session, isoDate, i === nextIndex);
    rows.push(renderSession(session, status));

    const next = sessions[i + 1];
    if (!next) {
      continue;
    }

    const breakMins = toMinutes(next.start) - toMinutes(session.end);
    if (breakMins > 0) {
      rows.push(renderBreak(breakMins, facilityId));
    } else if (breakMins === 0 && facilityId === "rowing_base") {
      rows.push(renderNoGapDivider());
    }
  }

  return rows.join("");
}

function renderDaySection(day, facilityId) {
  const sessions = [...day.sessions].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const title = formatDayHeading(day.date, day.weekday);
  const dayTag = formatDayTag(day.date);
  const countLabel = sessions.length ? formatSessionCount(sessions.length) : "Без сеансов";
  const isWeekendClosed = isWeekendClosure(day.closedReason);
  const closedCountClass = isWeekendClosed ? "day-count day-count-weekend" : "day-count day-count-muted";
  const sectionClass = [
    "day-section",
    day.date === todayIso() ? "day-section-current" : "",
    isWeekendClosed ? "day-section-weekend" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (day.closedReason) {
    return `
      <section id="day-${day.date}" class="${sectionClass} day-closed">
        <div class="day-header">
          <div class="day-header-left">
            <p class="day-kicker">${escapeHtml(dayTag)}</p>
            <h3 class="day-title">${escapeHtml(title)}</h3>
          </div>
          <span class="${closedCountClass}">${escapeHtml(countLabel)}</span>
        </div>
        <div class="day-divider"></div>
        <div class="ice-card rounded-2xl p-4 day-state-card">
          <p class="text-sm font-bold ${isWeekendClosed ? "day-weekend-note" : "text-red-300"}">${escapeHtml(day.closedReason)}</p>
        </div>
      </section>
    `;
  }

  if (!sessions.length) {
    return `
      <section id="day-${day.date}" class="${sectionClass} day-empty">
        <div class="day-header">
          <div class="day-header-left">
            <p class="day-kicker">${escapeHtml(dayTag)}</p>
            <h3 class="day-title">${escapeHtml(title)}</h3>
          </div>
          <span class="day-count day-count-muted">${escapeHtml(countLabel)}</span>
        </div>
        <div class="day-divider"></div>
        <div class="ice-card rounded-2xl p-4 day-state-card">
          <p class="text-sm font-semibold text-gray-400">На эту дату сеансов нет.</p>
        </div>
      </section>
    `;
  }

  return `
    <section id="day-${day.date}" class="${sectionClass}">
      <div class="day-header">
        <div class="day-header-left">
          <p class="day-kicker">${escapeHtml(dayTag)}</p>
          <h3 class="day-title">${escapeHtml(title)}</h3>
        </div>
        <span class="day-count">${escapeHtml(countLabel)}</span>
      </div>
      <div class="day-divider"></div>
      <div class="day-content">${buildTimelineMarkup(sessions, facilityId, day.date)}</div>
    </section>
  `;
}

function renderExpandHint() {
  return `
    <div class="expand-hint">
      <p class="expand-hint-text">Прокрутите вниз или нажмите кнопку, чтобы увидеть все даты расписания</p>
      <button id="expandTimelineButton" type="button" class="expand-hint-btn">Показать все даты</button>
    </div>
  `;
}

function renderSession(session, status) {
  const activity = session.activity || session.note || "Сеанс";
  const note = session.note && session.note !== activity ? session.note : "";
  const isLive = status.className === "live";
  const isUpcoming = status.className === "upcoming";
  const isPast = status.className === "past";
  const stateClass = isLive
    ? "session-card session-card-live relative overflow-hidden"
    : isUpcoming
      ? "session-card session-card-upcoming"
      : isPast
        ? "session-card session-card-past"
        : "session-card";

  const labelClass =
    isLive
      ? "bg-emerald-500/12 text-emerald-300 border border-emerald-400/30"
      : isUpcoming
        ? "bg-blue-500/12 text-blue-300 border border-blue-400/30"
        : isPast
          ? "bg-slate-500/10 text-slate-400 border border-slate-500/25"
        : "bg-slate-500/10 text-slate-300 border border-slate-500/20";

  return `
    <div class="ice-card rounded-2xl p-4 flex items-center justify-between ${stateClass}">
      ${isLive ? '<div class="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>' : ""}
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1.5">
          <span class="text-xl font-black ${
            isPast ? "text-gray-500" : "text-white"
          } tracking-tight">${escapeHtml(session.start)}</span>
          <span class="${isPast ? "text-gray-600" : "text-gray-700"} font-bold">—</span>
          <span class="text-base font-bold ${
            isPast ? "text-gray-600" : "text-gray-500"
          } tracking-tight">${escapeHtml(session.end)}</span>
        </div>
        <p class="text-sm font-bold ${isPast ? "text-gray-400" : "text-white"}">${escapeHtml(activity)}</p>
        ${
          note
            ? `<div class="mt-0.5"><span class="px-2 py-0.5 rounded text-[8px] font-black ${labelClass} uppercase tracking-[0.05em]">${escapeHtml(
                note
              )}</span></div>`
            : ""
        }
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <span class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${labelClass}">${escapeHtml(
          status.label
        )}</span>
      </div>
    </div>
  `;
}

function renderBreak(minutes, facilityId) {
  return `
    <div class="break-line">
      <div class="break-badge">${escapeHtml(formatDuration(minutes))} ${escapeHtml(classifyBreak(minutes, facilityId))}</div>
    </div>
  `;
}

function renderNoGapDivider() {
  return `
    <div class="break-line break-line-tight">
      <div class="break-badge">без перерыва</div>
    </div>
  `;
}

function updateClosureBanner(reason) {
  if (!el.closureBanner) {
    return;
  }

  if (!reason) {
    el.closureBanner.hidden = true;
    el.closureBanner.textContent = "";
    return;
  }

  const weekend = isWeekendClosure(reason);
  el.closureBanner.hidden = false;
  el.closureBanner.textContent = reason;
  el.closureBanner.className = `closure-banner ${weekend ? "closure-banner-weekend" : "closure-banner-alert"} mb-4 rounded-2xl border px-4 py-3 text-sm font-bold`;
}

function isWeekendClosure(reason) {
  return Boolean(reason) && /выход/i.test(String(reason));
}

function classifyBreak(minutes, facilityId) {
  if (facilityId === "ice_arena" && minutes >= 20 && minutes <= 90) {
    return "заливка льда";
  }

  if (minutes >= 120) {
    return "перерыв";
  }

  if (minutes >= 45) {
    return "пауза";
  }

  return "переход";
}

function findNextUpcomingIndex(sessions, isoDate) {
  if (!isToday(isoDate)) {
    return 0;
  }

  const now = nowInMinutes();
  for (let i = 0; i < sessions.length; i += 1) {
    if (toMinutes(sessions[i].start) > now) {
      return i;
    }
  }

  return -1;
}

function getSessionStatus(session, isoDate, isNext) {
  if (isToday(isoDate)) {
    const now = nowInMinutes();
    const start = toMinutes(session.start);
    const end = toMinutes(session.end);

    if (now >= end) {
      return { label: "Прошёл", className: "past" };
    }

    if (now >= start && now < end) {
      return { label: "Сейчас", className: "live" };
    }

    if (isNext) {
      return { label: "Скоро", className: "upcoming" };
    }

    return { label: "Сегодня", className: "upcoming" };
  }

  return { label: "По графику", className: "neutral" };
}

function renderSources() {
  if (!state.data?.facilities) {
    el.sourceList.innerHTML = "";
    return;
  }

  el.sourceList.innerHTML = state.data.facilities
    .map((facility) => {
      const warn = facility.error
        ? `Ошибка: ${facility.error}`
        : facility.warnings?.length
          ? facility.warnings[0]
          : "ОК";

      return `
        <li class="source-item">
          <a
            class="source-item-link"
            href="${escapeHtml(facility.sourceUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${escapeHtml(`Открыть официальный сайт: ${facility.name}`)}"
          >
            <div class="source-main">
              <h4>${escapeHtml(`${facility.emoji || ""} ${facility.name}`)}</h4>
              <p>${escapeHtml(warn)}</p>
            </div>
            <div class="source-cta" aria-hidden="true">
              <span class="source-cta-text">Официальный сайт</span>
              <span class="material-symbols-outlined">open_in_new</span>
            </div>
          </a>
        </li>
      `;
    })
    .join("");
}

function hydrateMyScheduleUI() {
  if (!el.myShiftForm) {
    return;
  }

  renderMyScheduleFacilityOptions();

  if (!el.myShiftDateInput.value) {
    el.myShiftDateInput.value = todayIso();
  }

  if (!el.myShiftStartInput.value) {
    el.myShiftStartInput.value = "08:00";
  }

  if (!el.myShiftEndInput.value) {
    el.myShiftEndInput.value = "10:00";
  }

  setMyShiftFormExpanded(state.myShiftFormExpanded);
  renderMySchedule();
}

function setMyShiftFormExpanded(expanded) {
  state.myShiftFormExpanded = Boolean(expanded);
  saveMyShiftFormExpanded();

  if (!el.myShiftFormContainer || !el.myShiftToggleButton || !el.myShiftToggleIcon) {
    return;
  }

  el.myShiftFormContainer.hidden = !state.myShiftFormExpanded;
  el.myShiftToggleButton.setAttribute("aria-expanded", state.myShiftFormExpanded ? "true" : "false");
  el.myShiftToggleIcon.textContent = state.myShiftFormExpanded ? "expand_less" : "expand_more";
}

function renderMySchedule() {
  if (!el.myScheduleTimeline) {
    return;
  }

  if (!/^\d{4}-\d{2}$/.test(state.myScheduleMonth)) {
    state.myScheduleMonth = currentMonthIso();
  }

  renderMyScheduleFacilityOptions();
  el.myMonthInput.value = state.myScheduleMonth;
  el.myMonthTitle.textContent = formatMonthLabel(state.myScheduleMonth);

  const monthShifts = state.myShifts
    .filter((shift) => shift.date.slice(0, 7) === state.myScheduleMonth)
    .sort(compareMyShift);

  const monthShiftChecks = monthShifts.map((shift) => ({
    shift,
    verification: getShiftVerification(shift),
  }));

  renderMyScheduleCharts(monthShiftChecks);

  const missingCount = monthShiftChecks.filter((item) => item.verification.status === "missing").length;
  const partialCount = monthShiftChecks.filter((item) => item.verification.status === "partial").length;
  const confirmedShiftChecks = monthShiftChecks.filter((item) => item.verification.confirmedMinutes > 0);
  const confirmedShiftCount = confirmedShiftChecks.length;
  const totalMinutes = confirmedShiftChecks.reduce((sum, item) => sum + item.verification.confirmedMinutes, 0);
  const avgMinutes = confirmedShiftCount ? Math.round(totalMinutes / confirmedShiftCount) : 0;

  const nearestShift = findNearestVerifiedShift(
    state.myShifts.map((shift) => ({
      shift,
      verification: getShiftVerification(shift),
    }))
  );

  el.myMetricShifts.textContent = String(confirmedShiftCount);
  el.myMetricAverageHours.textContent = confirmedShiftCount ? formatDuration(avgMinutes) : "0ч";
  el.myMetricNextShift.textContent = nearestShift ? formatNearestShift(nearestShift) : "—";
  el.myMonthSummary.textContent = monthShifts.length
    ? `${confirmedShiftCount} ${pluralizeShifts(confirmedShiftCount)} · ${formatDuration(totalMinutes)} по сайту${
        confirmedShiftCount !== monthShifts.length ? ` · внесено: ${monthShifts.length}` : ""
      }${
        missingCount ? ` · ${missingCount} не на сайте` : partialCount ? ` · ${partialCount} частично` : ""
      }`
    : "В этом месяце смен пока нет";

  if (!monthShifts.length) {
    el.myScheduleTimeline.innerHTML = `
      <div class="my-timeline-empty">
        <p>Смен пока нет. Добавьте первую запись через форму выше.</p>
      </div>
    `;
    return;
  }

  const grouped = new Map();
  for (const item of monthShiftChecks) {
    if (!grouped.has(item.shift.date)) {
      grouped.set(item.shift.date, []);
    }
    grouped.get(item.shift.date).push(item);
  }

  el.myScheduleTimeline.innerHTML = Array.from(grouped.entries())
    .map(([date, shiftChecks]) => renderMyScheduleDay(date, shiftChecks))
    .join("");
}

function renderMyScheduleFacilityOptions() {
  if (!el.myShiftFacilitySelect) {
    return;
  }

  const options = getMyFacilityOptions();
  const currentValue = el.myShiftFacilitySelect.value;

  el.myShiftFacilitySelect.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.name)}</option>`)
    .join("");

  if (currentValue && options.some((option) => option.id === currentValue)) {
    el.myShiftFacilitySelect.value = currentValue;
  } else if (options[0]) {
    el.myShiftFacilitySelect.value = options[0].id;
  }
}

function getMyFacilityOptions() {
  if (state.data?.facilities?.length) {
    return state.data.facilities.map((facility) => ({
      id: String(facility.id),
      name: String(facility.name),
    }));
  }

  return [
    { id: "ice_arena", name: "Ледовая арена" },
    { id: "sports_pool", name: "Спортивный бассейн" },
    { id: "small_pool", name: "Малый бассейн" },
    { id: "rowing_base", name: "Гребная база" },
  ];
}

function handleMyShiftSubmit(event) {
  event.preventDefault();

  const date = String(el.myShiftDateInput.value || "");
  const facilityId = String(el.myShiftFacilitySelect.value || "");
  const start = normalizeTime(String(el.myShiftStartInput.value || ""));
  const end = normalizeTime(String(el.myShiftEndInput.value || ""));
  const note = String(el.myShiftNoteInput.value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    setMyScheduleNotice("Выберите корректную дату смены.", "error");
    return;
  }

  if (!start || !end) {
    setMyScheduleNotice("Укажите корректное время начала и окончания.", "error");
    return;
  }

  if (toMinutes(end) <= toMinutes(start)) {
    setMyScheduleNotice("Время окончания должно быть позже времени начала.", "error");
    return;
  }

  if (!facilityId) {
    setMyScheduleNotice("Выберите объект работы.", "error");
    return;
  }

  const facility = getMyFacilityOptions().find((item) => item.id === facilityId);
  const shift = {
    id: createShiftId(),
    date,
    facilityId,
    facilityName: facility ? facility.name : "Объект",
    start,
    end,
    note,
    createdAt: new Date().toISOString(),
  };

  state.myShifts = [...state.myShifts, shift].sort(compareMyShift);
  saveMyShifts();

  state.myScheduleMonth = date.slice(0, 7);
  el.myMonthInput.value = state.myScheduleMonth;
  setMyScheduleNotice("Смена добавлена в график.", "success");
  renderMySchedule();
}

function handleMyScheduleTimelineClick(event) {
  const removeButton = event.target.closest("button[data-delete-shift]");
  if (!removeButton) {
    return;
  }

  const shiftId = String(removeButton.dataset.deleteShift || "");
  if (!shiftId) {
    return;
  }

  const shift = state.myShifts.find((item) => item.id === shiftId);
  if (!shift) {
    return;
  }

  const confirmed = window.confirm(`Удалить смену ${shift.date} ${shift.start}–${shift.end}?`);
  if (!confirmed) {
    return;
  }

  state.myShifts = state.myShifts.filter((item) => item.id !== shiftId);
  saveMyShifts();
  setMyScheduleNotice("Смена удалена.", "info");
  renderMySchedule();
}

function renderMyScheduleDay(date, shiftChecks) {
  const dayTotalMinutes = shiftChecks.reduce((sum, item) => sum + item.verification.confirmedMinutes, 0);
  const dayClasses = ["my-timeline-day"];
  if (date === todayIso()) {
    dayClasses.push("is-today");
  }
  if (isWeekendIsoDate(date)) {
    dayClasses.push("is-weekend");
  }

  return `
    <section class="${dayClasses.join(" ")}">
      <div class="my-timeline-day-head">
        <div>
          <p class="my-timeline-day-kicker">${escapeHtml(formatDayTag(date))}</p>
          <h4 class="my-timeline-day-title">${escapeHtml(formatMyDayHeading(date))}</h4>
        </div>
        <span class="my-timeline-day-total">${escapeHtml(formatDuration(dayTotalMinutes))}</span>
      </div>
      <div class="my-timeline-day-list">
        ${shiftChecks.map((item) => renderMyShiftCard(item.shift, item.verification)).join("")}
      </div>
    </section>
  `;
}

function renderMyShiftCard(shift, verification = getShiftVerification(shift)) {
  const status = getMyShiftStatus(shift);
  const duration = formatDuration(verification.confirmedMinutes);
  const noteHtml = shift.note ? `<p class="my-shift-note">${escapeHtml(shift.note)}</p>` : "";
  const strikeClass = verification.strike ? "my-shift-text-missing" : "";
  const siteSessionsHtml = verification.status === "partial" ? renderMyShiftSiteTimeline(shift, verification) : "";

  return `
    <article class="my-shift-card ${escapeHtml(status.className)} ${escapeHtml(verification.cardClass)}">
      <div class="my-shift-time ${strikeClass}">${escapeHtml(`${shift.start} — ${shift.end}`)}</div>
      <div class="my-shift-place ${strikeClass}">${escapeHtml(resolveShiftFacilityName(shift))}</div>
      ${noteHtml}
      ${siteSessionsHtml}
      <div class="my-shift-meta">
        <span class="my-shift-verify ${escapeHtml(verification.badgeClass)}">${escapeHtml(verification.label)}</span>
        <span class="my-shift-status">${escapeHtml(status.label)}</span>
        <span class="my-shift-duration">${escapeHtml(duration)}</span>
        <button type="button" class="my-shift-delete-btn" data-delete-shift="${escapeHtml(shift.id)}" aria-label="Удалить смену">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </article>
  `;
}

function renderMyShiftSiteTimeline(shift, verification) {
  const sessions = Array.isArray(verification.siteSessions) ? verification.siteSessions : [];
  if (!sessions.length) {
    return "";
  }

  const rows = [];
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    if (i > 0) {
      const breakMins = session.startMinutes - sessions[i - 1].endMinutes;
      if (breakMins > 0) {
        rows.push(renderMyShiftBreak(breakMins, shift.facilityId));
      }
    }

    const notes = [];
    if (session.clipped) {
      notes.push("часть сеанса");
    }
    if (session.note && session.note !== session.activity) {
      notes.push(session.note);
    }

    rows.push(`
      <div class="my-shift-site-row">
        <div class="my-shift-site-session">
          <span class="my-shift-site-time">${escapeHtml(`${session.start} — ${session.end}`)}</span>
          <span class="my-shift-site-activity">${escapeHtml(session.activity || "Сеанс")}</span>
        </div>
        ${notes.length ? `<p class="my-shift-site-note">${escapeHtml(notes.join(" · "))}</p>` : ""}
      </div>
    `);
  }

  return `
    <div class="my-shift-site-strip">
      <p class="my-shift-site-title">Сеансы на сайте в рамках смены</p>
      ${rows.join("")}
    </div>
  `;
}

function renderMyShiftBreak(minutes, facilityId) {
  return `
    <div class="my-shift-site-break">${escapeHtml(formatDuration(minutes))} ${escapeHtml(classifyBreak(minutes, facilityId))}</div>
  `;
}

function renderMyScheduleCharts(monthShiftChecks) {
  if (!ensureMyChartInstances()) {
    return;
  }

  const mode = getResolvedThemeMode();
  const isDark = mode === "dark";
  const palette = isDark ? ["#60a5fa", "#22c55e", "#f59e0b", "#38bdf8", "#a78bfa"] : ["#2563eb", "#16a34a", "#d97706", "#0284c7", "#7c3aed"];
  const textColor = isDark ? "#e2e8f0" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#475569";
  const gridColor = isDark ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.35)";
  const cardBg = isDark ? "#0f172a" : "#f8fafc";

  const facilityTotals = new Map();
  for (const item of monthShiftChecks) {
    if (!item.verification.confirmedMinutes) {
      continue;
    }
    const name = resolveShiftFacilityName(item.shift);
    const hours = item.verification.confirmedMinutes / 60;
    facilityTotals.set(name, (facilityTotals.get(name) || 0) + hours);
  }

  const facilityData = Array.from(facilityTotals.entries())
    .map(([name, value]) => ({ name: shortFacilityLabel(name), value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const pieData =
    facilityData.length > 0
      ? facilityData
      : [
          {
            name: "Нет данных",
            value: 1,
            itemStyle: { color: isDark ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.55)" },
            label: { color: mutedColor },
          },
        ];

  state.myCharts.facility.setOption(
    {
      animationDuration: 420,
      color: palette,
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "rgba(2,6,23,0.96)" : "rgba(255,255,255,0.98)",
        borderColor: gridColor,
        textStyle: { color: textColor, fontFamily: "Lexend, sans-serif", fontSize: 12 },
        formatter: (item) => {
          if (!facilityData.length) {
            return "Нет данных для графика";
          }
          const hours = Number(item?.value || 0);
          return `${item.name}<br/>${hours.toFixed(1)} ч (${item.percent}%)`;
        },
      },
      legend: {
        show: true,
        bottom: 2,
        left: "center",
        icon: "circle",
        textStyle: { color: mutedColor, fontSize: 11, fontFamily: "Lexend, sans-serif" },
      },
      series: [
        {
          type: "pie",
          radius: ["46%", "72%"],
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          minShowLabelAngle: 6,
          itemStyle: {
            borderWidth: 2,
            borderColor: cardBg,
          },
          label: {
            color: textColor,
            fontSize: 11,
            formatter: facilityData.length ? "{b}" : "{b}",
          },
          labelLine: {
            lineStyle: { color: gridColor },
          },
          emphasis: {
            scale: true,
            scaleSize: 7,
          },
          data: pieData,
        },
      ],
      graphic:
        facilityData.length > 0
          ? []
          : [
              {
                type: "text",
                left: "center",
                top: "42%",
                style: {
                  text: "Нет смен",
                  fill: mutedColor,
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "Lexend, sans-serif",
                },
              },
            ],
    },
    true
  );

  requestMyChartsResize();
}

function ensureMyChartInstances() {
  if (!window.echarts || !el.myFacilityShareChart) {
    return false;
  }

  if (!state.myCharts.facility) {
    state.myCharts.facility = window.echarts.init(el.myFacilityShareChart, null, { renderer: "canvas" });
  }

  return Boolean(state.myCharts.facility);
}

function requestMyChartsResize() {
  if (state.chartResizeRafId) {
    return;
  }

  state.chartResizeRafId = window.requestAnimationFrame(() => {
    state.chartResizeRafId = null;
    if (state.myCharts.facility) {
      state.myCharts.facility.resize();
    }
  });
}

function getResolvedThemeMode() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getMyShiftStatus(shift) {
  const today = todayIso();
  const now = nowInMinutes();
  const start = toMinutes(shift.start);
  const end = toMinutes(shift.end);

  if (shift.date < today) {
    return { label: "Прошёл", className: "past" };
  }

  if (shift.date > today) {
    return { label: "По плану", className: "upcoming" };
  }

  if (now >= end) {
    return { label: "Прошёл", className: "past" };
  }

  if (now >= start && now < end) {
    return { label: "Сейчас", className: "live" };
  }

  return { label: "Сегодня", className: "upcoming" };
}

function getShiftVerification(shift) {
  const fallback = {
    siteSessions: [],
    confirmedMinutes: 0,
  };
  if (!state.data?.facilities?.length) {
    return {
      status: "unknown",
      label: "Ждём синхронизацию",
      badgeClass: "verify-unknown",
      cardClass: "",
      strike: false,
      ...fallback,
    };
  }

  const facility = state.data.facilities.find((item) => String(item.id) === String(shift.facilityId));
  if (!facility) {
    return {
      status: "missing",
      label: "Объект не найден",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: true,
      ...fallback,
    };
  }

  const day = facility.days?.find((item) => item.date === shift.date);
  const sessions = Array.isArray(day?.sessions) ? day.sessions : [];
  if (!sessions.length) {
    return {
      status: "missing",
      label: day?.closedReason ? "На сайте выходной" : "На сайте нет сеанса",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: true,
      ...fallback,
    };
  }

  const overlapSessions = getOverlapSiteSessions(sessions, shift.start, shift.end);
  const confirmedMinutes = getMergedSessionMinutes(overlapSessions);
  if (!overlapSessions.length) {
    return {
      status: "missing",
      label: "Нет на сайте",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: true,
      ...fallback,
    };
  }

  const hasExact = sessions.some(
    (session) => normalizeTime(String(session.start || "")) === shift.start && normalizeTime(String(session.end || "")) === shift.end
  );
  if (hasExact) {
    return {
      status: "matched",
      label: "Подтверждено",
      badgeClass: "verify-matched",
      cardClass: "",
      strike: false,
      siteSessions: overlapSessions,
      confirmedMinutes,
    };
  }

  return {
    status: "partial",
    label: "Частично",
    badgeClass: "verify-partial",
    cardClass: "",
    strike: false,
    siteSessions: overlapSessions,
    confirmedMinutes,
  };
}

function getOverlapSiteSessions(sessions, shiftStartText, shiftEndText) {
  const shiftStart = toMinutes(shiftStartText);
  const shiftEnd = toMinutes(shiftEndText);
  const overlaps = [];

  for (const session of sessions) {
    const normalizedStart = normalizeTime(String(session.start || ""));
    const normalizedEnd = normalizeTime(String(session.end || ""));
    if (!normalizedStart || !normalizedEnd) {
      continue;
    }

    const sessionStart = toMinutes(normalizedStart);
    const sessionEnd = toMinutes(normalizedEnd);
    const overlapStart = Math.max(shiftStart, sessionStart);
    const overlapEnd = Math.min(shiftEnd, sessionEnd);
    if (overlapEnd <= overlapStart) {
      continue;
    }

    overlaps.push({
      start: minutesToTime(overlapStart),
      end: minutesToTime(overlapEnd),
      startMinutes: overlapStart,
      endMinutes: overlapEnd,
      activity: String(session.activity || session.note || "Сеанс"),
      note: String(session.note || ""),
      clipped: overlapStart !== sessionStart || overlapEnd !== sessionEnd,
    });
  }

  return overlaps.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
}

function getMergedSessionMinutes(sessions) {
  if (!sessions.length) {
    return 0;
  }

  let mergedStart = sessions[0].startMinutes;
  let mergedEnd = sessions[0].endMinutes;
  let total = 0;

  for (let i = 1; i < sessions.length; i += 1) {
    const session = sessions[i];
    if (session.startMinutes <= mergedEnd) {
      mergedEnd = Math.max(mergedEnd, session.endMinutes);
      continue;
    }

    total += mergedEnd - mergedStart;
    mergedStart = session.startMinutes;
    mergedEnd = session.endMinutes;
  }

  return total + (mergedEnd - mergedStart);
}

function findNearestVerifiedShift(shiftChecks) {
  const today = todayIso();
  const now = nowInMinutes();
  let nearest = null;

  for (const item of shiftChecks) {
    const shift = item.shift;
    const sessions = Array.isArray(item.verification?.siteSessions) ? item.verification.siteSessions : [];
    if (!sessions.length || shift.date < today) {
      continue;
    }

    let focusSession = null;
    let sortMinute = 0;

    if (shift.date === today) {
      focusSession = sessions.find((session) => session.endMinutes > now);
      if (!focusSession) {
        continue;
      }
      sortMinute = Math.max(now, focusSession.startMinutes);
    } else {
      focusSession = sessions[0];
      sortMinute = focusSession.startMinutes;
    }

    const candidate = {
      date: shift.date,
      start: focusSession.start,
      end: focusSession.end,
      sortMinute,
    };

    if (
      !nearest ||
      candidate.date < nearest.date ||
      (candidate.date === nearest.date && candidate.sortMinute < nearest.sortMinute)
    ) {
      nearest = candidate;
    }
  }

  return nearest;
}

function formatNearestShift(shift) {
  const tag = formatDayTag(shift.date);
  const datePart = tag === "Дата" ? formatMonthDayShort(shift.date) : tag;
  return `${datePart} · ${shift.start}`;
}

function getShiftDurationMinutes(shift) {
  const start = toMinutes(shift.start);
  const end = toMinutes(shift.end);
  return Math.max(0, end - start);
}

function resolveShiftFacilityName(shift) {
  const facility = getMyFacilityOptions().find((item) => item.id === shift.facilityId);
  if (facility) {
    return facility.name;
  }

  if (shift.facilityName) {
    return shift.facilityName;
  }

  return "Объект";
}

function compareMyShift(a, b) {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  return toMinutes(a.start) - toMinutes(b.start);
}

function normalizeTime(value) {
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function shiftMonthKey(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return capitalize(
    new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      year: "numeric",
    }).format(date)
  );
}

function formatMonthDayShort(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMyDayHeading(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return capitalize(
    new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(date)
  );
}

function pluralizeShifts(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "смена";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "смены";
  }
  return "смен";
}

function isWeekendIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekDay = date.getUTCDay();
  return weekDay === 0 || weekDay === 6;
}

function createShiftId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function setMyScheduleNotice(message, type = "info") {
  if (!el.myScheduleNotice) {
    return;
  }

  if (state.myScheduleNoticeTimer) {
    clearTimeout(state.myScheduleNoticeTimer);
  }

  el.myScheduleNotice.hidden = false;
  el.myScheduleNotice.textContent = message;
  el.myScheduleNotice.className = `my-schedule-notice ${type}`;

  state.myScheduleNoticeTimer = window.setTimeout(() => {
    if (!el.myScheduleNotice) {
      return;
    }
    el.myScheduleNotice.hidden = true;
    el.myScheduleNotice.textContent = "";
  }, 2200);
}

function setMyShiftsDataNotice(message, type = "info") {
  if (!el.myShiftsDataNotice) {
    return;
  }

  el.myShiftsDataNotice.hidden = false;
  el.myShiftsDataNotice.textContent = message;
  el.myShiftsDataNotice.className = `history-data-notice mt-3 ${type}`;
}

function exportMyShiftsHistory() {
  const payload = {
    version: 1,
    app: "Расписание",
    exportedAt: new Date().toISOString(),
    timezone: state.data?.timezone || "Europe/Minsk",
    shifts: state.myShifts,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `raspisanie-my-graph-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);

  setMyShiftsDataNotice("История графика экспортирована.", "success");
}

async function handleMyShiftsImport(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.shifts) ? parsed.shifts : null;

    if (!records) {
      throw new Error("Неверный формат файла.");
    }

    const normalized = normalizeShiftRecords(records);
    if (!normalized.length && records.length) {
      throw new Error("Не удалось найти корректные записи смен.");
    }

    if (state.myShifts.length) {
      const confirmed = window.confirm("Заменить текущую историю графика импортированными данными?");
      if (!confirmed) {
        setMyShiftsDataNotice("Импорт отменён.", "info");
        input.value = "";
        return;
      }
    }

    state.myShifts = normalized;
    saveMyShifts();

    if (state.myShifts.length && !state.myShifts.some((item) => item.date.slice(0, 7) === state.myScheduleMonth)) {
      state.myScheduleMonth = state.myShifts[0].date.slice(0, 7);
    }

    renderMySchedule();
    setMyShiftsDataNotice(`Импортировано смен: ${state.myShifts.length}.`, "success");
  } catch (error) {
    setMyShiftsDataNotice(
      error instanceof Error ? `Ошибка импорта: ${error.message}` : "Ошибка импорта истории.",
      "error"
    );
  } finally {
    input.value = "";
  }
}

function hydrateSettingsUI() {
  el.autoRefreshSelect.value = String(state.settings.autoRefreshMins || 0);
  hydrateThemeButtons();
}

function hydrateThemeButtons() {
  const buttons = Array.from(el.themeSelector.querySelectorAll("button[data-theme]"));
  buttons.forEach((button) => {
    button.classList.toggle("active-theme", button.dataset.theme === state.settings.theme);
  });
}

function setupAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }

  const mins = Number(state.settings.autoRefreshMins || 0);
  if (!mins) {
    return;
  }

  state.autoRefreshTimer = setInterval(() => {
    fetchSchedule(false, { source: "auto" });
  }, mins * 60 * 1000);
}

function applyTheme(theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved !== "dark");
  applyThemeColor(resolved);
  renderMySchedule();
  requestMyChartsResize();
}

function applyThemeColor(resolvedTheme) {
  const metaTheme = document.getElementById("themeColorMeta");
  if (!metaTheme) {
    return;
  }

  metaTheme.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#edf2f8");
}

function setLiveText(text, busy) {
  el.liveText.textContent = text;
  el.livePill.style.opacity = busy ? "0.8" : "1";
}

function pulseRefreshButton(button = el.refreshButton) {
  if (!button) {
    return;
  }

  button.classList.remove("refresh-btn-tap");
  void button.offsetWidth;
  button.classList.add("refresh-btn-tap");

  window.setTimeout(() => {
    button.classList.remove("refresh-btn-tap");
  }, 160);
}

function setRefreshButtonLoading(loading, options = {}) {
  const { button = el.refreshButton, icon = el.refreshIcon } = options;
  if (!button) {
    return;
  }

  if (loading) {
    pulseRefreshButton(button);
  }

  button.classList.toggle("refresh-btn-loading", loading);
  button.disabled = loading;
  button.setAttribute("aria-busy", loading ? "true" : "false");

  if (icon) {
    icon.classList.toggle("refresh-icon-spin", loading);
  }
}

function showRefreshResult(type, options = {}) {
  const { button = el.refreshButton, timerKey = "header" } = options;
  if (!button) {
    return;
  }

  if (state.refreshFeedbackTimers[timerKey]) {
    clearTimeout(state.refreshFeedbackTimers[timerKey]);
  }

  button.classList.remove("refresh-btn-success", "refresh-btn-error");
  if (type === "success") {
    button.classList.add("refresh-btn-success");
  } else if (type === "error") {
    button.classList.add("refresh-btn-error");
  }

  state.refreshFeedbackTimers[timerKey] = window.setTimeout(() => {
    button.classList.remove("refresh-btn-success", "refresh-btn-error");
    state.refreshFeedbackTimers[timerKey] = null;
  }, 900);
}

function showErrorEmpty(error) {
  el.timeline.innerHTML = "";
  el.emptyState.hidden = false;
  el.emptyState.innerHTML = `
    <h2 class="text-xl font-black text-white">Ошибка загрузки</h2>
    <p class="mt-2 text-sm font-semibold text-gray-400">${escapeHtml(
      error instanceof Error ? error.message : String(error)
    )}</p>
  `;
}

function getSelectedFacility() {
  return state.data?.facilities?.find((f) => f.id === state.selectedFacilityId) || null;
}

function pickDefaultDate(facility) {
  const today = todayIso();
  const hasToday = facility.days.find((item) => item.date === today);
  if (hasToday) {
    return hasToday.date;
  }
  return facility.days[0]?.date || null;
}

function formatDateChip(isoDate, weekday) {
  if (isoDate === todayIso()) {
    return "Сегодня";
  }

  if (isoDate === addDays(todayIso(), 1)) {
    return "Завтра";
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);

  return `${capitalize(weekday)} ${formatted}`;
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (!h) {
    return `${m}м`;
  }

  if (!m) {
    return `${h}ч`;
  }

  return `${h}ч ${m}м`;
}

function formatDayTag(isoDate) {
  const today = todayIso();
  if (isoDate === today) {
    return "Сегодня";
  }
  if (isoDate === addDays(today, 1)) {
    return "Завтра";
  }
  if (isoDate === addDays(today, -1)) {
    return "Вчера";
  }
  return "Дата";
}

function formatDayHeading(isoDate, weekday) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
  }).format(date);
  return `${capitalize(weekday)} · ${formatted}`;
}

function formatSessionCount(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let suffix = "сеансов";

  if (mod10 === 1 && mod100 !== 11) {
    suffix = "сеанс";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    suffix = "сеанса";
  }

  return `${count} ${suffix}`;
}

function todayIso() {
  const timezone = state.data?.timezone || "Europe/Minsk";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isToday(isoDate) {
  return isoDate === todayIso();
}

function nowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addDays(isoDate, delta) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function shortFacilityLabel(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("лед")) return "Ледовая";
  if (text.includes("мал")) return "Малый";
  if (text.includes("басс")) return "Бассейн";
  if (text.includes("греб")) return "Гребная";
  return name;
}

function currentMonthIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Minsk",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function normalizeShiftRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: String(item.id || createShiftId()),
      date: String(item.date || ""),
      facilityId: String(item.facilityId || ""),
      facilityName: String(item.facilityName || ""),
      start: normalizeTime(String(item.start || "")),
      end: normalizeTime(String(item.end || "")),
      note: String(item.note || "").slice(0, 80),
      createdAt: String(item.createdAt || ""),
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.start && item.end && toMinutes(item.end) > toMinutes(item.start))
    .sort(compareMyShift);
}

function loadMyShifts() {
  try {
    const raw = localStorage.getItem(STORAGE.myShifts);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.shifts) ? parsed.shifts : [];
    return normalizeShiftRecords(records);
  } catch {
    return [];
  }
}

function saveMyShifts() {
  localStorage.setItem(STORAGE.myShifts, JSON.stringify(state.myShifts));
}

function loadMyShiftFormExpanded() {
  try {
    const raw = localStorage.getItem(STORAGE.myShiftFormExpanded);
    return raw === "1";
  } catch {
    return false;
  }
}

function saveMyShiftFormExpanded() {
  localStorage.setItem(STORAGE.myShiftFormExpanded, state.myShiftFormExpanded ? "1" : "0");
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE.settings);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
