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

const MY_SCHEDULE_RANGE = {
  DAY: "day",
  WEEK: "week",
  FULL: "full",
};

const SITE_CHANGES_HISTORY_LIMIT = 20;
const SITE_CHANGES_EVENTS_LIMIT = 24;
const SITE_CHANGES_LATEST_EVENTS_LIMIT = 8;
const SITE_CHANGES_HISTORY_PREVIEW_LIMIT = 8;
const siteChangesUtils = window.SiteChangesUtils || null;

const state = {
  data: null,
  view: "my_schedule",
  settings: loadSettings(),
  myShifts: loadMyShifts(),
  siteChangesHistory: loadSiteChangesHistory(),
  siteChangesLastCheckedAt: loadSiteChangesLastCheckedAt(),
  siteChangesAcknowledgedSignature: loadSiteChangesAcknowledgedSignature(),
  myScheduleFocusDate: null,
  myScheduleRangeMode: MY_SCHEDULE_RANGE.DAY,
  myEditingShiftId: null,
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
  myScheduleEditorView: document.getElementById("myScheduleEditorView"),
  changesView: document.getElementById("changesView"),
  changesMain: document.getElementById("changesMain"),
  myScheduleUpdatedAt: document.getElementById("myScheduleUpdatedAt"),
  changesUpdatedAt: document.getElementById("changesUpdatedAt"),
  myScheduleRefreshButton: document.getElementById("myScheduleRefreshButton"),
  myScheduleRefreshIcon: document.getElementById("myScheduleRefreshIcon"),
  changesRefreshButton: document.getElementById("changesRefreshButton"),
  changesRefreshIcon: document.getElementById("changesRefreshIcon"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  openMyEditorButton: document.getElementById("openMyEditorButton"),
  backFromSettingsButton: document.getElementById("backFromSettingsButton"),
  backFromChangesButton: document.getElementById("backFromChangesButton"),
  backFromMyEditorButton: document.getElementById("backFromMyEditorButton"),
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
  settingsDataCard: document.getElementById("settingsDataCard"),
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
  changesUpdatesCard: document.getElementById("changesUpdatesCard"),
};

init();

function init() {
  if (!state.siteChangesLastCheckedAt && state.siteChangesHistory[0]?.checkedAt) {
    state.siteChangesLastCheckedAt = String(state.siteChangesHistory[0].checkedAt);
    saveSiteChangesLastCheckedAt();
  }
  migrateLegacyAcknowledgedSiteChanges();

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
  if (el.openMyEditorButton) {
    el.openMyEditorButton.addEventListener("click", () => {
      state.myEditingShiftId = null;
      resetMyShiftForm();
      setView("my_schedule_editor");
    });
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

  if (el.myShowAllButton) {
    el.myShowAllButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.WEEK;
      renderMySchedule();
      scrollMyScheduleControlsIntoView();
    });
  }

  if (el.myCollapseRangeButton) {
    el.myCollapseRangeButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
      renderMySchedule();
      scrollMyScheduleControlsIntoView();
    });
  }

  if (el.myOpenFullRangeButton) {
    el.myOpenFullRangeButton.addEventListener("click", () => {
      state.myScheduleRangeMode = MY_SCHEDULE_RANGE.FULL;
      renderMySchedule();
      scrollMyScheduleControlsIntoView();
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
  const showMyScheduleEditor = view === "my_schedule_editor";
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
  if (el.myScheduleEditorView) {
    el.myScheduleEditorView.hidden = !showMyScheduleEditor;
  }

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

    const payload = await response.json();
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

  return "переход";
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
    if (facility?.error) {
      return [{
        facilityName,
        description: String(facility.error),
        kind: "error",
        sourceUrl,
      }];
    }

    if (Array.isArray(facility?.warnings) && facility.warnings.length) {
      return [{
        facilityName,
        description: String(facility.warnings[0]),
        kind: "warn",
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
  const exportableItems = state.myShifts.length + (Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory.length : 0);

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
    hasMyShifts: state.myShifts.length > 0,
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

function renderSettingsView() {
  if (!el.settingsOverviewCard || !el.settingsMonitorCard || !el.settingsDataCard) {
    return;
  }

  const model = buildSettingsOverviewModel();
  el.settingsOverviewCard.innerHTML = renderSettingsOverviewCard(model);
  el.settingsMonitorCard.innerHTML = renderSettingsMonitorCard(model);
  el.settingsDataCard.innerHTML = renderSettingsDataCard(model);
  if (el.settingsSourceIssues) {
    el.settingsSourceIssues.innerHTML = renderSettingsSourceIssues(model.sourceIssues);
  }
  if (el.openSettingsChangesButton) {
    const hasAnyChangesPageData = model.hasHistory || Boolean(model.changesModel.checkedAtIso);
    el.openSettingsChangesButton.disabled = !hasAnyChangesPageData;
    el.openSettingsChangesButton.querySelector("span:last-child").textContent =
      model.status === "attention" || model.status === "issue" ? "Посмотреть изменения" : "Страница изменений";
  }
  if (el.exportMyShiftsButton) {
    el.exportMyShiftsButton.disabled = !model.exportableItems;
  }
  if (el.resetSiteChangesButton) {
    el.resetSiteChangesButton.disabled = !model.hasHistory && !Boolean(state.siteChangesLastCheckedAt);
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

    return `
      ${linkStart}
        <span class="material-symbols-outlined">${issue.kind === "error" ? "warning" : "info"}</span>
        <div>
          <strong>${escapeHtml(issue.facilityName)}</strong>
          <p>${escapeHtml(issue.description)}</p>
        </div>
      ${linkEnd}
    `;
  }).join("");
}

function renderSettingsDataCard(model) {
  const metrics = [
    { label: "Смены", value: String(state.myShifts.length) },
    { label: "Журнал", value: String(state.siteChangesHistory.length) },
    { label: "К экспорту", value: String(model.exportableItems) },
    { label: "Тема", value: resolveThemeLabel(state.settings.theme) },
  ];

  let summary = "Экспорт сохраняет ваши смены и локальный журнал проверки сайта в один JSON-файл.";
  if (!state.myShifts.length && !state.siteChangesHistory.length) {
    summary = "Локальных данных почти нет. Сначала добавьте смену или дождитесь первой проверки сайта.";
  } else if (!state.myShifts.length) {
    summary = "У вас пока нет своих смен, но уже есть локальный журнал проверки сайта.";
  } else if (!state.siteChangesHistory.length) {
    summary = "Ваши смены сохранены, а локальный журнал изменений ещё не накопился.";
  }

  return `
    <article class="settings-surface-card">
      <div class="settings-surface-head">
        <div>
          <p class="settings-surface-kicker">Резерв и перенос</p>
          <h3>Локальные данные этого устройства</h3>
        </div>
        <span class="settings-surface-chip">${escapeHtml(model.exportableItems ? "Есть данные" : "Пусто")}</span>
      </div>
      <p class="settings-surface-text">${escapeHtml(summary)}</p>
      <div class="settings-surface-metrics">
        ${metrics.map((metric) => renderOverviewMetric(metric, "settings-surface-metric")).join("")}
      </div>
      <p class="settings-surface-footnote">Сброс журнала очищает только локальную историю изменений и не затрагивает сами смены.</p>
    </article>
  `;
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
  updateMyScheduleRangeControls(rangeMode, state.myShifts.length > 0);

  if (el.myTimelineTitle) {
    if (rangeMode === MY_SCHEDULE_RANGE.WEEK) {
      el.myTimelineTitle.textContent = "Неделя от выбранной даты";
    } else if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
      el.myTimelineTitle.textContent = "Весь период от выбранной даты";
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
    el.myDayInlineActions.classList.toggle("is-sticky", hasHistory && rangeMode !== MY_SCHEDULE_RANGE.DAY);
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
      el.myOpenFullRangeButton.classList.remove("is-active");
      el.myOpenFullRangeButton.innerHTML =
        '<span class="material-symbols-outlined">open_in_full</span><span>Открыть полный график</span>';
      return;
    }

    if (rangeMode === MY_SCHEDULE_RANGE.FULL) {
      el.myOpenFullRangeButton.hidden = false;
      el.myOpenFullRangeButton.disabled = true;
      el.myOpenFullRangeButton.classList.add("is-active");
      el.myOpenFullRangeButton.innerHTML =
        '<span class="material-symbols-outlined">check_circle</span><span>Полный график открыт</span>';
      return;
    }

    el.myOpenFullRangeButton.hidden = true;
    el.myOpenFullRangeButton.disabled = false;
    el.myOpenFullRangeButton.classList.remove("is-active");
    el.myOpenFullRangeButton.innerHTML =
      '<span class="material-symbols-outlined">open_in_full</span><span>Открыть полный график</span>';
  }
}

function scrollMyScheduleControlsIntoView() {
  const target = el.myDayInlineActions || el.myScheduleTimeline || null;
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

  el.changesLatestCard.innerHTML = renderChangesOverviewCard(overviewModel);
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
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Мои смены</h2>
        <p>Когда появится первый локальный снимок, здесь будет видно, затронуты ли ваши смены.</p>
      </div>
    </section>
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Журнал проверок</h2>
        <p>Первые записи появятся после успешной синхронизации расписания.</p>
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
    headline: buildChangesOverviewHeadline(status),
    pill: buildChangesOverviewPill(status),
    icon: buildChangesOverviewIcon(status),
  };
}

function buildChangesOverviewHeadline(status) {
  switch (status) {
    case "important":
      return "Затронуты мои смены";
    case "changes":
      return "Есть изменения";
    case "issue":
      return "Проверка неполная";
    case "reviewed_changes":
      return "Последнее изменение просмотрено";
    case "reviewed_issue":
      return "Последняя проблема просмотрена";
    case "stable":
      return "Без новых изменений";
    case "baseline":
      return "Первый снимок готов";
    case "no_data":
    default:
      return "Проверка ещё не запущена";
  }
}

function buildChangesOverviewPill(status) {
  switch (status) {
    case "important":
      return "Влияет";
    case "changes":
      return "Новое";
    case "issue":
      return "Неполно";
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

function buildChangesOverviewIcon(status) {
  switch (status) {
    case "important":
      return "priority_high";
    case "changes":
      return "notifications";
    case "issue":
      return "warning";
    case "reviewed_changes":
      return "visibility";
    case "reviewed_issue":
      return "fact_check";
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
      return "Последняя проблема проверки уже просмотрена. Новых непросмотренных событий сейчас нет.";
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
      metrics.push({ label: "Сбоев", value: String(focusEntry.sourceIssues?.length || 0) });
    }
  } else if (focusEntry?.hasSourceIssues) {
    metrics.push({ label: "Сбоев", value: String(focusEntry.sourceIssues?.length || 0) });
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
  const metricsHtml = model.highlights.length
    ? `
      <div class="changes-overview-metrics">
        ${model.highlights.map((metric) => renderOverviewMetric(metric, "changes-overview-metric")).join("")}
      </div>
    `
    : "";
  const acknowledgeButton = model.focusEntry && !model.focusEntry.baseline && !isSiteChangeEntryAcknowledged(model.focusEntry)
    ? renderChangesAcknowledgeButton(model.focusEntry, "Просмотрено")
    : "";

  return `
    <article class="changes-overview-card ${escapeHtml(model.toneClass)}">
      <div class="changes-overview-top">
        <div>
          <p class="changes-overview-kicker">Проверка расписания</p>
          <p class="changes-overview-meta">${escapeHtml(model.checkedAtMeta)}</p>
        </div>
        <span class="changes-state-pill">${escapeHtml(model.pill)}</span>
      </div>
      <div class="changes-overview-main">
        <div class="changes-overview-icon">
          <span class="material-symbols-outlined">${escapeHtml(model.icon)}</span>
        </div>
        <div class="changes-overview-copy">
          <h2>${escapeHtml(model.headline)}</h2>
          <p>${escapeHtml(model.summary)}</p>
        </div>
      </div>
      ${metricsHtml}
      <p class="changes-overview-footer">${escapeHtml(model.footer)}</p>
      ${acknowledgeButton}
    </article>
  `;
}

function renderChangesDetailSections(model, history) {
  return [
    renderMyShiftImpactSection(model),
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
          <p>Сейчас нельзя надёжно оценить влияние на смены, потому что часть источников не ответила.</p>
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
  return Boolean(shift && typeof shift === "object" && String(shift.date || "") >= todayIso());
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
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);

  if (aStart < 0 || aEnd < 0 || bStart < 0 || bEnd < 0) {
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

  if (!focusEntry) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Кратко по изменениям</h2>
          <p>Последняя проверка не нашла новых событий. Предыдущие записи остались в истории ниже.</p>
        </div>
      </section>
    `;
  }

  if (focusEntry.baseline) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Кратко по изменениям</h2>
          <p>Это стартовый локальный снимок. Следующие проверки будут сравниваться с ним или с более новыми снимками.</p>
        </div>
      </section>
    `;
  }

  if (!focusGroups.length) {
    return `
      <section class="changes-section">
        <div class="changes-list-head">
          <h2>Кратко по изменениям</h2>
          <p>В этой записи нет отдельных карточек расписания. Обычно это означает, что изменился только статус проверки.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Кратко по изменениям</h2>
        <p>${
          isSiteChangeEntryAcknowledged(focusEntry)
            ? "Это последнее уже просмотренное событие. Карточки ниже показывают только суть изменений."
            : "Карточки ниже показывают суть изменений по объектам и датам. Нажмите на карточку, чтобы открыть официальный источник."
        }</p>
      </div>
      <div class="changes-list">
        ${focusGroups.map((group) => renderChangeGroupCard(group)).join("")}
      </div>
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
  if (group.impactedShiftCount > 0) {
    chips.push(`<span class="changes-feed-chip warn">Смены: ${escapeHtml(String(group.impactedShiftCount))}</span>`);
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
        <div>
          <h3 class="changes-feed-title">${escapeHtml(group.shortLabel)}</h3>
          <p class="changes-feed-time">${escapeHtml(group.summary)}</p>
        </div>
      </div>
      ${chips.length ? `<div class="changes-feed-chips">${chips.join("")}</div>` : ""}
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
  return `
    <div class="changes-group-row">
      <span>${escapeHtml(String(row?.label || ""))}</span>
      <strong>${escapeHtml(String(row?.value || ""))}</strong>
    </div>
  `;
}

function renderSourceIssueSection(sourceIssues, options = {}) {
  const entry = options?.entry || null;
  const reviewed = Boolean(entry && isSiteChangeEntryAcknowledged(entry));
  return `
    <section class="changes-section">
      <div class="changes-list-head">
        <h2>Проблемы проверки</h2>
        <p>${
          reviewed
            ? "Последняя просмотренная проверка была неполной: часть источников ответила с ошибкой."
            : "Часть сайтов ответила с ошибкой. Из-за этого сравнение может быть неполным."
        }</p>
      </div>
      <div class="changes-events">
        ${sourceIssues.map((issue) => renderSourceIssueCard(issue)).join("")}
      </div>
    </section>
  `;
}

function renderSourceIssueCard(issue) {
  return `
    <article class="changes-event changes-event-warning">
      <h3 class="changes-event-title">${escapeHtml(issue?.facilityName || "Источник")}</h3>
      <p class="changes-event-desc">${escapeHtml(issue?.description || "Источник временно недоступен.")}</p>
      <p class="changes-event-meta">${escapeHtml(String(issue?.fetchState || "error"))}</p>
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
  if (!targetId || !Array.isArray(state.data?.facilities)) {
    return "";
  }

  const facility = state.data.facilities.find((item) => String(item?.id || "") === targetId) || null;
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
  const dayTotalMinutes = shiftChecks.reduce((sum, item) => sum + getShiftDurationMinutes(item.shift), 0);
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

  const daySummary = isWorkingDay
    ? `${shiftChecks.length} ${pluralizeRu(shiftChecks.length, "смена", "смены", "смен")} · ${formatDuration(dayTotalMinutes)}`
    : "Свободный день";
  const dayBody = isWorkingDay
    ? shiftChecks.map((item) => renderMyShiftCard(item.shift, item.verification)).join("")
    : `<div class="my-day-empty">На эти сутки смены не добавлены.</div>`;

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

function renderMyChangesSummary() {
  if (!el.myChangesSummaryContent) {
    return;
  }

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const lastCheckedAtIso = state.siteChangesLastCheckedAt || latest?.checkedAt || "";
  const model = buildChangesAttentionModel(history, lastCheckedAtIso);
  const highlights = model.highlights.slice(0, 2);
  const highlightsHtml = highlights.length
    ? `
      <div class="my-changes-widget-highlights">
        ${highlights.map((metric) => renderOverviewMetric(metric, "my-changes-widget-highlight")).join("")}
      </div>
    `
    : "";

  el.myChangesSummaryContent.innerHTML = `
    <div class="my-changes-widget ${escapeHtml(model.toneClass)}">
      <div class="my-changes-widget-top">
        <div>
          <p class="my-changes-kicker">Проверка расписания</p>
          <h3>${escapeHtml(model.headline)}</h3>
        </div>
        <span class="my-changes-state-pill">${escapeHtml(model.pill)}</span>
      </div>
      <p class="my-changes-widget-summary">${escapeHtml(model.summary)}</p>
      <p class="my-changes-widget-time">${escapeHtml(model.checkedAtMeta)}</p>
      ${highlightsHtml}
      <div class="my-changes-widget-footer">
        <span>${escapeHtml(buildMyChangesWidgetFooter(model))}</span>
        <span class="material-symbols-outlined">arrow_forward</span>
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

function renderMyShiftCard(shift, verification = getShiftVerification(shift)) {
  const status = getMyShiftStatus(shift);
  const shiftDuration = formatDuration(getShiftDurationMinutes(shift));
  const coworkersHtml = renderShiftCoworkersLine(shift, "my-shift-coworkers", { label: false });
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

function renderShiftCoworkersLine(shift, className, options = {}) {
  const { label = true } = options;
  const coworkers = normalizeCoworkers(shift?.coworkers || []);
  if (!coworkers.length) {
    return "";
  }

  const text = label ? `С кем: ${coworkers.join(", ")}` : coworkers.join(", ");
  return `<p class="${escapeHtml(className)}">${escapeHtml(text)}</p>`;
}

function renderMyShiftSiteTimeline(shift, verification) {
  const sessions = Array.isArray(verification.siteSessions) ? verification.siteSessions : [];
  if (verification.status === "matched") {
    return "";
  }

  const summaryText = buildMyShiftSiteSummary(verification, sessions);
  const detailText = String(verification.detail || "").trim();
  const rows = [];
  if (verification.status === "partial") {
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
        notes.push("часть смены");
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
  }

  const toneClass =
    verification.status === "missing" ? "is-alert" : verification.status === "unknown" ? "is-muted" : "is-partial";

  return `
    <div class="my-shift-site-strip ${escapeHtml(toneClass)}">
      <div class="my-shift-site-head">
        <p class="my-shift-site-title">На сайте</p>
        ${summaryText ? `<p class="my-shift-site-summary">${escapeHtml(summaryText)}</p>` : ""}
      </div>
      ${detailText ? `<p class="my-shift-site-message">${escapeHtml(detailText)}</p>` : ""}
      ${rows.length ? `<div class="my-shift-site-list">${rows.join("")}</div>` : ""}
    </div>
  `;
}

function renderMyShiftBreak(minutes, facilityId) {
  return `
    <div class="my-shift-site-break">${escapeHtml(formatDuration(minutes))} ${escapeHtml(classifyBreak(minutes, facilityId))}</div>
  `;
}

function buildMyShiftSiteSummary(verification, sessions) {
  if (verification.status === "unknown") {
    return "Нет данных";
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
  const confirmedMinutes = getMergedSessionMinutes(overlapSessions);
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

  const hasExact = sessions.some(
    (session) => normalizeTime(String(session.start || "")) === shift.start && normalizeTime(String(session.end || "")) === shift.end
  );
  if (hasExact) {
    return {
      status: "matched",
      label: "Совпадает",
      badgeClass: "verify-matched",
      cardClass: "",
      strike: false,
      siteSessions: overlapSessions,
      confirmedMinutes,
      detail: "",
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
    detail: "На сайте совпадает только часть смены.",
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

function getShiftDurationMinutes(shift) {
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
  el.myShiftsDataNotice.className = `history-data-notice ${type}`;
}

function exportMyShiftsHistory() {
  const siteChangesHistory = Array.isArray(state.siteChangesHistory)
    ? state.siteChangesHistory
        .map(normalizeSiteChangeEntry)
        .slice(0, SITE_CHANGES_HISTORY_LIMIT)
    : [];

  const payload = {
    version: 4,
    app: "Расписание",
    exportedAt: new Date().toISOString(),
    timezone: state.data?.timezone || "Europe/Minsk",
    shifts: state.myShifts,
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

  setMyShiftsDataNotice("История графика и изменения на сайте экспортированы.", "success");
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

    const importedSiteChanges = normalizeImportedSiteChangesPayload(parsed?.siteChanges);

    state.myShifts = normalized;
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

    state.myScheduleFocusDate = state.myShifts.length ? state.myShifts[0].date : todayIso();
    state.myScheduleRangeMode = MY_SCHEDULE_RANGE.DAY;
    state.myEditingShiftId = null;
    resetMyShiftForm();

    renderMySchedule();
    renderMyScheduleEditor();
    renderChangesView();
    renderSettingsView();
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
    if (!isFacilitySourceUnavailable(nextFacility)) {
      continue;
    }

    const issueText = getFacilitySourceIssueText(nextFacility);
    events.push({
      type: "source_issue",
      severity: "warning",
      facilityId,
      facilityName,
      sourceUrl,
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
