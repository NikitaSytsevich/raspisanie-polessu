const STORAGE = {
  settings: "polessu_schedule_settings_v2",
  cache: "polessu_schedule_cache_v2",
  myShifts: "polessu_schedule_my_shifts_v1",
  siteChanges: "polessu_site_changes_v1",
  siteChangesLastCheckedAt: "polessu_site_changes_last_checked_at_v1",
  siteChangesAcknowledgedSignature: "polessu_site_changes_ack_signature_v1",
};

const DEFAULT_SETTINGS = {
  theme: "system",
  autoRefreshMins: 0,
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
const DEFAULT_FACILITY_OPTIONS = [
  {
    id: "ice_arena",
    name: "Ледовая арена",
    sourceUrl: "https://www.polessu.by/%D0%BB%D0%B5%D0%B4%D0%BE%D0%B2%D0%B0%D1%8F-%D0%B0%D1%80%D0%B5%D0%BD%D0%B0-%D0%BF%D0%BE%D0%BB%D0%B5%D1%81%D0%B3%D1%83",
  },
  {
    id: "sports_pool",
    name: "Спортивный бассейн",
    sourceUrl: "https://www.polessu.by/%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%BE%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
  },
  {
    id: "small_pool",
    name: "Малый бассейн",
    sourceUrl: "https://www.polessu.by/%D0%BC%D0%B0%D0%BB%D1%8B%D0%B9-%D0%B1%D0%B0%D1%81%D1%81%D0%B5%D0%B9%D0%BD",
  },
  {
    id: "rowing_base",
    name: "Гребная база",
    sourceUrl: "https://www.polessu.by/%D1%80%D0%B0%D1%81%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5-%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D1%8B-%D1%82%D1%80%D0%B5%D0%BD%D0%B0%D0%B6%D0%B5%D1%80%D0%BD%D0%BE%D0%B3%D0%BE-%D0%B7%D0%B0%D0%BB%D0%B0-%D0%B8-%D0%B7%D0%B0%D0%BB%D0%B0-%D1%88%D1%82%D0%B0%D0%BD%D0%B3%D0%B8-%D0%B3%D1%80%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F-%D0%B1%D0%B0%D0%B7%D0%B0-%E2%84%961",
  },
];

const MY_SCHEDULE_RANGE = {
  DAY: "day",
  FULL: "full",
};

const MY_SHIFT_KIND = {
  WORK: "shift",
  DAY_OFF: "day_off",
};

const WEEKDAY_OPTIONS = [
  { value: 1, short: "Пн", label: "Понедельник" },
  { value: 2, short: "Вт", label: "Вторник" },
  { value: 3, short: "Ср", label: "Среда" },
  { value: 4, short: "Чт", label: "Четверг" },
  { value: 5, short: "Пт", label: "Пятница" },
  { value: 6, short: "Сб", label: "Суббота" },
  { value: 0, short: "Вс", label: "Воскресенье" },
];

const SITE_CHANGES_HISTORY_LIMIT = 20;
const SITE_CHANGES_EVENTS_LIMIT = 24;
const SITE_CHANGES_LATEST_EVENTS_LIMIT = 8;
const SITE_CHANGES_HISTORY_PREVIEW_LIMIT = 8;
const SHIFT_EDGE_OVERLAP_MINUTES = 20;
const SHIFT_EDGE_OVERLAP_MAX_MINUTES = 30;
const SHIFT_EDGE_OVERLAP_MAX_RATIO = 0.5;
const siteChangesUtils = window.SiteChangesUtils || null;
const LOCAL_SITE_CHANGE_DEMO_HOSTS = new Set(["localhost", "127.0.0.1"]);

const state = {
  data: null,
  view: "my_schedule",
  settings: loadSettings(),
  myShifts: loadMyShifts(),
  weeklyDayOffWeekday: loadWeeklyDayOffWeekday(),
  staffShifts: loadStaffShifts(),
  siteChangesHistory: loadSiteChangesHistory(),
  siteChangesLastCheckedAt: loadSiteChangesLastCheckedAt(),
  siteChangesAcknowledgedSignature: loadSiteChangesAcknowledgedSignature(),
  myScheduleFocusDate: null,
  myScheduleRangeMode: MY_SCHEDULE_RANGE.DAY,
  myEditingShiftId: null,
  myEditorMode: "single",
  autoRefreshTimer: null,
  updatedAtTicker: null,
  fetchInFlight: false,
  refreshFeedbackTimers: {
    mySchedule: null,
    changes: null,
  },
  myScheduleNoticeTimer: null,
};

const el = {
  settingsView: document.getElementById("settingsView"),
  settingsMain: document.getElementById("settingsMain"),
  myScheduleView: document.getElementById("myScheduleView"),
  changesView: document.getElementById("changesView"),
  changesMain: document.getElementById("changesMain"),
  myScheduleUpdatedAt: document.getElementById("myScheduleUpdatedAt"),
  changesUpdatedAt: document.getElementById("changesUpdatedAt"),
  myScheduleRefreshButton: document.getElementById("myScheduleRefreshButton"),
  myScheduleRefreshIcon: document.getElementById("myScheduleRefreshIcon"),
  changesRefreshButton: document.getElementById("changesRefreshButton"),
  changesRefreshIcon: document.getElementById("changesRefreshIcon"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  backFromSettingsButton: document.getElementById("backFromSettingsButton"),
  backFromChangesButton: document.getElementById("backFromChangesButton"),
  themeSelector: document.getElementById("themeSelector"),
  autoRefreshOptions: document.getElementById("autoRefreshOptions"),
  settingsRefreshButton: document.getElementById("settingsRefreshButton"),
  openSettingsChangesButton: document.getElementById("openSettingsChangesButton"),
  openSettingsEditorButton: document.getElementById("openSettingsEditorButton"),
  exportMyShiftsButton: document.getElementById("exportMyShiftsButton"),
  importMyShiftsButton: document.getElementById("importMyShiftsButton"),
  importMyShiftsInput: document.getElementById("importMyShiftsInput"),
  myShiftsDataNotice: document.getElementById("myShiftsDataNotice"),
  resetSiteChangesButton: document.getElementById("resetSiteChangesButton"),
  settingsOverviewCard: document.getElementById("settingsOverviewCard"),
  settingsMonitorCard: document.getElementById("settingsMonitorCard"),
  settingsSourceIssues: document.getElementById("settingsSourceIssues"),
  myDaySpotlightHead: document.getElementById("myDaySpotlightHead"),
  myScheduleRangeButton: document.getElementById("myScheduleRangeButton"),
  myScheduleRangeIcon: document.getElementById("myScheduleRangeIcon"),
  myScheduleRangeLabel: document.getElementById("myScheduleRangeLabel"),
  myDayInlineActions: document.getElementById("myDayInlineActions"),
  myTimelineTitle: document.getElementById("myTimelineTitle"),
  myShiftForm: document.getElementById("myShiftForm"),
  myEditorModeSwitch: document.getElementById("myEditorModeSwitch"),
  myEditorModeSingleButton: document.getElementById("myEditorModeSingleButton"),
  myEditorModeBatchButton: document.getElementById("myEditorModeBatchButton"),
  myShiftSingleSection: document.getElementById("myShiftSingleSection"),
  myShiftBatchSection: document.getElementById("myShiftBatchSection"),
  myShiftDateInput: document.getElementById("myShiftDateInput"),
  myShiftBatchStartInput: document.getElementById("myShiftBatchStartInput"),
  myShiftBatchEndInput: document.getElementById("myShiftBatchEndInput"),
  myShiftBatchWeekdays: document.getElementById("myShiftBatchWeekdays"),
  myShiftBatchPreview: document.getElementById("myShiftBatchPreview"),
  myShiftWorkFields: document.getElementById("myShiftWorkFields"),
  myShiftFacilitySelect: document.getElementById("myShiftFacilitySelect"),
  myShiftInstructorsList: document.getElementById("myShiftInstructorsList"),
  myShiftStartInput: document.getElementById("myShiftStartInput"),
  myShiftEndInput: document.getElementById("myShiftEndInput"),
  myShiftNoteInput: document.getElementById("myShiftNoteInput"),
  myShiftFillLatestButton: document.getElementById("myShiftFillLatestButton"),
  myShiftResetDraftButton: document.getElementById("myShiftResetDraftButton"),
  myShiftDraftSummary: document.getElementById("myShiftDraftSummary"),
  myScheduleNotice: document.getElementById("myScheduleNotice"),
  myScheduleTimeline: document.getElementById("myScheduleTimeline"),
  myEditorLaunchWrap: document.getElementById("myEditorLaunchWrap"),
  myEditorShiftList: document.getElementById("myEditorShiftList"),
  myEditorShiftStats: document.getElementById("myEditorShiftStats"),
  myEditorTitle: document.getElementById("myEditorTitle"),
  myEditorSummary: document.getElementById("myEditorSummary"),
  myWeeklyDayOffOptions: document.getElementById("myWeeklyDayOffOptions"),
  myWeeklyDayOffSummary: document.getElementById("myWeeklyDayOffSummary"),
  myShiftSubmitButton: document.getElementById("myShiftSubmitButton"),
  myShiftCancelEditButton: document.getElementById("myShiftCancelEditButton"),
  myDeleteHistoryButton: document.getElementById("myDeleteHistoryButton"),
  myChangesSummaryCard: document.getElementById("myChangesSummaryCard"),
  myChangesSummaryContent: document.getElementById("myChangesSummaryContent"),
  changesLatestCard: document.getElementById("changesLatestCard"),
  changesUpdatesCard: document.getElementById("changesUpdatesCard"),
};

init();

function init() {
  if (!state.siteChangesLastCheckedAt && state.siteChangesHistory[0]?.checkedAt) {
    state.siteChangesLastCheckedAt = String(state.siteChangesHistory[0].checkedAt);
    saveSiteChangesLastCheckedAt();
  }
  migrateLegacyAcknowledgedSiteChanges();
  if (syncStaffShiftsWithMyShifts()) {
    saveMyShifts();
  }

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
  if (el.settingsRefreshButton) {
    el.settingsRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "settings" }));
  }
  if (el.openSettingsChangesButton) {
    el.openSettingsChangesButton.addEventListener("click", () => setView("changes"));
  }
  if (el.openSettingsEditorButton) {
    el.openSettingsEditorButton.addEventListener("click", () => {
      state.myEditingShiftId = null;
      resetMyShiftForm();
      setView("my_schedule_editor");
    });
  }
  if (el.resetSiteChangesButton) {
    el.resetSiteChangesButton.addEventListener("click", handleResetSiteChanges);
  }
  if (el.myScheduleRefreshButton) {
    el.myScheduleRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "my_schedule_global" }));
  }
  if (el.changesRefreshButton) {
    el.changesRefreshButton.addEventListener("click", () => fetchSchedule(true, { source: "changes" }));
  }
  if (el.changesMain) {
    el.changesMain.addEventListener("click", handleChangesMainClick);
  }

  if (el.openSettingsButton) {
    el.openSettingsButton.addEventListener("click", () => setView("settings"));
  }
  if (el.backFromSettingsButton) {
    el.backFromSettingsButton.addEventListener("click", () => setView("my_schedule"));
  }
  if (el.backFromChangesButton) {
    el.backFromChangesButton.addEventListener("click", () => setView("my_schedule"));
  }
  if (el.backFromMyEditorButton) {
    el.backFromMyEditorButton.addEventListener("click", () => setView("my_schedule"));
  }

  if (el.myScheduleRangeButton) {
    el.myScheduleRangeButton.addEventListener("click", () => {
      state.myScheduleRangeMode =
        getMyScheduleRangeMode() === MY_SCHEDULE_RANGE.DAY ? MY_SCHEDULE_RANGE.FULL : MY_SCHEDULE_RANGE.DAY;
      renderMySchedule();
      scrollMyScheduleControlsIntoView();
    });
  }

  if (el.myShiftForm) {
    el.myShiftForm.addEventListener("submit", handleMyShiftSubmit);
    el.myShiftForm.addEventListener("input", renderMyShiftDraftPreview);
    el.myShiftForm.addEventListener("change", renderMyShiftDraftPreview);
    el.myShiftForm.addEventListener("click", handleMyShiftFormClick);
  }

  if (el.myShiftInstructorsList) {
    el.myShiftInstructorsList.addEventListener("change", () => {
      syncInstructorChipState();
      renderMyShiftDraftPreview();
    });
  }

  if (el.myEditorModeSingleButton) {
    el.myEditorModeSingleButton.addEventListener("click", () => setMyEditorMode("single"));
  }

  if (el.myEditorModeBatchButton) {
    el.myEditorModeBatchButton.addEventListener("click", () => setMyEditorMode("batch"));
  }

  if (el.myShiftFillLatestButton) {
    el.myShiftFillLatestButton.addEventListener("click", handleUseLatestShiftTemplate);
  }

  if (el.myShiftResetDraftButton) {
    el.myShiftResetDraftButton.addEventListener("click", () => {
      state.myEditingShiftId = null;
      resetMyShiftForm({ preserveDate: state.myScheduleFocusDate || todayIso() });
      renderMyScheduleEditor();
    });
  }

  if (el.myWeeklyDayOffOptions) {
    el.myWeeklyDayOffOptions.addEventListener("click", handleWeeklyDayOffPickerClick);
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

  if (el.settingsMain) {
    el.settingsMain.addEventListener("click", handleSettingsMainClick);
  }

  if (el.autoRefreshOptions) {
    el.autoRefreshOptions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-auto-refresh]");
      if (!button) {
        return;
      }

      state.settings.autoRefreshMins = Number(button.dataset.autoRefresh || 0);
      saveSettings();
      setupAutoRefresh();
      hydrateAutoRefreshButtons();
      renderSettingsView();
    });
  }

  if (el.themeSelector) {
    el.themeSelector.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-theme]");
      if (!button) {
        return;
      }

      state.settings.theme = button.dataset.theme;
      saveSettings();
      applyTheme(state.settings.theme);
      hydrateThemeButtons();
      renderSettingsView();
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.theme === "system") {
      applyTheme("system");
    }
  });

}

function setView(view) {
  if (view === "schedule") {
    view = "my_schedule";
  }
  state.view = view;

  const showSettings = view === "settings";
  const showMySchedule = view === "my_schedule";
  const showChanges = view === "changes";

  if (el.settingsView) {
    el.settingsView.hidden = !showSettings;
  }
  if (el.myScheduleView) {
    el.myScheduleView.hidden = !showMySchedule;
  }
  if (el.changesView) {
    el.changesView.hidden = !showChanges;
  }

  if (showMySchedule) {
    state.myScheduleFocusDate = todayIso();
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    if (el.myShiftDateInput) {
      el.myShiftDateInput.value = state.myScheduleFocusDate;
    }
    renderMySchedule();
  }
  if (showChanges) {
    renderChangesView();
  }
  if (showSettings) {
    renderSettingsView();
  }

  window.scrollTo({ top: 0, behavior: "auto" });
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
    renderAll();
  } catch {
    // ignore cache parse errors
  }
}

async function fetchSchedule(force, options = {}) {
  const { source = "auto" } = options;
  const isMyScheduleRefresh = source === "my_schedule" || source === "my_schedule_global";
  const isChangesRefresh = source === "changes";
  const shouldTrackSiteCheck = true;

  if (state.fetchInFlight) {
    if (isMyScheduleRefresh) {
      pulseRefreshButton(el.myScheduleRefreshButton);
    }
    if (isChangesRefresh) {
      pulseRefreshButton(el.changesRefreshButton);
    }
    return;
  }

  state.fetchInFlight = true;
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

  const query = force ? "?refresh=1" : "";

  try {
    const response = await fetch(`/api/schedule${query}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = applyLocalDemoSiteChanges(await response.json());
    const previousPayload = state.data ? clonePayload(state.data) : null;
    if (shouldTrackSiteCheck) {
      state.siteChangesLastCheckedAt = new Date().toISOString();
      saveSiteChangesLastCheckedAt();
    }
    registerSiteChanges(previousPayload, payload, { source, forced: force });
    state.data = payload;

    renderAll();

    localStorage.setItem(
      STORAGE.cache,
      JSON.stringify({
        at: new Date().toISOString(),
        payload,
      })
    );

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

function renderAll() {
  renderHeader();
  renderSettingsView();
  renderMySchedule();
  renderMyScheduleEditor();
  renderChangesView();
}

function renderHeader() {
  const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
  if (el.myScheduleUpdatedAt) {
    el.myScheduleUpdatedAt.textContent = freshness.shortText;
    el.myScheduleUpdatedAt.title = freshness.tooltip;
  }
  if (el.changesUpdatedAt && state.view !== "changes") {
    el.changesUpdatedAt.textContent = freshness.shortText;
    el.changesUpdatedAt.title = freshness.tooltip;
  }
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
    if (state.view === "changes") {
      renderChangesView();
    }
    if (state.view === "my_schedule") {
      renderMyChangesSummary();
    }
    if (state.view === "settings") {
      renderSettingsView();
    }
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

  return "перерыв";
}

function formatAutoRefreshLabel(minutes, options = {}) {
  const { compact = false } = options;
  const mins = Number(minutes || 0);
  if (!mins) {
    return compact ? "вручную" : "Только вручную";
  }
  return compact ? `${mins} мин` : `Каждые ${mins} минут`;
}

function buildCurrentSourceIssues() {
  if (!Array.isArray(state.data?.facilities)) {
    return [];
  }

  return state.data.facilities.flatMap((facility) => {
    const facilityName = String(facility?.name || "Источник");
    const sourceUrl = sanitizeHttpUrl(facility?.sourceUrl);
    const blockingNotice = getFacilityBlockingNotice(facility);
    if (blockingNotice) {
      return [{
        facilityName,
        description: String(blockingNotice.message || blockingNotice.summary || "На сайте опубликовано служебное сообщение."),
        kind: "notice",
        title: String(blockingNotice.badge || "Служебное сообщение"),
        sourceUrl,
      }];
    }

    if (facility?.error) {
      return [{
        facilityName,
        description: String(getFacilitySourceIssueText(facility) || facility.error),
        kind: "error",
        title: getFacilityIssueTitle(facility),
        sourceUrl,
      }];
    }

    if (Array.isArray(facility?.warnings) && facility.warnings.length) {
      return [{
        facilityName,
        description: String(getFacilitySourceIssueText(facility) || facility.warnings[0]),
        kind: "warn",
        title: getFacilityIssueTitle(facility),
        sourceUrl,
      }];
    }

    return [];
  }).slice(0, 6);
}

function buildSettingsOverviewModel() {
  const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
  const changesModel = buildChangesAttentionModel(
    Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [],
    state.siteChangesLastCheckedAt || state.siteChangesHistory?.[0]?.checkedAt || ""
  );
  const sourceIssues = buildCurrentSourceIssues();
  const unreadChanges = (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [])
    .filter((entry) => entry && !entry.baseline && (entry.hasChanges || entry.hasSourceIssues) && !isSiteChangeEntryAcknowledged(entry))
    .length;
  const hasData = Boolean(state.data?.generatedAt);
  const autoRefreshMins = Number(state.settings.autoRefreshMins || 0);
  const exportableItems =
    state.myShifts.length
    + (hasWeeklyDayOffConfigured() ? 1 : 0)
    + (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory.length : 0);

  let status = "setup";
  if (!hasData) {
    status = "setup";
  } else if (sourceIssues.some((issue) => issue.kind === "error") || changesModel.status === "issue") {
    status = "issue";
  } else if (changesModel.status === "important" || changesModel.status === "changes") {
    status = "attention";
  } else {
    status = "calm";
  }

  const toneClass =
    status === "issue"
      ? "tone-issue"
      : status === "attention"
        ? changesModel.status === "important" ? "tone-important" : "tone-info"
        : status === "calm"
          ? "tone-stable"
          : "tone-baseline";

  return {
    status,
    toneClass,
    hasData,
    freshness,
    changesModel,
    sourceIssues,
    unreadChanges,
    autoRefreshMins,
    exportableItems,
    hasMyShifts: state.myShifts.length > 0 || hasWeeklyDayOffConfigured(),
    hasHistory: Array.isArray(state.siteChangesHistory) && state.siteChangesHistory.length > 0,
    headline: buildSettingsHeadline(status, changesModel, sourceIssues),
    pill: buildSettingsPill(status),
    icon: buildSettingsIcon(status, changesModel),
    summary: buildSettingsSummary(status, changesModel, sourceIssues, freshness, autoRefreshMins),
  };
}

function buildSettingsHeadline(status, changesModel, sourceIssues) {
  if (status === "setup") {
    return "Ждём первую загрузку";
  }
  if (status === "issue") {
    return sourceIssues.some((issue) => issue.kind === "error") ? "Есть проблемы с данными" : "Проверка требует внимания";
  }
  if (status === "attention") {
    return changesModel.status === "important" ? "Есть важные изменения" : "Есть новые события";
  }
  return "Всё работает спокойно";
}

function buildSettingsPill(status) {
  if (status === "setup") {
    return "Настройка";
  }
  if (status === "issue") {
    return "Проверить";
  }
  if (status === "attention") {
    return "Новое";
  }
  return "Готово";
}

function buildSettingsIcon(status, changesModel) {
  if (status === "setup") {
    return "hourglass_top";
  }
  if (status === "issue") {
    return changesModel.status === "issue" ? "rule" : "warning";
  }
  if (status === "attention") {
    return changesModel.status === "important" ? "priority_high" : "notifications";
  }
  return "verified";
}

function buildSettingsSummary(status, changesModel, sourceIssues, freshness, autoRefreshMins) {
  if (status === "setup") {
    return "После первой успешной синхронизации здесь появится контроль состояния приложения, данных и локального мониторинга.";
  }
  if (status === "issue") {
    if (sourceIssues.length) {
      return `${sourceIssues.length} ${pluralizeRu(sourceIssues.length, "источник отвечает с проблемой", "источника отвечают с проблемой", "источников отвечают с проблемой")}. Последняя загрузка: ${freshness.shortText}.`;
    }
    return "Последняя локальная проверка была неполной. Лучше открыть страницу изменений и проверить детали.";
  }
  if (status === "attention") {
    if (changesModel.status === "important") {
      return `Есть непросмотренные изменения, которые затрагивают ${changesModel.focusImpact.total} ${pluralizeRu(changesModel.focusImpact.total, "вашу смену", "ваши смены", "ваших смен")}.`;
    }
    return `Новые изменения уже найдены. Автообновление сейчас: ${formatAutoRefreshLabel(autoRefreshMins, { compact: false }).toLowerCase()}.`;
  }
  return `Последняя загрузка прошла спокойно. Автообновление сейчас: ${formatAutoRefreshLabel(autoRefreshMins, { compact: false }).toLowerCase()}.`;
}

function buildSettingsMonitorSummary(model) {
  if (!model.hasData) {
    return "Пока приложение не получило первый снимок расписания. После загрузки появятся время обновления и локальный мониторинг изменений.";
  }

  const localStatus =
    model.changesModel.status === "important"
      ? "Есть важные непросмотренные изменения."
      : model.changesModel.status === "changes"
        ? "Есть новые изменения без влияния на ваши смены."
        : model.changesModel.status === "issue"
          ? "Последняя локальная проверка была неполной."
          : "Новых непросмотренных изменений сейчас нет.";

  return `${model.freshness.mainText}. ${localStatus}`;
}

function buildAutoRefreshHint(model) {
  if (!model.autoRefreshMins) {
    return "Режим вручную подходит, если вы сами открываете приложение перед работой и не хотите лишних фоновых запросов.";
  }
  if (model.autoRefreshMins <= 5) {
    return "Частый режим: удобен, если расписание меняется в течение дня и вы хотите быстро видеть новые события.";
  }
  if (model.autoRefreshMins <= 15) {
    return "Сбалансированный режим: обычно этого достаточно, чтобы держать изменения под контролем без лишнего шума.";
  }
  return "Редкий режим: меньше фоновых проверок, но изменения могут появляться в журнале с заметной задержкой.";
}

function hasSavedScheduleHistory() {
  return Boolean(state.myShifts.length || state.staffShifts.length || hasWeeklyDayOffConfigured());
}

function renderSettingsView() {
  const hasHistory = hasSavedScheduleHistory();
  if (el.exportMyShiftsButton) {
    el.exportMyShiftsButton.disabled = !hasHistory;
  }
  if (el.myDeleteHistoryButton) {
    el.myDeleteHistoryButton.disabled = !hasHistory;
    el.myDeleteHistoryButton.setAttribute("aria-disabled", hasHistory ? "false" : "true");
  }
}

function renderSettingsOverviewCard(model) {
  const metrics = [
    { label: "Данные", value: model.hasData ? model.freshness.shortText : "нет" },
    { label: "Автообновл.", value: formatAutoRefreshLabel(model.autoRefreshMins, { compact: true }) },
    { label: "Мои смены", value: String(state.myShifts.length) },
    { label: "Новых", value: String(model.unreadChanges) },
  ];

  return `
    <article class="settings-hero-card ${escapeHtml(model.toneClass)}">
      <div class="settings-hero-top">
        <div>
          <p class="settings-hero-kicker">Умная сводка</p>
          <p class="settings-hero-meta">${
            model.hasData ? escapeHtml(model.freshness.mainText) : "Данные ещё не загружены"
          }</p>
        </div>
        <span class="settings-state-pill">${escapeHtml(model.pill)}</span>
      </div>
      <div class="settings-hero-main">
        <div class="settings-hero-icon">
          <span class="material-symbols-outlined">${escapeHtml(model.icon)}</span>
        </div>
        <div class="settings-hero-copy">
          <h2>${escapeHtml(model.headline)}</h2>
          <p>${escapeHtml(model.summary)}</p>
        </div>
      </div>
      <div class="settings-hero-metrics">
        ${metrics.map((metric) => renderOverviewMetric(metric, "settings-hero-metric")).join("")}
      </div>
    </article>
  `;
}

function renderSettingsMonitorCard(model) {
  const monitorMetrics = [
    { label: "Режим", value: formatAutoRefreshLabel(model.autoRefreshMins, { compact: true }) },
    { label: "Журнал", value: String(state.siteChangesHistory.length) },
    { label: "Новых", value: String(model.unreadChanges) },
    { label: "Проблемы", value: String(model.sourceIssues.length) },
  ];

  return `
    <article class="settings-surface-card">
      <div class="settings-surface-head">
        <div>
          <p class="settings-surface-kicker">Фоновая проверка</p>
          <h3>${escapeHtml(model.autoRefreshMins ? `Автообновление ${formatAutoRefreshLabel(model.autoRefreshMins, { compact: false }).toLowerCase()}` : "Обновление только вручную")}</h3>
        </div>
        <span class="settings-surface-chip">${escapeHtml(model.hasData ? "Активно" : "Ожидание")}</span>
      </div>
      <p class="settings-surface-text">${escapeHtml(buildSettingsMonitorSummary(model))}</p>
      <div class="settings-surface-metrics">
        ${monitorMetrics.map((metric) => renderOverviewMetric(metric, "settings-surface-metric")).join("")}
      </div>
      <p class="settings-surface-footnote">${escapeHtml(buildAutoRefreshHint(model))}</p>
    </article>
  `;
}

function renderSettingsSourceIssues(issues) {
  if (!Array.isArray(issues) || !issues.length) {
    return `
      <article class="settings-inline-note is-calm">
        <span class="material-symbols-outlined">task_alt</span>
        <p>Сейчас нет явных проблем у источников данных.</p>
      </article>
    `;
  }

  return issues.map((issue) => {
    const linkStart = issue.sourceUrl
      ? `<a class="settings-inline-note ${escapeHtml(issue.kind === "error" ? "is-issue" : "is-warn")}" href="${escapeHtml(issue.sourceUrl)}" target="_blank" rel="noopener noreferrer">`
      : `<div class="settings-inline-note ${escapeHtml(issue.kind === "error" ? "is-issue" : "is-warn")}">`;
    const linkEnd = issue.sourceUrl ? "</a>" : "</div>";
    const detailParts = [String(issue.description || "").trim(), String(issue.title || "").trim()].filter(Boolean);

    return `
      ${linkStart}
        <span class="material-symbols-outlined">${issue.kind === "error" ? "warning" : "info"}</span>
        <div>
          <strong>${escapeHtml(issue.facilityName)}</strong>
          <p>${escapeHtml(detailParts.join(" · "))}</p>
        </div>
      ${linkEnd}
    `;
  }).join("");
}

function renderSettingsDataCard() {
  const hasScheduleData = state.myShifts.length > 0 || hasWeeklyDayOffConfigured();
  const facilityCount = new Set(
    state.myShifts
      .map((shift) => String(shift.facilityId || "").trim())
      .filter(Boolean)
  ).size;
  const staffPeopleCount = new Set(
    (state.staffShifts || [])
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean)
      .filter((name) => normalizeDiffText(name) !== normalizeDiffText(SELF_INSTRUCTOR_NAME))
  ).size;
  const metrics = [
    { label: "Смены", value: String(state.myShifts.length) },
    { label: "Выходной", value: hasWeeklyDayOffConfigured() ? getWeeklyDayOffLabel(state.weeklyDayOffWeekday, { short: true }) : "—" },
    { label: "Объекты", value: String(facilityCount) },
    { label: "Коллеги", value: String(staffPeopleCount) },
    { label: "Тема", value: resolveThemeLabel(state.settings.theme) },
  ];

  let summary = "Скачанный файл можно хранить как резервную копию и потом вернуть обратно одним импортом.";
  if (!hasScheduleData) {
    summary = "Если GPT уже собрал JSON по скриншотам, его можно сразу загрузить сюда без ручного редактирования.";
  }

  return `
    <article class="settings-surface-card">
      <div class="settings-surface-head">
        <div>
          <p class="settings-surface-kicker">JSON для приложения</p>
          <h3>${escapeHtml(hasScheduleData ? "Ваш график готов к резервной копии" : "Можно загрузить готовый график")}</h3>
        </div>
        <span class="settings-surface-chip">${escapeHtml(hasScheduleData ? "Есть график" : "Пока пусто")}</span>
      </div>
      <p class="settings-surface-text">${escapeHtml(summary)}</p>
      <div class="settings-surface-metrics">
        ${metrics.map((metric) => renderOverviewMetric(metric, "settings-surface-metric")).join("")}
      </div>
      <p class="settings-surface-footnote">Подходит и полный экспорт приложения, и объект вида <code>{ "shifts": [...], "staffShifts": [...] }</code>.</p>
    </article>
  `;
}

function renderSettingsPromptsCard() {
  return buildSettingsPromptCatalog()
    .map((prompt) => `
      <article class="settings-prompt-card">
        <div class="settings-prompt-head">
          <div>
            <p class="settings-prompt-kicker">${escapeHtml(prompt.kicker)}</p>
            <h3>${escapeHtml(prompt.title)}</h3>
            <p>${escapeHtml(prompt.description)}</p>
          </div>
          <button
            type="button"
            class="settings-copy-btn"
            data-copy-settings-prompt="${escapeHtml(prompt.id)}"
            data-default-label="${escapeHtml(prompt.buttonLabel)}"
            data-default-icon="content_copy"
          >
            <span class="material-symbols-outlined">content_copy</span>
            <span data-copy-label>${escapeHtml(prompt.buttonLabel)}</span>
          </button>
        </div>
        <pre class="settings-prompt-text">${escapeHtml(prompt.prompt)}</pre>
      </article>
    `)
    .join("");
}

function buildSettingsPromptCatalog() {
  const facilityLines = getMyFacilityOptions()
    .map((facility) => `- ${facility.name} -> ${facility.id}`)
    .join("\n");

  const extractPrompt = [
    `Ты получаешь несколько скриншотов месячного графика работы сотрудников по объектам ПолесГУ.`,
    `Твоя задача: найти только смены сотрудника "${SELF_INSTRUCTOR_NAME}" и вернуть готовый JSON для импорта в приложение.`,
    `Верни два массива: "shifts" и "staffShifts".`,
    `Верни только JSON без markdown, пояснений и текста до или после.`,
    ``,
    `Что обязательно учитывать:`,
    `1. Месяц и год бери из заголовка каждого скриншота.`,
    `2. Используй только дату, объект, фамилии сотрудников и интервалы времени в ячейках.`,
    `3. Игнорируй графу часов за день, цифры под сменами и итоговые часы за месяц: в них могут быть намеренные ошибки.`,
    `4. Если у "${SELF_INSTRUCTOR_NAME}" в ячейке стоит "в", "вс", "вых" или "вых.", это выходной: смену не создавай.`,
    `5. Если в ячейке стоит только пометка другого объекта ("лед", "мал", "спорт", "гребная"), не создавай смену из этой ячейки. Найди реальное время на скриншоте соответствующего объекта.`,
    `6. "shifts" — это только мои смены.`,
    `7. "staffShifts" — это смены сотрудников на тех датах и объектах, где у меня есть смена. Включай туда и мою запись, и коллег.`,
    `8. coworkers в моих сменах можешь заполнить по пересечению на всю смену или оставить пустым массивом, если staffShifts уже достаточно.`,
    `9. Меня самого в coworkers не добавляй.`,
    `10. Если время читается неуверенно, не выдумывай запись. Лучше пропусти её, чем сделай неверную смену.`,
    `11. note оставляй пустой строкой, если нет явной причины что-то пояснить.`,
    ``,
    `Сопоставление объектов с facilityId:`,
    facilityLines,
    ``,
    `Формат ответа:`,
    `{`,
    `  "shifts": [`,
    `    {`,
    `      "date": "2026-03-02",`,
    `      "facilityId": "rowing_base",`,
    `      "facilityName": "Гребная база",`,
    `      "start": "18:00",`,
    `      "end": "21:00",`,
    `      "coworkers": [],`,
    `      "note": ""`,
    `    }`,
    `  ],`,
    `  "staffShifts": [`,
    `    {`,
    `      "date": "2026-03-02",`,
    `      "facilityId": "rowing_base",`,
    `      "facilityName": "Гребная база",`,
    `      "name": "Сыцевич Н.В.",`,
    `      "start": "18:00",`,
    `      "end": "21:00"`,
    `    },`,
    `    {`,
    `      "date": "2026-03-02",`,
    `      "facilityId": "rowing_base",`,
    `      "facilityName": "Гребная база",`,
    `      "name": "Липчук А.С.",`,
    `      "start": "18:00",`,
    `      "end": "21:00"`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Правила по формату:`,
    `- date в формате YYYY-MM-DD`,
    `- start и end в формате HH:MM`,
    `- staffShifts должен содержать только даты и объекты, где у меня есть смена`,
    `- записи отсортируй по дате и времени`,
    `- если смен нет, верни { "shifts": [], "staffShifts": [] }`,
    `- не добавляй поля, которых нет в примере`,
    ``,
    `Сейчас я — "${SELF_INSTRUCTOR_NAME}". Анализируй только мои смены.`,
  ].join("\n");

  const reviewPrompt = [
    `Ты проверяешь уже готовый JSON со сменами по тем же скриншотам графика.`,
    `Смотри только на сотрудника "${SELF_INSTRUCTOR_NAME}".`,
    `В JSON должны быть два массива: "shifts" и "staffShifts".`,
    `Верни исправленный JSON без markdown, пояснений и текста до или после.`,
    ``,
    `Проверь по шагам:`,
    `1. Каждая смена должна быть подтверждена реальным временем на одном из скриншотов нужного объекта.`,
    `2. Выходные не должны превращаться в смены.`,
    `3. Пометки "лед", "мал", "спорт", "гребная" не являются сменами сами по себе — это только указание на другой объект.`,
    `4. staffShifts должен содержать мою смену и смены коллег на тех датах и объектах, где я реально работаю.`,
    `5. coworkers добавляй только если у сотрудников есть пересечение по времени на том же объекте и в тот же день.`,
    `6. Полностью игнорируй графу часов за день, цифры под сменами и месячные итоги.`,
    `7. Если запись сомнительна или противоречит скриншотам, лучше удали её, чем оставь неточной.`,
    ``,
    `Формат ответа:`,
    `{`,
    `  "shifts": [`,
    `    {`,
    `      "date": "2026-03-02",`,
    `      "facilityId": "rowing_base",`,
    `      "facilityName": "Гребная база",`,
    `      "start": "18:00",`,
    `      "end": "21:00",`,
    `      "coworkers": [],`,
      `      "note": ""`,
    `    }`,
    `  ],`,
    `  "staffShifts": [`,
    `    {`,
    `      "date": "2026-03-02",`,
    `      "facilityId": "rowing_base",`,
    `      "facilityName": "Гребная база",`,
    `      "name": "Сыцевич Н.В.",`,
    `      "start": "18:00",`,
    `      "end": "21:00"`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");

  return [
    {
      id: "extract",
      kicker: "Основной",
      title: "Скриншоты в JSON",
      description: "Первый прогон по новым графикам. На выходе должен быть готовый файл для импорта.",
      buttonLabel: "Копировать текст",
      prompt: extractPrompt,
    },
    {
      id: "review",
      kicker: "Проверка",
      title: "Проверить готовый JSON",
      description: "Второй прогон, если нужно проверить ответ GPT и убрать сомнительные записи.",
      buttonLabel: "Копировать проверку",
      prompt: reviewPrompt,
    },
  ];
}

function handleSettingsMainClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const copyButton = target.closest("[data-copy-settings-prompt]");
  if (!copyButton) {
    return;
  }

  void handleSettingsPromptCopy(String(copyButton.dataset.copySettingsPrompt || ""), copyButton);
}

async function handleSettingsPromptCopy(promptId, button) {
  const prompt = buildSettingsPromptCatalog().find((item) => item.id === promptId);
  if (!prompt) {
    return;
  }

  try {
    await copyTextToClipboard(prompt.prompt);
    flashSettingsCopyButton(button, "Скопировано", "done");
  } catch {
    flashSettingsCopyButton(button, "Не удалось", "priority_high");
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}

function flashSettingsCopyButton(button, label, icon) {
  const labelNode = button.querySelector("[data-copy-label]");
  const iconNode = button.querySelector(".material-symbols-outlined");
  if (!labelNode || !iconNode) {
    return;
  }

  const defaultLabel = String(button.dataset.defaultLabel || labelNode.textContent || "Копировать");
  const defaultIcon = String(button.dataset.defaultIcon || iconNode.textContent || "content_copy");

  if (button._settingsCopyTimer) {
    window.clearTimeout(button._settingsCopyTimer);
  }

  labelNode.textContent = label;
  iconNode.textContent = icon;
  button.classList.add("is-copied");
  button._settingsCopyTimer = window.setTimeout(() => {
    labelNode.textContent = defaultLabel;
    iconNode.textContent = defaultIcon;
    button.classList.remove("is-copied");
  }, 1800);
}

function resolveThemeLabel(theme) {
  switch (theme) {
    case "light":
      return "светлая";
    case "dark":
      return "тёмная";
    case "system":
    default:
      return "система";
  }
}

function hydrateMyScheduleUI() {
  if (!el.myShiftForm) {
    return;
  }

  if (!state.myScheduleFocusDate) {
    state.myScheduleFocusDate = hasWeeklyDayOffConfigured()
      ? findNextIsoDateForWeekday(todayIso(), state.weeklyDayOffWeekday)
      : todayIso();
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

  ensureMyShiftBatchDefaults({ force: true, anchorDate: state.myScheduleFocusDate });
  resetMyShiftForm();
  renderMySchedule();
  renderMyScheduleEditor();
}

function getMyScheduleRangeMode() {
  const mode = String(state.myScheduleRangeMode || "");
  if (mode === MY_SCHEDULE_RANGE.DAY || mode === MY_SCHEDULE_RANGE.FULL) {
    return mode;
  }
  if (mode === "week") {
    return MY_SCHEDULE_RANGE.FULL;
  }
  return MY_SCHEDULE_RANGE.DAY;
}

function buildMyScheduleTimelineItems(records) {
  return (Array.isArray(records) ? records : [])
    .filter(isWorkingShiftRecord)
    .slice()
    .sort(compareMyShift)
    .map((shift) => ({
      kind: MY_SHIFT_KIND.WORK,
      date: shift.date,
      shift,
      verification: getShiftVerification(shift),
    }));
}

function renderMySchedule() {
  if (!el.myScheduleTimeline) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(state.myScheduleFocusDate || ""))) {
    state.myScheduleFocusDate = todayIso();
  }

  renderMyScheduleFacilityOptions();
  let rangeMode = getMyScheduleRangeMode();
  if (el.myEditorLaunchWrap) {
    el.myEditorLaunchWrap.hidden = !state.myShifts.length && !hasWeeklyDayOffConfigured();
  }

  const timelineItems = buildMyScheduleTimelineItems(state.myShifts);

  const groupedByDate = new Map();
  for (const item of timelineItems) {
    if (!groupedByDate.has(item.date)) {
      groupedByDate.set(item.date, []);
    }
    groupedByDate.get(item.date).push(item);
  }

  const focusDate = state.myScheduleFocusDate;
  const canExpandRange = canExpandMyScheduleRange(focusDate, groupedByDate);
  if (!canExpandRange && rangeMode === MY_SCHEDULE_RANGE.FULL) {
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    rangeMode = MY_SCHEDULE_RANGE.DAY;
  }
  const datesToRender = getMyScheduleDatesToRender(focusDate, groupedByDate, rangeMode);
  updateMyScheduleRangeControls(rangeMode, canExpandRange);

  if (el.myTimelineTitle) {
    if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
      el.myTimelineTitle.textContent = "Весь график";
    } else {
      el.myTimelineTitle.textContent = "Выбранный день";
    }
  }

  if (!state.myShifts.length && !hasWeeklyDayOffConfigured()) {
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

function canExpandMyScheduleRange(focusDate, groupedByDate) {
  return Array.from(groupedByDate.keys()).some((date) => date > focusDate);
}

function updateMyScheduleRangeControls(rangeMode, canExpandRange) {
  if (el.myDayInlineActions) {
    el.myDayInlineActions.hidden = !canExpandRange;
  }

  if (!canExpandRange || !el.myScheduleRangeButton) {
    return;
  }

  const isExpanded = rangeMode === MY_SCHEDULE_RANGE.FULL;
  el.myScheduleRangeButton.classList.toggle("is-expanded", isExpanded);
  el.myScheduleRangeButton.setAttribute("aria-pressed", isExpanded ? "true" : "false");
  el.myScheduleRangeButton.title = isExpanded ? "Свернуть к выбранному дню" : "Показать весь график";

  if (el.myScheduleRangeIcon) {
    el.myScheduleRangeIcon.textContent = isExpanded ? "close_fullscreen" : "open_in_full";
  }
  if (el.myScheduleRangeLabel) {
    el.myScheduleRangeLabel.textContent = isExpanded ? "К дню" : "Весь график";
  }
}

function scrollMyScheduleControlsIntoView() {
  const target = el.myDaySpotlightHead || el.myScheduleTimeline || null;
  if (!target) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function renderMyScheduleEmptyState() {
  return `
    <section class="my-empty-state">
      <div class="my-empty-symbol" aria-hidden="true">
        <span class="material-symbols-outlined">calendar_clock</span>
      </div>
      <h4 class="my-empty-title">График пока пуст</h4>
      <p class="my-empty-text">
        Загрузите готовый JSON-файл со сменами.
        После импорта здесь появится график на выбранные сутки.
      </p>
      <div class="my-empty-actions">
        <button type="button" class="my-empty-cta" data-import-history>Загрузить JSON</button>
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
  return getFacilityOptionsFromData(state.data);
}

function getFacilityOptionsFromData(data) {
  if (data?.facilities?.length) {
    return data.facilities.map((facility) => ({
      id: String(facility.id),
      name: String(facility.name),
      sourceUrl: sanitizeHttpUrl(facility.sourceUrl),
    }));
  }

  return DEFAULT_FACILITY_OPTIONS;
}

function normalizeFacilityLookupKey(value) {
  return normalizeDiffText(value)
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/\bбольшой\b/g, "спортивный")
    .replace(/\bспорт\.?\b/g, "спортивный")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveImportedFacility(item, facilityOptions = DEFAULT_FACILITY_OPTIONS) {
  const options = Array.isArray(facilityOptions) && facilityOptions.length ? facilityOptions : DEFAULT_FACILITY_OPTIONS;
  const rawId = String(item?.facilityId || item?.facility_id || "").trim();
  const rawName = String(item?.facilityName || item?.facility || item?.object || item?.location || "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases = new Map([
    ["ледовая арена", "ice_arena"],
    ["большой бассейн", "sports_pool"],
    ["спортивный бассейн", "sports_pool"],
    ["малый бассейн", "small_pool"],
    ["гребная база", "rowing_base"],
  ]);

  if (rawId) {
    const matchById = options.find((facility) => String(facility.id) === rawId);
    if (matchById) {
      return {
        facilityId: matchById.id,
        facilityName: matchById.name,
      };
    }
  }

  const normalizedName = normalizeFacilityLookupKey(rawName);
  if (normalizedName) {
    const aliasId = aliases.get(normalizedName);
    const matchByName =
      options.find((facility) => normalizeFacilityLookupKey(facility.name) === normalizedName)
      || options.find((facility) => normalizeFacilityLookupKey(facility.name).includes(normalizedName))
      || options.find((facility) => normalizedName.includes(normalizeFacilityLookupKey(facility.name)))
      || (aliasId ? options.find((facility) => String(facility.id) === aliasId) : null);

    if (matchByName) {
      return {
        facilityId: matchByName.id,
        facilityName: matchByName.name,
      };
    }
  }

  return {
    facilityId: rawId,
    facilityName: rawName || rawId,
  };
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

  for (const entry of state.staffShifts || []) {
    const normalized = normalizeDiffText(entry?.name);
    if (!normalized || normalized === normalizeDiffText(SELF_INSTRUCTOR_NAME)) {
      continue;
    }
    if (!map.has(normalized)) {
      map.set(normalized, String(entry.name));
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

function getMyEditorMode() {
  if (state.myEditingShiftId) {
    return "single";
  }
  return String(state.myEditorMode || "") === "batch" ? "batch" : "single";
}

function setMyEditorMode(mode) {
  const nextMode = mode === "batch" && !state.myEditingShiftId ? "batch" : "single";
  state.myEditorMode = nextMode;
  if (nextMode === "batch") {
    ensureMyShiftBatchDefaults();
  }
  renderMyScheduleEditor();
}

function renderMyEditorModeUI() {
  const mode = getMyEditorMode();
  const isEditing = Boolean(state.myEditingShiftId);

  if (el.myEditorModeSingleButton) {
    const active = mode === "single";
    el.myEditorModeSingleButton.classList.toggle("is-active", active);
    el.myEditorModeSingleButton.setAttribute("aria-pressed", active ? "true" : "false");
  }

  if (el.myEditorModeBatchButton) {
    const active = mode === "batch";
    el.myEditorModeBatchButton.classList.toggle("is-active", active);
    el.myEditorModeBatchButton.setAttribute("aria-pressed", active ? "true" : "false");
    el.myEditorModeBatchButton.disabled = isEditing;
    el.myEditorModeBatchButton.title = isEditing ? "Серия недоступна при редактировании одной записи" : "Добавить серию смен";
  }

  if (el.myEditorModeSwitch) {
    el.myEditorModeSwitch.classList.toggle("is-editing", isEditing);
  }

  if (el.myShiftSingleSection) {
    el.myShiftSingleSection.hidden = mode !== "single";
  }

  if (el.myShiftBatchSection) {
    el.myShiftBatchSection.hidden = mode !== "batch";
  }
}

function handleMyShiftFormClick(event) {
  const shortcutButton = event.target.closest("button[data-shift-date-shortcut]");
  if (shortcutButton) {
    applyMyShiftDateShortcut(String(shortcutButton.dataset.shiftDateShortcut || ""));
    return;
  }

  const presetButton = event.target.closest("button[data-batch-preset]");
  if (presetButton) {
    applyMyShiftBatchPreset(String(presetButton.dataset.batchPreset || ""));
    return;
  }

  const weekdayButton = event.target.closest("button[data-batch-weekday]");
  if (weekdayButton) {
    toggleMyShiftBatchWeekday(weekdayButton.dataset.batchWeekday || "");
  }
}

function applyMyShiftDateShortcut(shortcut) {
  if (!el.myShiftDateInput) {
    return;
  }

  const current = /^\d{4}-\d{2}-\d{2}$/.test(String(el.myShiftDateInput.value || ""))
    ? String(el.myShiftDateInput.value)
    : todayIso();

  switch (shortcut) {
    case "today":
      el.myShiftDateInput.value = todayIso();
      break;
    case "tomorrow":
      el.myShiftDateInput.value = addDays(todayIso(), 1);
      break;
    case "next_day":
      el.myShiftDateInput.value = addDays(current, 1);
      break;
    default:
      return;
  }

  ensureMyShiftBatchDefaults({ anchorDate: el.myShiftDateInput.value });
  renderMyShiftDraftPreview();
}

function getSelectedMyShiftBatchWeekdays() {
  if (!el.myShiftBatchWeekdays) {
    return [];
  }

  const fromDataset = String(el.myShiftBatchWeekdays.dataset.selectedWeekdays || "")
    .split(",")
    .map((value) => normalizeWeekdayValue(value))
    .filter((value) => value !== null);

  return Array.from(new Set(fromDataset));
}

function setSelectedMyShiftBatchWeekdays(values) {
  if (!el.myShiftBatchWeekdays) {
    return;
  }

  const normalized = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeWeekdayValue(value))
        .filter((value) => value !== null)
    )
  );

  el.myShiftBatchWeekdays.dataset.selectedWeekdays = normalized.join(",");
  renderMyShiftBatchWeekdayOptions();
}

function renderMyShiftBatchWeekdayOptions() {
  if (!el.myShiftBatchWeekdays) {
    return;
  }

  const selected = new Set(getSelectedMyShiftBatchWeekdays());
  el.myShiftBatchWeekdays.innerHTML = WEEKDAY_OPTIONS
    .map((item) => {
      const isActive = selected.has(item.value);
      return `
        <button
          type="button"
          class="my-weekday-chip ${isActive ? "is-active" : ""}"
          data-batch-weekday="${String(item.value)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeHtml(item.label)}"
        >
          <span>${escapeHtml(item.short)}</span>
        </button>
      `;
    })
    .join("");
}

function toggleMyShiftBatchWeekday(rawValue) {
  const weekday = normalizeWeekdayValue(rawValue);
  if (weekday === null) {
    return;
  }

  const selected = new Set(getSelectedMyShiftBatchWeekdays());
  if (selected.has(weekday)) {
    selected.delete(weekday);
  } else {
    selected.add(weekday);
  }

  setSelectedMyShiftBatchWeekdays(Array.from(selected));
  renderMyShiftDraftPreview();
}

function applyMyShiftBatchPreset(preset) {
  switch (String(preset || "")) {
    case "weekdays":
      setSelectedMyShiftBatchWeekdays([1, 2, 3, 4, 5]);
      break;
    case "weekend":
      setSelectedMyShiftBatchWeekdays([6, 0]);
      break;
    case "all":
      setSelectedMyShiftBatchWeekdays([1, 2, 3, 4, 5, 6, 0]);
      break;
    case "clear":
      setSelectedMyShiftBatchWeekdays([]);
      break;
    default:
      return;
  }

  renderMyShiftDraftPreview();
}

function ensureMyShiftBatchDefaults(options = {}) {
  const { force = false, anchorDate = "" } = options;
  const resolvedAnchor = /^\d{4}-\d{2}-\d{2}$/.test(String(anchorDate || ""))
    ? String(anchorDate)
    : /^\d{4}-\d{2}-\d{2}$/.test(String(el.myShiftDateInput?.value || ""))
      ? String(el.myShiftDateInput.value)
      : state.myScheduleFocusDate || todayIso();

  if (el.myShiftBatchStartInput && (force || !/^\d{4}-\d{2}-\d{2}$/.test(String(el.myShiftBatchStartInput.value || "")))) {
    el.myShiftBatchStartInput.value = resolvedAnchor;
  }

  if (el.myShiftBatchEndInput && (force || !/^\d{4}-\d{2}-\d{2}$/.test(String(el.myShiftBatchEndInput.value || "")))) {
    el.myShiftBatchEndInput.value = addDays(resolvedAnchor, 13);
  }

  if (!getSelectedMyShiftBatchWeekdays().length || force) {
    const weekday = normalizeWeekdayValue(getIsoDateWeekday(resolvedAnchor));
    setSelectedMyShiftBatchWeekdays(weekday === null ? [] : [weekday]);
  } else {
    renderMyShiftBatchWeekdayOptions();
  }
}

function extractMyShiftTemplateFromForm() {
  return {
    facilityId: String(el.myShiftFacilitySelect?.value || ""),
    start: normalizeTime(String(el.myShiftStartInput?.value || "")),
    end: normalizeTime(String(el.myShiftEndInput?.value || "")),
    note: String(el.myShiftNoteInput?.value || "").trim(),
    coworkers: getSelectedMyShiftInstructors(),
  };
}

function applyMyShiftTemplate(template = {}) {
  renderMyScheduleFacilityOptions();

  if (el.myShiftFacilitySelect && template.facilityId) {
    el.myShiftFacilitySelect.value = String(template.facilityId);
  }
  if (el.myShiftStartInput && template.start) {
    el.myShiftStartInput.value = String(template.start);
  }
  if (el.myShiftEndInput && template.end) {
    el.myShiftEndInput.value = String(template.end);
  }
  if (el.myShiftNoteInput) {
    el.myShiftNoteInput.value = String(template.note || "");
  }

  renderMyInstructorOptions(template.coworkers || []);
  syncInstructorChipState();
}

function getMyShiftTemplateFromShift(shift) {
  return {
    facilityId: String(shift?.facilityId || ""),
    start: String(shift?.start || ""),
    end: String(shift?.end || ""),
    note: String(shift?.note || ""),
    coworkers: Array.isArray(shift?.coworkers) ? shift.coworkers : [],
  };
}

function getLatestCreatedMyShift() {
  if (!Array.isArray(state.myShifts) || !state.myShifts.length) {
    return null;
  }

  return state.myShifts
    .slice()
    .sort((a, b) => {
      const aCreatedAt = Date.parse(String(a?.createdAt || ""));
      const bCreatedAt = Date.parse(String(b?.createdAt || ""));
      if (!Number.isNaN(aCreatedAt) || !Number.isNaN(bCreatedAt)) {
        return (Number.isNaN(bCreatedAt) ? 0 : bCreatedAt) - (Number.isNaN(aCreatedAt) ? 0 : aCreatedAt);
      }
      return compareMyShift(b, a);
    })[0] || null;
}

function seedMyShiftFormFromShift(shift) {
  if (!shift) {
    return;
  }

  applyMyShiftTemplate(getMyShiftTemplateFromShift(shift));

  if (el.myShiftDateInput) {
    el.myShiftDateInput.value = String(shift.date || state.myScheduleFocusDate || todayIso());
  }
  ensureMyShiftBatchDefaults({ force: true, anchorDate: shift.date || state.myScheduleFocusDate || todayIso() });
  renderMyShiftDraftPreview();
}

function handleUseLatestShiftTemplate() {
  const latestShift = getLatestCreatedMyShift();
  if (!latestShift) {
    setMyScheduleNotice("Пока нет смен, из которых можно собрать шаблон.", "info");
    return;
  }

  state.myEditingShiftId = null;
  seedMyShiftFormFromShift(latestShift);
  renderMyScheduleEditor();
  setMyScheduleNotice("Шаблон заполнен по последней смене.", "info");
}

function collectMyShiftBatchDates() {
  const start = String(el.myShiftBatchStartInput?.value || "");
  const end = String(el.myShiftBatchEndInput?.value || "");
  const weekdays = new Set(getSelectedMyShiftBatchWeekdays());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return {
      dates: [],
      error: "Выберите начало и конец серии.",
    };
  }

  if (end < start) {
    return {
      dates: [],
      error: "Дата окончания серии должна быть не раньше даты начала.",
    };
  }

  if (!weekdays.size) {
    return {
      dates: [],
      error: "Отметьте хотя бы один день недели для серии.",
    };
  }

  const dates = [];
  let cursor = start;
  let guard = 0;

  while (cursor <= end && guard < 370) {
    if (weekdays.has(getIsoDateWeekday(cursor))) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  if (guard >= 370) {
    return {
      dates: [],
      error: "Серия получилась слишком длинной. Сократите диапазон до одного года.",
    };
  }

  if (!dates.length) {
    return {
      dates: [],
      error: "В выбранном диапазоне нет отмеченных дней недели.",
    };
  }

  return {
    dates,
    error: "",
  };
}

function findMyShiftBySlot(candidate, ignoreShiftId = "") {
  return (state.myShifts || []).find((item) => (
    item
    && item.id !== ignoreShiftId
    && item.date === candidate.date
    && item.facilityId === candidate.facilityId
    && item.start === candidate.start
    && item.end === candidate.end
  )) || null;
}

function buildMyShiftDraftPlan() {
  const editingShift = state.myEditingShiftId
    ? state.myShifts.find((item) => item.id === state.myEditingShiftId) || null
    : null;
  const mode = editingShift ? "single" : getMyEditorMode();
  const date = String(el.myShiftDateInput?.value || "");
  const note = String(el.myShiftNoteInput?.value || "").trim();
  const facilityId = String(el.myShiftFacilitySelect?.value || "");
  const start = normalizeTime(String(el.myShiftStartInput?.value || ""));
  const end = normalizeTime(String(el.myShiftEndInput?.value || ""));
  const coworkers = getSelectedMyShiftInstructors();
  const facility = getMyFacilityOptions().find((item) => item.id === facilityId) || null;

  const errors = [];
  if (!start || !end) {
    errors.push("Укажите корректное время начала и окончания.");
  } else if (toMinutes(end) <= toMinutes(start)) {
    errors.push("Время окончания должно быть позже времени начала.");
  }

  if (!facilityId) {
    errors.push("Выберите объект работы.");
  }

  let candidateDates = [];
  if (mode === "batch") {
    const batchDates = collectMyShiftBatchDates();
    candidateDates = batchDates.dates;
    if (batchDates.error) {
      errors.push(batchDates.error);
    }
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("Выберите корректную дату смены.");
  } else {
    candidateDates = [date];
  }

  const candidates = !errors.length
    ? candidateDates.map((candidateDate) => ({
      id: editingShift ? editingShift.id : "",
      kind: MY_SHIFT_KIND.WORK,
      date: candidateDate,
      facilityId,
      facilityName: facility ? facility.name : "Объект",
      start,
      end,
      note,
      coworkers,
      createdAt: editingShift?.createdAt || "",
    }))
    : [];

  const duplicates = [];
  const newCandidates = [];

  for (const candidate of candidates) {
    const existing = findMyShiftBySlot(candidate, editingShift?.id || "");
    if (existing) {
      duplicates.push({
        candidate,
        existing,
      });
    } else {
      newCandidates.push(candidate);
    }
  }

  const weeklyDayOffConflicts = candidates.filter((candidate) => (
    candidate.date >= todayIso() && isWeeklyDayOffDate(candidate.date)
  ));

  return {
    editingShift,
    mode,
    facility,
    facilityId,
    start,
    end,
    note,
    coworkers,
    errors,
    candidateDates,
    candidates,
    duplicates,
    newCandidates,
    weeklyDayOffConflicts,
  };
}

function renderMyShiftBatchPreview(plan = buildMyShiftDraftPlan()) {
  if (!el.myShiftBatchPreview) {
    return;
  }

  if (getMyEditorMode() !== "batch") {
    el.myShiftBatchPreview.innerHTML = "";
    return;
  }

  if (plan.errors.length) {
    el.myShiftBatchPreview.innerHTML = `
      <div class="my-editor-preview-empty">
        <p>${escapeHtml(plan.errors[0])}</p>
      </div>
    `;
    return;
  }

  const previewDates = plan.candidateDates.slice(0, 8);
  const extraDatesCount = Math.max(0, plan.candidateDates.length - previewDates.length);

  el.myShiftBatchPreview.innerHTML = `
    <div class="my-editor-preview-meta">
      <span class="my-editor-stat-pill">${escapeHtml(String(plan.candidateDates.length))} ${escapeHtml(pluralizeRu(plan.candidateDates.length, "дата", "даты", "дат"))}</span>
      ${plan.duplicates.length ? `<span class="my-editor-stat-pill warning">уже есть: ${escapeHtml(String(plan.duplicates.length))}</span>` : ""}
    </div>
    <div class="my-editor-preview-dates">
      ${previewDates.map((candidateDate) => `<span class="my-editor-date-pill">${escapeHtml(formatMonthDayShort(candidateDate))}</span>`).join("")}
      ${extraDatesCount ? `<span class="my-editor-date-pill muted">+${escapeHtml(String(extraDatesCount))}</span>` : ""}
    </div>
  `;
}

function updateMyShiftSubmitButton(plan = buildMyShiftDraftPlan()) {
  if (!el.myShiftSubmitButton) {
    return;
  }

  if (plan.editingShift) {
    el.myShiftSubmitButton.textContent = "Сохранить изменения";
    return;
  }

  if (plan.mode === "batch") {
    if (plan.newCandidates.length) {
      el.myShiftSubmitButton.textContent = `Добавить ${plan.newCandidates.length} ${pluralizeRu(plan.newCandidates.length, "смену", "смены", "смен")}`;
      return;
    }
    el.myShiftSubmitButton.textContent = "Добавить серию";
    return;
  }

  el.myShiftSubmitButton.textContent = "Сохранить смену";
}

function renderMyShiftDraftPreview() {
  const plan = buildMyShiftDraftPlan();
  renderMyShiftDraftSummary(plan);
}

function renderMyShiftDraftSummary(plan = buildMyShiftDraftPlan()) {
  renderMyEditorModeUI();
  renderMyShiftBatchPreview(plan);
  updateMyShiftSubmitButton(plan);

  if (!el.myShiftDraftSummary) {
    return;
  }

  if (!plan.facilityId && !plan.start && !plan.end && !plan.candidateDates.length) {
    el.myShiftDraftSummary.innerHTML = `
      <div class="my-editor-summary-empty">
        <p>Выберите объект, время и дату. После этого здесь появится понятный итог по записи или серии.</p>
      </div>
    `;
    return;
  }

  if (plan.errors.length) {
    el.myShiftDraftSummary.innerHTML = `
      <div class="my-editor-summary-empty">
        <p>${escapeHtml(plan.errors[0])}</p>
      </div>
    `;
    return;
  }

  const previewDates = plan.candidateDates.slice(0, plan.mode === "batch" ? 6 : 1);
  const datesOverflow = Math.max(0, plan.candidateDates.length - previewDates.length);
  const coworkersLabel = plan.coworkers.length
    ? `С коллегами: ${plan.coworkers.join(", ")}`
    : "Без коллег";
  const modeLabel = plan.editingShift ? "Редактирование" : plan.mode === "batch" ? "Серия" : "Одна смена";
  const resultingCount = plan.editingShift ? (plan.duplicates.length ? 0 : 1) : plan.newCandidates.length;

  el.myShiftDraftSummary.innerHTML = `
    <div class="my-editor-summary-top">
      <span class="my-editor-stat-pill">${escapeHtml(modeLabel)}</span>
      <span class="my-editor-stat-pill success">Добавится: ${escapeHtml(String(resultingCount))}</span>
      ${plan.duplicates.length ? `<span class="my-editor-stat-pill warning">Повторы: ${escapeHtml(String(plan.duplicates.length))}</span>` : ""}
    </div>

    <div class="my-editor-summary-main">
      <h4>${escapeHtml(plan.facility?.name || "Объект не выбран")}</h4>
      <p>${escapeHtml(`${plan.start} - ${plan.end}`)}</p>
      <p>${escapeHtml(coworkersLabel)}</p>
      ${plan.note ? `<p>${escapeHtml(plan.note)}</p>` : ""}
    </div>

    <div class="my-editor-summary-block">
      <span>Даты</span>
      <div class="my-editor-preview-dates">
        ${previewDates.map((candidateDate) => `<span class="my-editor-date-pill">${escapeHtml(formatMonthDayShort(candidateDate))}</span>`).join("")}
        ${datesOverflow ? `<span class="my-editor-date-pill muted">+${escapeHtml(String(datesOverflow))}</span>` : ""}
      </div>
    </div>

    ${plan.weeklyDayOffConflicts.length ? `
      <div class="my-editor-summary-callout">
        На ${escapeHtml(String(plan.weeklyDayOffConflicts.length))} ${escapeHtml(pluralizeRu(plan.weeklyDayOffConflicts.length, "дату", "даты", "дат"))} уже попадает выбранный еженедельный выходной.
      </div>
    ` : ""}

    ${plan.duplicates.length ? `
      <div class="my-editor-summary-callout muted">
        Повторяющиеся слоты будут пропущены при сохранении, чтобы не плодить дубликаты.
      </div>
    ` : ""}
  `;
}

function normalizeMyShiftKind(value) {
  return String(value || "").trim() === MY_SHIFT_KIND.DAY_OFF ? MY_SHIFT_KIND.DAY_OFF : MY_SHIFT_KIND.WORK;
}

function normalizeWeekdayValue(value) {
  if (value === null || value === undefined || typeof value === "boolean") {
    return null;
  }

  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") {
    return null;
  }

  const number = Number(raw);
  if (!Number.isInteger(number) || number < 0 || number > 6) {
    return null;
  }
  return number;
}

function isWorkingShiftRecord(shift) {
  return Boolean(shift && normalizeMyShiftKind(shift?.kind) !== MY_SHIFT_KIND.DAY_OFF);
}

function getIsoDateWeekday(isoDate) {
  const [year, month, day] = String(isoDate || "").split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

function hasWeeklyDayOffConfigured() {
  return normalizeWeekdayValue(state.weeklyDayOffWeekday) !== null;
}

function getWeeklyDayOffLabel(weekday, options = {}) {
  const normalized = normalizeWeekdayValue(weekday);
  if (normalized === null) {
    return "";
  }

  const { short = false } = options;
  const item = WEEKDAY_OPTIONS.find((entry) => entry.value === normalized) || null;
  if (!item) {
    return "";
  }

  return short ? item.short : item.label;
}

function isWeeklyDayOffDate(isoDate) {
  const configured = normalizeWeekdayValue(state.weeklyDayOffWeekday);
  if (configured === null) {
    return false;
  }
  return getIsoDateWeekday(isoDate) === configured;
}

function findNextIsoDateForWeekday(fromIsoDate, weekday) {
  const normalized = normalizeWeekdayValue(weekday);
  if (normalized === null) {
    return String(fromIsoDate || todayIso());
  }

  let cursor = /^\d{4}-\d{2}-\d{2}$/.test(String(fromIsoDate || "")) ? String(fromIsoDate) : todayIso();
  for (let index = 0; index < 7; index += 1) {
    if (getIsoDateWeekday(cursor) === normalized) {
      return cursor;
    }
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

function countUpcomingShiftsOnWeekday(weekday) {
  const normalized = normalizeWeekdayValue(weekday);
  if (normalized === null) {
    return 0;
  }

  const today = todayIso();
  return (state.myShifts || [])
    .filter(isWorkingShiftRecord)
    .filter((shift) => String(shift.date || "") >= today)
    .filter((shift) => getIsoDateWeekday(shift.date) === normalized)
    .length;
}

function buildWeeklyDayOffConflictMessage(weekday, count) {
  const label = getWeeklyDayOffLabel(weekday);
  return `Нельзя выбрать ${label.toLowerCase()} выходным: в будущих сменах уже есть ${count} ${pluralizeRu(count, "запись", "записи", "записей")} на этот день.`;
}

function buildMyShiftConflictMessage(date) {
  if (!isWeeklyDayOffDate(date)) {
    return "";
  }
  return `На ${formatMyDayHeading(date)} выпадает выбранный еженедельный выходной.`;
}

function buildMyShiftDeletePrompt(shift) {
  return `Удалить смену ${shift.date} ${shift.start}–${shift.end}?`;
}

function getRecurringDayOffMeta(renderDate) {
  const weekdayLabel = getWeeklyDayOffLabel(state.weeklyDayOffWeekday);
  if (!weekdayLabel) {
    return {
      badge: "",
      summary: "",
    };
  }

  return {
    badge: capitalize(weekdayLabel),
    summary: `${formatMonthDayShort(renderDate)} автоматически отмечен как еженедельный выходной.`,
  };
}

function handleMyShiftSubmit(event) {
  event.preventDefault();

  const plan = buildMyShiftDraftPlan();
  const template = extractMyShiftTemplateFromForm();
  const batchState = {
    start: String(el.myShiftBatchStartInput?.value || ""),
    end: String(el.myShiftBatchEndInput?.value || ""),
    weekdays: getSelectedMyShiftBatchWeekdays(),
  };

  if (plan.errors.length) {
    setMyScheduleNotice(plan.errors[0], "error");
    return;
  }

  if (plan.editingShift) {
    if (plan.duplicates.length) {
      setMyScheduleNotice("Такая смена уже есть в графике. Откройте её из журнала и измените существующую запись.", "error");
      return;
    }

    const updatedShift = {
      ...plan.candidates[0],
      id: plan.editingShift.id,
      createdAt: plan.editingShift.createdAt || new Date().toISOString(),
    };

    state.myShifts = state.myShifts
      .map((item) => (item.id === plan.editingShift.id ? updatedShift : item))
      .sort(compareMyShift);

    saveMyShifts();
    state.myScheduleFocusDate = updatedShift.date;
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    state.myEditingShiftId = null;
    resetMyShiftForm({ preserveDate: updatedShift.date, preserveTemplate: getMyShiftTemplateFromShift(updatedShift) });

    const noticeMessage = plan.weeklyDayOffConflicts.length
      ? `Смена обновлена. ${buildMyShiftConflictMessage(updatedShift.date)}`
      : "Смена обновлена.";
    setMyScheduleNotice(noticeMessage, "success");
    renderMySchedule();
    renderMyScheduleEditor();
    return;
  }

  if (plan.mode === "batch") {
    if (!plan.newCandidates.length) {
      const duplicateMessage = plan.duplicates.length
        ? "Все смены из этой серии уже есть в графике."
        : "Серия пока не сформирована. Проверьте диапазон и дни недели.";
      setMyScheduleNotice(duplicateMessage, plan.duplicates.length ? "info" : "error");
      return;
    }

    const createdAt = new Date().toISOString();
    const shiftsToAdd = plan.newCandidates.map((candidate) => ({
      ...candidate,
      id: createShiftId(),
      createdAt,
    }));

    state.myShifts = [...state.myShifts, ...shiftsToAdd].sort(compareMyShift);
    saveMyShifts();

    state.myScheduleFocusDate = shiftsToAdd[0].date;
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    resetMyShiftForm({ preserveDate: shiftsToAdd[0].date, preserveTemplate: template, preserveBatch: batchState });

    const messageParts = [`Добавлено ${shiftsToAdd.length} ${pluralizeRu(shiftsToAdd.length, "смена", "смены", "смен")}.`];
    if (plan.duplicates.length) {
      messageParts.push(`Пропущено повторов: ${plan.duplicates.length}.`);
    }
    if (plan.weeklyDayOffConflicts.length) {
      messageParts.push(`Совпадений с еженедельным выходным: ${plan.weeklyDayOffConflicts.length}.`);
    }

    setMyScheduleNotice(messageParts.join(" "), "success");
    renderMySchedule();
    renderMyScheduleEditor();
    return;
  }

  if (plan.duplicates.length) {
    setMyScheduleNotice("Такая смена уже есть в графике. Чтобы поправить её, используйте редактирование из журнала ниже.", "error");
    return;
  }

  const shift = {
    ...plan.newCandidates[0],
    id: createShiftId(),
    createdAt: new Date().toISOString(),
  };

  state.myShifts = [...state.myShifts, shift].sort(compareMyShift);
  saveMyShifts();

  state.myScheduleFocusDate = shift.date;
  state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
  resetMyShiftForm({ preserveDate: shift.date, preserveTemplate: getMyShiftTemplateFromShift(shift) });

  const noticeMessage = plan.weeklyDayOffConflicts.length
    ? `Смена добавлена в график. ${buildMyShiftConflictMessage(shift.date)}`
    : "Смена добавлена в график.";
  setMyScheduleNotice(noticeMessage, "success");
  renderMySchedule();
  renderMyScheduleEditor();
}

function resetMyShiftForm(options = {}) {
  const { preserveDate = "", preserveTemplate = null, preserveBatch = null } = options;
  if (!el.myShiftForm) {
    return;
  }

  el.myShiftForm.reset();
  delete el.myShiftForm.dataset.boundShiftId;

  const targetDate = preserveDate || state.myScheduleFocusDate || todayIso();
  if (el.myShiftDateInput) {
    el.myShiftDateInput.value = targetDate;
  }

  applyMyShiftTemplate({
    start: "08:00",
    end: "10:00",
    ...(preserveTemplate || {}),
  });

  if (preserveBatch) {
    if (el.myShiftBatchStartInput) {
      el.myShiftBatchStartInput.value = String(preserveBatch.start || "");
    }
    if (el.myShiftBatchEndInput) {
      el.myShiftBatchEndInput.value = String(preserveBatch.end || "");
    }
    setSelectedMyShiftBatchWeekdays(preserveBatch.weekdays || []);
  }

  ensureMyShiftBatchDefaults({ anchorDate: targetDate });
  syncMyShiftEditorFormState();
}

function syncMyShiftEditorFormState() {
  const editingShift = state.myEditingShiftId
    ? state.myShifts.find((item) => item.id === state.myEditingShiftId) || null
    : null;

  if (editingShift) {
    const shouldSeedForm = String(el.myShiftForm?.dataset.boundShiftId || "") !== editingShift.id;
    if (shouldSeedForm) {
      el.myShiftDateInput.value = editingShift.date;
      el.myShiftNoteInput.value = editingShift.note || "";
      el.myShiftFacilitySelect.value = editingShift.facilityId;
      el.myShiftStartInput.value = editingShift.start;
      el.myShiftEndInput.value = editingShift.end;
      renderMyInstructorOptions(editingShift.coworkers || []);
      syncInstructorChipState();
      el.myShiftForm.dataset.boundShiftId = editingShift.id;
    }

    if (el.myEditorTitle) {
      el.myEditorTitle.textContent = "Редактирование смены";
    }
    if (el.myEditorSummary) {
      el.myEditorSummary.textContent = "Меняйте только нужные поля. Для серии сначала сохраните правки, затем вернитесь в режим пакетного добавления.";
    }
    if (el.myShiftCancelEditButton) {
      el.myShiftCancelEditButton.hidden = false;
    }
    renderMyShiftDraftPreview();
    return;
  }

  delete el.myShiftForm.dataset.boundShiftId;
  const selectedCoworkers = getSelectedMyShiftInstructors();

  if (el.myEditorTitle) {
    el.myEditorTitle.textContent = "Конструктор смен";
  }
  if (el.myEditorSummary) {
    el.myEditorSummary.textContent = getMyEditorMode() === "batch"
      ? "Соберите шаблон и диапазон. Повторяющиеся записи приложение пропустит автоматически."
      : "Добавляйте одиночные смены быстро, а для похожих записей можно подтянуть данные из последней смены.";
  }
  if (el.myShiftCancelEditButton) {
    el.myShiftCancelEditButton.hidden = true;
  }
  renderMyInstructorOptions(selectedCoworkers);
  syncInstructorChipState();
  renderMyShiftDraftPreview();
}

function renderMyScheduleEditor() {
  if (!el.myEditorShiftList) {
    return;
  }

  renderMyScheduleFacilityOptions();
  ensureMyShiftBatchDefaults({ anchorDate: state.myScheduleFocusDate || todayIso() });
  renderMyShiftBatchWeekdayOptions();
  syncMyShiftEditorFormState();
  renderWeeklyDayOffEditor();
  if (el.myDeleteHistoryButton) {
    el.myDeleteHistoryButton.hidden = !state.myShifts.length && !hasWeeklyDayOffConfigured();
  }

  renderMyEditorShiftStats();

  if (!state.myShifts.length) {
    el.myEditorShiftList.innerHTML = `
      <div class="my-timeline-empty">
        <p>${escapeHtml(hasWeeklyDayOffConfigured() ? "Смен пока нет. Еженедельный выходной уже можно настраивать в блоке выше." : "Смен пока нет. Соберите первую запись через конструктор выше.")}</p>
      </div>
    `;
    return;
  }

  const today = todayIso();
  const sorted = state.myShifts.slice().sort(compareMyShift);
  const upcoming = sorted.filter((item) => item.date >= today);
  const history = sorted.filter((item) => item.date < today).reverse();

  const sections = [];
  sections.push(renderMyEditorShiftSection("Ближайшие смены", upcoming, {
    emptyText: "Будущих смен пока нет. Можно добавить одну запись или целую серию.",
  }));

  if (history.length) {
    sections.push(renderMyEditorShiftHistorySection(history));
  }

  el.myEditorShiftList.innerHTML = sections.join("");
}

function renderWeeklyDayOffEditor() {
  if (!el.myWeeklyDayOffOptions || !el.myWeeklyDayOffSummary) {
    return;
  }

  const current = normalizeWeekdayValue(state.weeklyDayOffWeekday);
  el.myWeeklyDayOffOptions.innerHTML = WEEKDAY_OPTIONS
    .map((item) => {
      const isActive = current === item.value;
      return `
        <button
          type="button"
          class="my-weekday-chip ${isActive ? "is-active" : ""}"
          data-weekly-day-off="${String(item.value)}"
          aria-pressed="${isActive ? "true" : "false"}"
          title="${escapeHtml(item.label)}"
        >
          <span>${escapeHtml(item.short)}</span>
        </button>
      `;
    })
    .join("");

  el.myWeeklyDayOffSummary.textContent = current === null
    ? "День ещё не выбран. Нажмите на нужный день недели."
    : `Сейчас выходной: ${getWeeklyDayOffLabel(current).toLowerCase()}. Он будет автоматически отмечаться в графике.`;
}

function handleWeeklyDayOffPickerClick(event) {
  const button = event.target.closest("button[data-weekly-day-off]");
  if (!button) {
    return;
  }

  const weekday = normalizeWeekdayValue(button.dataset.weeklyDayOff || "");
  if (weekday === null) {
    return;
  }

  const nextWeekday = normalizeWeekdayValue(state.weeklyDayOffWeekday) === weekday ? null : weekday;
  if (nextWeekday !== null) {
    const conflictCount = countUpcomingShiftsOnWeekday(nextWeekday);
    if (conflictCount > 0) {
      setMyScheduleNotice(buildWeeklyDayOffConflictMessage(nextWeekday, conflictCount), "error");
      return;
    }
  }

  state.weeklyDayOffWeekday = nextWeekday;
  if (nextWeekday !== null) {
    const today = todayIso();
    const focusBase = state.myScheduleFocusDate && state.myScheduleFocusDate > today
      ? state.myScheduleFocusDate
      : today;
    state.myScheduleFocusDate = findNextIsoDateForWeekday(focusBase, nextWeekday);
  }
  saveMyShifts();
  renderMySchedule();
  renderMyScheduleEditor();
  setMyScheduleNotice(
    nextWeekday === null
      ? "Еженедельный выходной снят."
      : `Еженедельный выходной установлен: ${getWeeklyDayOffLabel(nextWeekday).toLowerCase()}.`,
    "success"
  );
}

function renderMyEditorShiftStats() {
  if (!el.myEditorShiftStats) {
    return;
  }

  const today = todayIso();
  const upcomingCount = (state.myShifts || []).filter((shift) => shift.date >= today).length;
  const historyCount = Math.max(0, (state.myShifts || []).length - upcomingCount);

  el.myEditorShiftStats.innerHTML = `
    <span class="my-editor-stat-pill">${escapeHtml(String(state.myShifts.length))} всего</span>
    <span class="my-editor-stat-pill success">${escapeHtml(String(upcomingCount))} впереди</span>
    ${historyCount ? `<span class="my-editor-stat-pill muted">${escapeHtml(String(historyCount))} в истории</span>` : ""}
  `;
}

function renderMyEditorShiftSection(title, shifts, options = {}) {
  const { emptyText = "Записей пока нет." } = options;

  return `
    <section class="my-editor-shift-section">
      <div class="my-editor-shift-section-head">
        <h4>${escapeHtml(title)}</h4>
        <span>${escapeHtml(String(shifts.length))}</span>
      </div>
      <div class="my-editor-shift-section-list">
        ${shifts.length
          ? shifts.map((shift) => renderMyEditorShiftCard(shift)).join("")
          : `<div class="my-timeline-empty"><p>${escapeHtml(emptyText)}</p></div>`
        }
      </div>
    </section>
  `;
}

function renderMyEditorShiftHistorySection(shifts) {
  return `
    <details class="my-editor-history-group">
      <summary>
        <span>Прошлые смены</span>
        <span>${escapeHtml(String(shifts.length))}</span>
      </summary>
      <div class="my-editor-history-content">
        ${shifts.map((shift) => renderMyEditorShiftCard(shift)).join("")}
      </div>
    </details>
  `;
}

function renderMyEditorShiftCard(shift) {
  const verification = getShiftVerification(shift);
  const labelDate = formatMyDayHeading(shift.date);
  const note = normalizeShiftNote(shift.note);
  const noteHtml = note ? `<p class="my-editor-shift-note">${escapeHtml(note)}</p>` : "";
  const coworkersHtml = renderShiftCoworkersLine(shift, "my-editor-shift-coworkers");
  const shiftDuration = formatDuration(getShiftDurationMinutes(shift));

  return `
    <article class="my-editor-shift-card">
      <div class="my-editor-shift-main">
        <p class="my-editor-shift-date">${escapeHtml(labelDate)}</p>
        <h4 class="my-editor-shift-title">${escapeHtml(`${shift.start} — ${shift.end}`)}</h4>
        <p class="my-editor-shift-place">${escapeHtml(resolveShiftFacilityName(shift))}</p>
        ${coworkersHtml}
        ${noteHtml}
        <div class="my-editor-shift-meta">
          <span class="my-shift-duration">${escapeHtml(shiftDuration)}</span>
          <span class="my-shift-verify ${escapeHtml(verification.badgeClass)}">${escapeHtml(verification.label)}</span>
        </div>
      </div>
      <div class="my-editor-shift-actions">
        <button type="button" class="my-editor-action-btn primary" data-clone-shift="${escapeHtml(shift.id)}">В шаблон</button>
        <button type="button" class="my-editor-action-btn" data-edit-shift="${escapeHtml(shift.id)}">Изменить</button>
        <button type="button" class="my-editor-action-btn danger" data-delete-shift="${escapeHtml(shift.id)}">Удалить</button>
      </div>
    </article>
  `;
}

function renderChangesView() {
  if (!el.changesLatestCard || !el.changesUpdatesCard) {
    return;
  }

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const latestChangedEntry = getLatestChangedEntry(history);
  const lastCheckedAtIso = state.siteChangesLastCheckedAt || latest?.checkedAt || null;
  const overviewModel = buildChangesAttentionModel(history, lastCheckedAtIso);

  if (el.changesUpdatedAt) {
    if (lastCheckedAtIso) {
      const checkedAt = new Date(lastCheckedAtIso);
      if (!Number.isNaN(checkedAt.getTime())) {
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
    } else {
      const freshness = buildScheduleFreshnessState(state.data?.generatedAt);
      el.changesUpdatedAt.textContent = freshness.shortText;
      el.changesUpdatedAt.title = freshness.tooltip;
    }
  }

  const overviewHtml = renderChangesOverviewCard(overviewModel);
  el.changesLatestCard.hidden = !overviewHtml;
  el.changesLatestCard.innerHTML = overviewHtml;
  el.changesUpdatesCard.innerHTML = latest ? renderChangesDetailSections(overviewModel, history) : renderChangesEmptySections();
}

function getLatestChangedEntry(history) {
  if (!Array.isArray(history)) {
    return null;
  }
  return history.find((entry) => entry && !entry.baseline && entry.hasChanges) || null;
}

function getLatestUnreadSiteChangeEntry(history) {
  if (!Array.isArray(history)) {
    return null;
  }
  return history.find((entry) => entry && !entry.baseline && (entry.hasChanges || entry.hasSourceIssues) && !isSiteChangeEntryAcknowledged(entry)) || null;
}

function getFocusSiteChangeEntry(history) {
  if (!Array.isArray(history) || !history.length) {
    return null;
  }
  return getLatestUnreadSiteChangeEntry(history) || getLatestSignificantSiteChangeEntry(history) || history[0] || null;
}

function getLatestSignificantSiteChangeEntry(history) {
  if (!Array.isArray(history)) {
    return null;
  }
  return history.find((entry) => entry && !entry.baseline && (entry.hasChanges || entry.hasSourceIssues)) || null;
}

function buildSiteChangeAckSignature(entry) {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  if (entry.signature) {
    return String(entry.signature);
  }
  return `${String(entry.checkedAt || "")}:${String(entry.id || "")}`;
}

function isSiteChangeEntryAcknowledged(entry) {
  return Boolean(String(entry?.acknowledgedAt || "").trim());
}

function renderChangesAcknowledgeButton(entry, label = "Просмотрено") {
  return `
    <div class="changes-ack-row">
      <button type="button" class="changes-ack-btn" data-acknowledge-entry="${escapeHtml(String(entry?.id || ""))}">
        <span class="material-symbols-outlined">done_all</span>
        <span>${escapeHtml(label)}</span>
      </button>
    </div>
  `;
}

function handleChangesMainClick(event) {
  const acknowledgeButton = event.target.closest("button[data-acknowledge-entry]");
  if (!acknowledgeButton) {
    return;
  }
  const entryId = String(acknowledgeButton.dataset.acknowledgeEntry || "");
  if (!entryId) {
    return;
  }
  acknowledgeSiteChangeEntry(entryId);
}

function acknowledgeSiteChangeEntry(entryId) {
  const normalizedId = String(entryId || "").trim();
  if (!normalizedId) {
    return;
  }

  let changed = false;
  state.siteChangesHistory = (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : []).map((entry) => {
    if (!entry || String(entry.id || "") !== normalizedId || entry.acknowledgedAt) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      acknowledgedAt: new Date().toISOString(),
    };
  });

  if (!changed) {
    return;
  }

  saveSiteChangesHistory();
  renderChangesView();
  renderMyChangesSummary();
  renderSettingsView();
}

function renderChangesEmptySections() {
  return `
    <section class="changes-section changes-section-feature tone-baseline">
      <div class="changes-feature-head">
        <div class="changes-feature-copy">
          <div class="changes-feature-meta">
            <span class="changes-feature-kicker">Проверка</span>
          </div>
          <div class="changes-feature-title-row">
            <h2>Пока пусто</h2>
          </div>
          <p class="changes-feature-summary">Первая успешная синхронизация создаст локальный снимок. После этого здесь появится история изменений.</p>
        </div>
      </div>
    </section>
  `;
}

function getSiteChangeEntryMetrics(entry) {
  if (!entry || typeof entry !== "object") {
    return {
      affectedFacilityCount: 0,
      affectedDateCount: 0,
    };
  }

  if (Number.isFinite(entry.affectedFacilityCount) || Number.isFinite(entry.affectedDateCount)) {
    return {
      affectedFacilityCount: Number(entry.affectedFacilityCount || 0),
      affectedDateCount: Number(entry.affectedDateCount || 0),
    };
  }

  const facilityIds = new Set();
  const dates = new Set();

  for (const item of [...getEntryDisplayEvents(entry), ...(Array.isArray(entry.sourceIssues) ? entry.sourceIssues : [])]) {
    const facilityId = String(item?.facilityId || "").trim();
    const date = String(item?.date || "").trim();
    if (facilityId) {
      facilityIds.add(facilityId);
    }
    if (date) {
      dates.add(date);
    }
  }

  return {
    affectedFacilityCount: facilityIds.size,
    affectedDateCount: dates.size,
  };
}

function parseIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasCheckAfterEntry(lastCheckedAtIso, entry) {
  const checkedAt = parseIsoDate(lastCheckedAtIso);
  const entryDate = parseIsoDate(entry?.checkedAt);
  if (!checkedAt || !entryDate) {
    return false;
  }
  return checkedAt.getTime() > entryDate.getTime();
}

function pluralizeRu(value, one, few, many) {
  const count = Math.abs(Number(value) || 0);
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

function resolveChangesToneClass(status) {
  switch (status) {
    case "important":
      return "tone-important";
    case "changes":
    case "reviewed_changes":
      return "tone-info";
    case "issue":
    case "reviewed_issue":
      return "tone-issue";
    case "stable":
      return "tone-stable";
    case "baseline":
    case "no_data":
    default:
      return "tone-baseline";
  }
}

function buildEntryChangeGroups(entry) {
  const events = getEntryDisplayEvents(entry);
  if (!events.length) {
    return [];
  }

  const groups = new Map();

  for (const event of events) {
    const scope = String(event?.scope || "").trim();
    const programTitle = String(event?.programTitle || "").trim();
    const date = String(event?.date || "").trim();
    const scopeKey =
      scope === "program"
        ? `program::${programTitle || String(event?.title || "program")}`
        : date
          ? `date::${date}`
          : event?.template
            ? "template"
            : "general";
    const facilityId = String(event?.facilityId || "").trim();
    const key = `${facilityId}::${scopeKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        facilityId,
        facilityName: String(event?.facilityName || "Объект"),
        date,
        sourceUrl: sanitizeHttpUrl(event?.sourceUrl),
        template: Boolean(event?.template),
        programTitle,
        scope,
        events: [],
      });
    }

    groups.get(key).events.push(event);
  }

  return Array.from(groups.values())
    .map((group) => {
      const impactedShiftCount = countChangeGroupShiftImpact(group.events);
      return {
        ...group,
        tone: pickImpactTone(group.events),
        impactedShiftCount,
        summary: buildChangeGroupSummary(group),
        details: buildChangeGroupDetails(group),
        shortLabel: buildChangeGroupShortLabel(group),
      };
    })
    .sort(compareChangeGroups);
}

function countChangeGroupShiftImpact(events) {
  if (!Array.isArray(state.myShifts) || !state.myShifts.length) {
    return 0;
  }

  return state.myShifts
    .filter(isShiftRelevantForImpact)
    .filter((shift) => (events || []).some((event) => doesEventAffectShift(event, shift)))
    .length;
}

function compareChangeGroups(a, b) {
  const hasDateA = Boolean(a?.date);
  const hasDateB = Boolean(b?.date);
  if (hasDateA && hasDateB && a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  if (hasDateA !== hasDateB) {
    return hasDateA ? -1 : 1;
  }

  const facilityA = String(a?.facilityName || "");
  const facilityB = String(b?.facilityName || "");
  if (facilityA !== facilityB) {
    return facilityA.localeCompare(facilityB, "ru");
  }

  const programA = String(a?.programTitle || "");
  const programB = String(b?.programTitle || "");
  if (programA !== programB) {
    return programA.localeCompare(programB, "ru");
  }

  return String(a?.summary || "").localeCompare(String(b?.summary || ""), "ru");
}

function buildChangeGroupShortLabel(group) {
  if (group?.programTitle) {
    return `${group.facilityName} · ${group.programTitle}`;
  }
  if (group?.date) {
    return `${group.facilityName} · ${formatMonthDayShort(group.date)}`;
  }
  if (group?.template) {
    return `${group.facilityName} · Шаблон`;
  }
  return String(group?.facilityName || "Изменение");
}

function buildChangeGroupSummary(group) {
  if (!group || !Array.isArray(group.events) || !group.events.length) {
    return "Изменение зафиксировано.";
  }

  if (group.scope === "program") {
    return buildProgramGroupSummary(group);
  }

  const removedCount = group.events.filter((event) => /_removed$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || ""))).length;
  const addedCount = group.events.filter((event) => /_added$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || ""))).length;
  const updatedCount = group.events.filter((event) => /_updated$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || ""))).length;
  const closureEvent = group.events.find((event) => String(event?.type || "") === "closure_changed" || String(event?.type || "") === "template_closure_changed") || null;
  const dayRemoved = group.events.find((event) => String(event?.type || "") === "day_removed") || null;
  const dayAdded = group.events.find((event) => String(event?.type || "") === "day_added") || null;
  const parts = [];

  if (removedCount) {
    parts.push(`убрано ${removedCount} ${pluralizeRu(removedCount, "сеанс", "сеанса", "сеансов")}`);
  }
  if (addedCount) {
    parts.push(`добавлено ${addedCount} ${pluralizeRu(addedCount, "сеанс", "сеанса", "сеансов")}`);
  }
  if (updatedCount) {
    parts.push(`обновлено ${updatedCount} ${pluralizeRu(updatedCount, "сеанс", "сеанса", "сеансов")}`);
  }

  if (parts.length) {
    return capitalize(parts.join(", "));
  }
  if (closureEvent) {
    return capitalize(cleanChangeSummaryText(closureEvent.afterText || closureEvent.description, "Статус суток обновлён."));
  }
  if (dayRemoved) {
    return "Дата снята с публикации.";
  }
  if (dayAdded) {
    return "Появилась новая дата.";
  }

  const fallback = group.events[0];
  return capitalize(cleanChangeSummaryText(fallback?.afterText || fallback?.description || fallback?.title, "Детали обновлены."));
}

function buildProgramGroupSummary(group) {
  const event = group?.events?.[0] || null;
  if (!event) {
    return "Обновлена дополнительная программа.";
  }

  switch (String(event.type || "")) {
    case "program_added":
      return "Добавлена дополнительная программа.";
    case "program_removed":
      return "Дополнительная программа удалена.";
    case "program_updated":
    default:
      return "Обновлено расписание дополнительной программы.";
  }
}

function buildChangeGroupDetails(group) {
  if (!group || !Array.isArray(group.events) || !group.events.length) {
    return [];
  }

  if (group.scope === "program") {
    return buildProgramGroupDetails(group);
  }

  const rows = [];
  const removedSessions = group.events.filter((event) => /_removed$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || "")));
  const addedSessions = group.events.filter((event) => /_added$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || "")));
  const updatedSessions = group.events.filter((event) => /_updated$/.test(String(event?.type || "")) && /session/.test(String(event?.scope || "")));
  const closureEvent = group.events.find((event) => String(event?.type || "") === "closure_changed" || String(event?.type || "") === "template_closure_changed") || null;
  const dayRemoved = group.events.find((event) => String(event?.type || "") === "day_removed") || null;
  const dayAdded = group.events.find((event) => String(event?.type || "") === "day_added") || null;

  if (removedSessions.length) {
    rows.push({
      label: "Убрано",
      value: joinLimitedValues(removedSessions.map((event) => formatSessionSlotForSummary(event, false)), 3),
    });
  }
  if (addedSessions.length) {
    rows.push({
      label: "Добавлено",
      value: joinLimitedValues(addedSessions.map((event) => formatSessionSlotForSummary(event, false)), 3),
    });
  }
  if (updatedSessions.length) {
    rows.push({
      label: "Обновлено",
      value: joinLimitedValues(updatedSessions.map((event) => formatSessionSlotForSummary(event, true)), 2),
    });
  }
  if (closureEvent) {
    rows.push({
      label: "Статус",
      value: truncateText(cleanChangeSummaryText(closureEvent.afterText || closureEvent.description, "Статус суток обновлён."), 150),
    });
  }
  if (dayRemoved) {
    rows.push({
      label: "Дата",
      value: "Дата больше не публикуется на сайте.",
    });
  } else if (dayAdded) {
    rows.push({
      label: "Дата",
      value: "На сайте появилась новая дата.",
    });
  }

  return rows.slice(0, 3);
}

function buildProgramGroupDetails(group) {
  const event = group?.events?.[0] || null;
  if (!event) {
    return [];
  }

  if (String(event.type || "") === "program_removed") {
    return [
      {
        label: "Было",
        value: truncateText(cleanChangeSummaryText(event.beforeText, "Детали программы недоступны."), 180),
      },
    ];
  }

  return [
    {
      label: String(event.type || "") === "program_added" ? "Добавлено" : "Расписание",
      value: truncateText(cleanChangeSummaryText(event.afterText || event.description, "Детали программы обновлены."), 180),
    },
  ];
}

function joinLimitedValues(values, limit = 3) {
  const normalized = Array.from(new Set((values || []).map((value) => normalizeChangeSideText(value, "")).filter(Boolean)));
  const visible = normalized.slice(0, limit);
  let text = visible.join(", ");

  if (normalized.length > visible.length) {
    text += ` и ещё ${normalized.length - visible.length}`;
  }

  return text || "Детали обновлены.";
}

function formatSessionSlotForSummary(event, includeDetails) {
  const timeLabel = event?.start && event?.end ? `${event.start} — ${event.end}` : "";
  if (!includeDetails) {
    return timeLabel || cleanChangeSummaryText(event?.afterText || event?.beforeText || event?.description, "Сеанс обновлён.");
  }

  const detail = stripLeadingTimeRange(
    cleanChangeSummaryText(event?.afterText || event?.description || event?.beforeText, "Сеанс обновлён.")
  );

  if (timeLabel && detail) {
    return `${timeLabel} (${truncateText(detail, 72)})`;
  }

  return timeLabel || truncateText(detail, 72);
}

function stripLeadingTimeRange(value) {
  return String(value || "")
    .replace(/^\d{2}:\d{2}\s+—\s+\d{2}:\d{2}\s*(?:·\s*)?/u, "")
    .trim();
}

function cleanChangeSummaryText(value, fallback = "Детали обновлены.") {
  const text = normalizeChangeSideText(value, fallback)
    .replace(/^(было|стало):\s*/iu, "")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function truncateText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function hasOnlyNoticeSourceIssues(sourceIssues) {
  return Array.isArray(sourceIssues) && sourceIssues.length
    ? sourceIssues.every((issue) => String(issue?.kind || "").toLowerCase() === "notice")
    : false;
}

function buildEntryLeadSummary(entry, groups = buildEntryChangeGroups(entry)) {
  if (!entry) {
    return "Подробности недоступны.";
  }

  if (entry.baseline) {
    return "Это стартовая точка для всех следующих сравнений на этом устройстве.";
  }

  if (entry.hasSourceIssues && !entry.hasChanges) {
    return entry.sourceIssues?.[0]?.description || "Один или несколько источников не ответили корректно.";
  }

  if (!groups.length) {
    return entry.hasSourceIssues
      ? "Изменения есть, но проверка была неполной."
      : "Изменения зафиксированы.";
  }

  const leadGroup = groups[0];
  const extraGroups = Math.max(0, groups.length - 1);
  const leadSummary = String(leadGroup.summary || "").replace(/[.]+$/u, "");
  let text = `${buildChangeGroupShortLabel(leadGroup)}: ${leadSummary}`;

  if (extraGroups > 0) {
    text += `. Ещё ${extraGroups} ${pluralizeRu(extraGroups, "блок", "блока", "блоков")} ниже`;
  }

  if (entry.hasSourceIssues) {
    text += ". Проверка неполная";
  }

  return text;
}

function buildChangesOverviewHighlights(status, focusEntry, focusImpact, focusGroups) {
  const highlights = [];

  if (focusImpact?.total > 0) {
    highlights.push({
      label: "Мои смены",
      value: `Затронуто ${focusImpact.total} ${pluralizeRu(focusImpact.total, "смена", "смены", "смен")}`,
    });
  }

  for (const group of focusGroups || []) {
    highlights.push({
      label: group.shortLabel,
      value: group.summary,
    });
    if (highlights.length >= 3) {
      break;
    }
  }

  if (focusEntry?.hasSourceIssues && highlights.length < 3) {
    const issue = focusEntry.sourceIssues?.[0] || null;
    if (issue) {
      highlights.push({
        label: issue.facilityName || "Проверка",
        value: truncateText(issue.description || "Источник ответил с ошибкой.", 96),
      });
    }
  }

  if (status === "stable" || status === "baseline" || status === "no_data") {
    return [];
  }

  return highlights.slice(0, 3);
}

function buildChangesAttentionModel(history, lastCheckedAtIso) {
  const entries = Array.isArray(history) ? history.filter(Boolean) : [];
  const latest = entries[0] || null;
  const latestUnreadEntry = getLatestUnreadSiteChangeEntry(entries);
  const latestSignificantEntry = getLatestSignificantSiteChangeEntry(entries);
  const baselineEntry = entries.find((entry) => entry?.baseline) || null;
  const checkedAtIso = String(lastCheckedAtIso || latest?.checkedAt || "").trim();
  const hasStableCheckAfterSignificant = hasCheckAfterEntry(checkedAtIso, latestSignificantEntry);
  const hasStableCheckAfterBaseline = hasCheckAfterEntry(checkedAtIso, baselineEntry);
  const currentSignificantEntry = latestSignificantEntry && !hasStableCheckAfterSignificant ? latestSignificantEntry : null;
  const currentBaselineEntry = !latestSignificantEntry && baselineEntry && !hasStableCheckAfterBaseline ? baselineEntry : null;

  let status = "no_data";
  let focusEntry = null;
  let focusImpact = { total: 0, items: [] };

  if (latestUnreadEntry) {
    focusEntry = latestUnreadEntry;
    focusImpact = buildEntryMyShiftImpact(focusEntry);
    if (focusEntry.hasSourceIssues && !focusEntry.hasChanges) {
      status = "issue";
    } else if (focusImpact.total > 0) {
      status = "important";
    } else {
      status = "changes";
    }
  } else if (currentSignificantEntry) {
    focusEntry = currentSignificantEntry;
    focusImpact = buildEntryMyShiftImpact(focusEntry);
    status = focusEntry.hasSourceIssues && !focusEntry.hasChanges ? "reviewed_issue" : "reviewed_changes";
  } else if (currentBaselineEntry) {
    focusEntry = currentBaselineEntry;
    status = "baseline";
  } else if (checkedAtIso) {
    status = "stable";
  }

  const lastEventEntry = latestSignificantEntry || baselineEntry || latest || null;
  const lastEventText = lastEventEntry?.checkedAt ? formatChangesDateTime(lastEventEntry.checkedAt) : "Событий пока не было";
  const checkedAtText = checkedAtIso ? formatChangesDateTime(checkedAtIso) : "Проверок пока нет";
  const checkedAtMeta = checkedAtIso ? buildChangesCheckMeta(checkedAtIso) : "Проверка ещё не запускалась";
  const focusGroups = buildEntryChangeGroups(focusEntry);
  const summary = buildChangesOverviewSummary(status, focusEntry, focusImpact, focusGroups);
  const footer = buildChangesOverviewFooter(status, lastEventEntry);
  const highlights = buildChangesOverviewHighlights(status, focusEntry, focusImpact, focusGroups);

  return {
    status,
    toneClass: resolveChangesToneClass(status),
    focusEntry,
    focusImpact,
    latest,
    latestUnreadEntry,
    latestSignificantEntry,
    lastEventEntry,
    checkedAtIso,
    checkedAtText,
    checkedAtMeta,
    lastEventText,
    focusGroups,
    summary,
    footer,
    highlights,
    headline: buildChangesOverviewHeadline(status, focusEntry),
    pill: buildChangesOverviewPill(status, focusEntry),
    icon: buildChangesOverviewIcon(status, focusEntry),
  };
}

function buildChangesOverviewHeadline(status, focusEntry) {
  switch (status) {
    case "important":
      return "Затронуты мои смены";
    case "changes":
      return "Есть изменения";
    case "issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "Есть сообщение сайта" : "Проверка неполная";
    case "reviewed_changes":
      return "Последнее изменение просмотрено";
    case "reviewed_issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "Сообщение сайта просмотрено" : "Последняя проблема просмотрена";
    case "stable":
      return "Без новых изменений";
    case "baseline":
      return "Первый снимок готов";
    case "no_data":
    default:
      return "Проверка ещё не запущена";
  }
}

function buildChangesOverviewPill(status, focusEntry) {
  switch (status) {
    case "important":
      return "Влияет";
    case "changes":
      return "Новое";
    case "issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "Сообщение" : "Неполно";
    case "reviewed_changes":
    case "reviewed_issue":
      return "Просмотрено";
    case "stable":
      return "Без изменений";
    case "baseline":
      return "Первый снимок";
    case "no_data":
    default:
      return "Нет данных";
  }
}

function buildChangesOverviewIcon(status, focusEntry) {
  switch (status) {
    case "important":
      return "event_busy";
    case "changes":
      return "event";
    case "issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "campaign" : "warning";
    case "reviewed_changes":
      return "visibility";
    case "reviewed_issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "mark_email_read" : "fact_check";
    case "stable":
      return "task_alt";
    case "baseline":
      return "schedule";
    case "no_data":
    default:
      return "hourglass_empty";
  }
}

function buildChangesOverviewSummary(status, focusEntry, focusImpact, focusGroups) {
  const leadIssue = focusEntry?.sourceIssues?.[0] || null;
  const leadSummary = buildEntryLeadSummary(focusEntry, focusGroups);
  switch (status) {
    case "important":
      return `Затронуто ${focusImpact.total} ${pluralizeRu(focusImpact.total, "ваша смена", "ваши смены", "ваших смен")}. ${leadSummary}`;
    case "changes":
      return state.myShifts.length
        ? `Ваши смены в этой проверке не затронуты. ${leadSummary}`
        : leadSummary;
    case "issue":
      return leadIssue?.description || "Часть источников не ответила. Сравнение может быть неполным.";
    case "reviewed_changes":
      return focusImpact.total > 0
        ? `Последнее изменение уже просмотрено. Было затронуто ${focusImpact.total} ${pluralizeRu(focusImpact.total, "ваша смена", "ваши смены", "ваших смен")}.`
        : `Последнее изменение уже просмотрено. ${leadSummary}`;
    case "reviewed_issue":
      return hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues)
        ? "Последнее служебное сообщение уже просмотрено. Новых непросмотренных сообщений сейчас нет."
        : "Последняя проблема проверки уже просмотрена. Новых непросмотренных событий сейчас нет.";
    case "stable":
      if (state.myShifts.length) {
        return "Последняя проверка не нашла новых изменений. Ваши смены выглядят актуальными.";
      }
      return "Последняя проверка не нашла новых изменений.";
    case "baseline":
      return "Создан стартовый снимок. Следующая успешная проверка уже сможет показать, что именно поменялось.";
    case "no_data":
    default:
      return "Первый локальный снимок создаётся после первой успешной синхронизации расписания.";
  }
}

function buildChangesOverviewFooter(status, lastEventEntry) {
  if (!lastEventEntry) {
    return "Локальная проверка работает только в этом браузере.";
  }

  if (status === "stable" && lastEventEntry.baseline) {
    return "Пока журнал пуст: сайт ещё не дал ни одного нового события по сравнению с первым снимком.";
  }

  if (status === "stable") {
    return `Последнее зафиксированное событие осталось в журнале ниже: ${formatChangesDateTime(lastEventEntry.checkedAt)}.`;
  }

  if (status === "baseline" || status === "no_data") {
    return "Локальная проверка работает только в этом браузере.";
  }

  return `Текущее событие журнала: ${formatChangesDateTime(lastEventEntry.checkedAt)}.`;
}

function buildChangesFeatureSummary(model, focusEntry, focusGroups) {
  if (!focusEntry) {
    return model?.summary || "Подробности недоступны.";
  }

  if (focusEntry.baseline) {
    return "Это стартовая точка. Следующие проверки будут показывать только реальные изменения относительно неё.";
  }

  if (focusEntry.hasSourceIssues && !focusEntry.hasChanges) {
    return model?.summary || "Часть источников ответила с проблемой.";
  }

  const groupCount = Array.isArray(focusGroups) ? focusGroups.length : 0;
  if (!groupCount) {
    return model?.summary || "Подробности недоступны.";
  }

  const cardsLabel = `${groupCount} ${pluralizeRu(groupCount, "карточка", "карточки", "карточек")}`;
  if (model?.status === "important") {
    const affected = Number(model?.focusImpact?.total || 0);
    return `Затронуто ${affected} ${pluralizeRu(affected, "ваша смена", "ваши смены", "ваших смен")}. Ниже ${cardsLabel} с короткой выжимкой.`;
  }

  if (model?.status === "reviewed_changes") {
    return `Последнее событие уже просмотрено. Ниже ${cardsLabel} с короткой выжимкой.`;
  }

  return `Ниже ${cardsLabel} с сутью последней проверки без лишних деталей.`;
}

function buildMyChangesWidgetSummary(model) {
  const status = String(model?.status || "");
  let text = model?.summary || "Подробности недоступны.";

  switch (status) {
    case "important":
      text = "Есть изменения, которые затрагивают ваш график.";
      break;
    case "changes":
      text = "На сайте появились новые изменения.";
      break;
    case "reviewed_changes":
      text = "Последнее изменение уже просмотрено.";
      break;
    case "issue":
      text = "Часть источников ответила с ошибкой, поэтому проверка могла быть неполной.";
      break;
    case "reviewed_issue":
      text = "Последняя проблема проверки уже просмотрена.";
      break;
    case "stable":
      text = "Сейчас всё совпадает с последней проверкой.";
      break;
    case "baseline":
      text = "Сохранена точка отсчёта для следующих сравнений.";
      break;
    case "no_data":
      text = "Первая проверка появится после синхронизации.";
      break;
    default:
      break;
  }

  if (model?.focusEntry?.hasSourceIssues && status !== "issue" && status !== "reviewed_issue") {
    return `${text} Проверка могла быть неполной.`;
  }

  return text;
}

function buildMyChangesWidgetHeadline(model) {
  switch (String(model?.status || "")) {
    case "important":
    case "changes":
    case "reviewed_changes":
      return "Есть изменения";
    case "issue":
      return hasOnlyNoticeSourceIssues(model?.focusEntry?.sourceIssues) ? "Есть сообщение" : "Проверка неполная";
    case "reviewed_issue":
      return "Проблема просмотрена";
    case "stable":
      return "Без изменений";
    case "baseline":
      return "Первый снимок";
    case "no_data":
    default:
      return "Проверка не запускалась";
  }
}

function buildChangesCheckMeta(checkedAtIso) {
  const checkedAt = parseIsoDate(checkedAtIso);
  if (!checkedAt) {
    return "Время проверки неизвестно";
  }
  const timeText = checkedAt.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const relative = formatRelativeAge(checkedAt, { compact: false });
  return relative ? `Проверено ${timeText} · ${relative}` : `Проверено ${timeText}`;
}

function buildChangesOverviewMetrics(status, focusEntry, focusImpact, checkedAtIso, history) {
  const metrics = [];
  const issueMetricLabel = hasOnlyNoticeSourceIssues(focusEntry?.sourceIssues) ? "Сообщений" : "Сбоев";

  if (focusEntry?.hasChanges) {
    const entryMetrics = getSiteChangeEntryMetrics(focusEntry);
    metrics.push({ label: "Изменений", value: String(focusEntry.summary?.total || 0) });
    metrics.push({ label: "Объектов", value: String(entryMetrics.affectedFacilityCount) });
    if (state.myShifts.length) {
      metrics.push({ label: "Мои смены", value: String(focusImpact.total) });
    } else if (entryMetrics.affectedDateCount) {
      metrics.push({ label: "Дат", value: String(entryMetrics.affectedDateCount) });
    }
    if (focusEntry.hasSourceIssues) {
      metrics.push({ label: issueMetricLabel, value: String(focusEntry.sourceIssues?.length || 0) });
    }
  } else if (focusEntry?.hasSourceIssues) {
    metrics.push({ label: issueMetricLabel, value: String(focusEntry.sourceIssues?.length || 0) });
  } else if (checkedAtIso) {
    const checkedAt = parseIsoDate(checkedAtIso);
    metrics.push({
      label: "Проверка",
      value: checkedAt
        ? checkedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : "сейчас",
    });
    if (state.myShifts.length) {
      metrics.push({ label: "Мои смены", value: String(state.myShifts.length) });
    }
  }

  if (Array.isArray(history) && history.length) {
    metrics.push({ label: "Журнал", value: String(history.length) });
  }

  return metrics.slice(0, 4);
}

function renderOverviewMetric(metric, className) {
  return `
    <div class="${escapeHtml(className)}">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
    </div>
  `;
}

function renderChangesOverviewCard(model) {
  return "";
}

function renderChangesDetailSections(model, history) {
  return [
    renderFocusEntryDetailsSection(model),
    model.focusEntry?.hasSourceIssues ? renderSourceIssueSection(model.focusEntry.sourceIssues, { entry: model.focusEntry }) : "",
    renderChangesHistorySection(history),
  ].join("");
}

function renderMyShiftImpactSection(model) {
  if (!state.myShifts.length) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Мои смены</h2>
          <p>Добавьте свои смены, и здесь появится персональная оценка влияния каждой проверки.</p>
        </div>
      </section>
    `;
  }

  if (model.status === "stable") {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Мои смены</h2>
          <p>Последняя проверка не нашла новых изменений. Ваши смены выглядят актуальными.</p>
        </div>
      </section>
    `;
  }

  if (!model.focusEntry || model.focusEntry.baseline) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Мои смены</h2>
          <p>Пока нечего сравнивать с вашими сменами. После следующей проверки здесь появится персональная сводка.</p>
        </div>
      </section>
    `;
  }

  if (!model.focusEntry.hasChanges) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Мои смены</h2>
          <p>${
            hasOnlyNoticeSourceIssues(model.focusEntry.sourceIssues)
              ? "На сайте опубликовано служебное сообщение по объекту. Проверьте детали ниже, если у вас есть смены на этом объекте."
              : "Сейчас нельзя надёжно оценить влияние на смены, потому что часть источников не ответила."
          }</p>
        </div>
      </section>
    `;
  }

  if (!model.focusImpact.total) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Мои смены</h2>
          <p>В этой проверке ваши смены не затронуты.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Мои смены</h2>
        <p>Показаны ближайшие смены, которые пересекаются с текущим событием локального журнала.</p>
      </div>
      <div class="changes-impact-list">
        ${model.focusImpact.items.map((item) => renderShiftImpactCard(item)).join("")}
      </div>
    </section>
  `;
}

function buildEntryMyShiftImpact(entry) {
  if (!entry || !entry.hasChanges || !Array.isArray(entry.events) || !state.myShifts.length) {
    return { total: 0, items: [] };
  }

  const upcomingShifts = state.myShifts
    .filter(isShiftRelevantForImpact)
    .sort(compareMyShift);
  const items = [];

  for (const shift of upcomingShifts) {
    const matchedEvents = getEntryDisplayEvents(entry).filter((event) => doesEventAffectShift(event, shift));
    if (!matchedEvents.length) {
      continue;
    }

    items.push({
      shift,
      events: matchedEvents.slice(0, 3),
    });
  }

  return {
    total: items.length,
    items: items.slice(0, SITE_CHANGES_LATEST_EVENTS_LIMIT),
  };
}

function isShiftRelevantForImpact(shift) {
  return Boolean(isWorkingShiftRecord(shift) && String(shift.date || "") >= todayIso());
}

function doesEventAffectShift(event, shift) {
  if (!event || !shift) {
    return false;
  }

  if (String(event.facilityId || "") !== String(shift.facilityId || "")) {
    return false;
  }

  const scope = String(event.scope || "");
  const eventDate = String(event.date || "").trim();
  if (eventDate && eventDate !== shift.date) {
    return false;
  }

  if ((scope === "session" || scope === "template_session") && event.start && event.end) {
    return timeRangesOverlap(shift.start, shift.end, event.start, event.end);
  }

  return true;
}

function timeRangesOverlap(startA, endA, startB, endB) {
  const aStart = toMinutes(normalizeTime(String(startA || "")));
  const aEnd = toMinutes(normalizeTime(String(endA || "")));
  const bStart = toMinutes(normalizeTime(String(startB || "")));
  const bEnd = toMinutes(normalizeTime(String(endB || "")));

  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) {
    return false;
  }

  return Math.min(aEnd, bEnd) > Math.max(aStart, bStart);
}

function renderShiftImpactCard(item) {
  const tone = pickImpactTone(item.events);
  const eventTitles = Array.from(new Set(item.events.map((event) => String(event?.title || "").trim()).filter(Boolean))).slice(0, 2);
  const extraCount = Math.max(0, item.events.length - eventTitles.length);
  const summary = eventTitles.join("; ");

  return `
    <article class="changes-impact-card">
      <div class="changes-impact-head">
        <h3>${escapeHtml(`${formatMonthDayShort(item.shift.date)} · ${item.shift.start} — ${item.shift.end}`)}</h3>
        <span class="changes-feed-chip ${escapeHtml(tone)}">${escapeHtml(`${item.events.length} событ.`)}</span>
      </div>
      <p class="changes-impact-meta">${escapeHtml(resolveShiftFacilityName(item.shift))}</p>
      <p class="changes-feed-line">${escapeHtml(summary || "Изменение затрагивает смену.")}${
        extraCount ? ` ${escapeHtml(`И ещё ${extraCount}.`)}` : ""
      }</p>
    </article>
  `;
}

function pickImpactTone(events) {
  if ((events || []).some((event) => String(event?.severity || "") === "warning")) {
    return "warn";
  }
  if ((events || []).some((event) => String(event?.severity || "") === "positive")) {
    return "positive";
  }
  return "info";
}

function renderFocusEntryDetailsSection(model) {
  const focusEntry = model?.focusEntry || null;
  const focusGroups = Array.isArray(model?.focusGroups) ? model.focusGroups : [];
  const acknowledgeButton = focusEntry && !focusEntry.baseline && !isSiteChangeEntryAcknowledged(focusEntry)
    ? renderChangesAcknowledgeButton(focusEntry, "Просмотрено")
    : "";
  const metaLabel = focusEntry?.baseline
    ? "Стартовый снимок"
    : focusEntry
      ? isSiteChangeEntryAcknowledged(focusEntry)
        ? "Последняя запись"
        : "Текущее событие"
      : "Проверка";
  const badgeHtml = model?.pill
    ? `<span class="changes-state-pill">${escapeHtml(model.pill)}</span>`
    : "";
  const summaryText = buildChangesFeatureSummary(model, focusEntry, focusGroups);

  if (!focusEntry) {
    return `
      <section class="changes-section changes-section-feature ${escapeHtml(model?.toneClass || "tone-baseline")}">
        <div class="changes-feature-head">
          <div class="changes-feature-copy">
            <div class="changes-feature-meta">
              <span class="changes-feature-kicker">${escapeHtml(metaLabel)}</span>
              <span class="changes-feature-time">${escapeHtml(model?.checkedAtMeta || "Проверка ещё не запускалась")}</span>
            </div>
            <div class="changes-feature-title-row">
              <h2>${escapeHtml(model?.headline || "Пока пусто")}</h2>
              ${badgeHtml}
            </div>
            <p class="changes-feature-summary">${escapeHtml(summaryText)}</p>
          </div>
        </div>
      </section>
    `;
  }

  if (focusEntry.baseline) {
    return `
      <section class="changes-section changes-section-feature ${escapeHtml(model?.toneClass || "tone-baseline")}">
        <div class="changes-feature-head">
          <div class="changes-feature-copy">
            <div class="changes-feature-meta">
              <span class="changes-feature-kicker">${escapeHtml(metaLabel)}</span>
              <span class="changes-feature-time">${escapeHtml(model?.checkedAtMeta || "")}</span>
            </div>
            <div class="changes-feature-title-row">
              <h2>${escapeHtml(model?.headline || "Первый снимок готов")}</h2>
              ${badgeHtml}
            </div>
            <p class="changes-feature-summary">${escapeHtml(summaryText)}</p>
          </div>
        </div>
      </section>
    `;
  }

  if (!focusGroups.length) {
    return `
      <section class="changes-section changes-section-feature ${escapeHtml(model?.toneClass || "tone-baseline")}">
        <div class="changes-feature-head">
          <div class="changes-feature-copy">
            <div class="changes-feature-meta">
              <span class="changes-feature-kicker">${escapeHtml(metaLabel)}</span>
              <span class="changes-feature-time">${escapeHtml(model?.checkedAtMeta || "")}</span>
            </div>
            <div class="changes-feature-title-row">
              <h2>${escapeHtml(model?.headline || "Проверка обновлена")}</h2>
              ${badgeHtml}
            </div>
            <p class="changes-feature-summary">${escapeHtml(summaryText)}</p>
          </div>
        </div>
        ${acknowledgeButton}
      </section>
    `;
  }

  return `
    <section class="changes-section changes-section-feature ${escapeHtml(model?.toneClass || "tone-baseline")}">
      <div class="changes-feature-head">
        <div class="changes-feature-copy">
          <div class="changes-feature-meta">
            <span class="changes-feature-kicker">${escapeHtml(metaLabel)}</span>
            <span class="changes-feature-time">${escapeHtml(model?.checkedAtMeta || "")}</span>
          </div>
          <div class="changes-feature-title-row">
            <h2>${escapeHtml(model?.headline || "Изменения")}</h2>
            ${badgeHtml}
          </div>
          <p class="changes-feature-summary">${escapeHtml(summaryText)}</p>
        </div>
      </div>
      <div class="changes-list changes-list-compact">
        ${focusGroups.map((group) => renderChangeGroupCard(group)).join("")}
      </div>
      ${acknowledgeButton}
    </section>
  `;
}

function renderChangeGroupCard(group) {
  const chips = [];
  if (group.template) {
    chips.push('<span class="changes-feed-chip info">Шаблон</span>');
  }
  if (group.programTitle) {
    chips.push('<span class="changes-feed-chip info">Программа</span>');
  }

  const rowsHtml = group.details.length
    ? `
      <div class="changes-group-rows">
        ${group.details.map((row) => renderChangeGroupRow(row)).join("")}
      </div>
    `
    : "";

  const cardHtml = `
    <article class="changes-feed-card changes-group-card">
      <div class="changes-feed-top">
        <div class="changes-feed-heading">
          <h3 class="changes-feed-title">${escapeHtml(group.shortLabel)}</h3>
          <p class="changes-feed-time">${escapeHtml(group.summary)}</p>
        </div>
        ${chips.length ? `<div class="changes-feed-chips changes-feed-chips-compact">${chips.join("")}</div>` : ""}
      </div>
      ${rowsHtml}
    </article>
  `;

  if (!group.sourceUrl) {
    return cardHtml;
  }

  return `
    <a
      class="changes-group-link"
      href="${escapeHtml(group.sourceUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeHtml(`${group.shortLabel}: открыть официальный источник`)}"
    >
      ${cardHtml}
    </a>
  `;
}

function renderChangeGroupRow(row) {
  const toneClass = resolveChangeGroupRowToneClass(row);
  return `
    <div class="changes-group-row ${escapeHtml(toneClass)}">
      <span class="changes-group-row-badge">${escapeHtml(String(row?.label || ""))}</span>
      <strong>${escapeHtml(String(row?.value || ""))}</strong>
    </div>
  `;
}

function resolveChangeGroupRowToneClass(row) {
  const label = String(row?.label || "").trim().toLowerCase();
  if (label === "добавлено") {
    return "is-added";
  }
  if (label === "убрано") {
    return "is-removed";
  }
  if (label === "обновлено") {
    return "is-updated";
  }
  return "is-neutral";
}

function renderSourceIssueSection(sourceIssues, options = {}) {
  const entry = options?.entry || null;
  const reviewed = Boolean(entry && isSiteChangeEntryAcknowledged(entry));
  const hasOnlyNotices = Array.isArray(sourceIssues) && sourceIssues.length
    ? sourceIssues.every((issue) => String(issue?.kind || "").toLowerCase() === "notice")
    : false;
  const sectionText = hasOnlyNotices
    ? "На сайтах опубликованы служебные сообщения. Отдельные объекты могут быть временно недоступны."
    : reviewed
      ? "Последняя просмотренная проверка была неполной: часть источников ответила с ошибкой."
      : "Часть сайтов ответила с ошибкой. Из-за этого сравнение может быть неполным.";
  return `
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Проблемы проверки</h2>
        <p>${escapeHtml(sectionText)}</p>
      </div>
      <div class="changes-events">
        ${sourceIssues.map((issue) => renderSourceIssueCard(issue)).join("")}
      </div>
    </section>
  `;
}

function renderSourceIssueCard(issue) {
  const metaParts = [];
  const title = String(issue?.title || "").trim();
  const fetchState = String(issue?.fetchState || "").trim().toLowerCase();
  if (title) {
    metaParts.push(title);
  }
  if (fetchState && fetchState !== "notice" && fetchState !== title.toLowerCase()) {
    metaParts.push(fetchState);
  }

  return `
    <article class="changes-event changes-event-warning">
      <h3 class="changes-event-title">${escapeHtml(issue?.facilityName || "Источник")}</h3>
      <p class="changes-event-desc">${escapeHtml(issue?.description || "Источник временно недоступен.")}</p>
      <p class="changes-event-meta">${escapeHtml(metaParts.join(" · ") || "Источник")}</p>
    </article>
  `;
}

function renderChangesHistorySection(history) {
  if (!Array.isArray(history) || !history.length) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>История проверок</h2>
          <p>Записи появятся после первой успешной проверки.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>История проверок</h2>
        <p>Лента хранится локально в этом браузере. Просмотренные записи остаются в истории.</p>
      </div>
      <div class="changes-list">
        ${history.slice(0, SITE_CHANGES_HISTORY_PREVIEW_LIMIT).map((entry) => renderSiteChangeHistoryCard(entry)).join("")}
      </div>
    </section>
  `;
}

function renderSiteChangeHistoryCard(entry) {
  const impact = buildEntryMyShiftImpact(entry);
  const groups = buildEntryChangeGroups(entry);
  const previewGroups = groups.slice(0, 2);
  const previewIssues = Array.isArray(entry?.sourceIssues) ? entry.sourceIssues.slice(0, 2) : [];
  const chips = [];

  if (entry.baseline) {
    chips.push('<span class="changes-feed-chip info">Базовый снимок</span>');
  } else if (isSiteChangeEntryAcknowledged(entry)) {
    chips.push('<span class="changes-feed-chip positive">Просмотрено</span>');
  } else {
    chips.push('<span class="changes-feed-chip warn">Не просмотрено</span>');
  }

  if (impact.total > 0) {
    chips.push(`<span class="changes-feed-chip warn">Смены: ${escapeHtml(String(impact.total))}</span>`);
  }
  if (previewIssues.length) {
    chips.push(`<span class="changes-feed-chip warn">Проблемы: ${escapeHtml(String(previewIssues.length))}</span>`);
  }
  if (entry.hasChanges && groups[0]?.template) {
    chips.push('<span class="changes-feed-chip info">Есть шаблонные изменения</span>');
  }

  const previewHtml = previewGroups.length
    ? `
      <div class="changes-events">
        ${previewGroups.map((group) => renderHistoryPreviewGroup(group)).join("")}
      </div>
    `
    : previewIssues.length
      ? `
        <div class="changes-events">
          ${previewIssues.map((issue) => renderSourceIssueCard(issue)).join("")}
        </div>
      `
      : "";

  const acknowledgeButton = !entry.baseline && !isSiteChangeEntryAcknowledged(entry)
    ? `
      <div class="changes-history-actions">
        <button type="button" class="changes-ack-btn" data-acknowledge-entry="${escapeHtml(String(entry?.id || ""))}">
          <span class="material-symbols-outlined">done_all</span>
          <span>Просмотрено</span>
        </button>
      </div>
    `
    : "";

  return `
    <article class="changes-feed-card">
      <div class="changes-feed-top">
        <div>
          <h3 class="changes-feed-title">${escapeHtml(buildHistoryEntryTitle(entry))}</h3>
          <p class="changes-feed-time">${escapeHtml(formatChangesDateTime(entry.checkedAt))}</p>
        </div>
        ${renderHistoryEntryStatus(entry)}
      </div>
      <p class="changes-feed-line">${escapeHtml(buildHistoryEntryLine(entry, impact, groups))}</p>
      <div class="changes-feed-chips">${chips.join("")}</div>
      ${previewHtml}
      ${acknowledgeButton}
    </article>
  `;
}

function renderHistoryPreviewGroup(group) {
  const meta = [
    group?.template ? "Шаблон" : "",
    group?.impactedShiftCount > 0 ? `Смены: ${group.impactedShiftCount}` : "",
  ].filter(Boolean).join(" · ");
  return `
    <article class="changes-event changes-event-${escapeHtml(String(group?.tone || "info"))}">
      <h3 class="changes-event-title">${escapeHtml(String(group?.shortLabel || "Изменение"))}</h3>
      <p class="changes-event-desc">${escapeHtml(String(group?.summary || "Детали обновлены."))}</p>
      ${meta ? `<p class="changes-event-meta">${escapeHtml(meta)}</p>` : ""}
    </article>
  `;
}

function renderHistoryEntryStatus(entry) {
  if (entry?.baseline) {
    return '<span class="changes-check-badge baseline">Старт</span>';
  }
  if (!isSiteChangeEntryAcknowledged(entry) && (entry?.hasChanges || entry?.hasSourceIssues)) {
    return '<span class="changes-check-badge changed">Новое</span>';
  }
  return '<span class="changes-check-badge stable">Просмотрено</span>';
}

function buildHistoryEntryTitle(entry) {
  if (!entry) {
    return "Событие";
  }
  if (entry.baseline) {
    return "Создан стартовый снимок";
  }
  if (entry.hasSourceIssues && !entry.hasChanges) {
    return "Проблема проверки";
  }
  if (entry.hasSourceIssues && entry.hasChanges) {
    return "Изменения и проблемы проверки";
  }
  if (entry.hasChanges) {
    return "Есть изменения на сайте";
  }
  return "Проверка выполнена";
}

function buildHistoryEntryLine(entry, impact, groups = buildEntryChangeGroups(entry)) {
  if (!entry) {
    return "Подробности недоступны.";
  }
  if (entry.baseline) {
    return "Это стартовая точка для всех следующих сравнений на этом устройстве.";
  }
  if (entry.hasSourceIssues && !entry.hasChanges) {
    return entry.sourceIssues?.[0]?.description || "Один или несколько источников не ответили корректно.";
  }

  let text = buildEntryLeadSummary(entry, groups);
  if (impact.total > 0 && !/Затронуто/i.test(text)) {
    text += `. Затронуто смен: ${impact.total}`;
  }
  return text;
}

function getEntryDisplayEvents(entry) {
  if (!entry || !Array.isArray(entry.events)) {
    return [];
  }
  return entry.events.filter((event) => !String(event?.type || "").startsWith("source_"));
}

function renderInteractiveChangeComparisonCard(event) {
  const cardHtml = renderChangeComparisonCard(event);
  const sourceUrl = resolveSiteChangeEventUrl(event);
  if (!sourceUrl) {
    return cardHtml;
  }

  const title = String(event?.title || "Открыть изменение на сайте");
  return `
    <a
      class="changes-compare-link"
      href="${escapeHtml(sourceUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeHtml(`${title}: открыть официальный сайт`)}"
    >
      ${cardHtml}
    </a>
  `;
}

function resolveSiteChangeEventUrl(event) {
  const direct = sanitizeHttpUrl(event?.sourceUrl);
  if (direct) {
    return direct;
  }

  const byFacility = resolveFacilitySourceUrl(event?.facilityId);
  if (byFacility) {
    return byFacility;
  }

  return resolveFallbackSourceUrl();
}

function resolveFacilitySourceUrl(facilityId) {
  const targetId = String(facilityId || "").trim();
  if (!targetId) {
    return "";
  }

  const facility = getMyFacilityOptions().find((item) => String(item?.id || "") === targetId) || null;
  return sanitizeHttpUrl(facility?.sourceUrl);
}

function resolveFallbackSourceUrl() {
  if (!Array.isArray(state.data?.facilities)) {
    return "";
  }

  for (const facility of state.data.facilities) {
    const sourceUrl = sanitizeHttpUrl(facility?.sourceUrl);
    if (sourceUrl) {
      return sourceUrl;
    }
  }
  return "";
}

function sanitizeHttpUrl(value) {
  const text = String(value || "").trim();
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

function normalizeChangeSideText(value, fallback = "—") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function handleMyEditorShiftListClick(event) {
  const cloneButton = event.target.closest("button[data-clone-shift]");
  if (cloneButton) {
    const shiftId = String(cloneButton.dataset.cloneShift || "");
    if (!shiftId) {
      return;
    }
    const shift = state.myShifts.find((item) => item.id === shiftId) || null;
    if (!shift) {
      return;
    }
    state.myEditingShiftId = null;
    seedMyShiftFormFromShift(shift);
    renderMyScheduleEditor();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMyScheduleNotice("Данные смены перенесены в конструктор.", "info");
    return;
  }

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

  const confirmed = window.confirm(buildMyShiftDeletePrompt(shift));
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
  if (!hasSavedScheduleHistory()) {
    setMyShiftsDataNotice("История уже пуста.", "info");
    renderSettingsView();
    return;
  }

  const confirmMessage = hasWeeklyDayOffConfigured()
    ? "Удалить всю историю смен и выбранный еженедельный выходной? Это действие нельзя отменить."
    : "Удалить всю историю смен? Это действие нельзя отменить.";
  const confirmed = window.confirm(confirmMessage);
  if (!confirmed) {
    return;
  }

  state.myShifts = [];
  state.staffShifts = [];
  state.weeklyDayOffWeekday = null;
  saveMyShifts();
  state.myEditingShiftId = null;
  state.myScheduleFocusDate = todayIso();
  state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
  resetMyShiftForm({ preserveDate: state.myScheduleFocusDate });
  renderMySchedule();
  renderMyScheduleEditor();
  renderChangesView();
  renderSettingsView();
  setMyShiftsDataNotice("История удалена. На главном экране можно загрузить новый JSON.", "success");
}

function handleResetSiteChanges() {
  const hasHistory = Array.isArray(state.siteChangesHistory) && state.siteChangesHistory.length > 0;
  const hasCheckedAt = Boolean(state.siteChangesLastCheckedAt);
  if (!hasHistory && !hasCheckedAt) {
    setMyShiftsDataNotice("Локальный журнал уже пуст.", "info");
    return;
  }

  const confirmed = window.confirm("Очистить локальный журнал изменений и историю проверок на этом устройстве?");
  if (!confirmed) {
    return;
  }

  state.siteChangesHistory = [];
  state.siteChangesLastCheckedAt = "";
  state.siteChangesAcknowledgedSignature = "";
  saveSiteChangesHistory();
  saveSiteChangesLastCheckedAt();
  saveSiteChangesAcknowledgedSignature();
  renderChangesView();
  renderMyChangesSummary();
  renderSettingsView();
  setMyShiftsDataNotice("Локальный журнал изменений очищен.", "success");
}

function handleMyScheduleTimelineClick(event) {
  const importHistoryButton = event.target.closest("button[data-import-history]");
  if (importHistoryButton && el.importMyShiftsInput) {
    el.importMyShiftsInput.click();
  }
}

function renderMyScheduleDay(date, timelineItems, options = {}) {
  const { spotlight = false } = options;
  const workingItems = timelineItems.filter((item) => item.kind === MY_SHIFT_KIND.WORK);
  const hasDayOff = !workingItems.length && isWeeklyDayOffDate(date);
  const dayTotalMinutes = workingItems.reduce((sum, item) => sum + getShiftDurationMinutes(item.shift), 0);
  const dayClasses = ["my-timeline-day"];
  if (spotlight) {
    dayClasses.push("is-spotlight");
  }
  if (date === todayIso()) {
    dayClasses.push("is-today");
  }
  if (isWeekendIsoDate(date)) {
    dayClasses.push("is-weekend");
  }

  const daySummary = workingItems.length
    ? `${workingItems.length} ${pluralizeRu(workingItems.length, "смена", "смены", "смен")} · ${formatDuration(dayTotalMinutes)}`
    : hasDayOff
      ? "Выходной день"
      : "Свободный день";
  const dayBody = renderMyScheduleDayItems(date, workingItems);

  return `
    <section class="${dayClasses.join(" ")}">
      <div class="my-timeline-day-head">
        <div class="my-timeline-day-copy">
          <p class="my-timeline-day-kicker">${escapeHtml(formatDayTag(date))}</p>
          <h4 class="my-timeline-day-title">${escapeHtml(formatMyDayHeading(date))}</h4>
        </div>
        <p class="my-timeline-day-summary">${escapeHtml(daySummary)}</p>
      </div>
      <div class="my-timeline-day-list">
        ${dayBody}
      </div>
    </section>
  `;
}

function renderMyScheduleDayItems(date, workingItems) {
  if (!workingItems.length) {
    return isWeeklyDayOffDate(date)
      ? renderMyDayOffCard(date)
      : `<div class="my-day-empty">На эти сутки смены не добавлены.</div>`;
  }

  const parts = [];
  let previousWorkItem = null;

  for (const item of workingItems) {
    if (previousWorkItem) {
      const gapModel = buildMyShiftGapModel(previousWorkItem, item);
      const gapHtml = renderMyShiftGapDivider(gapModel);
      if (gapHtml) {
        parts.push(gapHtml);
      }
    }

    parts.push(renderMyShiftCard(item.shift, item.verification));
    previousWorkItem = item;
  }

  return parts.join("");
}

function renderMyChangesSummary() {
  if (!el.myChangesSummaryContent) {
    return;
  }

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const lastCheckedAtIso = state.siteChangesLastCheckedAt || latest?.checkedAt || "";
  const model = buildChangesAttentionModel(history, lastCheckedAtIso);
  const headlineText = buildMyChangesWidgetHeadline(model);
  const summaryText = buildMyChangesWidgetSummary(model);

  el.myChangesSummaryContent.innerHTML = `
    <div class="my-changes-widget ${escapeHtml(model.toneClass)}">
      <div class="my-changes-widget-top">
        <p class="my-changes-kicker">Проверка расписания</p>
      </div>
      <div class="my-changes-widget-copy my-changes-widget-copy-compact">
        <h3>${escapeHtml(headlineText)}</h3>
        <p class="my-changes-widget-summary">${escapeHtml(summaryText)}</p>
      </div>
      <div class="my-changes-widget-footer">
        <p class="my-changes-widget-time">${escapeHtml(model.checkedAtMeta)}</p>
        <div class="my-changes-widget-action">
          <span>${escapeHtml(buildMyChangesWidgetFooter(model))}</span>
          <span class="material-symbols-outlined">arrow_forward</span>
        </div>
      </div>
    </div>
  `;
}

function buildMyChangesWidgetFooter(model) {
  if (model.status === "no_data") {
    return "Открыть и запустить проверку";
  }
  if (model.status === "issue") {
    return "Открыть проблему";
  }
  if (model.status === "stable") {
    return "Открыть журнал проверок";
  }
  return "Открыть разбор";
}

function buildMyShiftGapModel(previousCheck, nextCheck) {
  const previousSiteEnd = getShiftVerificationBoundaryMinutes(previousCheck?.verification, "end");
  const nextSiteStart = getShiftVerificationBoundaryMinutes(nextCheck?.verification, "start");
  if (!Number.isFinite(previousSiteEnd) || !Number.isFinite(nextSiteStart)) {
    return null;
  }

  const minutes = nextSiteStart - previousSiteEnd;
  if (minutes <= 0) {
    return null;
  }

  const previousFacilityId = String(previousCheck?.shift?.facilityId || "");
  const nextFacilityId = String(nextCheck?.shift?.facilityId || "");
  const isCrossFacility = previousFacilityId && nextFacilityId && previousFacilityId !== nextFacilityId;

  if (isCrossFacility) {
    return {
      minutes,
      label: minutes >= 120 ? "Перерыв между объектами" : "Переход между объектами",
      modifierClass: "is-cross-facility",
    };
  }

  const breakLabel = classifyBreak(minutes, previousCheck?.shift?.facilityId);
  return {
    minutes,
    label: `${breakLabel.charAt(0).toUpperCase()}${breakLabel.slice(1)}`,
    modifierClass: breakLabel === "заливка льда" ? "is-ice-fill" : "",
  };
}

function getShiftVerificationBoundaryMinutes(verification, edge) {
  const sessions = Array.isArray(verification?.siteSessions) ? verification.siteSessions : [];
  if (!sessions.length) {
    return null;
  }

  const session = edge === "end" ? sessions[sessions.length - 1] : sessions[0];
  if (!session) {
    return null;
  }

  const minutes = edge === "end"
    ? (Number.isFinite(session.siteEndMinutes) ? session.siteEndMinutes : session.endMinutes)
    : (Number.isFinite(session.siteStartMinutes) ? session.siteStartMinutes : session.startMinutes);

  return Number.isFinite(minutes) ? minutes : null;
}

function renderMyShiftGapDivider(gapModel) {
  if (!gapModel || !Number.isFinite(gapModel.minutes) || gapModel.minutes <= 0) {
    return "";
  }

  const classes = ["my-shift-site-break", "my-day-gap-divider"];
  if (gapModel.modifierClass) {
    classes.push(gapModel.modifierClass);
  }

  return `
    <div class="${escapeHtml(classes.join(" "))}">
      <span>${escapeHtml(`${gapModel.label} · ${formatDuration(gapModel.minutes)}`)}</span>
    </div>
  `;
}

function renderMyDayOffCard(renderDate) {
  const meta = getRecurringDayOffMeta(renderDate);

  return `
    <article class="my-day-off-card">
      <div class="my-day-off-top">
        <div>
          <p class="my-day-off-kicker">Личный график</p>
          <h3>Выходной день</h3>
        </div>
        <span class="my-day-off-badge">${escapeHtml(meta.badge)}</span>
      </div>
      <p class="my-day-off-summary">${escapeHtml(meta.summary)}</p>
    </article>
  `;
}

function renderMyShiftCard(shift, verification = getShiftVerification(shift)) {
  const status = getMyShiftStatus(shift);
  const shiftDuration = formatDuration(getShiftDurationMinutes(shift));
  const coworkersHtml = renderShiftCoworkersLine(shift, "my-shift-coworkers", { labelText: "По смене" });
  const note = normalizeShiftNote(shift.note);
  const noteHtml = note ? `<p class="my-shift-note">${escapeHtml(note)}</p>` : "";
  const supportHtml = [coworkersHtml, noteHtml].filter(Boolean).join("");
  const siteDetailsHtml = renderMyShiftSiteTimeline(shift, verification);
  const runtimeMeta = [status.label, shiftDuration].filter(Boolean).join(" · ");

  return `
    <article class="my-shift-card ${escapeHtml(status.className)} ${escapeHtml(verification.cardClass)}">
      <div class="my-shift-top">
        <div class="my-shift-time-wrap">
          <div class="my-shift-time">${escapeHtml(`${shift.start} — ${shift.end}`)}</div>
          <p class="my-shift-runtime">${escapeHtml(runtimeMeta)}</p>
        </div>
        <span class="my-shift-verify ${escapeHtml(verification.badgeClass)}">${escapeHtml(verification.label)}</span>
      </div>
      <div class="my-shift-place">${escapeHtml(resolveShiftFacilityName(shift))}</div>
      ${supportHtml ? `<div class="my-shift-support">${supportHtml}</div>` : ""}
      ${siteDetailsHtml}
    </article>
  `;
}

function getShiftCoworkerNames(shift) {
  const direct = normalizeCoworkers(shift?.coworkers || []);
  const derived = normalizeCoworkers(getShiftStaffOverlapEntries(shift).map((entry) => entry.name));
  return normalizeCoworkers([...direct, ...derived]);
}

function getShiftStaffOverlapEntries(shift) {
  if (!shift?.date || !shift?.facilityId || !Array.isArray(state.staffShifts) || !state.staffShifts.length) {
    return [];
  }

  return state.staffShifts.filter((entry) => {
    if (!entry || entry.date !== shift.date || String(entry.facilityId || "") !== String(shift.facilityId || "")) {
      return false;
    }

    if (normalizeDiffText(entry.name) === normalizeDiffText(SELF_INSTRUCTOR_NAME)) {
      return false;
    }

    return timeRangesOverlap(shift.start, shift.end, entry.start, entry.end);
  });
}

function getSessionCoworkerNames(session, staffEntries) {
  if (!session || !Array.isArray(staffEntries) || !staffEntries.length) {
    return [];
  }

  return normalizeCoworkers(
    staffEntries
      .filter((entry) => timeRangesOverlap(session.start, session.end, entry.start, entry.end))
      .map((entry) => entry.name)
  );
}

function renderShiftCoworkersLine(shift, className, options = {}) {
  const { label = true, labelText = "С кем" } = options;
  const coworkers = getShiftCoworkerNames(shift);
  if (!coworkers.length) {
    return "";
  }

  const text = label ? `${labelText}: ${coworkers.join(", ")}` : coworkers.join(", ");
  return `<p class="${escapeHtml(className)}">${escapeHtml(text)}</p>`;
}

function renderMyShiftSiteTimeline(shift, verification) {
  const sessions = Array.isArray(verification.siteSessions) ? verification.siteSessions : [];
  const staffEntries = getShiftStaffOverlapEntries(shift);
  const sourceUrl = resolveFacilitySourceUrl(shift?.facilityId);
  if (!sessions.length && !String(verification.detail || "").trim() && !sourceUrl) {
    return "";
  }

  const summaryText = buildMyShiftSiteSummary(verification, sessions);
  const detailText = String(verification.detail || "").trim();
  const rows = [];
  if (verification.status === "partial" || verification.status === "matched") {
    for (let i = 0; i < sessions.length; i += 1) {
      const session = sessions[i];
      const rowClasses = ["my-shift-site-row"];
      if (i > 0) {
        const breakMins = session.startMinutes - sessions[i - 1].endMinutes;
        if (breakMins > 0) {
          rows.push(renderMyShiftBreak(breakMins, shift.facilityId));
          rowClasses.push("after-break");
        }
      }

      const notes = [];
      if (session.clipped) {
        notes.push("часть смены");
      }
      if (session.note && session.note !== session.activity) {
        notes.push(session.note);
      }
      const sessionCoworkers = getSessionCoworkerNames(session, staffEntries);

      rows.push(`
        <div class="${escapeHtml(rowClasses.join(" "))}">
          <div class="my-shift-site-session">
            <span class="my-shift-site-time">${escapeHtml(`${session.start} — ${session.end}`)}</span>
            <span class="my-shift-site-activity">${escapeHtml(session.activity || "Сеанс")}</span>
          </div>
          ${sessionCoworkers.length ? `<p class="my-shift-site-coworkers">${escapeHtml(`На сеансе: ${sessionCoworkers.join(", ")}`)}</p>` : ""}
          ${notes.length ? `<p class="my-shift-site-note">${escapeHtml(notes.join(" · "))}</p>` : ""}
        </div>
      `);
    }
  }

  const toneClass =
    verification.status === "missing"
      ? "is-alert"
      : verification.status === "unknown"
        ? "is-muted"
        : verification.status === "edge"
          ? "is-edge"
          : "is-partial";
  const sourceLinkLabel = `Открыть расписание ${resolveShiftFacilityName(shift)} на polessu.by`;
  const sourceLinkHtml = sourceUrl
    ? `
      <div class="my-shift-site-actions">
        <a
          class="my-shift-site-link"
          href="${escapeHtml(sourceUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(sourceLinkLabel)}"
          title="${escapeHtml(sourceLinkLabel)}"
        >
          <span>Официальное расписание</span>
          <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
        </a>
      </div>
    `
    : "";

  return `
    <div class="my-shift-site-strip ${escapeHtml(toneClass)}">
      <div class="my-shift-site-head">
        <p class="my-shift-site-title">${rows.length ? "По сеансам" : "На сайте"}</p>
        ${summaryText ? `<p class="my-shift-site-summary">${escapeHtml(summaryText)}</p>` : ""}
      </div>
      ${detailText ? `<p class="my-shift-site-message">${escapeHtml(detailText)}</p>` : ""}
      ${rows.length ? `<div class="my-shift-site-list">${rows.join("")}</div>` : ""}
      ${sourceLinkHtml}
    </div>
  `;
}

function renderMyShiftBreak(minutes, facilityId) {
  const breakLabel = classifyBreak(minutes, facilityId);
  const modifierClass = breakLabel === "заливка льда" ? "is-ice-fill" : "";
  const label = `${breakLabel.charAt(0).toUpperCase()}${breakLabel.slice(1)} · ${formatDuration(minutes)}`;
  return `
    <div class="my-shift-site-break ${escapeHtml(modifierClass)}">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function buildMyShiftSiteSummary(verification, sessions) {
  if (verification.status === "unknown") {
    return "Нет данных";
  }

  if (verification.status === "edge") {
    return buildEdgeOverlapSummary(verification.edgeSessions);
  }

  if (verification.status === "notice") {
    return String(verification.serviceNotice?.summary || verification.label || "Сообщение сайта");
  }

  if (verification.status === "missing") {
    return "Совпадений нет";
  }

  if (!sessions.length) {
    return "";
  }

  const count = sessions.length;
  const parts = [`${count} ${pluralizeRu(count, "сеанс", "сеанса", "сеансов")}`];

  if (verification.confirmedMinutes > 0) {
    parts.push(`покрытие ${formatDuration(verification.confirmedMinutes)}`);
  }

  return parts.join(" · ");
}

function getMyShiftStatus(shift) {
  const today = todayIso();
  const now = nowInMinutes();
  const start = toMinutes(shift.start);
  const end = toMinutes(shift.end);

  if (shift.date < today) {
    return { label: "Завершено", className: "past" };
  }

  if (shift.date > today) {
    return { label: "Запланировано", className: "upcoming" };
  }

  if (now >= end) {
    return { label: "Завершено", className: "past" };
  }

  if (now >= start && now < end) {
    return { label: "Идёт сейчас", className: "live" };
  }

  return { label: "Позже сегодня", className: "upcoming" };
}

function getShiftVerification(shift) {
  const fallback = {
    siteSessions: [],
    confirmedMinutes: 0,
    edgeSessions: [],
    serviceNotice: null,
  };
  if (!state.data?.facilities?.length) {
    return {
      status: "unknown",
      label: "Не проверено",
      badgeClass: "verify-unknown",
      cardClass: "",
      strike: false,
      detail: "Проверка сайта ещё не выполнена.",
      ...fallback,
    };
  }

  const facility = state.data.facilities.find((item) => String(item.id) === String(shift.facilityId));
  if (!facility) {
    return {
      status: "missing",
      label: "Нет на сайте",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: false,
      detail: "Объект не найден в актуальных данных сайта.",
      ...fallback,
    };
  }

  const day = facility.days?.find((item) => item.date === shift.date);
  const sessions = Array.isArray(day?.sessions) ? day.sessions : [];
  const serviceNotice = resolveFacilityServiceNoticeForDate(facility, shift.date);
  if (serviceNotice && !sessions.length) {
    return {
      ...fallback,
      status: "notice",
      label: String(serviceNotice.badge || "Сообщение"),
      badgeClass: "verify-notice",
      cardClass: "shift-notice",
      strike: false,
      detail: String(serviceNotice.message || "На сайте опубликовано служебное сообщение."),
      serviceNotice,
    };
  }

  if (!sessions.length) {
    return {
      status: "missing",
      label: "Нет на сайте",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: false,
      detail: day?.closedReason ? String(day.closedReason) : "На сайте на эту дату нет сеансов.",
      ...fallback,
    };
  }

  const overlapSessions = getOverlapSiteSessions(sessions, shift.start, shift.end);
  if (!overlapSessions.length) {
    return {
      status: "missing",
      label: "Нет на сайте",
      badgeClass: "verify-missing",
      cardClass: "shift-missing",
      strike: false,
      detail: "На сайте нет совпадений по времени смены.",
      ...fallback,
    };
  }

  const overlapModel = buildShiftOverlapModel(overlapSessions);
  const confirmedMinutes = getMergedSessionMinutes(overlapModel.primarySessions);

  const hasExact = sessions.some(
    (session) => normalizeTime(String(session.start || "")) === shift.start && normalizeTime(String(session.end || "")) === shift.end
  );
  if (!overlapModel.primarySessions.length && overlapModel.edgeSessions.length) {
    return {
      ...fallback,
      status: "edge",
      label: "На границе",
      badgeClass: "verify-edge",
      cardClass: "shift-edge",
      strike: false,
      siteSessions: [],
      confirmedMinutes: 0,
      edgeSessions: overlapModel.edgeSessions,
      detail: buildEdgeOverlapDetail(overlapModel.edgeSessions),
    };
  }

  if (hasExact) {
    return {
      status: "matched",
      label: "Совпадает",
      badgeClass: "verify-matched",
      cardClass: "",
      strike: false,
      siteSessions: overlapModel.primarySessions,
      confirmedMinutes,
      edgeSessions: overlapModel.edgeSessions,
      detail: overlapModel.edgeSessions.length ? buildMixedEdgeOverlapDetail(overlapModel.edgeSessions) : "",
    };
  }

  return {
    status: "partial",
    label: "Частично",
    badgeClass: "verify-partial",
    cardClass: "",
    strike: false,
    siteSessions: overlapModel.primarySessions,
    confirmedMinutes,
    edgeSessions: overlapModel.edgeSessions,
    detail: overlapModel.edgeSessions.length
      ? `Часть смены совпадает с сайтом. ${buildMixedEdgeOverlapDetail(overlapModel.edgeSessions)}`
      : "На сайте совпадает только часть смены.",
  };
}

function resolveFacilityServiceNoticeForDate(facility, isoDate) {
  const notice = facility?.serviceNotice;
  if (!notice || !String(notice.message || "").trim()) {
    return null;
  }

  if (!Boolean(notice.blocksSchedule) && Array.isArray(facility?.days) && facility.days.length) {
    return null;
  }

  const startDate = String(notice.startDate || "").trim();
  const endDate = String(notice.endDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) {
    if (startDate && isoDate < startDate) {
      return null;
    }
    if (endDate && isoDate > endDate) {
      return null;
    }
  }

  return notice;
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
      overlapMinutes: overlapEnd - overlapStart,
      siteStart: normalizedStart,
      siteEnd: normalizedEnd,
      siteStartMinutes: sessionStart,
      siteEndMinutes: sessionEnd,
      siteDurationMinutes: sessionEnd - sessionStart,
      touchesShiftStart: overlapStart === shiftStart,
      touchesShiftEnd: overlapEnd === shiftEnd,
      activity: String(session.activity || session.note || "Сеанс"),
      note: String(session.note || ""),
      clipped: overlapStart !== sessionStart || overlapEnd !== sessionEnd,
    });
  }

  return overlaps.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
}

function buildShiftOverlapModel(overlapSessions) {
  const primarySessions = [];
  const edgeSessions = [];

  for (const session of overlapSessions || []) {
    if (isShiftEdgeOverlapSession(session)) {
      edgeSessions.push(session);
    } else {
      primarySessions.push(session);
    }
  }

  return {
    primarySessions,
    edgeSessions,
  };
}

function isShiftEdgeOverlapSession(session) {
  if (!session?.clipped) {
    return false;
  }

  if (!session.touchesShiftStart && !session.touchesShiftEnd) {
    return false;
  }

  const overlapMinutes = Number(session.overlapMinutes);
  const siteDurationMinutes = Number(session.siteDurationMinutes);
  if (!Number.isFinite(overlapMinutes) || overlapMinutes <= 0) {
    return false;
  }

  if (overlapMinutes <= SHIFT_EDGE_OVERLAP_MINUTES) {
    return true;
  }

  if (!Number.isFinite(siteDurationMinutes) || siteDurationMinutes <= 0) {
    return false;
  }

  return overlapMinutes <= SHIFT_EDGE_OVERLAP_MAX_MINUTES
    && overlapMinutes / siteDurationMinutes < SHIFT_EDGE_OVERLAP_MAX_RATIO;
}

function buildEdgeOverlapSummary(edgeSessions) {
  const session = Array.isArray(edgeSessions) ? edgeSessions[0] : null;
  if (!session || !Number.isFinite(session.overlapMinutes)) {
    return "Пограничное совпадение";
  }

  return `В смену попадает только ${formatDuration(session.overlapMinutes)}`;
}

function buildEdgeOverlapDetail(edgeSessions) {
  const sessions = Array.isArray(edgeSessions) ? edgeSessions.filter(Boolean) : [];
  if (!sessions.length) {
    return "";
  }

  const lead = formatEdgeOverlapExplanation(sessions[0]);
  if (sessions.length === 1) {
    return `Сеанс сайта касается только границы смены: ${lead}.`;
  }

  const extraCount = sessions.length - 1;
  return `${sessions.length} сеанса сайта касаются только границы смены. Первый: ${lead}. Ещё ${extraCount} ${pluralizeRu(extraCount, "случай", "случая", "случаев")}.`;
}

function buildMixedEdgeOverlapDetail(edgeSessions) {
  const sessions = Array.isArray(edgeSessions) ? edgeSessions.filter(Boolean) : [];
  if (!sessions.length) {
    return "";
  }

  const lead = formatEdgeOverlapExplanation(sessions[0]);
  if (sessions.length === 1) {
    return `Ещё один сеанс касается только границы смены: ${lead}.`;
  }

  return `Есть ${sessions.length} пограничных пересечения с сеансами сайта. Первый: ${lead}.`;
}

function formatEdgeOverlapExplanation(session) {
  const siteLabel = `${session.siteStart} — ${session.siteEnd}`;
  const overlapLabel = `${session.start} — ${session.end}`;
  const overlapDuration = formatDuration(Number(session.overlapMinutes) || 0);
  return `сайт ${siteLabel}, в смену попадает ${overlapDuration} (${overlapLabel})`;
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

function getShiftDurationMinutes(shift) {
  if (!isWorkingShiftRecord(shift)) {
    return 0;
  }

  const start = toMinutes(String(shift?.start || ""));
  const end = toMinutes(String(shift?.end || ""));

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return end - start;
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

  return toMinutes(String(a.start || "00:00")) - toMinutes(String(b.start || "00:00"));
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
  el.myShiftsDataNotice.className = `history-data-notice ${type}`;
}

function exportMyShiftsHistory() {
  const siteChangesHistory = Array.isArray(state.siteChangesHistory)
    ? state.siteChangesHistory
        .map(normalizeSiteChangeEntry)
        .slice(0, SITE_CHANGES_HISTORY_LIMIT)
    : [];

  const payload = {
    version: 7,
    app: "Расписание",
    exportedAt: new Date().toISOString(),
    timezone: state.data?.timezone || "Europe/Minsk",
    shifts: state.myShifts,
    weeklyDayOffWeekday: normalizeWeekdayValue(state.weeklyDayOffWeekday),
    staffShifts: state.staffShifts,
    siteChanges: {
      lastCheckedAt: state.siteChangesLastCheckedAt || "",
      acknowledgedSignature: "",
      history: siteChangesHistory,
    },
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

  setMyShiftsDataNotice("JSON с вашим графиком сохранён.", "success");
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
    const importedWeeklyDayOffWeekday = extractWeeklyDayOffWeekdayFromPayload(parsed, records);
    if (!normalized.length && records.length && importedWeeklyDayOffWeekday === null) {
      throw new Error("Не удалось найти корректные записи смен.");
    }

    if (hasSavedScheduleHistory()) {
      const confirmed = window.confirm("Заменить текущий график загруженным JSON?");
      if (!confirmed) {
        setMyShiftsDataNotice("Загрузка отменена.", "info");
        input.value = "";
        return;
      }
    }

    const importedSiteChanges = normalizeImportedSiteChangesPayload(parsed?.siteChanges);
    const importedStaffShifts = normalizeStaffShiftRecords(parsed?.staffShifts || parsed?.staff || parsed?.roster || []);

    state.myShifts = normalized;
    state.weeklyDayOffWeekday = importedWeeklyDayOffWeekday;
    state.staffShifts = importedStaffShifts;
    saveMyShifts();

    if (importedSiteChanges) {
      state.siteChangesHistory = importedSiteChanges.history;
      state.siteChangesLastCheckedAt = importedSiteChanges.lastCheckedAt;
      state.siteChangesAcknowledgedSignature = importedSiteChanges.acknowledgedSignature;
      migrateLegacyAcknowledgedSiteChanges();
      saveSiteChangesHistory();
      saveSiteChangesLastCheckedAt();
      saveSiteChangesAcknowledgedSignature();
    }

    state.myScheduleFocusDate = state.myShifts.length
      ? state.myShifts[0].date
      : importedWeeklyDayOffWeekday === null
        ? todayIso()
        : findNextIsoDateForWeekday(todayIso(), importedWeeklyDayOffWeekday);
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    state.myEditingShiftId = null;
    resetMyShiftForm();

    renderMySchedule();
    renderMyScheduleEditor();
    renderChangesView();
    renderSettingsView();
    const staffMeta = state.staffShifts.length
      ? ` Данных по коллегам: ${state.staffShifts.length}.`
      : "";
    const dayOffMeta = state.weeklyDayOffWeekday === null
      ? ""
      : ` Выходной: ${getWeeklyDayOffLabel(state.weeklyDayOffWeekday).toLowerCase()}.`;
    setMyShiftsDataNotice(`Загружено смен: ${state.myShifts.length}.${staffMeta}${dayOffMeta}`, "success");
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
  hydrateThemeButtons();
  hydrateAutoRefreshButtons();
  renderSettingsView();
}

function hydrateThemeButtons() {
  if (!el.themeSelector) {
    return;
  }
  const buttons = Array.from(el.themeSelector.querySelectorAll("button[data-theme]"));
  buttons.forEach((button) => {
    button.classList.toggle("active-theme", button.dataset.theme === state.settings.theme);
  });
}

function hydrateAutoRefreshButtons() {
  if (!el.autoRefreshOptions) {
    return;
  }
  const current = String(Number(state.settings.autoRefreshMins || 0));
  const buttons = Array.from(el.autoRefreshOptions.querySelectorAll("button[data-auto-refresh]"));
  buttons.forEach((button) => {
    button.classList.toggle("is-active", String(button.dataset.autoRefresh || "") === current);
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
  renderSettingsView();
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

function pulseRefreshButton(button = null) {
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
  const { button = null, icon = null } = options;
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
  const { button = null, timerKey = "mySchedule" } = options;
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
  const message = `Ошибка обновления: ${error instanceof Error ? error.message : String(error)}`;
  setMyScheduleNotice(message, "error");
  if (el.changesUpdatesCard && !state.siteChangesHistory.length) {
    el.changesUpdatesCard.innerHTML = `
      <div class="changes-list-head">
        <h2>Журнал изменений</h2>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}

function registerSiteChanges(previousPayload, nextPayload, options = {}) {
  if (!nextPayload?.facilities?.length) {
    return;
  }

  const { source = "auto", forced = false } = options;
  const checkedAt = new Date().toISOString();
  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory.slice() : [];
  const fallbackEvents = !siteChangesUtils ? diffSchedulePayload(previousPayload, nextPayload) : [];
  const fallbackSourceIssues = !siteChangesUtils ? collectSourceIssueEvents(previousPayload, nextPayload) : [];
  const fallbackSummary = !siteChangesUtils ? summarizeChangeEvents(fallbackEvents) : { total: 0, added: 0, removed: 0, updated: 0 };
  const comparison = siteChangesUtils
    ? siteChangesUtils.buildScheduleComparison(previousPayload, nextPayload)
    : {
        events: fallbackEvents,
        sourceIssues: fallbackSourceIssues,
        summary: fallbackSummary,
        hasChanges: fallbackSummary.total > 0,
        hasSourceIssues: fallbackSourceIssues.length > 0,
        entryType: fallbackSourceIssues.length ? (fallbackSummary.total > 0 ? "schedule_with_source_issues" : "source_error") : "schedule_diff",
        signature: buildSiteChangesSignature(fallbackSummary, fallbackEvents, fallbackSourceIssues, {
          hasChanges: fallbackSummary.total > 0,
          hasSourceIssues: fallbackSourceIssues.length > 0,
          entryType: fallbackSourceIssues.length ? (fallbackSummary.total > 0 ? "schedule_with_source_issues" : "source_error") : "schedule_diff",
        }),
        metrics: {
          affectedFacilityCount: new Set(
            [...fallbackEvents, ...fallbackSourceIssues].map((item) => String(item?.facilityId || "").trim()).filter(Boolean)
          ).size,
          affectedDateCount: new Set(fallbackEvents.map((item) => String(item?.date || "").trim()).filter(Boolean)).size,
        },
      };
  const sourceIssues = comparison.sourceIssues.slice(0, 8);
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
        sourceIssues,
        affectedFacilityCount: Number(comparison.metrics?.affectedFacilityCount || 0),
        affectedDateCount: Number(comparison.metrics?.affectedDateCount || 0),
        snapshotHash: String(nextPayload.snapshotHash || ""),
        acknowledgedAt: "",
        signature:
          comparison.signature ||
          buildSiteChangesSignature({ total: 0, added: 0, removed: 0, updated: 0 }, [], sourceIssues, {
            hasChanges: false,
            hasSourceIssues: true,
            entryType: "source_error",
          }),
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
      affectedFacilityCount: 0,
      affectedDateCount: 0,
      snapshotHash: String(nextPayload.snapshotHash || ""),
      acknowledgedAt: "",
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

  const events = comparison.events;
  const summary = comparison.summary;
  const hasChanges = comparison.hasChanges;

  if (!hasChanges && !hasSourceIssues) {
    return;
  }

  if (!hasChanges && hasSourceIssues && hasSameSourceIssueSignature(history[0], sourceIssues)) {
    return;
  }

  const entryType = comparison.entryType;
  const signature =
    comparison.signature ||
    buildSiteChangesSignature(summary, events, sourceIssues, {
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
    sourceIssues,
    affectedFacilityCount: Number(comparison.metrics?.affectedFacilityCount || 0),
    affectedDateCount: Number(comparison.metrics?.affectedDateCount || 0),
    snapshotHash: String(nextPayload.snapshotHash || ""),
    acknowledgedAt: "",
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
    const sourceUrl = sanitizeHttpUrl(nextFacility?.sourceUrl || previousFacility?.sourceUrl);

    if (hasFacilityBrokenData(previousFacility) || hasFacilityBrokenData(nextFacility)) {
      continue;
    }

    if (!previousFacility && nextFacility) {
      events.push({
        type: "facility_added",
        severity: "positive",
        facilityId,
        facilityName,
        sourceUrl,
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
        sourceUrl,
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
          sourceUrl,
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
          sourceUrl,
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
          sourceUrl,
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
            sourceUrl,
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
            sourceUrl,
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
            sourceUrl,
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
    const sourceUrl = sanitizeHttpUrl(nextFacility?.sourceUrl || previousFacility?.sourceUrl);
    const blockingNotice = getFacilityBlockingNotice(nextFacility);
    if (!isFacilitySourceUnavailable(nextFacility) && !blockingNotice) {
      continue;
    }

    const issueText = getFacilitySourceIssueText(nextFacility);
    const previousText = previousFacility ? getFacilitySourceIssueText(previousFacility) : "";
    events.push({
      type: "source_issue",
      severity: "warning",
      facilityId,
      facilityName,
      sourceUrl,
      date: null,
      title: getFacilityIssueTitle(nextFacility),
      kind: getFacilityIssueKind(nextFacility),
      description: issueText || "Источник временно недоступен.",
      beforeText: previousText || (blockingNotice ? "На сайте не было служебного сообщения." : "Источник работал штатно."),
      afterText: issueText || "Источник временно недоступен.",
      fetchState: blockingNotice ? "notice" : String(nextFacility?.fetchState || "error"),
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

function getFacilityBlockingNotice(facility) {
  const notice = facility?.serviceNotice;
  if (!notice || typeof notice !== "object") {
    return null;
  }

  const message = String(notice.message || "").replace(/\s+/g, " ").trim();
  if (!message || !Boolean(notice.blocksSchedule)) {
    return null;
  }

  return {
    kind: String(notice.kind || "notice").trim().toLowerCase() || "notice",
    badge: String(notice.badge || "").replace(/\s+/g, " ").trim() || "Служебное сообщение",
    summary: String(notice.summary || "").replace(/\s+/g, " ").trim(),
    message,
  };
}

function getFacilityIssueKind(facility) {
  return getFacilityBlockingNotice(facility) ? "notice" : "error";
}

function getFacilityIssueTitle(facility) {
  const blockingNotice = getFacilityBlockingNotice(facility);
  if (blockingNotice) {
    return blockingNotice.badge || "Служебное сообщение";
  }
  return "Ошибка источника";
}

function getFacilitySourceIssueText(facility) {
  if (!facility || typeof facility !== "object") {
    return "";
  }
  const blockingNotice = getFacilityBlockingNotice(facility);
  if (blockingNotice) {
    return String(blockingNotice.message || blockingNotice.summary || "").slice(0, 240);
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

function shouldApplyLocalDemoSiteChanges() {
  const host = String(window.location.hostname || "").trim().toLowerCase();
  return LOCAL_SITE_CHANGE_DEMO_HOSTS.has(host);
}

// Local-only demo changes for testing the schedule-diff widgets against real comparisons.
function applyLocalDemoSiteChanges(payload) {
  if (!shouldApplyLocalDemoSiteChanges() || !payload || !Array.isArray(payload.facilities)) {
    return payload;
  }

  const nextPayload = clonePayload(payload);
  if (!nextPayload || !Array.isArray(nextPayload.facilities)) {
    return payload;
  }

  let appliedCount = 0;
  const iceArena = nextPayload.facilities.find((facility) => facility?.id === "ice_arena") || null;
  const iceArenaDay = Array.isArray(iceArena?.days)
    ? iceArena.days.find((day) => Array.isArray(day?.sessions) && day.sessions.length > 0) || null
    : null;
  const iceArenaSession = iceArenaDay?.sessions?.[0] || null;

  if (iceArenaSession) {
    iceArenaSession.activity = "Массовое катание (тест)";
    iceArenaSession.note = "Локальное тестовое изменение для проверки сравнения";
    iceArenaSession.sourceLine = "Тест: обновлено описание сеанса";
    appliedCount += 1;
  }

  const rowingBase = nextPayload.facilities.find((facility) => facility?.id === "rowing_base") || null;
  const removedTemplateSession =
    Array.isArray(rowingBase?.template?.sessions) && rowingBase.template.sessions.length > 1
      ? rowingBase.template.sessions.pop() || null
      : null;

  if (rowingBase && removedTemplateSession && Array.isArray(rowingBase.days)) {
    rowingBase.days = rowingBase.days.map((day) => ({
      ...day,
      sessions: (Array.isArray(day?.sessions) ? day.sessions : []).filter((session) => !(
        String(session?.start || "") === String(removedTemplateSession.start || "")
        && String(session?.end || "") === String(removedTemplateSession.end || "")
      )),
    }));
    appliedCount += 1;
  }

  if (!appliedCount) {
    return payload;
  }

  nextPayload.facilities = nextPayload.facilities.map((facility) => enrichFacilityTrackingMetaForClient(facility));
  if (siteChangesUtils?.buildScheduleSnapshotHash) {
    nextPayload.snapshotHash = siteChangesUtils.buildScheduleSnapshotHash({
      schemaVersion: nextPayload.schemaVersion,
      timezone: nextPayload.timezone,
      facilities: nextPayload.facilities,
    });
  }
  nextPayload.meta = {
    ...(nextPayload.meta || {}),
    localDemoSiteChanges: true,
    localDemoSiteChangesCount: appliedCount,
  };

  return nextPayload;
}

function enrichFacilityTrackingMetaForClient(facility) {
  if (!siteChangesUtils?.buildFacilityTrackingMeta || !facility || typeof facility !== "object") {
    return facility;
  }

  const tracking = siteChangesUtils.buildFacilityTrackingMeta(facility);
  return {
    ...facility,
    comparisonMode: tracking.comparisonMode,
    dataQuality: tracking.dataQuality,
    facilityHash: tracking.facilityHash,
    templateHash: tracking.templateHash,
    changeTrackingHash: tracking.changeTrackingHash,
    windowStart: tracking.windowStart || null,
    windowEnd: tracking.windowEnd || null,
    template: tracking.template,
  };
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

function todayIso() {
  const timezone = state.data?.timezone || "Europe/Minsk";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function normalizeShiftRecords(records, facilityOptions = DEFAULT_FACILITY_OPTIONS) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const kind = normalizeMyShiftKind(item.kind || item.type);
      if (kind === MY_SHIFT_KIND.DAY_OFF) {
        return null;
      }

      const facility = resolveImportedFacility(item, facilityOptions);
      return {
        id: String(item.id || createShiftId()),
        kind,
        date: String(item.date || ""),
        facilityId: String(facility.facilityId || ""),
        facilityName: String(facility.facilityName || ""),
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
      };
    })
    .filter(Boolean)
    .filter((item) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        return false;
      }
      return Boolean(
        item.facilityId
        && item.start
        && item.end
        && toMinutes(item.end) > toMinutes(item.start)
      );
    })
    .sort(compareMyShift);
}

function normalizeStaffShiftRecords(records, facilityOptions = DEFAULT_FACILITY_OPTIONS) {
  if (!Array.isArray(records)) {
    return [];
  }

  const facilityMap = new Map(facilityOptions.map((facility) => [String(facility.id), facility.name]));
  const unique = new Map();

  for (const item of records.filter((entry) => entry && typeof entry === "object")) {
    const facility = resolveImportedFacility(item, facilityOptions);
    const facilityId = String(facility.facilityId || "");
    const name = String(
      item.name || item.employee || item.instructor || item.person || item.fullName || item.fio || ""
    )
      .replace(/\s+/g, " ")
      .trim();
    const normalized = {
      date: String(item.date || ""),
      facilityId,
      facilityName: String(facility.facilityName || facilityMap.get(facilityId) || ""),
      name,
      start: normalizeTime(String(item.start || "")),
      end: normalizeTime(String(item.end || "")),
    };
    if (!normalized.name || !normalized.facilityId || !/^\d{4}-\d{2}-\d{2}$/.test(normalized.date) || !normalized.start || !normalized.end) {
      continue;
    }
    if (toMinutes(normalized.end) <= toMinutes(normalized.start)) {
      continue;
    }

    const key = [
      normalized.date,
      normalized.facilityId,
      normalizeDiffText(normalized.name),
      normalized.start,
      normalized.end,
    ].join("|");
    unique.set(key, normalized);
  }

  return Array.from(unique.values())
    .sort((a, b) => (
      a.date.localeCompare(b.date)
      || String(a.facilityId).localeCompare(String(b.facilityId))
      || toMinutes(a.start) - toMinutes(b.start)
      || toMinutes(a.end) - toMinutes(b.end)
      || a.name.localeCompare(b.name, "ru")
    ));
}

function inferLegacyWeeklyDayOffWeekday(records) {
  if (!Array.isArray(records)) {
    return null;
  }

  const legacy = records.find((item) => normalizeMyShiftKind(item?.kind || item?.type) === MY_SHIFT_KIND.DAY_OFF) || null;
  return legacy?.date ? normalizeWeekdayValue(getIsoDateWeekday(legacy.date)) : null;
}

function extractWeeklyDayOffWeekdayFromPayload(payload, records = null) {
  const direct = normalizeWeekdayValue(
    payload?.weeklyDayOffWeekday
      ?? payload?.weeklyDayOff?.weekday
      ?? payload?.dayOffWeekday
      ?? payload?.dayOff?.weekday
  );
  if (direct !== null) {
    return direct;
  }

  const sourceRecords = Array.isArray(records)
    ? records
    : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.shifts)
        ? payload.shifts
        : [];

  return inferLegacyWeeklyDayOffWeekday(sourceRecords);
}

function loadMyShifts() {
  try {
    const raw = localStorage.getItem(STORAGE.myShifts);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.shifts) ? parsed.shifts : [];
    return normalizeShiftRecords(records, DEFAULT_FACILITY_OPTIONS);
  } catch {
    return [];
  }
}

function loadWeeklyDayOffWeekday() {
  try {
    const raw = localStorage.getItem(STORAGE.myShifts);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return extractWeeklyDayOffWeekdayFromPayload(parsed);
  } catch {
    return null;
  }
}

function loadStaffShifts() {
  try {
    const raw = localStorage.getItem(STORAGE.myShifts);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.staffShifts) ? parsed.staffShifts : [];
    return normalizeStaffShiftRecords(records, DEFAULT_FACILITY_OPTIONS);
  } catch {
    return [];
  }
}

function syncStaffShiftsWithMyShifts() {
  const previous = JSON.stringify(state.staffShifts || []);
  const activeKeys = new Set(
    (state.myShifts || [])
      .filter(isWorkingShiftRecord)
      .map((shift) => `${String(shift?.date || "")}|${String(shift?.facilityId || "")}`)
      .filter((key) => !key.startsWith("|") && !key.endsWith("|"))
  );
  const next = activeKeys.size
    ? normalizeStaffShiftRecords(
        (state.staffShifts || []).filter((entry) => activeKeys.has(`${String(entry?.date || "")}|${String(entry?.facilityId || "")}`))
        , getMyFacilityOptions()
      )
    : [];

  state.staffShifts = next;
  return previous !== JSON.stringify(next);
}

function saveMyShifts() {
  syncStaffShiftsWithMyShifts();
  localStorage.setItem(
    STORAGE.myShifts,
    JSON.stringify({
      shifts: state.myShifts,
      weeklyDayOffWeekday: normalizeWeekdayValue(state.weeklyDayOffWeekday),
      staffShifts: state.staffShifts,
    })
  );
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

function loadSiteChangesLastCheckedAt() {
  try {
    const raw = localStorage.getItem(STORAGE.siteChangesLastCheckedAt);
    if (!raw) {
      return "";
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString();
  } catch {
    return "";
  }
}

function saveSiteChangesLastCheckedAt() {
  if (!state.siteChangesLastCheckedAt) {
    localStorage.removeItem(STORAGE.siteChangesLastCheckedAt);
    return;
  }

  const date = new Date(state.siteChangesLastCheckedAt);
  if (Number.isNaN(date.getTime())) {
    localStorage.removeItem(STORAGE.siteChangesLastCheckedAt);
    return;
  }
  localStorage.setItem(STORAGE.siteChangesLastCheckedAt, date.toISOString());
}

function loadSiteChangesAcknowledgedSignature() {
  try {
    const raw = localStorage.getItem(STORAGE.siteChangesAcknowledgedSignature);
    if (!raw) {
      return "";
    }
    return String(raw).trim().slice(0, 400);
  } catch {
    return "";
  }
}

function saveSiteChangesAcknowledgedSignature() {
  const value = String(state.siteChangesAcknowledgedSignature || "").trim();
  if (!value) {
    localStorage.removeItem(STORAGE.siteChangesAcknowledgedSignature);
    return;
  }
  localStorage.setItem(STORAGE.siteChangesAcknowledgedSignature, value.slice(0, 400));
}

function migrateLegacyAcknowledgedSiteChanges() {
  const legacySignature = String(state.siteChangesAcknowledgedSignature || "").trim();
  if (!legacySignature || !Array.isArray(state.siteChangesHistory) || !state.siteChangesHistory.length) {
    return;
  }

  let migrated = false;
  state.siteChangesHistory = state.siteChangesHistory.map((entry) => {
    if (!entry || entry.acknowledgedAt) {
      return entry;
    }

    if (buildSiteChangeAckSignature(entry) !== legacySignature) {
      return entry;
    }

    migrated = true;
    return {
      ...entry,
      acknowledgedAt: normalizeOptionalIsoDate(entry.checkedAt) || new Date().toISOString(),
    };
  });

  if (migrated) {
    saveSiteChangesHistory();
  }

  state.siteChangesAcknowledgedSignature = "";
  saveSiteChangesAcknowledgedSignature();
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
      .map(normalizeSiteChangeEntry)
      .slice(0, SITE_CHANGES_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveSiteChangesHistory() {
  const compact = (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [])
    .map(normalizeSiteChangeEntry)
    .slice(0, SITE_CHANGES_HISTORY_LIMIT);
  localStorage.setItem(STORAGE.siteChanges, JSON.stringify(compact));
}

function normalizeSiteChangeEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.slice(0, SITE_CHANGES_EVENTS_LIMIT).map((event) => ({
    ...(event && typeof event === "object" ? event : {}),
    sourceUrl: sanitizeHttpUrl(event?.sourceUrl),
  }));
}

function normalizeSiteChangeEntry(item) {
  return {
    ...(item && typeof item === "object" ? item : {}),
    acknowledgedAt: normalizeOptionalIsoDate(item?.acknowledgedAt),
    events: normalizeSiteChangeEvents(item?.events),
    sourceIssues: Array.isArray(item?.sourceIssues) ? item.sourceIssues.slice(0, 8) : [],
    affectedFacilityCount: Number(item?.affectedFacilityCount || 0),
    affectedDateCount: Number(item?.affectedDateCount || 0),
  };
}

function normalizeImportedSiteChangesPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const historyRaw = Array.isArray(value.history) ? value.history : [];
  const history = historyRaw
    .filter((item) => item && typeof item === "object" && typeof item.checkedAt === "string")
    .map(normalizeSiteChangeEntry)
    .slice(0, SITE_CHANGES_HISTORY_LIMIT);

  return {
    history,
    lastCheckedAt: normalizeOptionalIsoDate(value.lastCheckedAt),
    acknowledgedSignature: String(value.acknowledgedSignature || "").trim().slice(0, 400),
  };
}

function normalizeOptionalIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
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
