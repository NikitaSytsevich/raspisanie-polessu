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
  autoRefreshSelect: document.getElementById("autoRefreshSelect"),
  settingsRefreshButton: document.getElementById("settingsRefreshButton"),
  exportMyShiftsButton: document.getElementById("exportMyShiftsButton"),
  importMyShiftsButton: document.getElementById("importMyShiftsButton"),
  importMyShiftsInput: document.getElementById("importMyShiftsInput"),
  myShiftsDataNotice: document.getElementById("myShiftsDataNotice"),
  sourceList: document.getElementById("sourceList"),
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

  if (el.autoRefreshSelect) {
    el.autoRefreshSelect.addEventListener("change", () => {
      state.settings.autoRefreshMins = Number(el.autoRefreshSelect.value || 0);
      saveSettings();
      setupAutoRefresh();
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
  const checkSiteChanges = source === "my_schedule_global";
  const shouldTrackSiteCheck = checkSiteChanges || isChangesRefresh;

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
    registerSiteChanges(previousPayload, payload, { source: checkSiteChanges ? "changes" : source, forced: force });
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
  renderSources();
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
  if (!el.changesLatestCard || !el.changesUpdatesCard) {
    return;
  }

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const latestChangedEntry = getActiveSiteChangeEntry(history);
  const lastCheckedAtIso = state.siteChangesLastCheckedAt || latest?.checkedAt || null;

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

  if (!latest) {
    const lastCheckedText = lastCheckedAtIso ? formatChangesDateTime(lastCheckedAtIso) : "Проверок пока нет";
    el.changesLatestCard.innerHTML = `
      <article class="changes-latest-inner">
        <div class="changes-latest-top">
          <h2>Последняя проверка</h2>
          <span class="changes-check-badge stable">Без изменений</span>
        </div>
        <p class="changes-latest-time">${escapeHtml(lastCheckedText)}</p>
        <div class="changes-last-change-row">
          <span class="changes-last-change-label">Дата последних изменений на сайте</span>
          <strong class="changes-last-change-value">Сейчас обновлений нет</strong>
        </div>
        <p class="changes-latest-text">${
          lastCheckedAtIso
            ? "Проверка выполнена. Обновлений на сайте не найдено."
            : "Нажмите «Проверить», чтобы получить первый снимок и начать отслеживание изменений на сайте."
        }</p>
      </article>
    `;
    el.changesUpdatesCard.innerHTML = `
      <div class="changes-list-head">
        <h2>Последние изменения на сайте</h2>
        <p>Сейчас обновлений нет.</p>
      </div>
    `;
    return;
  }

  const sourceIssues = Array.isArray(latest.sourceIssues) ? latest.sourceIssues : [];
  const hasSourceIssues = Boolean(latest.hasSourceIssues || sourceIssues.length);
  const latestBadge = hasSourceIssues && !latest.hasChanges
    ? '<span class="changes-check-badge changed">Ошибка источника</span>'
    : latestChangedEntry
      ? '<span class="changes-check-badge changed">Есть изменения</span>'
      : latest.baseline
        ? '<span class="changes-check-badge baseline">Базовый снимок</span>'
        : '<span class="changes-check-badge stable">Без изменений</span>';
  const latestTime = formatChangesDateTime(lastCheckedAtIso || latest.checkedAt);
  const latestChangedTime = latestChangedEntry?.checkedAt ? formatChangesDateTime(latestChangedEntry.checkedAt) : "Сейчас обновлений нет";
  const sourceIssueText = sourceIssues.length
    ? `${sourceIssues[0]?.facilityName ? `${sourceIssues[0].facilityName}: ` : ""}${
        sourceIssues[0]?.description || "Обнаружена проблема с источником данных."
      }`
    : "";
  const latestText = hasSourceIssues && !latest.hasChanges
    ? sourceIssueText
    : latest.baseline
    ? "Создан первый снимок расписания для сравнения будущих обновлений."
    : latestChangedEntry
      ? "Показаны последние зафиксированные изменения. Нажмите на карточку, чтобы открыть официальный источник."
      : "Сейчас обновлений нет.";
  const acknowledgeButton = latestChangedEntry ? renderChangesAcknowledgeButton() : "";

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
      ${acknowledgeButton}
    </article>
  `;

  if (!latestChangedEntry) {
    el.changesUpdatesCard.innerHTML = `
      <div class="changes-list-head">
        <h2>Последние изменения на сайте</h2>
        <p>Сейчас обновлений нет.</p>
      </div>
    `;
    return;
  }

  const allEvents = getEntryDisplayEvents(latestChangedEntry);
  const visibleEvents = allEvents.slice(0, SITE_CHANGES_LATEST_EVENTS_LIMIT);
  const moreCount = Math.max(0, allEvents.length - visibleEvents.length);

  if (!visibleEvents.length) {
    el.changesUpdatesCard.innerHTML = `
      <div class="changes-list-head">
        <h2>Последние изменения на сайте</h2>
        <p>Изменения зафиксированы, но подробные карточки пока недоступны.</p>
      </div>
    `;
    return;
  }

  el.changesUpdatesCard.innerHTML = `
    <div class="changes-list-head">
      <h2>Последние изменения на сайте</h2>
      <p>Как было и как стало. Нажмите на изменение, чтобы открыть официальный источник.</p>
    </div>
    <p class="changes-latest-time">${escapeHtml(formatChangesDateTime(latestChangedEntry.checkedAt))}</p>
    <div class="changes-compare-grid">
      ${visibleEvents.map((event) => renderInteractiveChangeComparisonCard(event)).join("")}
    </div>
    ${moreCount ? `<p class="changes-compare-more">И ещё ${escapeHtml(String(moreCount))} изменений в этой проверке.</p>` : ""}
  `;
}

function getLatestChangedEntry(history) {
  if (!Array.isArray(history)) {
    return null;
  }
  return history.find((entry) => entry && !entry.baseline && entry.hasChanges) || null;
}

function getActiveSiteChangeEntry(history) {
  const latestChangedEntry = getLatestChangedEntry(history);
  if (!latestChangedEntry) {
    return null;
  }
  return isSiteChangeEntryAcknowledged(latestChangedEntry) ? null : latestChangedEntry;
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
  const savedSignature = String(state.siteChangesAcknowledgedSignature || "").trim();
  if (!savedSignature) {
    return false;
  }
  const entrySignature = buildSiteChangeAckSignature(entry);
  return Boolean(entrySignature && entrySignature === savedSignature);
}

function renderChangesAcknowledgeButton() {
  return `
    <div class="changes-ack-row">
      <button type="button" class="changes-ack-btn" data-acknowledge-changes="1">
        <span class="material-symbols-outlined">done_all</span>
        <span>Ознакомлен</span>
      </button>
    </div>
  `;
}

function handleChangesMainClick(event) {
  const acknowledgeButton = event.target.closest("button[data-acknowledge-changes]");
  if (!acknowledgeButton) {
    return;
  }
  acknowledgeLatestSiteChanges();
}

function acknowledgeLatestSiteChanges() {
  const latestChangedEntry = getLatestChangedEntry(state.siteChangesHistory);
  if (!latestChangedEntry) {
    return;
  }

  const signature = buildSiteChangeAckSignature(latestChangedEntry);
  if (!signature) {
    return;
  }

  state.siteChangesAcknowledgedSignature = signature;
  saveSiteChangesAcknowledgedSignature();
  renderChangesView();
  renderMyChangesSummary();
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

  const history = Array.isArray(state.siteChangesHistory) ? state.siteChangesHistory : [];
  const latest = history[0] || null;
  const latestChangedEntry = getActiveSiteChangeEntry(history);
  const lastCheckedAtIso = state.siteChangesLastCheckedAt || latest?.checkedAt || "";
  const lastCheckedAt = lastCheckedAtIso ? new Date(lastCheckedAtIso) : null;
  const hasValidLastCheckedAt = Boolean(lastCheckedAt && !Number.isNaN(lastCheckedAt.getTime()));

  if (!latest) {
    if (hasValidLastCheckedAt) {
      const checkedText = `${lastCheckedAt.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })} · ${formatRelativeAge(lastCheckedAt, { compact: false })}`;
      el.myChangesSummaryContent.innerHTML = `
        <div class="my-changes-head">
          <div>
            <h3>Изменения на сайте</h3>
            <p>Последняя проверка выполнена, обновлений на сайте не найдено.</p>
          </div>
          <span class="my-changes-badge is-stable">Без изменений</span>
        </div>
        <p class="my-changes-time">${escapeHtml(checkedText)}</p>
        <div class="my-changes-last-block is-empty">
          <span class="my-changes-last-label">Последнее изменение</span>
          <p class="my-changes-last-title">Сейчас обновлений нет</p>
        </div>
        <p class="my-changes-open-hint">Нажмите карточку, чтобы открыть последние изменения.</p>
      `;
      return;
    }

    el.myChangesSummaryContent.innerHTML = `
      <div class="my-changes-head">
        <div>
          <h3>Изменения на сайте</h3>
          <p>Пока нет проверок. Откройте раздел изменений, чтобы сделать первый снимок.</p>
        </div>
        <span class="my-changes-badge is-baseline">Нет данных</span>
      </div>
      <p class="my-changes-time">Нажмите карточку, чтобы открыть страницу «Изменения на сайте».</p>
      <div class="my-changes-last-block is-empty">
        <span class="my-changes-last-label">Последнее изменение</span>
        <p class="my-changes-last-title">Сейчас обновлений нет</p>
      </div>
    `;
    return;
  }

  const checkedAt = hasValidLastCheckedAt ? lastCheckedAt : new Date(latest.checkedAt);
  const checkedText = Number.isNaN(checkedAt.getTime())
    ? "Время проверки неизвестно"
    : `${checkedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · ${formatRelativeAge(checkedAt, { compact: false })}`;
  const sourceIssues = Array.isArray(latest.sourceIssues) ? latest.sourceIssues : [];
  const hasOnlySourceIssues = sourceIssues.length > 0 && !latest.hasChanges;
  const badgeClass = latest.baseline ? "is-baseline" : hasOnlySourceIssues || latestChangedEntry ? "is-changed" : "is-stable";
  const badgeText = latest.baseline
    ? "Базовый снимок"
    : hasOnlySourceIssues
      ? "Ошибка источника"
      : latestChangedEntry
        ? "Есть изменения"
        : "Без изменений";
  const summaryText = hasOnlySourceIssues
    ? `${sourceIssues[0]?.facilityName ? `${sourceIssues[0].facilityName}: ` : ""}${
        sourceIssues[0]?.description || "Источник временно недоступен, изменения расписания сейчас не рассчитываются."
      }`
    : latest.baseline
    ? "Создан базовый снимок для отслеживания будущих изменений."
    : latestChangedEntry
      ? "Доступно краткое описание последнего изменения."
      : "Сейчас обновлений нет.";
  const latestChangeBlock = renderMyLatestSiteChangeBlock(latestChangedEntry);

  el.myChangesSummaryContent.innerHTML = `
    <div class="my-changes-head">
      <div>
        <h3>Изменения на сайте</h3>
        <p>${escapeHtml(summaryText)}</p>
      </div>
      <span class="my-changes-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
    </div>
    <p class="my-changes-time">${escapeHtml(checkedText)}</p>
    ${latestChangeBlock}
    <p class="my-changes-open-hint">Нажмите карточку, чтобы открыть последние изменения.</p>
  `;
}

function renderMyLatestSiteChangeBlock(entry) {
  if (!entry) {
    return `
      <div class="my-changes-last-block is-empty">
        <span class="my-changes-last-label">Последнее изменение</span>
        <p class="my-changes-last-title">Сейчас обновлений нет</p>
      </div>
    `;
  }

  const events = getEntryDisplayEvents(entry);
  const leadEvent = events[0] || null;
  const title = leadEvent ? String(leadEvent.title || "Изменение расписания") : "Изменение расписания";
  const details = leadEvent
    ? normalizeChangeSideText(leadEvent.afterText || leadEvent.description, "Детали изменения обновлены.")
    : "Есть обновление расписания.";
  const dateHint = leadEvent?.date ? formatMonthDayShort(leadEvent.date) : "";
  const facilityHint = leadEvent?.facilityName ? String(leadEvent.facilityName) : "";
  const metaPrefix = [facilityHint, dateHint].filter(Boolean).join(" · ");
  const changedAt = formatChangesDateTime(entry.checkedAt);
  const meta = metaPrefix ? `${metaPrefix} · ${changedAt}` : changedAt;

  return `
    <div class="my-changes-last-block">
      <span class="my-changes-last-label">Последнее изменение</span>
      <p class="my-changes-last-title">${escapeHtml(title)}</p>
      <p class="my-changes-last-text">${escapeHtml(details)}</p>
      <p class="my-changes-last-meta">${escapeHtml(meta)}</p>
    </div>
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
  const siteChangesHistory = Array.isArray(state.siteChangesHistory)
    ? state.siteChangesHistory
        .map((entry) => ({
          ...entry,
          events: normalizeSiteChangeEvents(entry.events),
          sourceIssues: Array.isArray(entry.sourceIssues) ? entry.sourceIssues.slice(0, 8) : [],
        }))
        .slice(0, SITE_CHANGES_HISTORY_LIMIT)
    : [];

  const payload = {
    version: 3,
    app: "Расписание",
    exportedAt: new Date().toISOString(),
    timezone: state.data?.timezone || "Europe/Minsk",
    shifts: state.myShifts,
    siteChanges: {
      lastCheckedAt: state.siteChangesLastCheckedAt || "",
      acknowledgedSignature: state.siteChangesAcknowledgedSignature || "",
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
        <h2>Последние изменения на сайте</h2>
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
        events: normalizeSiteChangeEvents(item.events),
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
      events: normalizeSiteChangeEvents(entry.events),
      sourceIssues: Array.isArray(entry.sourceIssues) ? entry.sourceIssues.slice(0, 8) : [],
    }))
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

function normalizeImportedSiteChangesPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const historyRaw = Array.isArray(value.history) ? value.history : [];
  const history = historyRaw
    .filter((item) => item && typeof item === "object" && typeof item.checkedAt === "string")
    .map((item) => ({
      ...item,
      events: normalizeSiteChangeEvents(item.events),
      sourceIssues: Array.isArray(item.sourceIssues) ? item.sourceIssues.slice(0, 8) : [],
    }))
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
