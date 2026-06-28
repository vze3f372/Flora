let scrollController = null;
let lastRenderSignature = "";
let rotationIndex = 0;
let rotationTimer = null;
let avatarCache = {};
const EVENT_TIME_REFRESH_INTERVAL_MS = 15000;

const PANEL_RENDERERS = {
  table: renderTablePanel,
  goal: renderGoalPanel,
  events: renderEventsPanel
};

async function loadJson(path) {
  try {
    const response = await fetch(path + "?cacheBust=" + Date.now());

    if (!response.ok) {
      return {
        ok: false,
        message: `Could not load ${path}`
      };
    }

    try {
      return {
        ok: true,
        data: await response.json()
      };
    } catch (error) {
      console.error(error);

      return {
        ok: false,
        message: `${path} is not valid JSON`
      };
    }
  } catch (error) {
    console.error(error);

    return {
      ok: false,
      message: `Could not load ${path}`
    };
  }
}

function getQueryValue(name, fallback) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || fallback;
}

function hasQueryValue(name) {
  const params = new URLSearchParams(window.location.search);
  return params.has(name);
}

function getQueryFlag(name) {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(name);

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function getQueryNumber(name) {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get(name));

  return Number.isFinite(value) ? value : null;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}


function normalizeAvatarName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

async function loadAvatarCache() {
  const result = await loadJson("data/avatar-cache.json");

  if (!result.ok || !isObject(result.data)) {
    avatarCache = {};
    return;
  }

  avatarCache = result.data;
}

function getAvatarEntry(name) {
  return avatarCache[normalizeAvatarName(name)] || null;
}

function avatarInitials(name) {
  const cleaned = String(name || "?").trim();

  if (!cleaned) {
    return "?";
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function renderAvatar(name, className) {
  const avatar = getAvatarEntry(name);

  if (avatar && avatar.avatarPath) {
    return `
      <span class="${className}">
        <img src="${escapeHtml(avatar.avatarPath)}" alt="" loading="lazy">
      </span>
    `;
  }

  return `<span class="${className} ${className}--fallback">${escapeHtml(avatarInitials(name))}</span>`;
}

function renderNameWithAvatar(name, wrapperClass, avatarClass, textClass) {
  const avatar = renderAvatar(name, avatarClass);

  return `
    <div class="${wrapperClass}">
      ${avatar}
      <span class="${textClass}">${escapeHtml(name)}</span>
    </div>
  `;
}


function getPanelConfig(config, type) {
  return config.panels?.[type] ?? config.leaderboards?.[type] ?? null;
}

function getRotationQueryValue() {
  const params = new URLSearchParams(window.location.search);
  return params.get("rotation");
}

function isDefaultRotationValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return normalized === "" || ["1", "true", "yes", "on"].includes(normalized);
}

function isDisabledRotationValue(value) {
  return ["0", "false", "no", "off"].includes(String(value ?? "").trim().toLowerCase());
}

function getActiveRotation(config) {
  if (!hasQueryValue("rotation")) {
    return {
      name: "default",
      rotation: config.rotation ?? null
    };
  }

  const rotationValue = getRotationQueryValue();

  if (isDisabledRotationValue(rotationValue)) {
    return {
      name: "disabled",
      rotation: null
    };
  }

  if (isDefaultRotationValue(rotationValue)) {
    return {
      name: "default",
      rotation: config.rotation ?? null
    };
  }

  const rotationName = String(rotationValue).trim();

  return {
    name: rotationName,
    rotation: config.rotations?.[rotationName] ?? null
  };
}

function getRotationEntries(rotation) {
  if (!isObject(rotation) || !Array.isArray(rotation.panels)) {
    return [];
  }

  return rotation.panels.filter(entry => (
    isObject(entry)
    && typeof entry.panel === "string"
    && entry.panel.trim()
  ));
}

function shouldUseRotation(config) {
  if (hasQueryValue("type")) {
    return false;
  }

  if (hasQueryValue("rotation")) {
    return !isDisabledRotationValue(getRotationQueryValue());
  }

  return config.rotation?.enabled === true;
}

function findRotationIndex(entries, panelName) {
  return entries.findIndex(entry => entry.panel === panelName);
}

function getRotationStartPanel(rotation) {
  return getQueryValue("start", rotation?.startPanel ?? "");
}

function normalizeRotationIndex(entries, rotation) {
  if (entries.length === 0) {
    rotationIndex = 0;
    return;
  }

  if (rotationIndex < 0 || rotationIndex >= entries.length) {
    rotationIndex = 0;
  }

  const startPanel = getRotationStartPanel(rotation);

  if (!startPanel) {
    return;
  }

  const startIndex = findRotationIndex(entries, startPanel);

  if (startIndex >= 0) {
    rotationIndex = startIndex;
  }
}

function getRotationDurationMilliseconds(entry) {
  const queryDurationSeconds = getQueryNumber("duration");

  if (queryDurationSeconds !== null && queryDurationSeconds > 0) {
    return queryDurationSeconds * 1000;
  }

  const durationSeconds = Number(entry.durationSeconds);
  const safeDurationSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : 10;

  return safeDurationSeconds * 1000;
}

function getRotationTransitionMilliseconds(rotation) {
  const transitionMilliseconds = Number(rotation?.transitionMilliseconds);

  if (!Number.isFinite(transitionMilliseconds) || transitionMilliseconds < 0) {
    return 500;
  }

  return transitionMilliseconds;
}

function getPanelShell() {
  return document.querySelector(".panel-shell") ?? document.body;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function renderPanelError(title, message) {
  const titleElement = document.getElementById("panel-title");
  const subtitleElement = document.getElementById("panel-subtitle");
  const columns = document.getElementById("table-panel-columns");
  const track = document.getElementById("table-panel-scroll-track");

  if (!titleElement || !subtitleElement || !columns || !track) {
    console.error(title, message);
    return;
  }

  titleElement.textContent = title;
  subtitleElement.textContent = message;
  columns.innerHTML = "";

  if (scrollController) {
    scrollController.reset();
  }

  track.innerHTML = `<div class="table-panel-empty">${escapeHtml(message)}</div>`;
  track.classList.add("is-static");
}

const TABLE_SORT_MODES = {
  totalViewers: ["viewers", "raids"],
  raidCount: ["raids", "viewers"],
  biggestRaid: ["biggestRaid", "viewers"],
  totalBits: ["bits", "cheers"],
  cheerCount: ["cheers", "bits"],
  biggestCheer: ["biggestCheer", "bits"],
};

function getTableSortFields(panelConfig) {
  const modeFields = TABLE_SORT_MODES[panelConfig.sortMode];

  if (Array.isArray(modeFields)) {
    return modeFields;
  }

  return [panelConfig.sortBy, panelConfig.sortThenBy].filter(Boolean);
}

function sortEntries(entries, panelConfig) {
  const sortFields = getTableSortFields(panelConfig);

  return entries.sort((a, b) => {
    for (const field of sortFields) {
      const diff = getNumber(b[1][field]) - getNumber(a[1][field]);

      if (diff !== 0) {
        return diff;
      }
    }

    return 0;
  });
}

function getColumnStyle(column) {
  const styles = [];

  if (column.align) {
    styles.push(`text-align: ${column.align}`);
  }

  if (column.width) {
    styles.push(`--column-width: ${column.width}`);
  }

  return styles.join("; ");
}

function getTableGridTemplate(panelConfig) {
  const fixedColumns = ["70px", "minmax(0, 1fr)"];
  const valueColumns = panelConfig.columns.map(column => column.width || "120px");

  return [...fixedColumns, ...valueColumns].join(" ");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateTableData(data, panelConfig) {
  if (!isObject(data)) {
    return "Panel data must be a JSON object.";
  }

  const sortFields = getTableSortFields(panelConfig);
  const columnFields = panelConfig.columns
    .map(column => column.field)
    .filter(Boolean);

  const requiredFields = [...new Set([...sortFields, ...columnFields])];

  for (const [name, stats] of Object.entries(data)) {
    if (!isObject(stats)) {
      return `${name} must contain a JSON object.`;
    }

    for (const field of requiredFields) {
      if (!(field in stats)) {
        return `${name} is missing field: ${field}`;
      }
    }

    for (const field of sortFields) {
      if (!Number.isFinite(Number(stats[field]))) {
        return `${name}.${field} must be numeric.`;
      }
    }
  }

  return null;
}

function validateGoalData(data, panelConfig) {
  if (!isObject(data)) {
    return "Panel data must be a JSON object.";
  }

  const goalKey = panelConfig.goalKey;

  if (!goalKey) {
    return "Goal panel is missing goalKey.";
  }

  const goal = data[goalKey];

  if (!isObject(goal)) {
    return `Goal data is missing key: ${goalKey}`;
  }

  if (!Number.isFinite(Number(goal.current))) {
    return `${goalKey}.current must be numeric.`;
  }

  if (!Number.isFinite(Number(goal.target))) {
    return `${goalKey}.target must be numeric.`;
  }

  if (Number(goal.target) <= 0) {
    return `${goalKey}.target must be greater than zero.`;
  }

  return null;
}

function validateEventsData(data) {
  if (!isObject(data)) {
    return "Panel data must be a JSON object.";
  }

  if (!Array.isArray(data.events)) {
    return "Panel data must contain an events array.";
  }

  for (const [index, event] of data.events.entries()) {
    if (!isObject(event)) {
      return `events[${index}] must contain a JSON object.`;
    }

    for (const field of ["type", "name", "detail", "time"]) {
      if (typeof event[field] !== "string" || !event[field].trim()) {
        return `events[${index}].${field} must not be empty.`;
      }
    }
  }

  return null;
}

function getEventTypeConfig(panelConfig, eventType) {
  const eventTypes = panelConfig.eventTypes;

  if (!isObject(eventTypes)) {
    return {};
  }

  const typeConfig = eventTypes[eventType];

  return isObject(typeConfig) ? typeConfig : {};
}

function getEventTypeLabel(panelConfig, eventType) {
  const typeConfig = getEventTypeConfig(panelConfig, eventType);

  return typeConfig.label ?? eventType;
}

function getEventTypeColor(panelConfig, eventType) {
  const typeConfig = getEventTypeConfig(panelConfig, eventType);

  return getGoalColor(typeConfig.color, DEFAULT_GOAL_PROGRESS_FILL);
}

function clampPercentage(value) {
  return Math.max(0, Math.min(value, 100));
}

const DEFAULT_GOAL_PROGRESS_FILL = "#5eead4";
const DEFAULT_GOAL_PROGRESS_EMPTY = "#16323a";

function isSafeHexColor(value) {
  return typeof value === "string"
    && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(value.trim());
}

function getGoalColor(value, fallback) {
  return isSafeHexColor(value) ? value.trim() : fallback;
}

function formatGoalNumber(value, panelConfig) {
  const format = panelConfig.numberFormat ?? "plain";

  if (format === "compact") {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }

  return String(value);
}

function getGoalStatusText(current, target, displayPercentage, panelConfig) {
  const showPercent = panelConfig.showPercent ?? true;

  if (current >= target && panelConfig.completeMessage) {
    return panelConfig.completeMessage;
  }

  if (!showPercent) {
    return "";
  }

  const percentLabel = panelConfig.percentLabel ?? "Complete";
  return `${displayPercentage}% ${percentLabel}`;
}

function renderTableColumns(panelConfig) {
  const columns = document.getElementById("table-panel-columns");
  const rankLabel = panelConfig.rankLabel ?? "Rank";
  const nameLabel = panelConfig.nameLabel ?? "Name";

  columns.innerHTML = `
    <div class="table-panel-column table-panel-column--rank">${escapeHtml(rankLabel)}</div>
    <div class="table-panel-column table-panel-column--name">${escapeHtml(nameLabel)}</div>
    ${panelConfig.columns.map(column => `
      <div class="table-panel-column table-panel-column--${escapeHtml(column.className || column.field)}" style="${getColumnStyle(column)}">
        ${escapeHtml(column.label)}
      </div>
    `).join("")}
  `;
}

function getRankClass(rank) {
  if (rank === 1) return "table-panel-row--gold";
  if (rank === 2) return "table-panel-row--silver";
  if (rank === 3) return "table-panel-row--bronze";

  return "";
}

function createTableRow(rank, name, stats, panelConfig) {
  const row = document.createElement("div");
  row.className = `table-panel-row ${getRankClass(rank)}`.trim();

  const valueCells = panelConfig.columns.map(column => {
    const value = stats[column.field] ?? 0;
    const className = column.className || column.field;

    return `<div class="table-panel-value table-panel-value--${escapeHtml(className)}" style="${getColumnStyle(column)}">${escapeHtml(value)}</div>`;
  }).join("");

  row.innerHTML = `
    <div class="table-panel-rank">${rank}.</div>
    ${renderNameWithAvatar(name, "table-panel-name", "table-panel-avatar", "table-panel-name-text")}
    ${valueCells}
  `;

  return row;
}

class ScrollController {
  constructor(track, viewport) {
    this.track = track;
    this.viewport = viewport;
  }

  reset() {
    this.track.classList.remove("is-scrolling", "is-static");

    this.track.style.removeProperty("--scroll-distance");
    this.track.style.removeProperty("--scroll-duration");
    this.track.style.removeProperty("--scroll-delay");
    this.track.style.removeProperty("--scroll-gap");

    this.track
      .querySelectorAll("[data-scroll-duplicate='true']")
      .forEach(element => element.remove());
  }

  apply(scrollConfig) {
    this.reset();

    if (!scrollConfig?.enabled) {
      this.track.classList.add("is-static");
      return;
    }

    const viewportHeight = this.viewport.clientHeight;
    const contentHeight = this.track.scrollHeight;

    if (contentHeight <= viewportHeight) {
      this.track.classList.add("is-static");
      return;
    }

    const gapPixels = scrollConfig.gapPixels ?? 20;
    const speedPixelsPerSecond = scrollConfig.speedPixelsPerSecond ?? 24;
    const startDelaySeconds = scrollConfig.startDelaySeconds ?? 1;

    const originals = Array.from(this.track.children);

    const gap = document.createElement("div");
    gap.className = "table-panel-scroll-gap";
    gap.dataset.scrollDuplicate = "true";
    gap.style.height = `${gapPixels}px`;

    const clones = originals.map(element => {
      const clone = element.cloneNode(true);
      clone.dataset.scrollDuplicate = "true";
      return clone;
    });

    this.track.appendChild(gap);
    clones.forEach(clone => this.track.appendChild(clone));

    const scrollDistance = contentHeight + gapPixels;
    const durationSeconds = Math.max(scrollDistance / speedPixelsPerSecond, 8);

    this.track.style.setProperty("--scroll-distance", `${scrollDistance}px`);
    this.track.style.setProperty("--scroll-duration", `${durationSeconds}s`);
    this.track.style.setProperty("--scroll-delay", `${startDelaySeconds}s`);
    this.track.style.setProperty("--scroll-gap", `${gapPixels}px`);

    this.track.classList.add("is-scrolling");
  }
}

function buildRenderSignature(type, panelConfig, data) {
  return JSON.stringify({
    type,
    panelConfig,
    data
  });
}

async function renderPanel(force = false, configOverride = null, typeOverride = null) {
  let config = configOverride;

  if (!config) {
    const configResult = await loadJson("config.json");

    if (!configResult.ok) {
      lastRenderSignature = "";
      renderPanelError("CONFIG ERROR", configResult.message);
      return;
    }

    config = configResult.data;
  }

  const type = typeOverride ?? getQueryValue("type", "raids");
  const panelConfig = getPanelConfig(config, type);

  if (!panelConfig) {
    lastRenderSignature = "";
    renderPanelError("UNKNOWN PANEL", `No panel configured for type: ${type}`);
    return;
  }

  const panelType = panelConfig.type ?? "table";
  const renderer = PANEL_RENDERERS[panelType];

  if (!renderer) {
    lastRenderSignature = "";
    renderPanelError("UNSUPPORTED PANEL", `Unsupported panel type: ${panelType}`);
    return;
  }

  const dataResult = await loadJson(panelConfig.dataFile);

  if (!dataResult.ok) {
    lastRenderSignature = "";
    renderPanelError("PANEL DATA ERROR", dataResult.message);
    return;
  }

  const data = dataResult.data;
  const signature = buildRenderSignature(type, panelConfig, data);

  if (!force && signature === lastRenderSignature) {
    return;
  }

  lastRenderSignature = signature;

  await loadAvatarCache();
  renderer(type, panelConfig, data);
}

function renderTablePanel(type, panelConfig, data) {
  const dataError = validateTableData(data, panelConfig);

  if (dataError) {
    renderPanelError("PANEL DATA ERROR", dataError);
    return;
  }

  document.getElementById("panel-title").textContent = panelConfig.title;
  document.getElementById("panel-subtitle").textContent = panelConfig.subtitle;

  const gridTemplate = getTableGridTemplate(panelConfig);
  const columns = document.getElementById("table-panel-columns");

  columns.style.setProperty("--panel-grid-template", gridTemplate);
  renderTableColumns(panelConfig);

  const viewport = document.getElementById("table-panel-rows");
  const track = document.getElementById("table-panel-scroll-track");

  track.style.setProperty("--panel-grid-template", gridTemplate);

  if (!scrollController) {
    scrollController = new ScrollController(track, viewport);
  }

  scrollController.reset();
  track.innerHTML = "";

  const entries = sortEntries(Object.entries(data), panelConfig);
  const maxRows = panelConfig.maxRows ?? 10;

  if (entries.length === 0) {
    const emptyMessage = panelConfig.emptyMessage ?? "No entries yet";
    track.innerHTML = `<div class="table-panel-empty">${escapeHtml(emptyMessage)}</div>`;
    track.classList.add("is-static");
    return;
  }

  entries.slice(0, maxRows).forEach(([name, stats], index) => {
    track.appendChild(createTableRow(index + 1, name, stats, panelConfig));
  });

  requestAnimationFrame(() => {
    scrollController.apply(panelConfig.scroll);
  });
}


function parseEventTimestamp(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatRelativeEventTime(date, now = new Date()) {
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays === 1) {
    return "Yesterday";
  }

  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(event) {
  const createdAt = parseEventTimestamp(event.createdAt);

  if (createdAt) {
    return formatRelativeEventTime(createdAt);
  }

  return event.time || "";
}

function setEventTimeText(element, nextText) {
  if (element.textContent === nextText) {
    return;
  }

  element.textContent = nextText;
}

function refreshEventTimes() {
  const timeElements = document.querySelectorAll(".events-panel-time");

  for (const element of timeElements) {
    const createdAt = parseEventTimestamp(element.dataset.createdAt);
    const nextText = createdAt
      ? formatRelativeEventTime(createdAt)
      : element.dataset.fallbackTime || "";

    setEventTimeText(element, nextText);
  }
}

window.setInterval(refreshEventTimes, EVENT_TIME_REFRESH_INTERVAL_MS);

function renderEventsPanel(type, panelConfig, data) {
  const dataError = validateEventsData(data);

  if (dataError) {
    renderPanelError("PANEL DATA ERROR", dataError);
    return;
  }

  document.getElementById("panel-title").textContent = panelConfig.title;
  document.getElementById("panel-subtitle").textContent = panelConfig.subtitle;

  const columns = document.getElementById("table-panel-columns");
  const track = document.getElementById("table-panel-scroll-track");

  columns.innerHTML = "";

  if (scrollController) {
    scrollController.reset();
  }

  track.innerHTML = "";

  const maxEvents = panelConfig.maxEvents ?? 8;
  const events = data.events.slice(0, maxEvents);

  if (events.length === 0) {
    const emptyMessage = panelConfig.emptyMessage ?? "No recent events yet";
    track.innerHTML = `<div class="table-panel-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  track.innerHTML = events.map(event => {
    const eventLabel = getEventTypeLabel(panelConfig, event.type);
    const eventColor = getEventTypeColor(panelConfig, event.type);

    return `
      <article class="events-panel-row">
        <div class="events-panel-type" style="--event-type-color: ${escapeHtml(eventColor)}">${escapeHtml(eventLabel)}</div>
        ${renderNameWithAvatar(event.name, "events-panel-name", "events-panel-avatar", "events-panel-name-text")}
        <div class="events-panel-detail">${escapeHtml(event.detail)}</div>
        <div class="events-panel-time" data-created-at="${escapeHtml(event.createdAt || "")}" data-fallback-time="${escapeHtml(event.time || "")}">${escapeHtml(formatEventTime(event))}</div>
      </article>
    `;
  }).join("");

  track.classList.add("is-static");
}

function renderGoalPanel(type, panelConfig, data) {
  const dataError = validateGoalData(data, panelConfig);

  if (dataError) {
    renderPanelError("PANEL DATA ERROR", dataError);
    return;
  }

  const goal = data[panelConfig.goalKey];
  const current = Number(goal.current);
  const target = Number(goal.target);
  const rawPercentage = (current / target) * 100;
  const displayPercentage = Math.round(rawPercentage);
  const barPercentage = clampPercentage(rawPercentage);

  const currentLabel = panelConfig.currentLabel ?? "Current";
  const targetLabel = panelConfig.targetLabel ?? "Target";
  const percentLabel = panelConfig.percentLabel ?? "Complete";
  const statusText = getGoalStatusText(current, target, displayPercentage, panelConfig);
  const progressFill = getGoalColor(panelConfig.progressFill, DEFAULT_GOAL_PROGRESS_FILL);
  const progressEmpty = getGoalColor(panelConfig.progressEmpty, DEFAULT_GOAL_PROGRESS_EMPTY);
  const progressStyle = [
    `--goal-progress: ${barPercentage}%`,
    `--goal-fill: var(--accent-primary, #38bdf8)`,
    `--goal-empty: ${progressEmpty}`
  ].join("; ");

  document.getElementById("panel-title").textContent = panelConfig.title;
  document.getElementById("panel-subtitle").textContent = panelConfig.subtitle;

  const columns = document.getElementById("table-panel-columns");
  const track = document.getElementById("table-panel-scroll-track");

  columns.innerHTML = "";

  if (scrollController) {
    scrollController.reset();
  }

  track.classList.add("is-static");
  track.innerHTML = `
    <section class="goal-panel" aria-label="${escapeHtml(panelConfig.title)}">
      <div class="goal-panel-values">
        <div class="goal-panel-value">
          <span class="goal-panel-label">${escapeHtml(currentLabel)}</span>
          <strong class="goal-panel-number">${escapeHtml(formatGoalNumber(current, panelConfig))}</strong>
        </div>
        <div class="goal-panel-value">
          <span class="goal-panel-label">${escapeHtml(targetLabel)}</span>
          <strong class="goal-panel-number">${escapeHtml(formatGoalNumber(target, panelConfig))}</strong>
        </div>
      </div>

      <div class="goal-panel-progress" aria-label="${escapeHtml(percentLabel)}" style="${escapeHtml(progressStyle)}"></div>

      ${statusText ? `
        <div class="goal-panel-percent">
          ${escapeHtml(statusText)}
        </div>
      ` : ""}
    </section>
  `;
}

function getRotationDebugEnabled() {
  return getQueryFlag("debug");
}

function getOrCreateRotationDebug() {
  let debug = document.getElementById("rotation-debug");

  if (!debug) {
    debug = document.createElement("div");
    debug.id = "rotation-debug";
    debug.className = "rotation-debug";
    document.body.appendChild(debug);
  }

  return debug;
}

function updateRotationDebug(result) {
  const existingDebug = document.getElementById("rotation-debug");

  if (!getRotationDebugEnabled()) {
    if (existingDebug) {
      existingDebug.remove();
    }

    return;
  }

  const debug = getOrCreateRotationDebug();

  if (!result || !result.entry || !result.entries) {
    debug.textContent = "rotation: unavailable";
    return;
  }

  const panelNumber = result.index + 1;
  const panelTotal = result.entries.length;
  const durationSeconds = getRotationDurationMilliseconds(result.entry) / 1000;
  const rotationName = result.rotationName && result.rotationName !== "default"
    ? `${result.rotationName} `
    : "";

  debug.textContent = `rotation ${rotationName}${panelNumber}/${panelTotal}: ${result.entry.panel} · ${durationSeconds}s`;
}

async function renderRotationPanel(force = false, applyStartPanel = false) {
  const configResult = await loadJson("config.json");

  if (!configResult.ok) {
    lastRenderSignature = "";
    renderPanelError("CONFIG ERROR", configResult.message);
    return null;
  }

  const config = configResult.data;
  const activeRotation = getActiveRotation(config);
  const rotation = activeRotation.rotation;
  const entries = getRotationEntries(rotation);

  if (!isObject(rotation)) {
    lastRenderSignature = "";
    renderPanelError("ROTATION ERROR", `Rotation group not found: ${activeRotation.name}`);
    return null;
  }

  if (entries.length === 0) {
    lastRenderSignature = "";
    renderPanelError("ROTATION ERROR", "No rotation panels configured.");
    return null;
  }

  if (applyStartPanel) {
    normalizeRotationIndex(entries, rotation);
  } else if (rotationIndex < 0 || rotationIndex >= entries.length) {
    rotationIndex = 0;
  }

  const entry = entries[rotationIndex];
  const panelName = entry.panel;

  await renderPanel(force, config, panelName);

  return {
    config,
    rotation,
    rotationName: activeRotation.name,
    entries,
    entry,
    index: rotationIndex
  };
}

async function transitionToNextRotationPanel(result) {
  const shell = getPanelShell();
  const transitionMilliseconds = getRotationTransitionMilliseconds(result.rotation);

  if (transitionMilliseconds > 0) {
    shell.classList.add("is-rotating-out");
    await wait(transitionMilliseconds);
  }

  rotationIndex = (rotationIndex + 1) % result.entries.length;

  const nextResult = await renderRotationPanel(true, false);

  if (transitionMilliseconds > 0) {
    requestAnimationFrame(() => {
      shell.classList.remove("is-rotating-out");
    });
  }

  scheduleRotation(nextResult);
}

function scheduleRotation(result) {
  if (rotationTimer) {
    clearTimeout(rotationTimer);
  }

  updateRotationDebug(result);

  if (!result || !result.entries.length) {
    return;
  }

  rotationTimer = setTimeout(() => {
    transitionToNextRotationPanel(result);
  }, getRotationDurationMilliseconds(result.entry));
}

async function start() {
  const configResult = await loadJson("config.json");

  if (!configResult.ok) {
    renderPanelError("CONFIG ERROR", configResult.message);
    setInterval(() => renderPanel(false), 5000);
    return;
  }

  const config = configResult.data;
  const refreshSeconds = config.refreshSeconds ?? 5;

  if (shouldUseRotation(config)) {
    const result = await renderRotationPanel(true, true);
    scheduleRotation(result);

    if (refreshSeconds > 0) {
      setInterval(() => renderRotationPanel(false), refreshSeconds * 1000);
    }

    return;
  }

  await renderPanel(true, config);

  if (refreshSeconds > 0) {
    setInterval(() => renderPanel(false), refreshSeconds * 1000);
  }
}

start();
