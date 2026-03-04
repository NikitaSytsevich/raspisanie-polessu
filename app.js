const STORAGE = {
  settings: "polessu_schedule_settings_v2",
  cache: "polessu_schedule_cache_v2",
  myShifts: "polessu_schedule_my_shifts_v1",
  siteChanges: "polessu_site_changes_v1",
};

const DEFAULT_SETTINGS = {
  theme: "system",
  autoRefreshMins: 0,
};

const FACILITY_ICON = {
  ice_arena: "ac_unit",
  sports_pool: "pool",
  small_pool: "waves",
  rowing_base: "fitness_center",
};

const SELF_INSTRUCTOR_NAME = "Сыцевич Н.В.";
const DEFAULT_INSTRUCTORS = [
  { id: "lapchuk_as", name: "Липчук А.С." },
  { id: "krylychuk_ps", name: "Крыльчук П.С." },
  { id: "melnikova_ov", name: "Мельникова О.В." },
  { id: "ivshin_my", name: "Ившина М.Ю." },
  { id: "moiseenko_vv", name: "Моисеенко В.В." },
  { id: "karavaychik_kv", name: "Каравайчик К.В." },
];

const MY_SCHEDULE_RANGE = {
  DAY: "day",
  WEEK: "week",
  FULL: "full",
};

const SITE_CHANGES_HISTORY_LIMIT = 20;
const SITE_CHANGES_EVENTS_LIMIT = 24;
const SITE_CHANGES_PREVIEW_LIMIT = 20;
const SITE_CHANGES_COMPARE_LIMIT = 4;

const state = {
  data: null,
  selectedFacilityId: null,
  selectedDate: null,
  view: "my_schedule",
  settings: loadSettings(),
  myShifts: loadMyShifts(),
  siteChangesHistory: loadSiteChangesHistory(),
  myScheduleFocusDate: null,
  myScheduleRangeMode: MY_SCHEDULE_RANGE.DAY,
  myEditingShiftId: null,
  autoRefreshTimer: null,
  updatedAtTicker: null,
  expandedTimelineByFacility: {},
  scrollSpyRafId: null,
  initialDaySnapDone: false,
  fetchInFlight: false,
  refreshFeedbackTimers: {
    header: null,
    mySchedule: null,
    changes: null,
  },
  myScheduleNoticeTimer: null,
};

const el = {
  scheduleView: document.getElementById("scheduleView"),
  settingsView: document.getElementById("settingsView"),
  myScheduleView: document.getElementById("myScheduleView"),
  myScheduleEditorView: document.getElementById("myScheduleEditorView"),
  changesView: document.getElementById("changesView"),
  facilityDock: document.getElementById("facilityDock"),
  facilityMeta: document.getElementById("facilityMeta"),
  updatedAt: document.getElementById("updatedAt"),
  myScheduleUpdatedAt: document.getElementById("myScheduleUpdatedAt"),
  changesUpdatedAt: document.getElementById("changesUpdatedAt"),
  livePill: document.getElementById("livePill"),
  liveText: document.getElementById("liveText"),
  refreshButton: document.getElementById("refreshButton"),
  refreshIcon: document.getElementById("refreshIcon"),
  myScheduleRefreshButton: document.getElementById("myScheduleRefreshButton"),
  myScheduleRefreshIcon: document.getElementById("myScheduleRefreshIcon"),
  changesRefreshButton: document.getElementById("changesRefreshButton"),
  changesRefreshIcon: document.getElementById("changesRefreshIcon"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  openMyScheduleButton: document.getElementById("openMyScheduleButton"),
  openChangesButton: document.getElementById("openChangesButton"),
  openMyEditorButton: document.getElementById("openMyEditorButton"),
  backFromSettingsButton: document.getElementById("backFromSettingsButton"),
  backFromMyScheduleButton: document.getElementById("backFromMyScheduleButton"),
  backFromChangesButton: document.getElementById("backFromChangesButton"),
  backFromMyEditorButton: document.getElementById("backFromMyEditorButton"),
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
  myDayTitle: document.getElementById("myDayTitle"),
  myDaySummary: document.getElementById("myDaySummary"),
  myShowAllButton: document.getElementById("myShowAllButton"),
  myCollapseRangeButton: document.getElementById("myCollapseRangeButton"),
  myOpenFullRangeButton: document.getElementById("myOpenFullRangeButton"),
  myDayInlineActions: document.getElementById("myDayInlineActions"),
  myTimelineTitle: document.getElementById("myTimelineTitle"),
  myShiftForm: document.getElementById("myShiftForm"),
  myShiftDateInput: document.getElementById("myShiftDateInput"),
  myShiftFacilitySelect: document.getElementById("myShiftFacilitySelect"),
  myShiftInstructorsList: document.getElementById("myShiftInstructorsList"),
  myShiftStartInput: document.getElementById("myShiftStartInput"),
  myShiftEndInput: document.getElementById("myShiftEndInput"),
  myShiftNoteInput: document.getElementById("myShiftNoteInput"),
  myScheduleNotice: document.getElementById("myScheduleNotice"),
  myScheduleTimeline: document.getElementById("myScheduleTimeline"),
  myEditorLaunchWrap: document.getElementById("myEditorLaunchWrap"),
  myEditorShiftList: document.getElementById("myEditorShiftList"),
  myEditorTitle: document.getElementById("myEditorTitle"),
  myEditorSummary: document.getElementById("myEditorSummary"),
  myShiftSubmitButton: document.getElementById("myShiftSubmitButton"),
  myShiftCancelEditButton: document.getElementById("myShiftCancelEditButton"),
  myDeleteHistoryButton: document.getElementById("myDeleteHistoryButton"),
  myChangesSummaryCard: document.getElementById("myChangesSummaryCard"),
  myChangesSummaryContent: document.getElementById("myChangesSummaryContent"),
  changesLatestCard: document.getElementById("changesLatestCard"),
  changesStats: document.getElementById("changesStats"),
  changesList: document.getElementById("changesList"),
};

init();

function init() {
  applyTheme(state.settings.theme);
  hydrateSettingsUI();
  bindEvents();
  hydrateMyScheduleUI();
  setView(state.view);
  loadFromLocalCache();
  setupUpdatedAtTicker();
  fetchSchedule(false, { source: "init" });
  setupAutoRefresh();
}

function bindEvents() {
  el.refreshButton.addEventListener("click", () => fetchSchedule(true, { source: "header" }));
  el.settingsRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "settings" }));
  if (el.myScheduleRefreshButton) {
    el.myScheduleRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "my_schedule_global" }));
  }
  if (el.changesRefreshButton) {
    el.changesRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "changes" }));
  }

  el.openSettingsButton.addEventListener("click", () => setView("settings"));
  el.openMyScheduleButton.addEventListener("click", () => setView("my_schedule"));
  if (el.openChangesButton) {
    el.openChangesButton.addEventListener("click", () => setView("changes"));
  }
  if (el.openMyEditorButton) {
    el.openMyEditorButton.addEventListener("click", () => {
      state.myEditingShiftId = null;
      resetMyShiftForm();
      setView("my_schedule_editor");
    });
  }
  el.backFromSettingsButton.addEventListener("click", () => setView("schedule"));
  el.backFromMyScheduleButton.addEventListener("click", () => setView("schedule"));
  if (el.backFromChangesButton) {
    el.backFromChangesButton.addEventListener("click", () => setView("schedule"));
  }
  if (el.backFromMyEditorButton) {
    el.backFromMyEditorButton.addEventListener("click", () => setView("my_schedule"));
  }

  if (el.myShowAllButton) {
    el.myShowAllButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.WEEK;
      renderMySchedule();
    });
  }

  if (el.myCollapseRangeButton) {
    el.myCollapseRangeButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
      renderMySchedule();
    });
  }

  if (el.myOpenFullRangeButton) {
    el.myOpenFullRangeButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.FULL;
      renderMySchedule();
    });
  }

  if (el.myShiftForm) {
    el.myShiftForm.addEventListener("submit", handleMyShiftSubmit);
  }

  if (el.myShiftInstructorsList) {
    el.myShiftInstructorsList.addEventListener("change", syncInstructorChipState);
  }

  if (el.myScheduleTimeline) {
    el.myScheduleTimeline.addEventListener("click", handleMyScheduleTimelineClick);
  }

  if (el.myChangesSummaryCard) {
    el.myChangesSummaryCard.addEventListener("click", () => setView("changes"));
  }

  if (el.myEditorShiftList) {
    el.myEditorShiftList.addEventListener("click", handleMyEditorShiftListClick);
  }

  if (el.myShiftCancelEditButton) {
    el.myShiftCancelEditButton.addEventListener("click", () => {
      state.myEditingShiftId = null;
      resetMyShiftForm();
      renderMyScheduleEditor();
    });
  }

  if (el.myDeleteHistoryButton) {
    el.myDeleteHistoryButton.addEventListener("click", handleDeleteMyShiftsHistory);
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
}

function setView(view) {
  state.view = view;

  const showSchedule = view === "schedule";
  const showSettings = view === "settings";
  const showMySchedule = view === "my_schedule";
  const showMyScheduleEditor = view === "my_schedule_editor";
  const showChanges = view === "changes";

  el.scheduleView.hidden = !showSchedule;
  el.settingsView.hidden = !showSettings;
  el.myScheduleView.hidden = !showMySchedule;
  if (el.changesView) {
    el.changesView.hidden = !showChanges;
  }
  if (el.myScheduleEditorView) {
    el.myScheduleEditorView.hidden = !showMyScheduleEditor;
  }
  el.facilityDock.hidden = !showSchedule;

  if (showMySchedule) {
    state.myScheduleFocusDate = todayIso();
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    if (el.myShiftDateInput) {
      el.myShiftDateInput.value = state.myScheduleFocusDate;
    }
    renderMySchedule();
  }

  if (showMyScheduleEditor) {
    renderMyScheduleEditor();
  }
  if (showChanges) {
    renderChangesView();
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
  const isMyScheduleRefresh = source === "my_schedule" || source === "my_schedule_global";
  const isChangesRefresh = source === "changes";
  const checkSiteChanges = source === "my_schedule_global";

  if (state.fetchInFlight) {
    if (isHeaderRefresh) {
      pulseRefreshButton(el.refreshButton);
    }
    if (isMyScheduleRefresh) {
      pulseRefreshButton(el.myScheduleRefreshButton);
    }
    if (isChangesRefresh) {
      pulseRefreshButton(el.changesRefreshButton);
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
  if (isChangesRefresh) {
    setRefreshButtonLoading(true, {
      button: el.changesRefreshButton,
      icon: el.changesRefreshIcon,
    });
  }

  setLiveText(checkSiteChanges ? "Обновляем расписание и проверяем изменения…" : "Обновляем расписание…", true);

  const query = force ? "?refresh=1" : "";

  try {
    const response = await fetch(`/api/schedule${query}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const previousPayload = state.data ? clonePayload(state.data) : null;
    registerSiteChanges(previousPayload, payload, { source: checkSiteChanges ? "changes" : source, forced: force });
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
    if (isChangesRefresh) {
      showRefreshResult("success", {
        button: el.changesRefreshButton,
        timerKey: "changes",
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
    if (isChangesRefresh) {
      showRefreshResult("error", {
        button: el.changesRefreshButton,
        timerKey: "changes",
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
    if (isChangesRefresh) {
      setRefreshButtonLoading(false, {
        button: el.changesRefreshButton,
        icon: el.changesRefreshIcon,
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
  renderMyScheduleEditor();
  renderChangesView();
}

function renderHeader() {
  const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
  el.updatedAt.textContent = freshness.mainText;
  if (el.myScheduleUpdatedAt) {
    el.myScheduleUpdatedAt.textContent = freshness.shortText;
    el.myScheduleUpdatedAt.title = freshness.tooltip;
  }
  if (el.changesUpdatedAt) {
    el.changesUpdatedAt.textContent = freshness.shortText;
    el.changesUpdatedAt.title = freshness.tooltip;
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

  if (!state.myScheduleFocusDate) {
    state.myScheduleFocusDate = todayIso();
  }

  renderMyScheduleFacilityOptions();
  renderMyInstructorOptions();

  if (!el.myShiftDateInput.value) {
    el.myShiftDateInput.value = state.myScheduleFocusDate;
  }

  if (!el.myShiftStartInput.value) {
    el.myShiftStartInput.value = "08:00";
  }

  if (!el.myShiftEndInput.value) {
    el.myShiftEndInput.value = "10:00";
  }

  resetMyShiftForm();
  renderMySchedule();
  renderMyScheduleEditor();
}

function getMyScheduleRangeMode() {
  const mode = String(state.myScheduleRangeMode || "");
  if (mode === MY_SCHEDULE_RANGE.DAY || mode === MY_SCHEDULE_RANGE.WEEK || mode === MY_SCHEDULE_RANGE.FULL) {
    return mode;
  }
  return MY_SCHEDULE_RANGE.DAY;
}

function renderMySchedule() {
  if (!el.myScheduleTimeline) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(state.myScheduleFocusDate || ""))) {
    state.myScheduleFocusDate = todayIso();
  }

  renderMyScheduleFacilityOptions();
  const rangeMode = getMyScheduleRangeMode();
  if (el.myEditorLaunchWrap) {
    el.myEditorLaunchWrap.hidden = !state.myShifts.length;
  }

  const allShiftChecks = state.myShifts
    .slice()
    .sort(compareMyShift)
    .map((shift) => ({
      shift,
      verification: getShiftVerification(shift),
    }));

  const groupedByDate = new Map();
  for (const item of allShiftChecks) {
    if (!groupedByDate.has(item.shift.date)) {
      groupedByDate.set(item.shift.date, []);
    }
    groupedByDate.get(item.shift.date).push(item);
  }

  const focusDate = state.myScheduleFocusDate;
  const datesToRender = getMyScheduleDatesToRender(focusDate, groupedByDate, rangeMode);
  const focusShiftChecks = groupedByDate.get(focusDate) || [];
  const focusStats = summarizeShiftChecks(focusShiftChecks);

  updateMyScheduleHeader(focusDate, datesToRender.length, focusStats, rangeMode);
  updateMyScheduleRangeControls(rangeMode, state.myShifts.length > 0);

  if (el.myTimelineTitle) {
    if (rangeMode === MY_SCHEDULE_RANGE.WEEK) {
      el.myTimelineTitle.textContent = "Выбранные сутки + 7 дней";
    } else if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
      el.myTimelineTitle.textContent = "Полный график";
    } else {
      el.myTimelineTitle.textContent = "График на выбранные сутки";
    }
  }

  if (!state.myShifts.length) {
    el.myScheduleTimeline.innerHTML = renderMyScheduleEmptyState();
    renderMyChangesSummary();
    return;
  }

  el.myScheduleTimeline.innerHTML = datesToRender
    .map((date) =>
      renderMyScheduleDay(date, groupedByDate.get(date) || [], {
        spotlight: rangeMode === MY_SCHEDULE_RANGE.DAY && date === focusDate,
      })
    )
    .join("");
  renderMyChangesSummary();
}

function getMyScheduleDatesToRender(focusDate, groupedByDate, rangeMode) {
  if (rangeMode === MY_SCHEDULE_RANGE.WEEK) {
    return Array.from({ length: 8 }, (_, index) => addDays(focusDate, index));
  }

  if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
    const futureShiftDates = Array.from(groupedByDate.keys())
      .filter((date) => date >= focusDate)
      .sort((a, b) => a.localeCompare(b));
    const lastDate = futureShiftDates.length ? futureShiftDates[futureShiftDates.length - 1] : focusDate;
    const dates = [];
    let cursor = focusDate;
    while (cursor <= lastDate) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  return [focusDate];
}

function updateMyScheduleRangeControls(rangeMode, hasHistory) {
  if (el.myDayInlineActions) {
    el.myDayInlineActions.hidden = !hasHistory;
  }

  if (!hasHistory) {
    return;
  }

  if (el.myShowAllButton) {
    el.myShowAllButton.hidden = rangeMode !== MY_SCHEDULE_RANGE.DAY;
  }

  if (el.myCollapseRangeButton) {
    el.myCollapseRangeButton.hidden = rangeMode === MY_SCHEDULE_RANGE.DAY;
  }

  if (el.myOpenFullRangeButton) {
    if (rangeMode === MY_SCHEDULE_RANGE.WEEK) {
      el.myOpenFullRangeButton.hidden = false;
      el.myOpenFullRangeButton.disabled = false;
      el.myOpenFullRangeButton.innerHTML =
        '<span class="material-symbols-outlined">open_in_full</span><span>Открыть полный график</span>';
      return;
    }

    if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
      el.myOpenFullRangeButton.hidden = false;
      el.myOpenFullRangeButton.disabled = true;
      el.myOpenFullRangeButton.innerHTML =
        '<span class="material-symbols-outlined">check_circle</span><span>Полный график открыт</span>';
      return;
    }

    el.myOpenFullRangeButton.hidden = true;
    el.myOpenFullRangeButton.disabled = false;
    el.myOpenFullRangeButton.innerHTML =
      '<span class="material-symbols-outlined">open_in_full</span><span>Открыть полный график</span>';
  }
}

function updateMyScheduleHeader(focusDate, dayCount, focusStats, rangeMode) {
  if (el.myDayTitle) {
    el.myDayTitle.textContent = focusDate === todayIso() ? `Текущие сутки · ${formatMonthDayShort(focusDate)}` : formatMyDayHeading(focusDate);
  }

  if (!el.myDaySummary) {
    return;
  }

  if (rangeMode === MY_SCHEDULE_RANGE.WEEK) {
    el.myDaySummary.textContent = "Режим «Показать всё»: выбранные сутки и ещё 7 дней вперёд.";
    return;
  }

  if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
    const tailCount = Math.max(0, dayCount - 1);
    el.myDaySummary.textContent = tailCount
      ? `Показываем полный график: выбранные сутки и ещё ${tailCount} следующих дней.`
      : "Полный график сейчас совпадает с выбранными сутками.";
    return;
  }

  if (!focusStats.planned) {
    el.myDaySummary.textContent = "На выбранные сутки смен пока нет. Добавьте запись или импортируйте историю.";
    return;
  }

  el.myDaySummary.textContent = `${focusStats.planned} смен · всего ${formatDuration(focusStats.plannedMinutes)}`;
}

function summarizeShiftChecks(shiftChecks) {
  return {
    planned: shiftChecks.length,
    plannedMinutes: shiftChecks.reduce((sum, item) => sum + (toMinutes(item.shift.end) - toMinutes(item.shift.start)), 0),
    confirmedMinutes: shiftChecks.reduce((sum, item) => sum + item.verification.confirmedMinutes, 0),
    missing: shiftChecks.filter((item) => item.verification.status === "missing").length,
    partial: shiftChecks.filter((item) => item.verification.status === "partial").length,
  };
}

function renderMyScheduleEmptyState() {
  return `
    <section class="my-empty-state">
      <lottie-player
        class="my-empty-lottie"
        src="https://assets4.lottiefiles.com/packages/lf20_5tl1xxnz.json"
        background="transparent"
        speed="1"
        loop
        autoplay
      ></lottie-player>
      <h4 class="my-empty-title">График пока пуст</h4>
      <p class="my-empty-text">
        Импортируйте готовую историю смен или добавьте первую запись вручную.
        После этого здесь появится график на выбранные сутки.
      </p>
      <div class="my-empty-actions">
        <button type="button" class="my-empty-cta" data-import-history>Импорт истории</button>
        <button type="button" class="my-empty-cta secondary" data-open-editor>Добавить вручную</button>
      </div>
    </section>
  `;
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

function getMyInstructorOptions() {
  const map = new Map(DEFAULT_INSTRUCTORS.map((item) => [normalizeDiffText(item.name), item.name]));

  for (const shift of state.myShifts || []) {
    for (const name of shift.coworkers || []) {
      const normalized = normalizeDiffText(name);
      if (!normalized || normalized === normalizeDiffText(SELF_INSTRUCTOR_NAME)) {
        continue;
      }
      if (!map.has(normalized)) {
        map.set(normalized, name);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "ru"));
}

function renderMyInstructorOptions(selectedNames = []) {
  if (!el.myShiftInstructorsList) {
    return;
  }

  const selectedSet = new Set(normalizeCoworkers(selectedNames).map((name) => normalizeDiffText(name)));
  const options = getMyInstructorOptions();

  el.myShiftInstructorsList.innerHTML = options
    .map((name) => {
      const checked = selectedSet.has(normalizeDiffText(name));
      return `
        <label class="my-instructor-chip ${checked ? "is-active" : ""}">
          <input
            type="checkbox"
            value="${escapeHtml(name)}"
            data-instructor-name="${escapeHtml(name)}"
            ${checked ? "checked" : ""}
          />
          <span>${escapeHtml(name)}</span>
        </label>
      `;
    })
    .join("");
}

function syncInstructorChipState() {
  if (!el.myShiftInstructorsList) {
    return;
  }
  const chips = Array.from(el.myShiftInstructorsList.querySelectorAll(".my-instructor-chip"));
  chips.forEach((chip) => {
    const input = chip.querySelector("input[type='checkbox']");
    chip.classList.toggle("is-active", Boolean(input?.checked));
  });
}

function getSelectedMyShiftInstructors() {
  if (!el.myShiftInstructorsList) {
    return [];
  }

  const values = Array.from(
    el.myShiftInstructorsList.querySelectorAll("input[type='checkbox'][data-instructor-name]:checked")
  ).map((input) => String(input.value || input.dataset.instructorName || ""));

  return normalizeCoworkers(values);
}

function handleMyShiftSubmit(event) {
  event.preventDefault();

  const date = String(el.myShiftDateInput.value || "");
  const facilityId = String(el.myShiftFacilitySelect.value || "");
  const start = normalizeTime(String(el.myShiftStartInput.value || ""));
  const end = normalizeTime(String(el.myShiftEndInput.value || ""));
  const note = String(el.myShiftNoteInput.value || "").trim();
  const coworkers = getSelectedMyShiftInstructors();

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

  const editingShift = state.myEditingShiftId
    ? state.myShifts.find((item) => item.id === state.myEditingShiftId) || null
    : null;
  const facility = getMyFacilityOptions().find((item) => item.id === facilityId);
  const shift = {
    id: editingShift ? editingShift.id : createShiftId(),
    date,
    facilityId,
    facilityName: facility ? facility.name : "Объект",
    start,
    end,
    note,
    coworkers,
    createdAt: editingShift?.createdAt || new Date().toISOString(),
  };

  if (editingShift) {
    state.myShifts = state.myShifts
      .map((item) => (item.id === editingShift.id ? shift : item))
      .sort(compareMyShift);
  } else {
    state.myShifts = [...state.myShifts, shift].sort(compareMyShift);
  }
  saveMyShifts();

  state.myScheduleFocusDate = date;
  state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
  state.myEditingShiftId = null;
  resetMyShiftForm({ preserveDate: date });
  setMyScheduleNotice(editingShift ? "Смена обновлена." : "Смена добавлена в график.", "success");
  renderMySchedule();
  renderMyScheduleEditor();
}

function resetMyShiftForm(options = {}) {
  const { preserveDate = "" } = options;
  if (!el.myShiftForm) {
    return;
  }

  el.myShiftForm.reset();
  el.myShiftDateInput.value = preserveDate || state.myScheduleFocusDate || todayIso();
  el.myShiftStartInput.value = "08:00";
  el.myShiftEndInput.value = "10:00";
  renderMyScheduleFacilityOptions();
  renderMyInstructorOptions();
  syncMyShiftEditorFormState();
}

function syncMyShiftEditorFormState() {
  const editingShift = state.myEditingShiftId
    ? state.myShifts.find((item) => item.id === state.myEditingShiftId) || null
    : null;

  if (editingShift) {
    el.myShiftDateInput.value = editingShift.date;
    el.myShiftFacilitySelect.value = editingShift.facilityId;
    el.myShiftStartInput.value = editingShift.start;
    el.myShiftEndInput.value = editingShift.end;
    el.myShiftNoteInput.value = editingShift.note || "";
    renderMyInstructorOptions(editingShift.coworkers || []);

    if (el.myEditorTitle) {
      el.myEditorTitle.textContent = "Редактирование смены";
    }
    if (el.myEditorSummary) {
      el.myEditorSummary.textContent = "Измените поля и сохраните обновлённую запись.";
    }
    if (el.myShiftSubmitButton) {
      el.myShiftSubmitButton.textContent = "Сохранить изменения";
    }
    if (el.myShiftCancelEditButton) {
      el.myShiftCancelEditButton.hidden = false;
    }
    return;
  }

  if (el.myEditorTitle) {
    el.myEditorTitle.textContent = "Добавить смену";
  }
  if (el.myEditorSummary) {
    el.myEditorSummary.textContent = "Заполните смену и сохраните её в график.";
  }
  if (el.myShiftSubmitButton) {
    el.myShiftSubmitButton.textContent = "Сохранить смену";
  }
  if (el.myShiftCancelEditButton) {
    el.myShiftCancelEditButton.hidden = true;
  }
  renderMyInstructorOptions();
}

function renderMyScheduleEditor() {
  if (!el.myEditorShiftList) {
    return;
  }

  renderMyScheduleFacilityOptions();
  syncMyShiftEditorFormState();
  if (el.myDeleteHistoryButton) {
    el.myDeleteHistoryButton.hidden = !state.myShifts.length;
  }

  if (!state.myShifts.length) {
    el.myEditorShiftList.innerHTML = `
      <div class="my-timeline-empty">
        <p>Смен пока нет. Добавьте первую запись через форму выше.</p>
      </div>
    `;
    return;
  }

  const today = todayIso();
  const sorted = state.myShifts.slice().sort(compareMyShift);
  const list = [...sorted.filter((item) => item.date >= today), ...sorted.filter((item) => item.date < today).reverse()];

  el.myEditorShiftList.innerHTML = list
    .map((shift) => renderMyEditorShiftCard(shift, getShiftVerification(shift)))
    .join("");
}

function renderMyEditorShiftCard(shift, verification) {
  const labelDate = formatMyDayHeading(shift.date);
  const note = normalizeShiftNote(shift.note);
  const noteHtml = note ? `<p class="my-editor-shift-note">${escapeHtml(note)}</p>` : "";
  const coworkersHtml = renderShiftCoworkersLine(shift, "my-editor-shift-coworkers");

  return `
    <article class="my-editor-shift-card">
      <div class="my-editor-shift-main">
        <p class="my-editor-shift-date">${escapeHtml(labelDate)}</p>
        <h4 class="my-editor-shift-title">${escapeHtml(`${shift.start} — ${shift.end}`)}</h4>
        <p class="my-editor-shift-place">${escapeHtml(resolveShiftFacilityName(shift))}</p>
        ${coworkersHtml}
        ${noteHtml}
        <div class="my-editor-shift-meta">
          <span class="my-shift-duration">${escapeHtml(formatDuration(verification.confirmedMinutes))}</span>
        </div>
      </div>
      <div class="my-editor-shift-actions">
        <button type="button" class="my-editor-action-btn" data-edit-shift="${escapeHtml(shift.id)}">Изменить</button>
        <button type="button" class="my-editor-action-btn danger" data-delete-shift="${escapeHtml(shift.id)}">Удалить</button>
      </div>
    </article>
  `;
}

function renderChangesView() {
  if (!el.changesLatestCard || !el.changesList) {
    return;
  }

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const latestChangedEntry = history.find((entry) => entry && !entry.baseline && entry.hasChanges) || null;

  if (el.changesUpdatedAt) {
    if (latest?.checkedAt) {
      const checkedAt = new Date(latest.checkedAt);
      const relative = formatRelativeAge(checkedAt, { compact: true });
      const checkedText = checkedAt.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      el.changesUpdatedAt.textContent = relative ? `${checkedText} · ${relative}` : checkedText;
      const lastChangedTitle = latestChangedEntry?.checkedAt
        ? `Последние изменения: ${new Date(latestChangedEntry.checkedAt).toLocaleString("ru-RU")}`
        : "Изменения пока не зафиксированы";
      el.changesUpdatedAt.title = `Проверено ${checkedAt.toLocaleString("ru-RU")} · ${lastChangedTitle}`;
    } else {
      const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
      el.changesUpdatedAt.textContent = freshness.shortText;
      el.changesUpdatedAt.title = freshness.tooltip;
    }
  }

  if (!latest) {
    el.changesLatestCard.innerHTML = `
      <div class="changes-empty-state">
        <h2>Изменений пока нет</h2>
        <p>Нажмите «Проверить», чтобы получить первый снимок и начать отслеживание изменений на сайте.</p>
      </div>
    `;
    if (el.changesStats) {
      el.changesStats.innerHTML = "";
    }
    el.changesList.innerHTML = "";
    return;
  }

  const latestBadge = latest.baseline
    ? '<span class="changes-check-badge baseline">Базовый снимок</span>'
    : latest.hasChanges && Array.isArray(latest.sourceIssues) && latest.sourceIssues.length
      ? '<span class="changes-check-badge changed">Есть изменения · источник нестабилен</span>'
      : Array.isArray(latest.sourceIssues) && latest.sourceIssues.length
      ? '<span class="changes-check-badge changed">Ошибка источника</span>'
      : latest.hasChanges
      ? '<span class="changes-check-badge changed">Есть изменения</span>'
      : '<span class="changes-check-badge stable">Без изменений</span>';
  const latestTime = formatChangesDateTime(latest.checkedAt);
  const latestChangedTime = latestChangedEntry?.checkedAt ? formatChangesDateTime(latestChangedEntry.checkedAt) : "Изменения ещё не зафиксированы";
  const summary = latest.summary || { total: 0, added: 0, removed: 0, updated: 0 };
  const sourceIssues = Array.isArray(latest.sourceIssues) ? latest.sourceIssues : [];
  const hasSourceIssues = sourceIssues.length > 0;
  const sourceIssueText = hasSourceIssues
    ? `${sourceIssues[0]?.facilityName ? `${sourceIssues[0].facilityName}: ` : ""}${
        sourceIssues[0]?.description || "Обнаружена проблема с источником данных."
      }`
    : "";
  const latestText = latest.baseline
    ? "Создан первый снимок расписания для сравнения будущих обновлений."
    : latest.hasChanges
      ? `Найдено ${summary.total} изменений. Ниже показаны ключевые блоки «было / стало».${
          hasSourceIssues ? " Часть источников работает нестабильно." : ""
        }`
      : hasSourceIssues
      ? sourceIssueText
      : "После последней проверки изменений не обнаружено.";

  el.changesLatestCard.innerHTML = `
    <article class="changes-latest-inner">
      <div class="changes-latest-top">
        <h2>Последняя проверка</h2>
        ${latestBadge}
      </div>
      <p class="changes-latest-time">${escapeHtml(latestTime)}</p>
      <div class="changes-last-change-row">
        <span class="changes-last-change-label">Дата последних изменений на сайте</span>
        <strong class="changes-last-change-value">${escapeHtml(latestChangedTime)}</strong>
      </div>
      <p class="changes-latest-text">${escapeHtml(latestText)}</p>
      ${renderLatestChangesComparison(latest)}
    </article>
  `;

  if (el.changesStats) {
    el.changesStats.innerHTML = renderChangesStatsCompact(latest, summary, sourceIssues);
  }

  const visibleHistory = history.slice(0, SITE_CHANGES_PREVIEW_LIMIT);
  el.changesList.innerHTML = visibleHistory.map((entry) => renderChangesCheckCard(entry)).join("");
}

function renderChangesCheckCard(entry) {
  const summary = entry.summary || { total: 0, added: 0, removed: 0, updated: 0 };
  const sourceIssues = Array.isArray(entry.sourceIssues) ? entry.sourceIssues : [];
  const hasSourceIssues = sourceIssues.length > 0;
  const headline = entry.baseline
    ? "Базовый снимок"
    : entry.hasChanges
      ? hasSourceIssues
        ? `Изменений: ${summary.total} · источник нестабилен`
        : `Изменений: ${summary.total}`
      : hasSourceIssues
      ? `Ошибка источника (${sourceIssues.length})`
      : "Изменений не найдено";
  const badge = entry.baseline
    ? '<span class="changes-check-badge baseline">Снимок</span>'
    : entry.hasChanges && hasSourceIssues
      ? '<span class="changes-check-badge changed">Обновлено + источник</span>'
    : hasSourceIssues
      ? '<span class="changes-check-badge changed">Источник</span>'
      : entry.hasChanges
      ? '<span class="changes-check-badge changed">Обновлено</span>'
      : '<span class="changes-check-badge stable">Стабильно</span>';
  const events = Array.isArray(entry.events) ? entry.events : [];
  const previewText = getChangesEntryPreviewText(entry, events, sourceIssues);
  const chipsHtml = renderChangesEntryChips(entry, summary, events.length, sourceIssues.length);

  return `
    <article class="changes-feed-card">
      <div class="changes-feed-top">
        <div>
          <h3 class="changes-feed-title">${escapeHtml(headline)}</h3>
          <p class="changes-feed-time">${escapeHtml(formatChangesDateTime(entry.checkedAt))}</p>
        </div>
        ${badge}
      </div>
      <p class="changes-feed-line">${escapeHtml(previewText)}</p>
      <div class="changes-feed-chips">${chipsHtml}</div>
    </article>
  `;
}

function renderChangesStatsCompact(latest, summary, sourceIssues) {
  if (latest.hasSourceIssues && !latest.hasChanges) {
    return `
      <article class="changes-stat-card compact issue"><span>Проблемы источника</span><strong>${escapeHtml(String(sourceIssues.length))}</strong></article>
      <article class="changes-stat-card compact"><span>Найдено</span><strong>—</strong></article>
      <article class="changes-stat-card compact"><span>Добавлено</span><strong>—</strong></article>
      <article class="changes-stat-card compact"><span>Удалено</span><strong>—</strong></article>
    `;
  }

  const issueChip = latest.hasSourceIssues
    ? `<article class="changes-stat-card compact issue"><span>Проблемы источника</span><strong>${escapeHtml(String(sourceIssues.length))}</strong></article>`
    : "";

  return `
    <article class="changes-stat-card compact"><span>Найдено</span><strong>${escapeHtml(String(summary.total || 0))}</strong></article>
    <article class="changes-stat-card compact"><span>Добавлено</span><strong>${escapeHtml(String(summary.added || 0))}</strong></article>
    <article class="changes-stat-card compact"><span>Удалено</span><strong>${escapeHtml(String(summary.removed || 0))}</strong></article>
    <article class="changes-stat-card compact"><span>Изменено</span><strong>${escapeHtml(String(summary.updated || 0))}</strong></article>
    ${issueChip}
  `;
}

function renderLatestChangesComparison(entry) {
  if (entry.baseline) {
    return `<p class="changes-compare-empty">Это стартовый снимок. «Было / стало» появится после первого изменения на сайте.</p>`;
  }

  const sourceIssues = Array.isArray(entry.sourceIssues) ? entry.sourceIssues : [];
  const events = Array.isArray(entry.events) ? entry.events.filter((event) => !String(event?.type || "").startsWith("source_")) : [];
  const compareItems = (entry.hasChanges ? events : sourceIssues).slice(0, SITE_CHANGES_COMPARE_LIMIT);
  if (!compareItems.length) {
    return `<p class="changes-compare-empty">${
      entry.hasChanges
        ? "Изменения зафиксированы, но детальных блоков пока нет."
        : entry.hasSourceIssues
          ? "Источник временно недоступен. Как только связь восстановится, сравнение появится автоматически."
          : "Сейчас изменений нет, сайт совпадает с предыдущей проверкой."
    }</p>`;
  }

  const cardsHtml = compareItems.map((event) => renderChangeComparisonCard(event)).join("");
  const totalItems = entry.hasChanges ? events.length : sourceIssues.length;
  const more = Math.max(0, totalItems - compareItems.length);

  return `
    <div class="changes-compare-grid">${cardsHtml}</div>
    ${more ? `<p class="changes-compare-more">И ещё ${escapeHtml(String(more))} изменений в этой проверке.</p>` : ""}
  `;
}

function renderChangeComparisonCard(event) {
  const severity = event?.severity || "info";
  const title = String(event?.title || "Изменение");
  const beforeText = normalizeChangeSideText(event?.beforeText, "Нет данных до изменения.");
  const afterText = normalizeChangeSideText(event?.afterText || event?.description, "Нет данных после изменения.");
  const dateText = event?.date ? formatMonthDayShort(event.date) : "";
  const facility = String(event?.facilityName || "");
  const suffix = [facility, dateText].filter(Boolean).join(" · ");

  return `
    <article class="changes-compare-card changes-event-${escapeHtml(severity)}">
      <div class="changes-compare-head">
        <h3>${escapeHtml(title)}</h3>
        ${suffix ? `<p class="changes-compare-meta">${escapeHtml(suffix)}</p>` : ""}
      </div>
      <div class="changes-compare-columns">
        <div class="changes-compare-col before">
          <span>Было</span>
          <p>${escapeHtml(beforeText)}</p>
        </div>
        <div class="changes-compare-col after">
          <span>Стало</span>
          <p>${escapeHtml(afterText)}</p>
        </div>
      </div>
    </article>
  `;
}

function getChangesEntryPreviewText(entry, events, sourceIssues) {
  if (entry.baseline) {
    return "Создан базовый снимок для будущего сравнения.";
  }

  if (entry.hasChanges) {
    const leadEvent = events[0] || null;
    if (!leadEvent) {
      return entry.hasSourceIssues
        ? "Изменения зафиксированы, но часть источников работает нестабильно."
        : "Изменения зафиксированы.";
    }

    const dateHint = leadEvent.date ? formatMonthDayShort(leadEvent.date) : "";
    const facilityHint = leadEvent.facilityName ? String(leadEvent.facilityName) : "";
    const prefix = [facilityHint, dateHint].filter(Boolean).join(" · ");
    const leadText = `${prefix ? `${prefix}: ` : ""}${String(leadEvent.title || "Изменение")} — ${String(
      leadEvent.afterText || leadEvent.description || "детали обновлены"
    )}`;
    if (!entry.hasSourceIssues) {
      return leadText;
    }
    return `${leadText} (есть проблемы источника)`;
  }

  if (entry.hasSourceIssues) {
    return String(sourceIssues[0]?.description || "Источник временно недоступен.");
  }

  if (!entry.hasChanges) {
    return "Изменения не обнаружены.";
  }
  return "Изменения зафиксированы.";
}

function renderChangesEntryChips(entry, summary, eventsCount, sourceIssuesCount) {
  if (entry.hasSourceIssues && !entry.hasChanges) {
    return `<span class="changes-feed-chip warn">Источник: ${escapeHtml(String(sourceIssuesCount))}</span>`;
  }

  if (entry.baseline) {
    return `<span class="changes-feed-chip">Старт</span>`;
  }

  if (!entry.hasChanges) {
    return `<span class="changes-feed-chip">Без изменений</span>`;
  }

  return [
    `<span class="changes-feed-chip">Событий: ${escapeHtml(String(eventsCount))}</span>`,
    `<span class="changes-feed-chip positive">+${escapeHtml(String(summary.added || 0))}</span>`,
    `<span class="changes-feed-chip warn">-${escapeHtml(String(summary.removed || 0))}</span>`,
    `<span class="changes-feed-chip info">~${escapeHtml(String(summary.updated || 0))}</span>`,
    entry.hasSourceIssues ? `<span class="changes-feed-chip warn">Источник: ${escapeHtml(String(sourceIssuesCount))}</span>` : "",
  ].join("");
}

function normalizeChangeSideText(value, fallback = "—") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function handleMyEditorShiftListClick(event) {
  const editButton = event.target.closest("button[data-edit-shift]");
  if (editButton) {
    const shiftId = String(editButton.dataset.editShift || "");
    if (!shiftId) {
      return;
    }
    const exists = state.myShifts.some((item) => item.id === shiftId);
    if (!exists) {
      return;
    }
    state.myEditingShiftId = shiftId;
    renderMyScheduleEditor();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

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
  if (state.myEditingShiftId === shiftId) {
    state.myEditingShiftId = null;
    resetMyShiftForm();
  }

  setMyScheduleNotice("Смена удалена.", "info");
  renderMySchedule();
  renderMyScheduleEditor();
}

function handleDeleteMyShiftsHistory() {
  if (!state.myShifts.length) {
    setMyScheduleNotice("История уже пустая.", "info");
    return;
  }

  const confirmed = window.confirm("Удалить всю историю смен? Это действие нельзя отменить.");
  if (!confirmed) {
    return;
  }

  state.myShifts = [];
  saveMyShifts();
  state.myEditingShiftId = null;
  state.myScheduleFocusDate = todayIso();
  state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
  resetMyShiftForm({ preserveDate: state.myScheduleFocusDate });
  setMyScheduleNotice("История смен удалена.", "info");
  renderMySchedule();
  renderMyScheduleEditor();
}

function handleMyScheduleTimelineClick(event) {
  const importHistoryButton = event.target.closest("button[data-import-history]");
  if (importHistoryButton && el.importMyShiftsInput) {
    el.importMyShiftsInput.click();
    return;
  }

  const openEditorButton = event.target.closest("button[data-open-editor]");
  if (!openEditorButton) {
    return;
  }

  state.myEditingShiftId = null;
  resetMyShiftForm({ preserveDate: state.myScheduleFocusDate || todayIso() });
  setView("my_schedule_editor");
}

function renderMyScheduleDay(date, shiftChecks, options = {}) {
  const { spotlight = false } = options;
  const dayTotalMinutes = shiftChecks.reduce((sum, item) => sum + (toMinutes(item.shift.end) - toMinutes(item.shift.start)), 0);
  const dayClasses = ["my-timeline-day"];
  if (spotlight) {
    dayClasses.push("is-spotlight");
  }
  const isWorkingDay = shiftChecks.length > 0;
  if (date === todayIso()) {
    dayClasses.push("is-today");
  }
  if (isWeekendIsoDate(date)) {
    dayClasses.push("is-weekend");
  }

  const stateClass = isWorkingDay ? "is-working" : "is-off";
  const stateLabel = isWorkingDay ? "Рабочий день" : "Смен нет";
  const dayBody = isWorkingDay
    ? shiftChecks.map((item) => renderMyShiftCard(item.shift, item.verification)).join("")
    : `<div class="my-day-empty">На эти сутки смены не добавлены.</div>`;

  return `
    <section class="${dayClasses.join(" ")}">
      <div class="my-timeline-day-head">
        <div>
          <p class="my-timeline-day-kicker">${escapeHtml(formatDayTag(date))}</p>
          <h4 class="my-timeline-day-title">${escapeHtml(formatMyDayHeading(date))}</h4>
        </div>
        <div class="my-timeline-day-badges">
          <span class="my-timeline-day-state ${stateClass}">${escapeHtml(stateLabel)}</span>
          <span class="my-timeline-day-total">${escapeHtml(formatDuration(dayTotalMinutes))}</span>
        </div>
      </div>
      <div class="my-timeline-day-list">
        ${dayBody}
      </div>
    </section>
  `;
}

function renderMyChangesSummary() {
  if (!el.myChangesSummaryContent) {
    return;
  }

  const latest = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory[0] || null : null;
  if (!latest) {
    el.myChangesSummaryContent.innerHTML = `
      <div class="my-changes-head">
        <div>
          <h3>Изменения на сайте</h3>
          <p>Пока нет проверок. Откройте раздел изменений, чтобы сделать первый снимок.</p>
        </div>
        <span class="my-changes-badge is-baseline">Нет данных</span>
      </div>
      <p class="my-changes-time">Нажмите карточку, чтобы открыть страницу «Изменения на сайте».</p>
    `;
    return;
  }

  const checkedAt = new Date(latest.checkedAt);
  const checkedText = Number.isNaN(checkedAt.getTime())
    ? "Время проверки неизвестно"
    : `${checkedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · ${formatRelativeAge(checkedAt, { compact: false })}`;
  const summary = latest.summary || { total: 0, added: 0, removed: 0, updated: 0 };
  const sourceIssues = Array.isArray(latest.sourceIssues) ? latest.sourceIssues : [];
  const hasSourceIssues = sourceIssues.length > 0;
  const badgeClass = latest.baseline ? "is-baseline" : hasSourceIssues || latest.hasChanges ? "is-changed" : "is-stable";
  const badgeText = latest.baseline ? "Базовый снимок" : hasSourceIssues ? "Ошибка источника" : latest.hasChanges ? "Есть изменения" : "Без изменений";
  const summaryText = latest.baseline
    ? "Создан базовый снимок для отслеживания будущих изменений."
    : hasSourceIssues
      ? `${sourceIssues[0]?.facilityName ? `${sourceIssues[0].facilityName}: ` : ""}${
          sourceIssues[0]?.description || "Источник временно недоступен, изменения расписания сейчас не рассчитываются."
        }`
      : latest.hasChanges
      ? `Найдено ${summary.total} изменений.`
      : "После последней проверки изменений не обнаружено.";

  el.myChangesSummaryContent.innerHTML = `
    <div class="my-changes-head">
      <div>
        <h3>Изменения на сайте</h3>
        <p>${escapeHtml(summaryText)}</p>
      </div>
      <span class="my-changes-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
    </div>
    <p class="my-changes-time">${escapeHtml(checkedText)}</p>
    <p class="my-changes-open-hint">Нажмите карточку, чтобы открыть детальную ленту изменений.</p>
  `;
}

function renderMyShiftCard(shift, verification = getShiftVerification(shift)) {
  const status = getMyShiftStatus(shift);
  const duration = formatDuration(verification.confirmedMinutes);
  const coworkersHtml = renderShiftCoworkersLine(shift, "my-shift-coworkers");
  const note = normalizeShiftNote(shift.note);
  const noteHtml = note ? `<p class="my-shift-note">${escapeHtml(note)}</p>` : "";
  const strikeClass = verification.strike ? "my-shift-text-missing" : "";
  const siteSessionsHtml = verification.status === "partial" ? renderMyShiftSiteTimeline(shift, verification) : "";
  const missingBadgeHtml =
    verification.status === "missing"
      ? `
        <span class="my-shift-site-missing-badge" title="${escapeHtml(verification.label)}">
          <span class="material-symbols-outlined">warning</span>
          <span>Нет на сайте</span>
        </span>
      `
      : "";

  return `
    <article class="my-shift-card ${escapeHtml(status.className)} ${escapeHtml(verification.cardClass)}">
      <div class="my-shift-time ${strikeClass}">${escapeHtml(`${shift.start} — ${shift.end}`)}</div>
      <div class="my-shift-place ${strikeClass}">${escapeHtml(resolveShiftFacilityName(shift))}</div>
      ${coworkersHtml}
      ${noteHtml}
      ${siteSessionsHtml}
      <div class="my-shift-meta">
        ${missingBadgeHtml}
        <span class="my-shift-status">${escapeHtml(status.label)}</span>
        <span class="my-shift-duration">${escapeHtml(duration)}</span>
      </div>
    </article>
  `;
}

function renderShiftCoworkersLine(shift, className) {
  const coworkers = normalizeCoworkers(shift?.coworkers || []);
  if (!coworkers.length) {
    return "";
  }

  return `<p class="${escapeHtml(className)}">С кем: ${escapeHtml(coworkers.join(", "))}</p>`;
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
    version: 2,
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

    state.myScheduleFocusDate = state.myShifts.length ? state.myShifts[0].date : todayIso();
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    state.myEditingShiftId = null;
    resetMyShiftForm();

    renderMySchedule();
    renderMyScheduleEditor();
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
  renderMyScheduleEditor();
  renderChangesView();
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

function registerSiteChanges(previousPayload, nextPayload, options = {}) {
  if (!nextPayload?.facilities?.length) {
    return;
  }

  const { source = "auto", forced = false } = options;
  const checkedAt = new Date().toISOString();
  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory.slice() : [];
  const sourceIssues = collectSourceIssueEvents(previousPayload, nextPayload);
  const hasSourceIssues = sourceIssues.length > 0;

  if (!previousPayload?.facilities?.length) {
    if (hasSourceIssues) {
      const issueEntry = {
        id: createShiftId(),
        checkedAt,
        generatedAt: nextPayload.generatedAt || null,
        source,
        forced: Boolean(forced),
        baseline: false,
        entryType: "source_error",
        hasChanges: false,
        hasSourceIssues: true,
        summary: { total: 0, added: 0, removed: 0, updated: 0 },
        events: [],
        sourceIssues: sourceIssues.slice(0, 8),
        signature: buildSiteChangesSignature(
          { total: 0, added: 0, removed: 0, updated: 0 },
          [],
          sourceIssues,
          { hasChanges: false, hasSourceIssues: true, entryType: "source_error" }
        ),
      };
      if (!hasSameSourceIssueSignature(history[0], sourceIssues)) {
        history.unshift(issueEntry);
        state.siteChangesHistory = history.slice(0, SITE_CHANGES_HISTORY_LIMIT);
        saveSiteChangesHistory();
      }
      return;
    }

    if (history.length) {
      return;
    }

    const baselineEntry = {
      id: createShiftId(),
      checkedAt,
      generatedAt: nextPayload.generatedAt || null,
      source,
      forced: Boolean(forced),
      baseline: true,
      entryType: "baseline",
      hasChanges: false,
      hasSourceIssues: false,
      summary: { total: 0, added: 0, removed: 0, updated: 0 },
      events: [],
      sourceIssues: [],
      signature: buildSiteChangesSignature(
        { total: 0, added: 0, removed: 0, updated: 0 },
        [],
        [],
        { hasChanges: false, hasSourceIssues: false, entryType: "baseline" }
      ),
    };
    state.siteChangesHistory = [baselineEntry];
    saveSiteChangesHistory();
    return;
  }

  const events = diffSchedulePayload(previousPayload, nextPayload);
  const summary = summarizeChangeEvents(events);
  const hasChanges = summary.total > 0;

  if (!hasChanges && !hasSourceIssues) {
    return;
  }

  if (!hasChanges && hasSourceIssues && hasSameSourceIssueSignature(history[0], sourceIssues)) {
    return;
  }

  const entryType = hasSourceIssues ? (hasChanges ? "schedule_with_source_issues" : "source_error") : "schedule_diff";
  const signature = buildSiteChangesSignature(summary, events, sourceIssues, {
    hasChanges,
    hasSourceIssues,
    entryType,
  });
  if (history[0]?.signature && history[0].signature === signature) {
    return;
  }

  const entry = {
    id: createShiftId(),
    checkedAt,
    generatedAt: nextPayload.generatedAt || null,
    source,
    forced: Boolean(forced),
    baseline: false,
    entryType,
    hasChanges,
    hasSourceIssues,
    summary,
    events: events.slice(0, SITE_CHANGES_EVENTS_LIMIT),
    sourceIssues: sourceIssues.slice(0, 8),
    signature,
  };

  history.unshift(entry);
  state.siteChangesHistory = history.slice(0, SITE_CHANGES_HISTORY_LIMIT);
  saveSiteChangesHistory();
}

function diffSchedulePayload(previousPayload, nextPayload) {
  const events = [];
  const previousFacilities = toFacilityMap(previousPayload?.facilities);
  const nextFacilities = toFacilityMap(nextPayload?.facilities);
  const facilityIds = Array.from(new Set([...previousFacilities.keys(), ...nextFacilities.keys()])).sort();

  for (const facilityId of facilityIds) {
    const previousFacility = previousFacilities.get(facilityId) || null;
    const nextFacility = nextFacilities.get(facilityId) || null;
    const facilityName = String(nextFacility?.name || previousFacility?.name || facilityId);

    if (hasFacilityBrokenData(previousFacility) || hasFacilityBrokenData(nextFacility)) {
      continue;
    }

    if (!previousFacility && nextFacility) {
      events.push({
        type: "facility_added",
        severity: "positive",
        facilityId,
        facilityName,
        date: null,
        title: "Добавлен объект",
        description: `Объект «${facilityName}» появился в данных расписания.`,
        beforeText: "Объект отсутствовал в расписании.",
        afterText: `Объект «${facilityName}» добавлен.`,
      });
      continue;
    }

    if (previousFacility && !nextFacility) {
      events.push({
        type: "facility_removed",
        severity: "warning",
        facilityId,
        facilityName,
        date: null,
        title: "Удалён объект",
        description: `Объект «${facilityName}» пропал из данных расписания.`,
        beforeText: `Объект «${facilityName}» присутствовал в расписании.`,
        afterText: "Объект удалён из расписания.",
      });
      continue;
    }

    const previousDays = toDayMap(previousFacility?.days);
    const nextDays = toDayMap(nextFacility?.days);
    const dates = Array.from(new Set([...previousDays.keys(), ...nextDays.keys()])).sort();

    for (const date of dates) {
      const previousDay = previousDays.get(date) || null;
      const nextDay = nextDays.get(date) || null;

      if (!previousDay && nextDay) {
        const sessionsCount = Array.isArray(nextDay.sessions) ? nextDay.sessions.length : 0;
        const addedDayText = nextDay.closedReason
          ? `Добавлен статус закрытия: ${nextDay.closedReason}.`
          : `Добавлено сеансов: ${sessionsCount}.`;
        events.push({
          type: "day_added",
          severity: "positive",
          facilityId,
          facilityName,
          date,
          title: "Добавлены сутки",
          description: nextDay.closedReason
            ? "Для даты добавлен статус закрытия."
            : `Новых сеансов: ${sessionsCount}.`,
          beforeText: "Дата отсутствовала.",
          afterText: addedDayText,
        });
        continue;
      }

      if (previousDay && !nextDay) {
        const sessionsCount = Array.isArray(previousDay.sessions) ? previousDay.sessions.length : 0;
        const removedDayText = previousDay.closedReason
          ? `Дата была закрыта (${previousDay.closedReason}).`
          : `Было сеансов: ${sessionsCount}.`;
        events.push({
          type: "day_removed",
          severity: "warning",
          facilityId,
          facilityName,
          date,
          title: "Удалены сутки",
          description: `Дата удалена из расписания (было сеансов: ${sessionsCount}).`,
          beforeText: removedDayText,
          afterText: "Дата удалена из расписания.",
        });
        continue;
      }

      const previousClosed = normalizeDiffText(previousDay?.closedReason);
      const nextClosed = normalizeDiffText(nextDay?.closedReason);
      if (previousClosed !== nextClosed) {
        let title = "Изменён статус суток";
        let description = "Статус закрытия на дату изменился.";
        let severity = "info";
        if (!previousClosed && nextClosed) {
          title = "Объект закрыт";
          description = `Появилась причина: ${nextClosed}.`;
          severity = "warning";
        } else if (previousClosed && !nextClosed) {
          title = "Объект открыт";
          description = "Ранее закрытые сутки снова открыты.";
          severity = "positive";
        }
        events.push({
          type: "closure_changed",
          severity,
          facilityId,
          facilityName,
          date,
          title,
          description,
          beforeText: previousClosed ? `Было: ${previousClosed}.` : "Было: объект открыт.",
          afterText: nextClosed ? `Стало: ${nextClosed}.` : "Стало: объект открыт.",
        });
      }

      const previousSessions = toSessionMap(previousDay?.sessions);
      const nextSessions = toSessionMap(nextDay?.sessions);
      const sessionKeys = Array.from(new Set([...previousSessions.keys(), ...nextSessions.keys()])).sort();

      for (const sessionKey of sessionKeys) {
        const previousSession = previousSessions.get(sessionKey) || null;
        const nextSession = nextSessions.get(sessionKey) || null;

        if (!previousSession && nextSession) {
          const label = formatSessionSnapshot(nextSession);
          events.push({
            type: "session_added",
            severity: "positive",
            facilityId,
            facilityName,
            date,
            title: "Добавлен сеанс",
            description: label,
            beforeText: "Сеанс отсутствовал.",
            afterText: label,
          });
          continue;
        }

        if (previousSession && !nextSession) {
          const label = formatSessionSnapshot(previousSession);
          events.push({
            type: "session_removed",
            severity: "warning",
            facilityId,
            facilityName,
            date,
            title: "Удалён сеанс",
            description: label,
            beforeText: label,
            afterText: "Сеанс удалён.",
          });
          continue;
        }

        const previousActivity = normalizeDiffText(previousSession?.activity);
        const nextActivity = normalizeDiffText(nextSession?.activity);
        const previousNote = normalizeDiffText(previousSession?.note);
        const nextNote = normalizeDiffText(nextSession?.note);
        if (previousActivity !== nextActivity || previousNote !== nextNote) {
          const beforeSessionText = formatSessionSnapshot(previousSession);
          const afterSessionText = formatSessionSnapshot(nextSession);
          events.push({
            type: "session_updated",
            severity: "info",
            facilityId,
            facilityName,
            date,
            title: "Изменён сеанс",
            description: `${nextSession.start} — ${nextSession.end} · обновлено описание/тип.`,
            beforeText: beforeSessionText,
            afterText: afterSessionText,
          });
        }
      }
    }
  }

  return events.sort(compareSiteChangeEvent);
}

function collectSourceIssueEvents(previousPayload, nextPayload) {
  const events = [];
  const previousFacilities = toFacilityMap(previousPayload?.facilities);
  const nextFacilities = toFacilityMap(nextPayload?.facilities);

  for (const [facilityId, nextFacility] of nextFacilities.entries()) {
    const previousFacility = previousFacilities.get(facilityId) || null;
    const facilityName = String(nextFacility?.name || previousFacility?.name || facilityId);
    if (!isFacilitySourceUnavailable(nextFacility)) {
      continue;
    }

    const issueText = getFacilitySourceIssueText(nextFacility);
    events.push({
      type: "source_issue",
      severity: "warning",
      facilityId,
      facilityName,
      date: null,
      title: "Ошибка источника",
      description: issueText || "Источник временно недоступен.",
      beforeText: "Источник работал штатно.",
      afterText: issueText || "Источник временно недоступен.",
    });
  }

  return events.sort(compareSiteChangeEvent);
}

function isFacilitySourceUnavailable(facility) {
  if (!facility || typeof facility !== "object") {
    return false;
  }
  const fetchState = String(facility.fetchState || "").toLowerCase();
  if (fetchState === "error" || fetchState === "stale_cache") {
    return true;
  }
  return Boolean(facility.error && getFacilityDayCount(facility) === 0);
}

function hasFacilityBrokenData(facility) {
  if (!facility || typeof facility !== "object") {
    return false;
  }
  const fetchState = String(facility.fetchState || "").toLowerCase();
  if (fetchState === "error") {
    return true;
  }
  return Boolean(facility.error && getFacilityDayCount(facility) === 0);
}

function getFacilityDayCount(facility) {
  return Array.isArray(facility?.days) ? facility.days.length : 0;
}

function getFacilitySourceIssueText(facility) {
  if (!facility || typeof facility !== "object") {
    return "";
  }
  const sourceIssue = String(facility.sourceIssue || facility.error || "").trim();
  if (sourceIssue) {
    return sourceIssue.slice(0, 240);
  }
  const warning = Array.isArray(facility.warnings) ? String(facility.warnings[0] || "").trim() : "";
  if (warning) {
    return warning.slice(0, 240);
  }
  return "Источник временно недоступен.";
}

function hasSameSourceIssueSignature(entry, sourceIssues) {
  if (!entry || !Array.isArray(sourceIssues) || !sourceIssues.length) {
    return false;
  }
  return buildSourceIssueSignature(entry.sourceIssues) === buildSourceIssueSignature(sourceIssues);
}

function buildSourceIssueSignature(sourceIssues) {
  if (!Array.isArray(sourceIssues) || !sourceIssues.length) {
    return "";
  }
  return sourceIssues
    .map((item) => `${String(item.facilityId || "")}:${normalizeDiffText(item.description || item.title || "")}`)
    .sort()
    .join("|");
}

function buildSiteChangesSignature(summary, events, sourceIssues, options = {}) {
  const { hasChanges = false, hasSourceIssues = false, entryType = "" } = options;
  const summaryPart = `${Number(summary?.total || 0)}:${Number(summary?.added || 0)}:${Number(summary?.removed || 0)}:${Number(
    summary?.updated || 0
  )}`;
  const issuePart = buildSourceIssueSignature(sourceIssues);
  const eventPart = (events || [])
    .slice(0, 10)
    .map((event) =>
      [
        String(event?.type || ""),
        String(event?.facilityId || ""),
        String(event?.date || ""),
        normalizeDiffText(event?.beforeText || ""),
        normalizeDiffText(event?.afterText || event?.description || ""),
      ].join(":")
    )
    .join("|");

  return `${String(entryType)}#${hasChanges ? "1" : "0"}#${hasSourceIssues ? "1" : "0"}#${summaryPart}#${issuePart}#${eventPart}`;
}

function compareSiteChangeEvent(a, b) {
  const dateA = String(a.date || "9999-12-31");
  const dateB = String(b.date || "9999-12-31");
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  const facilityA = String(a.facilityName || "");
  const facilityB = String(b.facilityName || "");
  if (facilityA !== facilityB) {
    return facilityA.localeCompare(facilityB, "ru");
  }
  return String(a.title || "").localeCompare(String(b.title || ""), "ru");
}

function summarizeChangeEvents(events) {
  const normalizedEvents = (events || []).filter((event) => !String(event?.type || "").startsWith("source_"));
  const summary = {
    total: normalizedEvents.length,
    added: 0,
    removed: 0,
    updated: 0,
  };

  for (const event of normalizedEvents) {
    const type = String(event.type || "");
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

function toFacilityMap(facilities) {
  const map = new Map();
  for (const facility of facilities || []) {
    const id = String(facility?.id || "");
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
    const date = String(day?.date || "");
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
    const start = normalizeTime(String(session?.start || ""));
    const end = normalizeTime(String(session?.end || ""));
    if (!start || !end) {
      continue;
    }
    map.set(`${start}-${end}`, {
      start,
      end,
      activity: String(session?.activity || ""),
      note: String(session?.note || ""),
    });
  }
  return map;
}

function formatSessionSnapshot(session) {
  if (!session) {
    return "Сеанс не указан.";
  }

  const start = normalizeTime(String(session.start || ""));
  const end = normalizeTime(String(session.end || ""));
  const timeLabel = start && end ? `${start} — ${end}` : "Время не указано";
  const activity = String(session.activity || "").replace(/\s+/g, " ").trim();
  const note = String(session.note || "").replace(/\s+/g, " ").trim();
  const details = [activity, note].filter(Boolean).join(" · ");
  return details ? `${timeLabel} · ${details}` : timeLabel;
}

function normalizeDiffText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clonePayload(payload) {
  try {
    return JSON.parse(JSON.stringify(payload || null));
  } catch {
    return null;
  }
}

function formatChangesDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Время неизвестно";
  }
  const relative = formatRelativeAge(date, { compact: false });
  const text = date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return relative ? `${text} · ${relative}` : text;
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

function normalizeCoworkers(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,]/)
      : value && typeof value === "object" && Array.isArray(value.names)
        ? value.names
        : [];

  const normalized = values
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((name) => normalizeDiffText(name) !== normalizeDiffText(SELF_INSTRUCTOR_NAME))
    .slice(0, 8);

  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b, "ru"));
}

function normalizeShiftNote(value) {
  const note = String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!note) {
    return "";
  }

  if (/^считано\s+из\s+графика/i.test(note)) {
    return "";
  }

  return note;
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
      note: normalizeShiftNote(item.note),
      coworkers: normalizeCoworkers(
        item.coworkers ||
          item.instructors ||
          item.withWhom ||
          item.with_whom ||
          item.coworker ||
          item.coworkersText ||
          ""
      ),
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

function loadSiteChangesHistory() {
  try {
    const raw = localStorage.getItem(STORAGE.siteChanges);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item === "object" && typeof item.checkedAt === "string")
      .map((item) => ({
        ...item,
        events: Array.isArray(item.events) ? item.events.slice(0, SITE_CHANGES_EVENTS_LIMIT) : [],
        sourceIssues: Array.isArray(item.sourceIssues) ? item.sourceIssues.slice(0, 8) : [],
      }))
      .slice(0, SITE_CHANGES_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveSiteChangesHistory() {
  const compact = (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [])
    .map((entry) => ({
      ...entry,
      events: Array.isArray(entry.events) ? entry.events.slice(0, SITE_CHANGES_EVENTS_LIMIT) : [],
      sourceIssues: Array.isArray(entry.sourceIssues) ? entry.sourceIssues.slice(0, 8) : [],
    }))
    .slice(0, SITE_CHANGES_HISTORY_LIMIT);
  localStorage.setItem(STORAGE.siteChanges, JSON.stringify(compact));
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
