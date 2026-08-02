import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, get, onValue, ref, serverTimestamp, set, update } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

(function () {
  "use strict";

  const STORAGE_PREFIX = "dw-friends-calendar:";
  const CHANNEL_NAME = "dw-friends-calendar-sync";
  const DEFAULT_TITLE = "친구 약속 잡기";
  const DEFAULT_THRESHOLD = 0.8;
  const DEFAULT_PARTICIPANTS = 6;
  const MAX_PARTICIPANTS = 12;
  const RANGE_LIMIT_DAYS = 180;
  const DATE_PAST_DAYS = 365;
  const DATE_FUTURE_DAYS = 730;
  const STATUS_FLOW = [null, "yes", "no", "maybe"];
  const STATUS_LABEL = {
    yes: { mark: "○", text: "참석 가능" },
    no: { mark: "×", text: "참석 불가" },
    maybe: { mark: "△", text: "확인 필요" }
  };
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const HOLIDAYS = {
    "2026-01-01": "신정",
    "2026-02-16": "설날 연휴",
    "2026-02-17": "설날",
    "2026-02-18": "설날 연휴",
    "2026-03-01": "삼일절",
    "2026-03-02": "삼일절 대체공휴일",
    "2026-05-05": "어린이날",
    "2026-05-24": "부처님오신날",
    "2026-06-06": "현충일",
    "2026-08-15": "광복절",
    "2026-09-24": "추석 연휴",
    "2026-09-25": "추석",
    "2026-09-26": "추석 연휴",
    "2026-10-03": "개천절",
    "2026-10-09": "한글날",
    "2026-12-25": "성탄절",
    "2027-01-01": "신정",
    "2027-02-06": "설날 연휴",
    "2027-02-07": "설날",
    "2027-02-08": "설날 연휴",
    "2027-03-01": "삼일절",
    "2027-05-05": "어린이날",
    "2027-05-13": "부처님오신날",
    "2027-06-06": "현충일",
    "2027-08-15": "광복절",
    "2027-09-14": "추석 연휴",
    "2027-09-15": "추석",
    "2027-09-16": "추석 연휴",
    "2027-10-03": "개천절",
    "2027-10-09": "한글날",
    "2027-12-25": "성탄절",
    "2028-01-01": "신정",
    "2028-01-26": "설날 연휴",
    "2028-01-27": "설날",
    "2028-01-28": "설날 연휴",
    "2028-03-01": "삼일절",
    "2028-05-02": "부처님오신날",
    "2028-05-05": "어린이날",
    "2028-06-06": "현충일",
    "2028-08-15": "광복절",
    "2028-10-02": "추석 연휴",
    "2028-10-03": "추석",
    "2028-10-04": "추석 연휴",
    "2028-10-09": "한글날",
    "2028-12-25": "성탄절"
  };

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC54ZHMG2_b0M7drYyIw0B4yWJt4Q2OE3I",
    authDomain: "friends-calendar-85abf.firebaseapp.com",
    databaseURL: "https://friends-calendar-85abf-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "friends-calendar-85abf",
    storageBucket: "friends-calendar-85abf.firebasestorage.app",
    messagingSenderId: "358834088863",
    appId: "1:358834088863:web:353823d71c56e1888d2baa"
  };

  const clientId = Math.random().toString(36).slice(2);
  const params = new URLSearchParams(window.location.search);
  const boardId = params.get("board") || "default";
  const inviteToken = params.get("invite");
  const storageKey = STORAGE_PREFIX + boardId;
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

  const els = {
    title: document.getElementById("boardTitle"),
    status: document.getElementById("connectionStatus"),
    banner: document.getElementById("statusBanner"),
    scroller: document.getElementById("calendarScroller"),
    grid: document.getElementById("calendarGrid"),
    previousDatesButton: document.getElementById("previousDatesButton"),
    nextDatesButton: document.getElementById("nextDatesButton"),
    todayButton: document.getElementById("todayButton"),
    shareButton: document.getElementById("shareButton"),
    settingsButton: document.getElementById("settingsButton"),
    confirmDialog: document.getElementById("confirmDialog"),
    confirmTitle: document.getElementById("confirmTitle"),
    confirmSummary: document.getElementById("confirmSummary"),
    maybeList: document.getElementById("maybeList"),
    confirmAction: document.getElementById("confirmAction"),
    cancelDialog: document.getElementById("cancelDialog"),
    cancelTitle: document.getElementById("cancelTitle"),
    cancelAction: document.getElementById("cancelAction"),
    settingsDialog: document.getElementById("settingsDialog"),
    thresholdInput: document.getElementById("thresholdInput"),
    thresholdLabel: document.getElementById("thresholdLabel"),
    stampLayer: document.getElementById("stampLayer"),
    toast: document.getElementById("toast")
  };

  let state = loadState();
  let dates = createDateRange();
  let visibleDates = new Set();
  let gesture = null;
  let toastTimer = null;
  let namePersistTimer = null;
  let summaryRefreshFrame = null;
  let pendingConfirmDate = null;
  let initialScrollDone = false;
  let firebaseDatabase = null;
  let firebaseUser = null;
  let firebaseReady = false;
  let syncedState = null;

  init();

  function init() {
    els.banner.hidden = Boolean(inviteToken);
    els.title.value = state.meta.title;
    els.thresholdInput.value = Math.round(state.meta.likelyThreshold * 100);
    updateThresholdLabel();
    render();
    attachEvents();
    requestAnimationFrame(scrollTodayIntoView);
    if (inviteToken) connectFirebase();
    else setLocalOnlyStatus();
  }

  function attachEvents() {
    els.title.addEventListener("change", () => {
      state.meta.title = els.title.value.trim() || DEFAULT_TITLE;
      els.title.value = state.meta.title;
      persist("모임 이름을 저장했습니다.");
    });

    els.scroller.addEventListener("scroll", onScroll, { passive: true });
    els.grid.addEventListener("pointerdown", onPointerDown);
    els.grid.addEventListener("pointermove", onPointerMove);
    els.grid.addEventListener("pointerup", onPointerUp);
    els.grid.addEventListener("pointercancel", cancelGesture);
    els.grid.addEventListener("keydown", onGridKeyDown);
    els.grid.addEventListener("input", onGridInput);
    els.grid.addEventListener("change", onGridChange);
    els.grid.addEventListener("focusout", onGridFocusOut);
    els.grid.addEventListener("click", onGridClick);

    els.todayButton.addEventListener("click", () => {
      els.scroller.scrollTo({ left: getTodayScrollLeft(), behavior: "smooth" });
    });

    els.previousDatesButton.addEventListener("click", () => moveDates(-1));
    els.nextDatesButton.addEventListener("click", () => moveDates(1));

    els.shareButton.addEventListener("click", copyShareLink);
    els.settingsButton.addEventListener("click", () => {
      showDialog(els.settingsDialog);
    });

    els.thresholdInput.addEventListener("input", () => {
      state.meta.likelyThreshold = Number(els.thresholdInput.value) / 100;
      updateThresholdLabel();
      renderKeepScroll();
      persist();
    });

    els.confirmAction.addEventListener("click", (event) => {
      event.preventDefault();
      if (pendingConfirmDate) {
        setConfirmation(pendingConfirmDate, true);
      }
      els.confirmDialog.close();
    });

    els.cancelAction.addEventListener("click", (event) => {
      event.preventDefault();
      if (pendingConfirmDate) {
        setConfirmation(pendingConfirmDate, false);
      }
      els.cancelDialog.close();
    });

    if (channel) {
      channel.addEventListener("message", (event) => {
        if (inviteToken) return;
        if (!event.data || event.data.clientId === clientId || event.data.boardId !== boardId) return;
        state = normalizeState(event.data.state);
        renderKeepScroll();
        flashSync("동기화됨");
      });
    }

    window.addEventListener("storage", (event) => {
      if (inviteToken) return;
      if (event.key !== storageKey || !event.newValue) return;
      state = normalizeState(JSON.parse(event.newValue));
      renderKeepScroll();
      flashSync("동기화됨");
    });
  }

  function loadState() {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        return normalizeState(JSON.parse(raw));
      } catch (error) {
        console.warn("Saved calendar state was ignored.", error);
      }
    }
    return normalizeState({
      meta: {
        title: DEFAULT_TITLE,
        timezone: "Asia/Seoul",
        likelyThreshold: DEFAULT_THRESHOLD,
        confirmationPermission: "all_members",
        updatedAt: Date.now()
      },
      participants: Array.from({ length: DEFAULT_PARTICIPANTS }, (_, index) => ({
        id: createId("p"),
        name: "",
        sortOrder: index,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })),
      availability: {},
      confirmedDates: {}
    });
  }

  function normalizeState(nextState) {
    const safe = nextState || {};
    const rawParticipants = Array.isArray(safe.participants)
      ? safe.participants
      : Object.entries(safe.participants || {}).map(([id, participant]) => ({ id, ...participant }));
    return {
      meta: {
        title: safe.meta && safe.meta.title ? safe.meta.title : DEFAULT_TITLE,
        timezone: "Asia/Seoul",
        likelyThreshold: safe.meta && Number.isFinite(Number(safe.meta.likelyThreshold)) ? Number(safe.meta.likelyThreshold) : DEFAULT_THRESHOLD,
        confirmationPermission: "all_members",
        createdAt: safe.meta && safe.meta.createdAt ? safe.meta.createdAt : Date.now(),
        updatedAt: safe.meta && safe.meta.updatedAt ? safe.meta.updatedAt : Date.now()
      },
      participants: rawParticipants
        .map((participant, index) => ({
          id: participant.id || createId("p"),
          name: typeof participant.name === "string" ? participant.name : "",
          sortOrder: Number.isFinite(participant.sortOrder) ? participant.sortOrder : index,
          isActive: participant.isActive !== false,
          createdAt: participant.createdAt || Date.now(),
          updatedAt: participant.updatedAt || Date.now()
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      availability: normalizeAvailability(safe.availability),
      confirmedDates: safe.confirmedDates || {}
    };
  }

  function normalizeAvailability(availability) {
    const result = {};
    Object.entries(availability || {}).forEach(([participantId, datesByParticipant]) => {
      Object.entries(datesByParticipant || {}).forEach(([date, value]) => {
        const status = typeof value === "string" ? value : value && value.status;
        if (!STATUS_LABEL[status]) return;
        if (!result[participantId]) result[participantId] = {};
        result[participantId][date] = status;
      });
    });
    return result;
  }

  function persist(message) {
    state.meta.updatedAt = Date.now();
    localStorage.setItem(storageKey, JSON.stringify(state));
    if (firebaseReady) {
      const updates = createFirebaseUpdates(syncedState || state, state);
      if (Object.keys(updates).length) {
        update(ref(firebaseDatabase), updates).catch((error) => handleFirebaseError(error, "저장하지 못했습니다."));
      }
      if (message) showToast(message);
      return;
    }
    if (channel) {
      channel.postMessage({ clientId, boardId, state });
    }
    flashSync(message);
  }

  function flashSync(message) {
    els.status.textContent = "동기화 중";
    els.status.className = "connection syncing";
    window.setTimeout(() => {
      els.status.textContent = "연결됨";
      els.status.className = "connection connected";
    }, 260);
    if (message) showToast(message);
  }

  async function connectFirebase() {
    try {
      setConnectionStatus("연결 중", "syncing");
      const firebaseApp = initializeApp(FIREBASE_CONFIG);
      const auth = getAuth(firebaseApp);
      firebaseDatabase = getDatabase(firebaseApp);
      const credential = await signInAnonymously(auth);
      firebaseUser = credential.user;

      const inviteSnapshot = await get(ref(firebaseDatabase, `boardInvites/${inviteToken}`));
      const invite = inviteSnapshot.val();
      if (!invite || invite.active !== true || invite.boardId !== boardId) {
        throw new Error("invalid-invite");
      }

      await set(ref(firebaseDatabase, `boards/${boardId}/members/${firebaseUser.uid}`), {
        role: "editor",
        inviteToken,
        joinedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      });

      onValue(ref(firebaseDatabase, `boards/${boardId}`), (snapshot) => {
        if (!snapshot.exists()) return;
        state = normalizeState(snapshot.val());
        syncedState = cloneState(state);
        firebaseReady = true;
        els.banner.hidden = true;
        els.title.value = state.meta.title;
        els.thresholdInput.value = Math.round(state.meta.likelyThreshold * 100);
        updateThresholdLabel();
        renderKeepScroll();
        setConnectionStatus("실시간 연결됨", "connected");
      }, (error) => handleFirebaseError(error, "보드를 읽지 못했습니다."));
    } catch (error) {
      handleFirebaseError(error, "Firebase 연결에 실패했습니다.");
    }
  }

  function createFirebaseUpdates(previous, next) {
    const updates = {};
    const oldState = previous || normalizeState({});
    if (!sameJson(oldState.meta, next.meta)) {
      updates[`boards/${boardId}/meta`] = next.meta;
    }

    const oldParticipants = Object.fromEntries((oldState.participants || []).map((participant) => [participant.id, participant]));
    const nextParticipants = Object.fromEntries((next.participants || []).map((participant) => [participant.id, participant]));
    new Set([...Object.keys(oldParticipants), ...Object.keys(nextParticipants)]).forEach((participantId) => {
      if (!sameJson(oldParticipants[participantId], nextParticipants[participantId])) {
        updates[`boards/${boardId}/participants/${participantId}`] = nextParticipants[participantId] || null;
      }
    });

    const participantIds = new Set([...Object.keys(oldState.availability || {}), ...Object.keys(next.availability || {})]);
    participantIds.forEach((participantId) => {
      const oldDates = oldState.availability[participantId] || {};
      const nextDates = next.availability[participantId] || {};
      new Set([...Object.keys(oldDates), ...Object.keys(nextDates)]).forEach((date) => {
        if (oldDates[date] === nextDates[date]) return;
        updates[`boards/${boardId}/availability/${participantId}/${date}`] = nextDates[date]
          ? { status: nextDates[date], updatedAt: serverTimestamp(), updatedBy: firebaseUser.uid }
          : null;
      });
    });

    const confirmedDates = new Set([...Object.keys(oldState.confirmedDates || {}), ...Object.keys(next.confirmedDates || {})]);
    confirmedDates.forEach((date) => {
      if (!sameJson(oldState.confirmedDates[date], next.confirmedDates[date])) {
        updates[`boards/${boardId}/confirmedDates/${date}`] = next.confirmedDates[date]
          ? { ...next.confirmedDates[date], updatedAt: serverTimestamp(), updatedBy: firebaseUser.uid }
          : null;
      }
    });
    return updates;
  }

  function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function setConnectionStatus(label, mode) {
    els.status.textContent = label;
    els.status.className = `connection ${mode}`;
  }

  function setLocalOnlyStatus() {
    els.banner.hidden = false;
    els.banner.textContent = "이 보드는 이 기기 안에만 저장됩니다. Firebase 보드는 초대 링크로 열어야 합니다.";
    setConnectionStatus("이 기기만", "syncing");
  }

  function handleFirebaseError(error, message) {
    console.error("Firebase calendar error:", error);
    firebaseReady = false;
    els.banner.hidden = false;
    els.banner.textContent = error && error.message === "invalid-invite"
      ? "초대 링크가 올바르지 않거나 만료되었습니다."
      : "Firebase 연결에 실패했습니다. 익명 로그인과 데이터베이스 규칙을 확인해 주세요.";
    setConnectionStatus("연결 실패", "syncing");
    showToast(message);
  }

  function renderKeepScroll() {
    const left = els.scroller.scrollLeft;
    const top = els.scroller.scrollTop;
    render();
    els.scroller.scrollLeft = left;
    els.scroller.scrollTop = top;
  }

  function render() {
    const activeParticipants = getActiveParticipants();
    visibleDates = new Set(dates.map((date) => date.iso));
    els.grid.style.gridTemplateColumns = `var(--name-col) repeat(${dates.length}, var(--cell))`;

    const html = [];
    html.push(`<div class="name-corner"><span>${escapeHtml(getVisibleMonthLabel())}</span><small>칸 클릭마다<br />표시 변경</small></div>`);
    dates.forEach((date) => html.push(renderDateHeader(date)));

    activeParticipants.forEach((participant) => {
      html.push(renderDragRailLabel());
      dates.forEach((date) => html.push(renderDragRail(participant, date)));
      html.push(renderParticipantLabel(participant));
      dates.forEach((date) => html.push(renderScheduleCell(participant, date)));
      html.push(renderDragRailLabel());
      dates.forEach((date) => html.push(renderDragRail(participant, date)));
    });

    html.push(`<div class="summary-label">집계</div>`);
    dates.forEach((date) => html.push(renderSummaryCell(date)));

    html.push(`<div class="add-row-label"><button class="add-row" type="button" data-action="add-row">행 추가</button></div>`);
    dates.forEach(() => html.push(`<div class="blank-fill" aria-hidden="true"></div>`));

    els.grid.innerHTML = html.join("");
    updateTodayButton();
  }

  function renderDateHeader(date) {
    const classes = ["date-cell"];
    if (date.isToday) classes.push("today");
    if (date.isHoliday) classes.push("holiday");
    if (date.day === 1) classes.push("month-start");
    const monthLabel = date.day === 1 || date.isToday ? `${date.month}월` : "";
    const holidayLabel = date.holidayName ? `<span class="holiday-dot" title="${escapeHtml(date.holidayName)}"></span>` : "";
    return `
      <div class="${classes.join(" ")}" data-date="${date.iso}" role="columnheader" aria-label="${escapeHtml(date.ariaLabel)}">
        <span class="month-label">${monthLabel}</span>
        <span class="date-number">${date.day}</span>
        <span class="weekday">${date.weekday}</span>
        ${holidayLabel}
      </div>`;
  }

  function renderParticipantLabel(participant) {
    const name = escapeHtml(participant.name);
    return `
      <div class="row-label" data-participant="${participant.id}">
        <input class="name-input" data-action="rename" data-participant="${participant.id}" maxlength="12" value="${name}" placeholder="친구 이름" aria-label="참여자 이름" />
        <button class="row-menu" type="button" data-action="deactivate" data-participant="${participant.id}" aria-label="${name || "빈 행"} 삭제">×</button>
      </div>`;
  }

  function renderDragRailLabel() {
    return `<div class="drag-rail-label" aria-hidden="true">↔</div>`;
  }

  function renderDragRail(participant, date) {
    return `<div class="drag-rail" data-participant="${participant.id}" data-date="${date.iso}"
      role="presentation" aria-label="${escapeHtml(participant.name || "친구")} ${escapeHtml(date.ariaLabel)} 날짜 조정 레일"></div>`;
  }

  function renderScheduleCell(participant, date) {
    const status = getStatus(participant.id, date.iso);
    const summary = calculateSummary(date.iso);
    const classes = ["schedule-cell"];
    if (status) classes.push(`status-${status}`);
    if (date.isHoliday) classes.push("is-holiday");
    if (summary.judgement === "유력") classes.push("is-likely");
    if (summary.isConfirmed) classes.push("is-confirmed");
    if ((summary.judgement === "유력" || summary.isConfirmed) && status === "maybe") classes.push("needs-check");
    const labelStatus = status ? STATUS_LABEL[status].text : "미입력";
    const mark = status ? `<span class="status-mark">${STATUS_LABEL[status].mark}</span>` : "";
    return `
      <button class="${classes.join(" ")}" type="button" tabindex="0"
        data-participant="${participant.id}" data-date="${date.iso}" data-status="${status || ""}"
        aria-label="${escapeHtml(participant.name || "이름 없음")}, ${escapeHtml(date.ariaLabel)}, ${labelStatus}">
        ${mark}
      </button>`;
  }

  function renderSummaryCell(date) {
    const summary = calculateSummary(date.iso);
    const classes = ["summary-cell"];
    if (summary.judgement === "유력") classes.push("likely");
    if (summary.isConfirmed) classes.push("confirmed");
    const maybe = summary.maybeCount ? `<span class="maybe-count">△ ${summary.maybeCount}</span>` : "";
    const buttonAttr = summary.judgement === "유력" || summary.isConfirmed
      ? `role="button" tabindex="0" data-action="summary" aria-label="${escapeHtml(date.ariaLabel)} ${summary.judgement} 선택"`
      : `aria-label="${escapeHtml(date.ariaLabel)} ${summary.judgement}"`;
    return `
      <div class="${classes.join(" ")}" data-date="${date.iso}" ${buttonAttr}>
        <span class="summary-count">${summary.possible}/${summary.total}</span>
        <span class="summary-judgement">${summary.isConfirmed ? "확정" : summary.judgement}</span>
        ${maybe}
      </div>`;
  }

  function onGridInput(event) {
    if (event.target.dataset.action !== "rename") return;
    if (!commitParticipantName(event.target)) return;
    scheduleSummaryRefresh();
    window.clearTimeout(namePersistTimer);
    namePersistTimer = window.setTimeout(() => {
      persist();
    }, 450);
  }

  function onGridChange(event) {
    if (event.target.dataset.action !== "rename") return;
    commitParticipantName(event.target);
    window.clearTimeout(namePersistTimer);
    persist("이름을 저장했습니다.");
    renderKeepScroll();
  }

  function onGridFocusOut(event) {
    if (event.target.dataset.action !== "rename") return;
    commitParticipantName(event.target);
    window.clearTimeout(namePersistTimer);
    persist();
    renderKeepScroll();
  }

  function onGridClick(event) {
    const scheduleCell = event.target.closest(".schedule-cell");
    if (scheduleCell) {
      cycleStatus(scheduleCell.dataset.participant, scheduleCell.dataset.date);
      return;
    }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "add-row") {
      addParticipant();
    } else if (action === "deactivate") {
      deactivateParticipant(actionEl.dataset.participant);
    } else if (action === "summary") {
      openSummaryDialog(actionEl.dataset.date);
    }
  }

  function onPointerDown(event) {
    const rail = event.target.closest(".drag-rail");
    if (!rail || event.button > 0) return;
    const status = getStatus(rail.dataset.participant, rail.dataset.date);
    if (!status) {
      showToast("먼저 위 칸을 눌러 ○, × 또는 △를 고른 뒤 드래그하세요.");
      return;
    }
    event.preventDefault();
    rail.setPointerCapture(event.pointerId);
    gesture = {
      pointerId: event.pointerId,
      participantId: rail.dataset.participant,
      startDate: rail.dataset.date,
      lastDate: rail.dataset.date,
      status
    };
    if (navigator.vibrate) navigator.vibrate(10);
    updatePaintPreview();
  }

  function onPointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const rail = target && target.closest ? target.closest(".drag-rail") : null;
    if (rail && rail.dataset.participant === gesture.participantId) {
      gesture.lastDate = rail.dataset.date;
      updatePaintPreview();
    }
  }

  function onPointerUp(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = gesture;
    if (current.startDate !== current.lastDate) {
      applyPaintRange(current.participantId, current.startDate, current.lastDate, current.status);
    }
    clearPaintPreview();
    gesture = null;
  }

  function cancelGesture() {
    if (!gesture) return;
    clearPaintPreview();
    gesture = null;
  }

  function onGridKeyDown(event) {
    const cell = event.target.closest(".schedule-cell");
    if (!cell) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cycleStatus(cell.dataset.participant, cell.dataset.date);
      return;
    }
    const arrows = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 0, ArrowDown: 0 };
    if (!(event.key in arrows)) return;
    event.preventDefault();
    const participantIndex = getActiveParticipants().findIndex((item) => item.id === cell.dataset.participant);
    const dateIndex = dates.findIndex((date) => date.iso === cell.dataset.date);
    let nextParticipant = participantIndex;
    let nextDate = dateIndex;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") nextDate += arrows[event.key];
    if (event.key === "ArrowUp") nextParticipant -= 1;
    if (event.key === "ArrowDown") nextParticipant += 1;
    const participants = getActiveParticipants();
    const next = participants[nextParticipant] && dates[nextDate]
      ? els.grid.querySelector(`.schedule-cell[data-participant="${participants[nextParticipant].id}"][data-date="${dates[nextDate].iso}"]`)
      : null;
    if (next) next.focus();
  }

  function cycleStatus(participantId, date) {
    const current = getStatus(participantId, date);
    const next = STATUS_FLOW[(STATUS_FLOW.indexOf(current) + 1) % STATUS_FLOW.length];
    setStatus(participantId, date, next);
    persist("일정을 저장했습니다.");
    renderKeepScroll();
  }

  function applyPaintRange(participantId, startDate, endDate, status) {
    const range = getDateRangeBetween(startDate, endDate);
    if (range.length > RANGE_LIMIT_DAYS) {
      showToast("한 번에 180일까지만 칠할 수 있습니다.");
      return;
    }
    range.forEach((date) => setStatus(participantId, date, status));
    persist(`${range.length}일을 한 번에 저장했습니다.`);
    renderKeepScroll();
  }

  function setStatus(participantId, date, status) {
    if (!state.availability[participantId]) state.availability[participantId] = {};
    if (!status) {
      delete state.availability[participantId][date];
      return;
    }
    state.availability[participantId][date] = status;
  }

  function getStatus(participantId, date) {
    return state.availability[participantId] && state.availability[participantId][date]
      ? state.availability[participantId][date]
      : null;
  }

  function calculateSummary(date) {
    const counted = getCountedParticipants(date);
    const total = counted.length;
    let yes = 0;
    let maybe = 0;
    let responses = 0;
    counted.forEach((participant) => {
      const status = getStatus(participant.id, date);
      if (status) responses += 1;
      if (status === "yes") yes += 1;
      if (status === "maybe") maybe += 1;
    });
    const possible = yes + maybe;
    const ratio = total ? possible / total : 0;
    let judgement = "미입력";
    if (total === 0 || responses === 0) judgement = "미입력";
    else if (possible === 0) judgement = "불가";
    else if (ratio < 0.5) judgement = "낮음";
    else if (ratio < state.meta.likelyThreshold) judgement = "가능";
    else judgement = "유력";
    const confirmed = state.confirmedDates[date] && state.confirmedDates[date].isConfirmed;
    return {
      total,
      yesCount: yes,
      maybeCount: maybe,
      possible,
      ratio,
      judgement,
      isConfirmed: Boolean(confirmed)
    };
  }

  function commitParticipantName(input) {
    const participant = findParticipant(input.dataset.participant);
    if (!participant) return false;
    const nextName = input.value.trim();
    if (participant.name === nextName) return false;
    participant.name = nextName;
    participant.updatedAt = Date.now();
    return true;
  }

  function scheduleSummaryRefresh() {
    if (summaryRefreshFrame) return;
    summaryRefreshFrame = window.requestAnimationFrame(() => {
      summaryRefreshFrame = null;
      refreshSummaryDisplay();
    });
  }

  function refreshSummaryDisplay() {
    const summaries = new Map();
    dates.forEach((date) => {
      summaries.set(date.iso, calculateSummary(date.iso));
      const current = els.grid.querySelector(`.summary-cell[data-date="${date.iso}"]`);
      if (!current) return;
      const template = document.createElement("template");
      template.innerHTML = renderSummaryCell(date).trim();
      current.replaceWith(template.content.firstElementChild);
    });

    els.grid.querySelectorAll(".schedule-cell").forEach((cell) => {
      const summary = summaries.get(cell.dataset.date) || calculateSummary(cell.dataset.date);
      const status = cell.dataset.status || null;
      cell.classList.toggle("is-likely", summary.judgement === "유력");
      cell.classList.toggle("is-confirmed", summary.isConfirmed);
      cell.classList.toggle("needs-check", (summary.judgement === "유력" || summary.isConfirmed) && status === "maybe");
    });
  }

  function openSummaryDialog(date) {
    const summary = calculateSummary(date);
    pendingConfirmDate = date;
    const dateLabel = formatLongDate(date);
    const maybeNames = getCountedParticipants(date)
      .filter((participant) => getStatus(participant.id, date) === "maybe")
      .map((participant) => getParticipantLabel(participant));

    if (summary.isConfirmed) {
      els.cancelTitle.textContent = `${dateLabel} 약속 확정을 취소할까요?`;
      showDialog(els.cancelDialog);
      return;
    }

    els.confirmTitle.textContent = `${dateLabel}로 약속을 확정할까요?`;
    els.confirmSummary.textContent = `참석 가능 ${summary.possible}/${summary.total}명, 확정 가능 ○ ${summary.yesCount}명`;
    els.maybeList.textContent = maybeNames.length ? `확인 필요 △ ${maybeNames.length}명: ${maybeNames.join(", ")}` : "확인 필요 인원은 없습니다.";
    showDialog(els.confirmDialog);
  }

  function setConfirmation(date, isConfirmed) {
    const current = state.confirmedDates[date] || { revision: 0 };
    state.confirmedDates[date] = {
      isConfirmed,
      revision: current.revision + 1,
      confirmedAt: isConfirmed ? Date.now() : null,
      updatedAt: Date.now()
    };
    persist(isConfirmed ? "약속을 확정했습니다." : "확정을 취소했습니다.");
    renderKeepScroll();
    if (isConfirmed) {
      showStamp(date);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  }

  function addParticipant() {
    const activeCount = getActiveParticipants().length;
    if (activeCount >= MAX_PARTICIPANTS) {
      showToast("최대 12명까지 추가할 수 있습니다.");
      return;
    }
    const nextOrder = Math.max(-1, ...state.participants.map((item) => item.sortOrder)) + 1;
    state.participants.push({
      id: createId("p"),
      name: "",
      sortOrder: nextOrder,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    persist("참여자 행을 추가했습니다.");
    renderKeepScroll();
  }

  function deactivateParticipant(participantId) {
    const participant = findParticipant(participantId);
    if (!participant) return;
    const label = participant.name || "빈 행";
    if (!window.confirm(`'${label}' 행을 목록에서 제거할까요?\n기존 일정은 보존되며 나중에 복구할 수 있습니다.`)) return;
    participant.isActive = false;
    participant.updatedAt = Date.now();
    persist();
    renderKeepScroll();
    showUndoToast(`${label} 행을 제거했습니다.`, () => {
      participant.isActive = true;
      participant.updatedAt = Date.now();
      persist("행을 복구했습니다.");
      renderKeepScroll();
    });
  }

  function updatePaintPreview() {
    clearPaintPreview();
    if (!gesture) return;
    getDateRangeBetween(gesture.startDate, gesture.lastDate).forEach((date) => {
      const cell = els.grid.querySelector(`.schedule-cell[data-participant="${gesture.participantId}"][data-date="${date}"]`);
      if (cell) cell.classList.add("paint-preview");
    });
  }

  function clearPaintPreview() {
    els.grid.querySelectorAll(".paint-preview").forEach((cell) => cell.classList.remove("paint-preview"));
  }

  function moveDates(direction) {
    const distance = Math.max(getCellWidth() * 7, els.scroller.clientWidth - getNameWidth());
    els.scroller.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  function onScroll() {
    updateTodayButton();
    updateVisibleMonth();
  }

  function updateTodayButton() {
    const todayIndex = dates.findIndex((date) => date.isToday);
    if (todayIndex < 0) return;
    const cellWidth = getCellWidth();
    const centerIndex = Math.round((els.scroller.scrollLeft + (els.scroller.clientWidth / 2)) / cellWidth);
    els.todayButton.hidden = Math.abs(centerIndex - todayIndex) <= 60;
  }

  function getVisibleMonthLabel() {
    if (!els.scroller) return `${new Date().getMonth() + 1}월`;
    const cellWidth = getCellWidth();
    const nameWidth = getNameWidth();
    const index = Math.max(0, Math.min(dates.length - 1, Math.floor((els.scroller.scrollLeft + nameWidth + 8) / cellWidth)));
    return `${dates[index].year}년 ${dates[index].month}월`;
  }

  function updateVisibleMonth() {
    const corner = els.grid.querySelector(".name-corner span");
    if (corner) corner.textContent = getVisibleMonthLabel();
  }

  function scrollTodayIntoView() {
    if (initialScrollDone) return;
    initialScrollDone = true;
    els.scroller.scrollLeft = getTodayScrollLeft();
    updateVisibleMonth();
    updateTodayButton();
  }

  function getTodayScrollLeft() {
    const todayIndex = dates.findIndex((date) => date.isToday);
    const cellWidth = getCellWidth();
    const nameWidth = getNameWidth();
    return Math.max(0, nameWidth + todayIndex * cellWidth - (els.scroller.clientWidth - nameWidth) * 0.42);
  }

  function getCellWidth() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--cell");
    return Number.parseFloat(value) || 48;
  }

  function getNameWidth() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--name-col");
    return Number.parseFloat(value) || 96;
  }

  function createDateRange() {
    const today = startOfDay(new Date());
    const start = addDays(today, -DATE_PAST_DAYS);
    const total = DATE_PAST_DAYS + DATE_FUTURE_DAYS + 1;
    return Array.from({ length: total }, (_, index) => {
      const date = addDays(start, index);
      const iso = toIsoDate(date);
      const holidayName = HOLIDAYS[iso] || "";
      const isSunday = date.getDay() === 0;
      return {
        date,
        iso,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday: WEEKDAYS[date.getDay()],
        isToday: iso === toIsoDate(today),
        isHoliday: isSunday || Boolean(holidayName),
        holidayName: holidayName || (isSunday ? "일요일" : ""),
        ariaLabel: `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일${holidayName ? `, ${holidayName}` : ""}`
      };
    });
  }

  function getDateRangeBetween(startDate, endDate) {
    const startIndex = dates.findIndex((date) => date.iso === startDate);
    const endIndex = dates.findIndex((date) => date.iso === endDate);
    if (startIndex < 0 || endIndex < 0) return [];
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    return dates.slice(from, to + 1).map((date) => date.iso);
  }

  function formatLongDate(iso) {
    const date = parseIsoDate(iso);
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseIsoDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getActiveParticipants() {
    return state.participants.filter((participant) => participant.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function getCountedParticipants(date) {
    return getActiveParticipants().filter((participant) => {
      return participant.name.trim() || getStatus(participant.id, date);
    });
  }

  function getParticipantLabel(participant) {
    const name = participant.name.trim();
    if (name) return name;
    const index = getActiveParticipants().findIndex((item) => item.id === participant.id);
    return `친구 ${index + 1}`;
  }

  function findParticipant(id) {
    return state.participants.find((participant) => participant.id === id);
  }

  function createId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function updateThresholdLabel() {
    els.thresholdLabel.textContent = `${els.thresholdInput.value}%`;
  }

  function showDialog(dialog) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  async function copyShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("board", boardId);
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast("공유 링크를 복사했습니다.");
    } catch (error) {
      window.prompt("공유 링크", url.toString());
    }
  }

  function showStamp(date) {
    const layer = els.stampLayer;
    layer.innerHTML = "";
    const stamp = document.createElement("div");
    stamp.className = "stamp";
    stamp.style.left = "50%";
    stamp.style.top = "42%";
    stamp.innerHTML = `확정<small>${escapeHtml(formatLongDate(date))}</small>`;
    layer.appendChild(stamp);

    const colors = ["#c52222", "#287a4f", "#276d9a", "#b76b00", "#f09b2e"];
    for (let index = 0; index < 42; index += 1) {
      const confetti = document.createElement("span");
      confetti.className = "confetti";
      confetti.style.left = `${30 + Math.random() * 40}%`;
      confetti.style.top = `${24 + Math.random() * 24}%`;
      confetti.style.background = colors[index % colors.length];
      confetti.style.animationDelay = `${Math.random() * 0.35}s`;
      layer.appendChild(confetti);
    }
    window.setTimeout(() => {
      layer.innerHTML = "";
    }, 1800);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 1800);
  }

  function showUndoToast(message, onUndo) {
    window.clearTimeout(toastTimer);
    els.toast.innerHTML = `${escapeHtml(message)} <button type="button">실행 취소</button>`;
    els.toast.hidden = false;
    const button = els.toast.querySelector("button");
    button.addEventListener("click", () => {
      els.toast.hidden = true;
      onUndo();
    }, { once: true });
    toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 4200);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
