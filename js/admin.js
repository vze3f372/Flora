const DEFAULT_STYLE = {
  colors: {
    background: "#0f172a",
    backgroundAlt: "#0b1f33",
    panel: "#111827",
    panelAlt: "#182235",
    text: "#f8fafc",
    muted: "#94a3b8",
    accent: "#38bdf8",
    border: "#293548",
    success: "#22c55e",
    error: "#fb7185",
  },
};

const DEFAULT_ROTATION = {
  enabled: false,
  panels: [
    { panel: "raids", durationSeconds: 10 },
    { panel: "bits", durationSeconds: 10 },
    { panel: "follower-goal", durationSeconds: 12 },
    { panel: "sub-goal", durationSeconds: 12 },
    { panel: "recent-events", durationSeconds: 10 },
  ],
  transitionMilliseconds: 500,
  startPanel: "bits",
};

const DEFAULT_EVENT_THEME = {
  raid: {
    label: "RAID",
    color: "#5eead4",
  },
  bits: {
    label: "BITS",
    color: "#67e8f9",
  },
  follow: {
    label: "FOLLOW",
    color: "#86efac",
  },
  sub: {
    label: "SUB",
    color: "#f0abfc",
  },
  goal: {
    label: "GOAL",
    color: "#a78bfa",
  },
};

let availablePanels = {};
let currentRotation = DEFAULT_ROTATION;
let currentEventTheme = DEFAULT_EVENT_THEME;

const statusElement = document.getElementById("status");
const reloadButton = document.getElementById("reload-button");
const goalsForm = document.getElementById("goals-form");
const styleForm = document.getElementById("style-form");
const resetStyleButton = document.getElementById("reset-style-button");
const rotationForm = document.getElementById("rotation-form");
const resetRotationButton = document.getElementById("reset-rotation-button");
const reloadBackupsButton = document.getElementById("reload-backups-button");
const restoreConfigBackupButton = document.getElementById("restore-config-backup-button");
const restoreGoalsBackupButton = document.getElementById("restore-goals-backup-button");
const configBackupStatus = document.getElementById("config-backup-status");
const goalsBackupStatus = document.getElementById("goals-backup-status");
const configBackupSelect = document.getElementById("config-backup-select");
const goalsBackupSelect = document.getElementById("goals-backup-select");
const configBackupTag = document.getElementById("config-backup-tag");
const goalsBackupTag = document.getElementById("goals-backup-tag");
const configBackupNote = document.getElementById("config-backup-note");
const goalsBackupNote = document.getElementById("goals-backup-note");
const tagConfigBackupButton = document.getElementById("tag-config-backup-button");
const tagGoalsBackupButton = document.getElementById("tag-goals-backup-button");
const workingBackupTag = document.getElementById("working-backup-tag");
const workingBackupNote = document.getElementById("working-backup-note");
const markWorkingBackupButton = document.getElementById("mark-working-backup-button");

const copyRotationUrlButton = document.getElementById("copy-rotation-url-button");
const openRotationPreviewButton = document.getElementById("open-rotation-preview-button");
const rotationPanelList = document.getElementById("rotation-panel-list");
const eventThemeForm = document.getElementById("event-theme-form");
const resetEventThemeButton = document.getElementById("reset-event-theme-button");
const eventThemeList = document.getElementById("event-theme-list");

const fields = {
  followersCurrent: document.getElementById("followers-current"),
  followersTarget: document.getElementById("followers-target"),
  subscribersCurrent: document.getElementById("subscribers-current"),
  subscribersTarget: document.getElementById("subscribers-target"),
};

const styleFields = {
  background: document.getElementById("style-background"),
  backgroundAlt: document.getElementById("style-background-alt"),
  panel: document.getElementById("style-panel"),
  panelAlt: document.getElementById("style-panel-alt"),
  text: document.getElementById("style-text"),
  muted: document.getElementById("style-muted"),
  accent: document.getElementById("style-accent"),
  border: document.getElementById("style-border"),
  success: document.getElementById("style-success"),
  error: document.getElementById("style-error"),
};

const rotationFields = {
  enabled: document.getElementById("rotation-enabled"),
  sequenceMode: document.getElementById("rotation-sequence-mode"),
  transitionMilliseconds: document.getElementById("rotation-transition"),
  rotationUrl: document.getElementById("rotation-url"),
};

const obsUrls = [
  ["/panel.html?type=raids", "Raids"],
  ["/panel.html?type=bits", "Bits"],
  ["/panel.html?type=sub-months-total", "Top subs"],
  ["/panel.html?type=sub-months-streak", "Sub streaks"],
  ["/panel.html?type=gift-subs", "Gift subs"],
  ["/panel.html?type=follower-goal", "Follower goal"],
  ["/panel.html?type=sub-goal", "Sub goal"],
  ["/panel.html?type=recent-events", "Recent activity"],
  ["/panel.html?rotation=true&duration=3", "Rotation"],
];

const streamerbotUrls = [
  ["/api/raid?name=%userName%&viewers=%viewers%", "Raid"],
  ["/api/bits?name=%userName%&bits=%bits%&cheers=1", "Cheer / bits"],
  ["/api/follow?name=%userName%&updateGoal=true", "Follow + goal"],
  ["/api/sub?name=%userName%&updateGoal=true", "Sub + goal"],
  ["/api/sub?name=%userName%&totalMonths=%badgeCount%&streakMonths=%monthsSubscribed%&tier=%tier%&isPrimeSub=%isPrimeSub%&avatarUrl=%targetUserProfileImageUrlEscaped%", "Sub leaderboard"],
  ["/api/gift-sub?name=%userName%&recipient=%recipientUserName%&giftCount=1&totalGifted=%totalSubsGifted%&tier=%tier%&anonymous=%anonymous%&monthsGifted=%monthsGifted%&avatarUrl=%targetUserProfileImageUrlEscaped%", "Gift sub leaderboard"],
  ["/api/streaks/attendance/check-in?name=%userName%&streamId=%date:yyyy-MM-dd%", "Flora attendance streaks"],
  ["/api/streaks/twitch/watch-streak?name=%userName%&watchStreak=%watchStreak%&watchStreakId=%watchStreakId%&message=%systemMessage%", "Twitch watch streaks"],
];

function absoluteUrl(path) {
  return `${window.location.origin}${path}`;
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }

  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `POST ${url} failed with ${response.status}`);
  }

  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, kind = "muted") {
  statusElement.textContent = message;
  statusElement.className = `status status-${kind}`;
}

function numberValue(input) {
  const value = Number(input.value);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Goal values must be non-negative whole numbers.");
  }

  return value;
}

function populateGoals(goals) {
  if (!goals.followers || !goals.subscribers) {
    throw new Error("Expected followers and subscribers goal entries.");
  }

  fields.followersCurrent.value = goals.followers.current ?? 0;
  fields.followersTarget.value = goals.followers.target ?? 0;
  fields.subscribersCurrent.value = goals.subscribers.current ?? 0;
  fields.subscribersTarget.value = goals.subscribers.target ?? 0;
}

function normalizeColor(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function populateStyle(style) {
  const colors = style?.colors || {};

  for (const [key, input] of Object.entries(styleFields)) {
    input.value = normalizeColor(colors[key], DEFAULT_STYLE.colors[key]);
  }
}

function collectStyle() {
  const colors = {};

  for (const [key, input] of Object.entries(styleFields)) {
    colors[key] = normalizeColor(input.value, DEFAULT_STYLE.colors[key]);
  }

  return { colors };
}


function positiveNumberValue(input, label) {
  const value = Number(input.value);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }

  return value;
}

function nonNegativeIntegerValue(input, label) {
  const value = Number(input.value);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }

  return value;
}

function panelTitle(panelKey) {
  const panel = availablePanels[panelKey];

  if (panel && typeof panel === "object" && typeof panel.title === "string") {
    return panel.title;
  }

  return panelKey;
}

function normalizeRotationSequenceMode(value) {
  return String(value || "manual").trim().toLowerCase() === "grouped"
    ? "grouped"
    : "manual";
}

function rotationEntryMap(rotation) {
  const map = new Map();

  for (const entry of rotation?.panels || []) {
    if (entry && typeof entry.panel === "string") {
      map.set(entry.panel, entry);
    }
  }

  return map;
}

function orderedRotationPanelKeys(rotation, panels) {
  const availableKeys = Object.keys(panels || {});
  const ordered = [];

  for (const entry of rotation?.panels || []) {
    if (
      entry
      && typeof entry.panel === "string"
      && availableKeys.includes(entry.panel)
      && !ordered.includes(entry.panel)
    ) {
      ordered.push(entry.panel);
    }
  }

  for (const panelKey of availableKeys) {
    if (!ordered.includes(panelKey)) {
      ordered.push(panelKey);
    }
  }

  return ordered;
}

function addRotationOrderControls(row) {
  const controls = document.createElement("div");
  controls.className = "rotation-order-controls";

  const upButton = document.createElement("button");
  upButton.type = "button";
  upButton.className = "secondary-button rotation-move-up";
  upButton.textContent = "↑";
  upButton.title = "Move panel up";

  const downButton = document.createElement("button");
  downButton.type = "button";
  downButton.className = "secondary-button rotation-move-down";
  downButton.textContent = "↓";
  downButton.title = "Move panel down";

  controls.append(upButton, downButton);
  row.append(controls);
}

function moveRotationPanelRow(button, direction) {
  const row = button.closest(".rotation-panel-row");

  if (!row || !row.parentElement) {
    return;
  }

  if (direction === "up" && row.previousElementSibling) {
    row.parentElement.insertBefore(row, row.previousElementSibling);
  }

  if (direction === "down" && row.nextElementSibling) {
    row.parentElement.insertBefore(row.nextElementSibling, row);
  }
}

function rotationDefaultDuration(panelKey, rotation) {
  const entry = rotationEntryMap(rotation).get(panelKey);

  if (entry && Number.isFinite(Number(entry.durationSeconds)) && Number(entry.durationSeconds) > 0) {
    return Number(entry.durationSeconds);
  }

  return 10;
}

function normalizeRotation(rotation) {
  const source = rotation && typeof rotation === "object" ? rotation : DEFAULT_ROTATION;
  const entries = Array.isArray(source.panels) ? source.panels : DEFAULT_ROTATION.panels;

  return {
    enabled: source.enabled === true,
    sequenceMode: normalizeRotationSequenceMode(source.sequenceMode),
    panels: entries
      .filter((entry) => entry && typeof entry.panel === "string")
      .map((entry) => ({
        panel: entry.panel,
        durationSeconds: Number(entry.durationSeconds) > 0 ? Number(entry.durationSeconds) : 10,
      })),
    transitionMilliseconds: Number.isInteger(Number(source.transitionMilliseconds))
      && Number(source.transitionMilliseconds) >= 0
      ? Number(source.transitionMilliseconds)
      : DEFAULT_ROTATION.transitionMilliseconds,
    startPanel: typeof source.startPanel === "string"
      ? source.startPanel
      : DEFAULT_ROTATION.startPanel,
  };
}

function populateRotationPanelList(rotation) {
  rotationPanelList.replaceChildren();

  const entryMap = rotationEntryMap(rotation);
  const panelKeys = orderedRotationPanelKeys(rotation, availablePanels);

  for (const panelKey of panelKeys) {
    const row = document.createElement("div");
    row.className = "rotation-panel-row";
    row.dataset.panel = panelKey;

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox-label rotation-panel-checkbox";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "rotation-panel-enabled";
    checkbox.checked = entryMap.has(panelKey);

    const labelText = document.createElement("span");
    labelText.textContent = `${panelTitle(panelKey)} (${panelKey})`;

    checkboxLabel.append(checkbox, labelText);

    const durationLabel = document.createElement("label");
    durationLabel.className = "rotation-duration-label";

    const durationText = document.createElement("span");
    durationText.textContent = "Duration seconds";

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "1";
    durationInput.step = "1";
    durationInput.className = "rotation-panel-duration";
    durationInput.value = rotationDefaultDuration(panelKey, rotation);

    durationLabel.append(durationText, durationInput);
    row.append(checkboxLabel, durationLabel);
    addRotationOrderControls(row);
    rotationPanelList.append(row);
  }
}

function updateRotationUrl() {
  const params = new URLSearchParams();
  params.set("rotation", "true");
  rotationFields.rotationUrl.value = `${window.location.origin}/panel.html?${params.toString()}`;
}

function populateRotation(rotation) {
  currentRotation = normalizeRotation(rotation);
  rotationFields.enabled.checked = currentRotation.enabled;
  rotationFields.sequenceMode.value = currentRotation.sequenceMode;
  rotationFields.transitionMilliseconds.value = currentRotation.transitionMilliseconds;
  populateRotationPanelList(currentRotation);
  updateRotationUrl();
}

function collectRotation() {
  const rows = [...rotationPanelList.querySelectorAll(".rotation-panel-row")];
  const panels = [];

  for (const row of rows) {
    const panel = row.dataset.panel;
    const enabled = row.querySelector(".rotation-panel-enabled").checked;
    const durationInput = row.querySelector(".rotation-panel-duration");

    if (!enabled) {
      continue;
    }

    panels.push({
      panel,
      durationSeconds: positiveNumberValue(durationInput, `${panel} durationSeconds`),
    });
  }

  if (panels.length === 0) {
    throw new Error("Rotation must include at least one panel.");
  }

  return {
    enabled: rotationFields.enabled.checked,
    sequenceMode: normalizeRotationSequenceMode(rotationFields.sequenceMode.value),
    panels,
    transitionMilliseconds: nonNegativeIntegerValue(
      rotationFields.transitionMilliseconds,
      "transitionMilliseconds",
    ),
    startPanel: panels[0].panel,
  };
}

async function saveRotation(event) {
  event.preventDefault();

  try {
    const rotation = collectRotation();

    const response = await fetchJson("/api/admin/rotation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rotation }),
    });

    populateRotation(response.rotation);
    setStatus("Rotation saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function resetRotationDefaults() {
  try {
    const response = await fetchJson("/api/admin/rotation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rotation: DEFAULT_ROTATION }),
    });

    populateRotation(response.rotation);
    setStatus("Rotation defaults restored.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function copyRotationUrl() {
  await navigator.clipboard.writeText(rotationFields.rotationUrl.value);
  setStatus("Copied Rotation URL.", "success");
}

function openRotationPreview() {
  window.open(rotationFields.rotationUrl.value, "_blank", "noopener,noreferrer");
  setStatus("Opened Rotation preview.", "success");
}


function normalizeEventTheme(eventTheme) {
  const source = eventTheme && typeof eventTheme === "object"
    ? eventTheme
    : DEFAULT_EVENT_THEME;

  const normalized = {};

  for (const [eventType, config] of Object.entries(source)) {
    if (!config || typeof config !== "object") {
      continue;
    }

    normalized[eventType] = {
      label: typeof config.label === "string" && config.label.trim()
        ? config.label.trim()
        : eventType.toUpperCase(),
      color: normalizeColor(config.color, DEFAULT_STYLE.colors.accent),
    };
  }

  return normalized;
}

function eventThemeSortOrder(eventType) {
  const order = ["raid", "bits", "follow", "sub", "goal", "custom"];
  const index = order.indexOf(eventType);

  return index === -1 ? order.length : index;
}

function populateEventTheme(eventTheme) {
  currentEventTheme = normalizeEventTheme(eventTheme);
  eventThemeList.replaceChildren();

  const entries = Object.entries(currentEventTheme)
    .sort(([left], [right]) => {
      const leftOrder = eventThemeSortOrder(left);
      const rightOrder = eventThemeSortOrder(right);

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.localeCompare(right);
    });

  for (const [eventType, config] of entries) {
    const row = document.createElement("div");
    row.className = "event-theme-row";
    row.dataset.eventType = eventType;

    const typeLabel = document.createElement("div");
    typeLabel.className = "event-theme-type";
    typeLabel.textContent = eventType;

    const labelInputWrapper = document.createElement("label");
    labelInputWrapper.className = "event-theme-label-control";

    const labelText = document.createElement("span");
    labelText.textContent = "Label";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "event-theme-label";
    labelInput.required = true;
    labelInput.value = config.label;

    labelInputWrapper.append(labelText, labelInput);

    const colorInputWrapper = document.createElement("label");
    colorInputWrapper.className = "event-theme-color-control";

    const colorText = document.createElement("span");
    colorText.textContent = "Color";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "event-theme-color";
    colorInput.required = true;
    colorInput.value = normalizeColor(config.color, DEFAULT_STYLE.colors.accent);

    colorInputWrapper.append(colorText, colorInput);

    const preview = document.createElement("div");
    preview.className = "event-theme-preview";
    preview.textContent = config.label;
    preview.style.setProperty("--event-preview-color", colorInput.value);

    labelInput.addEventListener("input", () => {
      preview.textContent = labelInput.value || eventType.toUpperCase();
    });

    colorInput.addEventListener("input", () => {
      preview.style.setProperty("--event-preview-color", colorInput.value);
    });

    row.append(typeLabel, labelInputWrapper, colorInputWrapper, preview);
    eventThemeList.append(row);
  }
}

function collectEventTheme() {
  const rows = [...eventThemeList.querySelectorAll(".event-theme-row")];
  const eventTypes = {};

  for (const row of rows) {
    const eventType = row.dataset.eventType;
    const labelInput = row.querySelector(".event-theme-label");
    const colorInput = row.querySelector(".event-theme-color");
    const label = labelInput.value.trim();

    if (!label) {
      throw new Error(`${eventType} label must not be empty.`);
    }

    eventTypes[eventType] = {
      label,
      color: normalizeColor(colorInput.value, DEFAULT_STYLE.colors.accent),
    };
  }

  if (Object.keys(eventTypes).length === 0) {
    throw new Error("Event theme must contain at least one event type.");
  }

  return eventTypes;
}

async function saveEventTheme(event) {
  event.preventDefault();

  try {
    const response = await fetchJson("/api/admin/event-theme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventTypes: collectEventTheme() }),
    });

    populateEventTheme(response.eventTypes);
    setStatus("Event theme saved. Refresh the recent activity panel to see the latest colors.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function resetEventThemeDefaults() {
  try {
    const response = await fetchJson("/api/admin/event-theme", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventTypes: DEFAULT_EVENT_THEME }),
    });

    populateEventTheme(response.eventTypes);
    setStatus("Event theme defaults restored.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}


async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function loadAdminData() {
  setStatus("Loading admin data...", "muted");

  const [config, goals, rotationData, eventThemeData] = await Promise.all([
    fetchJson("/api/admin/config"),
    fetchJson("/api/admin/goals"),
    fetchJson("/api/admin/rotation"),
    fetchJson("/api/admin/event-theme"),
  ]);

  availablePanels = rotationData.panels || config.panels || {};
  populateGoals(goals);
  populateStyle(config.style || DEFAULT_STYLE);
  populateRotation(rotationData.rotation || config.rotation || DEFAULT_ROTATION);
  populateEventTheme(eventThemeData.eventTypes || DEFAULT_EVENT_THEME);

  const panelCount = config.panels && typeof config.panels === "object"
    ? Object.keys(config.panels).length
    : "unknown";

  setStatus(`Connected. Loaded config.json and data/goals.json. Panel count: ${panelCount}.`, "success");
}

async function saveGoals(event) {
  event.preventDefault();

  try {
    const payload = {
      goals: {
        followers: {
          current: numberValue(fields.followersCurrent),
          target: numberValue(fields.followersTarget),
        },
        subscribers: {
          current: numberValue(fields.subscribersCurrent),
          target: numberValue(fields.subscribersTarget),
        },
      },
    };

    await fetchJson("/api/admin/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setStatus("Goals saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function saveStyle(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/admin/style", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ style: collectStyle() }),
    });

    setStatus("Style saved. Refresh OBS browser sources to see the latest panel styling.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function resetStyleDefaults() {
  populateStyle(DEFAULT_STYLE);

  try {
    await fetchJson("/api/admin/style", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ style: DEFAULT_STYLE }),
    });

    setStatus("Style defaults restored.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}


const backupState = {
  config: null,
  goals: null,
};

function formatBackupTime(value) {
  if (!value) {
    return "unknown time";
  }

  return new Date(value * 1000).toLocaleString();
}

function backupElements(target) {
  if (target === "config") {
    return {
      status: configBackupStatus,
      select: configBackupSelect,
      restoreButton: restoreConfigBackupButton,
      tagButton: tagConfigBackupButton,
      tagInput: configBackupTag,
      noteInput: configBackupNote,
    };
  }

  return {
    status: goalsBackupStatus,
    select: goalsBackupSelect,
    restoreButton: restoreGoalsBackupButton,
    tagButton: tagGoalsBackupButton,
    tagInput: goalsBackupTag,
    noteInput: goalsBackupNote,
  };
}

function backupItemLabel(item) {
  const time = formatBackupTime(item.modified);
  const tag = item.tag ? ` [${item.tag}]` : "";
  const note = item.note ? ` — ${item.note}` : "";

  return `${time}${tag}${note}`;
}

function selectedBackupItem(target) {
  const elements = backupElements(target);
  const info = backupState[target];

  if (!info || !Array.isArray(info.items)) {
    return null;
  }

  return info.items.find((item) => item.path === elements.select.value) || null;
}

function syncBackupTagFields(target) {
  const elements = backupElements(target);
  const item = selectedBackupItem(target);

  if (!item) {
    elements.tagInput.value = "";
    elements.noteInput.value = "";
    return;
  }

  elements.tagInput.value = item.tag || "";
  elements.noteInput.value = item.note || "";
}

function backupItemsFromInfo(info) {
  if (Array.isArray(info?.items)) {
    return info.items;
  }

  if (info?.available && info.path) {
    return [
      {
        target: info.target,
        label: info.label,
        path: info.path,
        modified: info.modified,
        sizeBytes: info.sizeBytes,
        tag: info.tag || "",
        note: info.note || "",
      },
    ];
  }

  return [];
}

function renderBackupStatus(target, info) {
  const elements = backupElements(target);
  const items = backupItemsFromInfo(info);

  backupState[target] = info || null;
  elements.select.replaceChildren();

  if (!items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No backups available";
    elements.select.append(option);

    elements.status.textContent = "No backup available yet.";
    elements.restoreButton.disabled = true;
    elements.tagButton.disabled = true;
    syncBackupTagFields(target);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.path;
    option.textContent = backupItemLabel(item);
    elements.select.append(option);
  }

  const latest = items[0];
  elements.status.textContent = `Latest: ${latest.path}`;
  elements.restoreButton.disabled = false;
  elements.tagButton.disabled = false;
  syncBackupTagFields(target);
}

async function loadBackups() {
  try {
    const data = await getJson("/api/admin/backups");

    if (!data.backups) {
      throw new Error("Backup response did not include backups.");
    }

    renderBackupStatus("config", data.backups.config);
    renderBackupStatus("goals", data.backups.goals);
  } catch (error) {
    configBackupStatus.textContent = `Could not load backup status: ${error.message}`;
    goalsBackupStatus.textContent = `Could not load backup status: ${error.message}`;
    restoreConfigBackupButton.disabled = true;
    restoreGoalsBackupButton.disabled = true;
    tagConfigBackupButton.disabled = true;
    tagGoalsBackupButton.disabled = true;
    setStatus(`Could not load backup status: ${error.message}`, "error");
  }
}

async function restoreBackup(target) {
  const elements = backupElements(target);
  const item = selectedBackupItem(target);
  const label = target === "config" ? "config.json" : "data/goals.json";

  if (!item) {
    setStatus(`No ${label} backup is selected.`, "error");
    return;
  }

  const confirmed = window.confirm(
    `Restore this backup for ${label}?\n\n${item.path}\n\nFlora will back up the current file before restoring.`
  );

  if (!confirmed) {
    return;
  }

  const data = await postJson("/api/admin/backups/restore", {
    target,
    path: elements.select.value,
  });

  await loadConfig();
  await loadGoals();
  await loadRotation();
  await loadEventTheme();
  await loadBackups();

  setStatus(`Restored ${data.restore.label} from ${data.restore.restoredFrom}.`, "success");
}

async function tagBackup(target) {
  const elements = backupElements(target);
  const item = selectedBackupItem(target);

  if (!item) {
    setStatus("No backup is selected.", "error");
    return;
  }

  await postJson("/api/admin/backups/tag", {
    target,
    path: elements.select.value,
    tag: elements.tagInput.value,
    note: elements.noteInput.value,
  });

  await loadBackups();
  setStatus("Saved backup tag.", "success");
}

async function markWorkingBackup() {
  await postJson("/api/admin/backups/mark-working", {
    tag: workingBackupTag.value || "known-good",
    note: workingBackupNote.value,
  });

  await loadBackups();
  setStatus("Marked current setup as working.", "success");
}

function createCopyButton(input, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Copy";
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(input.value);
    setStatus(`Copied ${label} URL.`, "success");
  });

  return button;
}

function createPreviewButton(input, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Open Preview";
  button.className = "secondary-button";
  button.addEventListener("click", () => {
    window.open(input.value, "_blank", "noopener,noreferrer");
    setStatus(`Opened ${label} preview.`, "success");
  });

  return button;
}

function renderUrlList(elementId, urls, options = {}) {
  const container = document.getElementById(elementId);
  container.replaceChildren();

  for (const [path, label] of urls) {
    const row = document.createElement("div");
    row.className = options.preview ? "url-row url-row--preview" : "url-row";

    const labelElement = document.createElement("div");
    labelElement.className = "url-label";
    labelElement.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = absoluteUrl(path);

    row.append(labelElement, input, createCopyButton(input, label));

    if (options.preview) {
      row.append(createPreviewButton(input, label));
    }

    container.append(row);
  }
}

reloadButton.addEventListener("click", () => {
  loadAdminData().catch((error) => setStatus(error.message, "error"));
});

goalsForm.addEventListener("submit", saveGoals);
styleForm.addEventListener("submit", saveStyle);
resetStyleButton.addEventListener("click", resetStyleDefaults);
rotationForm.addEventListener("submit", saveRotation);
resetRotationButton.addEventListener("click", resetRotationDefaults);
reloadBackupsButton.addEventListener("click", loadBackups);
configBackupSelect.addEventListener("change", () => syncBackupTagFields("config"));
goalsBackupSelect.addEventListener("change", () => syncBackupTagFields("goals"));
tagConfigBackupButton.addEventListener("click", () => tagBackup("config"));
tagGoalsBackupButton.addEventListener("click", () => tagBackup("goals"));
markWorkingBackupButton.addEventListener("click", markWorkingBackup);
restoreConfigBackupButton.addEventListener("click", () => restoreBackup("config"));
restoreGoalsBackupButton.addEventListener("click", () => restoreBackup("goals"));
copyRotationUrlButton.addEventListener("click", copyRotationUrl);
openRotationPreviewButton.addEventListener("click", openRotationPreview);
rotationPanelList.addEventListener("click", (event) => {
  if (event.target.closest(".rotation-move-up")) {
    moveRotationPanelRow(event.target, "up");
  }

  if (event.target.closest(".rotation-move-down")) {
    moveRotationPanelRow(event.target, "down");
  }
});

eventThemeForm.addEventListener("submit", saveEventTheme);
resetEventThemeButton.addEventListener("click", resetEventThemeDefaults);

renderUrlList("obs-url-list", obsUrls, { preview: true });
renderUrlList("streamerbot-url-list", streamerbotUrls);

loadAdminData().catch((error) => setStatus(error.message, "error"));


loadBackups().catch((error) => {
  setStatus(`Could not load backup status: ${error.message}`, "error");
});




// FLORA_SERVER_STATUS_UI_START
const floraServerStatusState = document.getElementById("server-status-state");
const floraServerStatusHost = document.getElementById("server-status-host");
const floraServerStatusPort = document.getElementById("server-status-port");
const floraServerHealthUrl = document.getElementById("server-health-url");
const floraServerAdminUrl = document.getElementById("server-admin-url");
const floraServerPanelUrl = document.getElementById("server-panel-url");
const floraServerStatusDetail = document.getElementById("server-status-detail");
const floraRefreshServerStatusButton = document.getElementById("refresh-server-status-button");
const floraCopyServerHealthUrlButton = document.getElementById("copy-server-health-url");
const floraCopyServerAdminUrlButton = document.getElementById("copy-server-admin-url");
const floraCopyServerPanelUrlButton = document.getElementById("copy-server-panel-url");

function floraServerOrigin() {
  return window.location.origin || "http://127.0.0.1:8000";
}

function floraServerUrl(path) {
  return `${floraServerOrigin()}${path}`;
}

function floraSetServerUrlFields() {
  if (floraServerHealthUrl) {
    floraServerHealthUrl.value = floraServerUrl("/api/health");
  }

  if (floraServerAdminUrl) {
    floraServerAdminUrl.value = floraServerUrl("/admin.html");
  }

  if (floraServerPanelUrl) {
    floraServerPanelUrl.value = floraServerUrl("/panel.html");
  }

  if (floraServerStatusHost) {
    floraServerStatusHost.textContent = window.location.hostname || "127.0.0.1";
  }

  if (floraServerStatusPort) {
    floraServerStatusPort.textContent = window.location.port || "80";
  }
}

async function floraRefreshServerStatus() {
  floraSetServerUrlFields();

  if (floraServerStatusState) {
    floraServerStatusState.textContent = "Checking...";
    floraServerStatusState.dataset.kind = "muted";
  }

  if (floraServerStatusDetail) {
    floraServerStatusDetail.textContent = "Checking /api/health...";
  }

  try {
    const startedAt = performance.now();
    const health = await getJson("/api/health");
    const elapsed = Math.round(performance.now() - startedAt);

    if (floraServerStatusState) {
      floraServerStatusState.textContent = health.ok ? "Running" : "Responding";
      floraServerStatusState.dataset.kind = health.ok ? "success" : "muted";
    }

    if (floraServerStatusDetail) {
      const service = health.service ? ` Service: ${health.service}.` : "";
      floraServerStatusDetail.textContent = `Health check passed in ${elapsed} ms.${service}`;
    }
  } catch (error) {
    if (floraServerStatusState) {
      floraServerStatusState.textContent = "Error";
      floraServerStatusState.dataset.kind = "error";
    }

    if (floraServerStatusDetail) {
      floraServerStatusDetail.textContent = `Health check failed: ${error.message}`;
    }
  }
}

async function floraCopyServerUrl(input, label) {
  if (!input || !input.value) {
    setStatus(`No ${label} URL is available to copy.`, "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(input.value);
    setStatus(`Copied ${label} URL.`, "success");
  } catch {
    input.focus();
    input.select();
    document.execCommand("copy");
    setStatus(`Copied ${label} URL.`, "success");
  }
}

if (
  floraServerStatusState &&
  floraServerHealthUrl &&
  floraServerAdminUrl &&
  floraServerPanelUrl &&
  floraRefreshServerStatusButton
) {
  floraSetServerUrlFields();

  floraRefreshServerStatusButton.addEventListener("click", () => {
    floraRefreshServerStatus().catch((error) => {
      if (floraServerStatusDetail) {
        floraServerStatusDetail.textContent = `Health check failed: ${error.message}`;
      }
    });
  });

  floraCopyServerHealthUrlButton?.addEventListener("click", () => {
    floraCopyServerUrl(floraServerHealthUrl, "health").catch((error) => setStatus(error.message, "error"));
  });

  floraCopyServerAdminUrlButton?.addEventListener("click", () => {
    floraCopyServerUrl(floraServerAdminUrl, "admin").catch((error) => setStatus(error.message, "error"));
  });

  floraCopyServerPanelUrlButton?.addEventListener("click", () => {
    floraCopyServerUrl(floraServerPanelUrl, "panel base").catch((error) => setStatus(error.message, "error"));
  });

  floraRefreshServerStatus().catch((error) => {
    if (floraServerStatusDetail) {
      floraServerStatusDetail.textContent = `Health check failed: ${error.message}`;
    }
  });
}
// FLORA_SERVER_STATUS_UI_END


// FLORA_RUNTIME_BACKUP_RESTORE_UI_START
const runtimeBackupSelect = document.getElementById("runtime-backup-select");
const reloadRuntimeBackupsButton = document.getElementById("reload-runtime-backups-button");
const runtimeBackupPreview = document.getElementById("runtime-backup-preview");
const runtimeRestoreButton = document.getElementById("runtime-restore-button");
const runtimeRestoreStatus = document.getElementById("runtime-restore-status");
const runtimeRestoreConfirmation = document.getElementById("runtime-restore-confirmation");
const runtimeRestoreFields = {
  raids: document.getElementById("runtime-restore-raids"),
  bits: document.getElementById("runtime-restore-bits"),
  subs: document.getElementById("runtime-restore-subs"),
  giftSubs: document.getElementById("runtime-restore-gift-subs"),
  streamStreaks: document.getElementById("runtime-restore-stream-streaks"),
  streamSessions: document.getElementById("runtime-restore-stream-sessions"),
  watchStreaks: document.getElementById("runtime-restore-watch-streaks"),
  events: document.getElementById("runtime-restore-events"),
  avatarCache: document.getElementById("runtime-restore-avatar-cache"),
  avatarImages: document.getElementById("runtime-restore-avatar-images"),
  goals: document.getElementById("runtime-restore-goals"),
};

const runtimeBackupState = {
  backups: [],
};

function formatRuntimeBackupDate(name) {
  const match = String(name || "").match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);

  if (!match) {
    return String(name || "");
  }

  const [, year, month, day, hour, minute, second] = match;

  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

function selectedRuntimeBackup() {
  return runtimeBackupState.backups.find((backup) => backup.path === runtimeBackupSelect.value) || null;
}

function runtimeBackupItemMap(backup) {
  const map = {};

  for (const item of backup?.items || []) {
    map[item.key] = item;
  }

  return map;
}

function runtimeRestoreSelection() {
  return {
    raids: Boolean(runtimeRestoreFields.raids?.checked),
    bits: Boolean(runtimeRestoreFields.bits?.checked),
    subs: Boolean(runtimeRestoreFields.subs?.checked),
    giftSubs: Boolean(runtimeRestoreFields.giftSubs?.checked),
    streamStreaks: Boolean(runtimeRestoreFields.streamStreaks?.checked),
    streamSessions: Boolean(runtimeRestoreFields.streamSessions?.checked),
    watchStreaks: Boolean(runtimeRestoreFields.watchStreaks?.checked),
    events: Boolean(runtimeRestoreFields.events?.checked),
    avatarCache: Boolean(runtimeRestoreFields.avatarCache?.checked),
    avatarImages: Boolean(runtimeRestoreFields.avatarImages?.checked),
    goals: Boolean(runtimeRestoreFields.goals?.checked),
  };
}

function runtimeRestoreSelectionLabels(options) {
  const labels = [];

  if (options.raids) labels.push("raid leaderboard");
  if (options.bits) labels.push("bits leaderboard");
  if (options.subs) labels.push("subscription leaderboard");
  if (options.giftSubs) labels.push("gift sub leaderboard");
  if (options.streamStreaks) labels.push("Flora attendance streaks");
  if (options.streamSessions) labels.push("Flora stream sessions");
  if (options.watchStreaks) labels.push("Twitch watch streaks");
  if (options.events) labels.push("recent events");
  if (options.avatarCache) labels.push("avatar cache metadata");
  if (options.avatarImages) labels.push("avatar image files");
  if (options.goals) labels.push("goals");

  return labels;
}

function syncRuntimeRestoreAvailability() {
  const backup = selectedRuntimeBackup();
  const available = runtimeBackupItemMap(backup);

  for (const [key, field] of Object.entries(runtimeRestoreFields)) {
    if (!field) {
      continue;
    }

    const isAvailable = Boolean(available[key]);
    field.disabled = !isAvailable;

    if (!isAvailable) {
      field.checked = false;
    }
  }
}

function renderRuntimeBackupPreview() {
  const backup = selectedRuntimeBackup();

  if (!backup) {
    runtimeBackupPreview.innerHTML = `<p class="form-note">No runtime backup selected.</p>`;
    syncRuntimeRestoreAvailability();
    return;
  }

  const items = backup.items || [];
  const itemList = items.length
    ? items.map((item) => {
        const extra = item.kind === "directory" ? ` (${item.fileCount ?? 0} files)` : "";
        return `<li>${escapeHtml(item.label)}${extra}</li>`;
      }).join("")
    : "<li>No restorable items found.</li>";

  runtimeBackupPreview.innerHTML = `
    <div class="runtime-backup-preview-card">
      <h3>${escapeHtml(formatRuntimeBackupDate(backup.name))}</h3>
      <p>${escapeHtml(backup.path)}</p>
      <ul>${itemList}</ul>
    </div>
  `;

  syncRuntimeRestoreAvailability();
}

function renderRuntimeBackups(backups) {
  runtimeBackupState.backups = Array.isArray(backups) ? backups : [];
  runtimeBackupSelect.replaceChildren();

  if (!runtimeBackupState.backups.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No runtime reset backups available";
    runtimeBackupSelect.append(option);
    runtimeBackupPreview.innerHTML = `<p class="form-note">No runtime reset backups available.</p>`;
    runtimeRestoreButton.disabled = true;
    return;
  }

  for (const backup of runtimeBackupState.backups) {
    const option = document.createElement("option");
    option.value = backup.path;
    option.textContent = `${formatRuntimeBackupDate(backup.name)} — ${backup.items.length} item(s)`;
    runtimeBackupSelect.append(option);
  }

  runtimeRestoreButton.disabled = false;
  renderRuntimeBackupPreview();
}

async function loadRuntimeBackups() {
  const data = await getJson("/api/admin/runtime-backups");
  renderRuntimeBackups(data.backups);
}

async function restoreRuntimeBackup() {
  const backup = selectedRuntimeBackup();
  const restore = runtimeRestoreSelection();
  const labels = runtimeRestoreSelectionLabels(restore);
  const confirmation = runtimeRestoreConfirmation.value.trim();

  if (!backup) {
    setStatus("No runtime backup is selected.", "error");
    runtimeRestoreStatus.textContent = "No runtime backup is selected.";
    return;
  }

  if (!labels.length) {
    setStatus("Select at least one runtime backup item to restore.", "error");
    runtimeRestoreStatus.textContent = "Nothing selected.";
    return;
  }

  if (confirmation !== "RESTORE") {
    setStatus('Type RESTORE to confirm the runtime backup restore.', "error");
    runtimeRestoreStatus.textContent = 'Confirmation must be exactly "RESTORE".';
    return;
  }

  const confirmed = window.confirm(
    `Restore selected runtime data from this backup?\n\n${backup.path}\n\n${labels.join("\n")}\n\nFlora will create a safety backup first.`
  );

  if (!confirmed) {
    return;
  }

  runtimeRestoreButton.disabled = true;
  runtimeRestoreStatus.textContent = "Creating safety backup and restoring selected data...";

  try {
    const data = await postJson("/api/admin/runtime-backups/restore", {
      backupDir: backup.path,
      confirmation,
      restore,
    });

    runtimeRestoreStatus.textContent = `Restore complete. Safety backup: ${data.safetyBackupDir}`;
    setStatus(`Runtime restore complete: ${data.restored.map((item) => item.label).join(", ")}.`, "success");

    runtimeRestoreConfirmation.value = "";

    for (const field of Object.values(runtimeRestoreFields)) {
      if (field) {
        field.checked = false;
      }
    }

    const goals = await getJson("/api/admin/goals");
    populateGoals(goals);

    renderRuntimeBackups(data.backups);
  } catch (error) {
    runtimeRestoreStatus.textContent = `Runtime restore failed: ${error.message}`;
    setStatus(error.message, "error");
  } finally {
    runtimeRestoreButton.disabled = false;
  }
}

if (
  runtimeBackupSelect &&
  reloadRuntimeBackupsButton &&
  runtimeBackupPreview &&
  runtimeRestoreButton &&
  runtimeRestoreStatus &&
  runtimeRestoreConfirmation
) {
  runtimeBackupSelect.addEventListener("change", renderRuntimeBackupPreview);

  reloadRuntimeBackupsButton.addEventListener("click", () => {
    loadRuntimeBackups().catch((error) => {
      runtimeRestoreStatus.textContent = `Could not load runtime backups: ${error.message}`;
      setStatus(error.message, "error");
    });
  });

  runtimeRestoreButton.addEventListener("click", () => {
    restoreRuntimeBackup().catch((error) => setStatus(error.message, "error"));
  });

  loadRuntimeBackups().catch((error) => {
    runtimeRestoreStatus.textContent = `Could not load runtime backups: ${error.message}`;
  });
}
// FLORA_RUNTIME_BACKUP_RESTORE_UI_END


// FLORA_RUNTIME_RESET_UI_START
const runtimeResetButton = document.getElementById("runtime-reset-button");
const runtimeResetStatus = document.getElementById("runtime-reset-status");
const runtimeResetConfirmation = document.getElementById("runtime-reset-confirmation");
const runtimeResetFields = {
  raids: document.getElementById("runtime-reset-raids"),
  bits: document.getElementById("runtime-reset-bits"),
  subs: document.getElementById("runtime-reset-subs"),
  giftSubs: document.getElementById("runtime-reset-gift-subs"),
  streamStreaks: document.getElementById("runtime-reset-stream-streaks"),
  streamSessions: document.getElementById("runtime-reset-stream-sessions"),
  watchStreaks: document.getElementById("runtime-reset-watch-streaks"),
  events: document.getElementById("runtime-reset-events"),
  avatarCache: document.getElementById("runtime-reset-avatar-cache"),
  avatarImages: document.getElementById("runtime-reset-avatar-images"),
  goalsProgress: document.getElementById("runtime-reset-goals-progress"),
};

function selectedRuntimeResetOptions() {
  return {
    raids: Boolean(runtimeResetFields.raids?.checked),
    bits: Boolean(runtimeResetFields.bits?.checked),
    subs: Boolean(runtimeResetFields.subs?.checked),
    giftSubs: Boolean(runtimeResetFields.giftSubs?.checked),
    streamStreaks: Boolean(runtimeResetFields.streamStreaks?.checked),
    streamSessions: Boolean(runtimeResetFields.streamSessions?.checked),
    watchStreaks: Boolean(runtimeResetFields.watchStreaks?.checked),
    events: Boolean(runtimeResetFields.events?.checked),
    avatarCache: Boolean(runtimeResetFields.avatarCache?.checked),
    avatarImages: Boolean(runtimeResetFields.avatarImages?.checked),
    goalsProgress: Boolean(runtimeResetFields.goalsProgress?.checked),
  };
}

function runtimeResetSelectionLabels(options) {
  const labels = [];

  if (options.raids) labels.push("raid leaderboard");
  if (options.bits) labels.push("bits leaderboard");
  if (options.subs) labels.push("subscription leaderboard");
  if (options.giftSubs) labels.push("gift sub leaderboard");
  if (options.events) labels.push("recent events");
  if (options.avatarCache) labels.push("avatar cache metadata");
  if (options.avatarImages) labels.push("avatar image files");
  if (options.goalsProgress) labels.push("goal progress");

  return labels;
}

async function runRuntimeReset() {
  const reset = selectedRuntimeResetOptions();
  const labels = runtimeResetSelectionLabels(reset);
  const confirmation = runtimeResetConfirmation.value.trim();

  if (!labels.length) {
    setStatus("Select at least one runtime data item to reset.", "error");
    runtimeResetStatus.textContent = "Nothing selected.";
    return;
  }

  if (confirmation !== "RESET") {
    setStatus('Type RESET to confirm the runtime data reset.', "error");
    runtimeResetStatus.textContent = 'Confirmation must be exactly "RESET".';
    return;
  }

  const confirmed = window.confirm(
    `Reset selected runtime data?\n\n${labels.join("\n")}\n\nFlora will create a backup first.`
  );

  if (!confirmed) {
    return;
  }

  runtimeResetButton.disabled = true;
  runtimeResetStatus.textContent = "Creating backup and resetting selected data...";

  try {
    const data = await postJson("/api/admin/runtime-reset", {
      confirmation,
      reset,
    });

    runtimeResetStatus.textContent = `Reset complete. Backup: ${data.backupDir}`;
    setStatus(`Runtime reset complete: ${data.reset.join(", ")}.`, "success");

    runtimeResetConfirmation.value = "";

    for (const field of Object.values(runtimeResetFields)) {
      if (field) {
        field.checked = false;
      }
    }

    const goals = await getJson("/api/admin/goals");
    populateGoals(goals);
    await loadBackups();
  } catch (error) {
    runtimeResetStatus.textContent = `Runtime reset failed: ${error.message}`;
    setStatus(error.message, "error");
  } finally {
    runtimeResetButton.disabled = false;
  }
}

if (runtimeResetButton && runtimeResetStatus && runtimeResetConfirmation) {
  runtimeResetButton.addEventListener("click", () => {
    runRuntimeReset().catch((error) => setStatus(error.message, "error"));
  });
}
// FLORA_RUNTIME_RESET_UI_END




// FLORA_LAYOUT_PRESETS_UI_START
const floraLayoutPresetSelect = document.getElementById("layout-preset-select");
const floraLayoutPresetPreview = document.getElementById("layout-preset-preview");
const floraLayoutPresetStatus = document.getElementById("layout-preset-status");
const floraReloadLayoutPresetsButton = document.getElementById("reload-layout-presets-button");
const floraApplyLayoutPresetButton = document.getElementById("apply-layout-preset-button");

const floraLayoutPresetState = {
  presets: [],
};

function floraSelectedLayoutPreset() {
  return floraLayoutPresetState.presets.find((preset) => preset.id === floraLayoutPresetSelect.value) || null;
}

function floraRenderLayoutPresetPreview() {
  const preset = floraSelectedLayoutPreset();

  floraLayoutPresetPreview.replaceChildren();

  if (!preset) {
    const note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "No layout preset selected.";
    floraLayoutPresetPreview.append(note);
    floraApplyLayoutPresetButton.disabled = true;
    return;
  }

  const card = document.createElement("div");
  card.className = "theme-preset-preview-card";

  const title = document.createElement("h3");
  title.textContent = preset.name;

  const description = document.createElement("p");
  description.textContent = preset.description;

  const details = document.createElement("ul");
  details.className = "layout-preset-details";

  const rows = [
    `Leaderboard rows: ${preset.tableMaxRows}`,
    `Recent events: ${preset.eventMaxEvents}`,
    `Scroll speed: ${preset.scrollSpeedPixelsPerSecond}px/s`,
    `Default rotation: ${preset.rotation.enabled ? "enabled" : "disabled"} · ${preset.rotation.panelCount} panels · start ${preset.rotation.startPanel}`,
  ];

  for (const [name, rotation] of Object.entries(preset.rotations || {})) {
    rows.push(`Named rotation ${name}: ${rotation.enabled ? "enabled" : "disabled"} · ${rotation.panelCount} panels · start ${rotation.startPanel}`);
  }

  for (const row of rows) {
    const item = document.createElement("li");
    item.textContent = row;
    details.append(item);
  }

  card.append(title, description, details);
  floraLayoutPresetPreview.append(card);

  floraApplyLayoutPresetButton.disabled = false;
}

function floraRenderLayoutPresets(presets) {
  floraLayoutPresetState.presets = Array.isArray(presets) ? presets : [];
  floraLayoutPresetSelect.replaceChildren();

  if (!floraLayoutPresetState.presets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No layout presets available";
    floraLayoutPresetSelect.append(option);
    floraLayoutPresetStatus.textContent = "No layout presets available.";
    floraApplyLayoutPresetButton.disabled = true;
    floraRenderLayoutPresetPreview();
    return;
  }

  for (const preset of floraLayoutPresetState.presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    floraLayoutPresetSelect.append(option);
  }

  floraLayoutPresetStatus.textContent = `${floraLayoutPresetState.presets.length} built-in layout presets available.`;
  floraRenderLayoutPresetPreview();
}

async function floraLoadLayoutPresets() {
  const data = await getJson("/api/admin/layout-presets");
  floraRenderLayoutPresets(data.presets);
}

async function floraApplyLayoutPreset() {
  const preset = floraSelectedLayoutPreset();

  if (!preset) {
    setStatus("No layout preset is selected.", "error");
    floraLayoutPresetStatus.textContent = "No layout preset is selected.";
    return;
  }

  const confirmed = window.confirm(
    `Apply layout preset "${preset.name}"?\n\nThis updates row limits, recent event limits, scroll speed, and rotations.\n\nFlora will back up config.json before applying the preset.`
  );

  if (!confirmed) {
    return;
  }

  floraApplyLayoutPresetButton.disabled = true;
  floraLayoutPresetStatus.textContent = `Applying ${preset.name}...`;

  try {
    const data = await postJson("/api/admin/layout-presets/apply", {
      presetId: preset.id,
    });

    availablePanels = data.config?.panels || availablePanels;
    populateRotation(data.rotation);
    namedRotations = data.rotations || namedRotations;

    if (typeof renderNamedRotationOptions === "function") {
      renderNamedRotationOptions();
    }

    floraRenderLayoutPresets(data.presets);
    floraLayoutPresetSelect.value = data.preset.id;
    floraRenderLayoutPresetPreview();

    floraLayoutPresetStatus.textContent = `Applied: ${data.preset.name}`;
    setStatus(`Applied layout preset ${data.preset.name}. Refresh OBS browser sources to see updated panel layout behavior.`, "success");
  } catch (error) {
    floraLayoutPresetStatus.textContent = `Layout preset failed: ${error.message}`;
    setStatus(error.message, "error");
  } finally {
    floraApplyLayoutPresetButton.disabled = false;
  }
}

if (
  floraLayoutPresetSelect &&
  floraLayoutPresetPreview &&
  floraLayoutPresetStatus &&
  floraReloadLayoutPresetsButton &&
  floraApplyLayoutPresetButton
) {
  floraLayoutPresetSelect.addEventListener("change", floraRenderLayoutPresetPreview);

  floraReloadLayoutPresetsButton.addEventListener("click", () => {
    floraLoadLayoutPresets().catch((error) => {
      floraLayoutPresetStatus.textContent = `Could not load layout presets: ${error.message}`;
      setStatus(error.message, "error");
    });
  });

  floraApplyLayoutPresetButton.addEventListener("click", () => {
    floraApplyLayoutPreset().catch((error) => setStatus(error.message, "error"));
  });

  floraLoadLayoutPresets().catch((error) => {
    floraLayoutPresetStatus.textContent = `Could not load layout presets: ${error.message}`;
  });
}
// FLORA_LAYOUT_PRESETS_UI_END


// FLORA_THEME_PRESETS_UI_START
const floraThemePresetSelect = document.getElementById("theme-preset-select");
const floraThemePresetPreview = document.getElementById("theme-preset-preview");
const floraThemePresetStatus = document.getElementById("theme-preset-status");
const floraReloadThemePresetsButton = document.getElementById("reload-theme-presets-button");
const floraApplyThemePresetButton = document.getElementById("apply-theme-preset-button");

const floraThemePresetState = {
  presets: [],
};

function floraSelectedThemePreset() {
  return floraThemePresetState.presets.find((preset) => preset.id === floraThemePresetSelect.value) || null;
}

function floraCreateThemeSwatch(name, value) {
  const swatch = document.createElement("span");
  swatch.className = "theme-preset-swatch";
  swatch.title = `${name}: ${value}`;
  swatch.style.background = value;
  return swatch;
}

function floraRenderThemePresetPreview() {
  const preset = floraSelectedThemePreset();

  floraThemePresetPreview.replaceChildren();

  if (!preset) {
    const note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "No theme preset selected.";
    floraThemePresetPreview.append(note);
    floraApplyThemePresetButton.disabled = true;
    return;
  }

  const card = document.createElement("div");
  card.className = "theme-preset-preview-card";

  const title = document.createElement("h3");
  title.textContent = preset.name;

  const description = document.createElement("p");
  description.textContent = preset.description;

  const swatches = document.createElement("div");
  swatches.className = "theme-preset-swatches";

  const colors = preset.style?.colors || {};

  for (const [name, value] of Object.entries(colors)) {
    swatches.append(floraCreateThemeSwatch(name, value));
  }

  card.append(title, description, swatches);
  floraThemePresetPreview.append(card);

  floraApplyThemePresetButton.disabled = false;
}

function floraRenderThemePresets(presets) {
  floraThemePresetState.presets = Array.isArray(presets) ? presets : [];
  floraThemePresetSelect.replaceChildren();

  if (!floraThemePresetState.presets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No theme presets available";
    floraThemePresetSelect.append(option);
    floraThemePresetStatus.textContent = "No theme presets available.";
    floraApplyThemePresetButton.disabled = true;
    floraRenderThemePresetPreview();
    return;
  }

  for (const preset of floraThemePresetState.presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    floraThemePresetSelect.append(option);
  }

  floraThemePresetStatus.textContent = `${floraThemePresetState.presets.length} built-in theme presets available.`;
  floraRenderThemePresetPreview();
}

async function floraLoadThemePresets() {
  const data = await getJson("/api/admin/theme-presets");
  floraRenderThemePresets(data.presets);
}

async function floraApplyThemePreset() {
  const preset = floraSelectedThemePreset();

  if (!preset) {
    setStatus("No theme preset is selected.", "error");
    floraThemePresetStatus.textContent = "No theme preset is selected.";
    return;
  }

  const confirmed = window.confirm(
    `Apply theme preset "${preset.name}"?\n\nFlora will back up config.json before applying the preset.`
  );

  if (!confirmed) {
    return;
  }

  floraApplyThemePresetButton.disabled = true;
  floraThemePresetStatus.textContent = `Applying ${preset.name}...`;

  try {
    const data = await postJson("/api/admin/theme-presets/apply", {
      presetId: preset.id,
    });

    populateStyle(data.style);
    floraRenderThemePresets(data.presets);
    floraThemePresetSelect.value = data.preset.id;
    floraRenderThemePresetPreview();

    floraThemePresetStatus.textContent = `Applied: ${data.preset.name}`;
    setStatus(`Applied theme preset ${data.preset.name}. Refresh OBS browser sources to see the latest panel styling.`, "success");
  } catch (error) {
    floraThemePresetStatus.textContent = `Theme preset failed: ${error.message}`;
    setStatus(error.message, "error");
  } finally {
    floraApplyThemePresetButton.disabled = false;
  }
}

if (
  floraThemePresetSelect &&
  floraThemePresetPreview &&
  floraThemePresetStatus &&
  floraReloadThemePresetsButton &&
  floraApplyThemePresetButton
) {
  floraThemePresetSelect.addEventListener("change", floraRenderThemePresetPreview);

  floraReloadThemePresetsButton.addEventListener("click", () => {
    floraLoadThemePresets().catch((error) => {
      floraThemePresetStatus.textContent = `Could not load theme presets: ${error.message}`;
      setStatus(error.message, "error");
    });
  });

  floraApplyThemePresetButton.addEventListener("click", () => {
    floraApplyThemePreset().catch((error) => setStatus(error.message, "error"));
  });

  floraLoadThemePresets().catch((error) => {
    floraThemePresetStatus.textContent = `Could not load theme presets: ${error.message}`;
  });
}
// FLORA_THEME_PRESETS_UI_END


// FLORA_PRESETS_UI_START
const floraPresetName = document.getElementById("preset-name");
const floraPresetNote = document.getElementById("preset-note");
const floraExportPresetButton = document.getElementById("export-preset-button");
const floraReloadPresetsButton = document.getElementById("reload-presets-button");
const floraPresetSelect = document.getElementById("preset-select");
const floraPresetStatus = document.getElementById("preset-status");
const floraPresetPreview = document.getElementById("preset-preview");
const floraImportPresetButton = document.getElementById("import-preset-button");
const floraDeletePresetButton = document.getElementById("delete-preset-button");

const floraPresetState = {
  presets: [],
};

function floraFormatPresetTime(value) {
  if (!value) {
    return "unknown time";
  }

  return new Date(value * 1000).toLocaleString();
}

function floraPresetOptionLabel(preset) {
  const note = preset.note ? ` — ${preset.note}` : "";
  return `${preset.name} (${floraFormatPresetTime(preset.modified)})${note}`;
}

function floraSelectedPreset() {
  return floraPresetState.presets.find((preset) => preset.filename === floraPresetSelect.value) || null;
}

function floraRenderPresetPreview(detail) {
  if (!detail || !detail.preview) {
    floraPresetPreview.innerHTML = `<p class="form-note">Select a preset to preview its contents.</p>`;
    return;
  }

  const preview = detail.preview;
  const colors = preview.style?.colors || {};
  const colorEntries = Object.entries(colors).slice(0, 12);
  const goals = preview.goals?.items || [];

  const colorSwatches = colorEntries
    .map(([name, value]) => `<span class="preset-color-swatch" title="${name}: ${value}" style="background: ${value}"></span>`)
    .join("");

  const goalText = goals.length
    ? goals.map((goal) => `${goal.label || goal.key}: ${goal.current ?? "?"}/${goal.target ?? "?"}`).join("<br>")
    : "No goals";

  floraPresetPreview.innerHTML = `
    <div class="preset-preview-grid">
      <div class="preset-preview-card">
        <h3>Style</h3>
        <p>${preview.style?.colorCount ?? 0} colors</p>
        <div class="preset-color-swatches">${colorSwatches}</div>
      </div>

      <div class="preset-preview-card">
        <h3>Rotation</h3>
        <p>${preview.rotation?.enabled ? "Enabled" : "Disabled"}</p>
        <p>Start: ${preview.rotation?.startPanel || "not set"}</p>
        <p>${preview.rotation?.panelCount ?? 0} panels</p>
      </div>

      <div class="preset-preview-card">
        <h3>Event Theme</h3>
        <p>${preview.eventTheme?.eventTypeCount ?? 0} event types</p>
        <p>${(preview.eventTheme?.eventTypes || []).join(", ") || "No event types"}</p>
      </div>

      <div class="preset-preview-card">
        <h3>Goals</h3>
        <p>${goalText}</p>
      </div>
    </div>
  `;
}

async function floraLoadPresetDetail() {
  const preset = floraSelectedPreset();

  if (!preset) {
    floraPresetStatus.textContent = "Select a preset.";
    floraPresetPreview.innerHTML = `<p class="form-note">Select a preset to preview its contents.</p>`;
    floraImportPresetButton.disabled = true;
    floraDeletePresetButton.disabled = true;
    return null;
  }

  const data = await postJson("/api/admin/presets/detail", {
    filename: preset.filename,
  });

  floraPresetStatus.textContent = `Selected: ${preset.path}`;
  floraRenderPresetPreview(data.preset);
  floraImportPresetButton.disabled = false;
  floraDeletePresetButton.disabled = false;

  return data.preset;
}

function floraRenderPresets(presets) {
  floraPresetState.presets = Array.isArray(presets) ? presets : [];
  floraPresetSelect.replaceChildren();

  if (!floraPresetState.presets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No presets available";
    floraPresetSelect.append(option);

    floraPresetStatus.textContent = "No presets exported yet.";
    floraPresetPreview.innerHTML = `<p class="form-note">No presets exported yet.</p>`;
    floraImportPresetButton.disabled = true;
    floraDeletePresetButton.disabled = true;
    return;
  }

  for (const preset of floraPresetState.presets) {
    const option = document.createElement("option");
    option.value = preset.filename;
    option.textContent = floraPresetOptionLabel(preset);
    floraPresetSelect.append(option);
  }

  floraImportPresetButton.disabled = true;
  floraDeletePresetButton.disabled = true;

  floraLoadPresetDetail().catch((error) => {
    floraPresetStatus.textContent = `Could not load preset preview: ${error.message}`;
    floraImportPresetButton.disabled = true;
    floraDeletePresetButton.disabled = true;
  });
}

async function floraLoadPresets() {
  const data = await getJson("/api/admin/presets");
  floraRenderPresets(data.presets);
}

async function floraExportPreset() {
  const name = floraPresetName.value.trim() || "Flora Preset";

  const data = await postJson("/api/admin/presets/export", {
    name,
    note: floraPresetNote.value,
  });

  floraRenderPresets(data.presets);
  floraPresetSelect.value = data.preset.filename;
  floraPresetStatus.textContent = `Exported: ${data.preset.path}`;
  setStatus(`Exported preset ${data.preset.name}.`, "success");
}

async function floraDeletePreset() {
  const preset = floraSelectedPreset();

  if (!preset) {
    setStatus("No preset is selected.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete preset "${preset.name}"?\n\n${preset.path}\n\nThis removes the local preset file. It does not change the current Flora setup.`
  );

  if (!confirmed) {
    return;
  }

  const data = await postJson("/api/admin/presets/delete", {
    filename: preset.filename,
  });

  floraRenderPresets(data.presets);
  setStatus(`Deleted preset ${data.deleted.name}.`, "success");
}

async function floraImportPreset() {
  const preset = floraSelectedPreset();

  if (!preset) {
    setStatus("No preset is selected.", "error");
    return;
  }

  const detail = await floraLoadPresetDetail();
  const preview = detail?.preview || {};
  const rotationStatus = preview.rotation?.enabled ? "enabled" : "disabled";
  const goalCount = preview.goals?.goalCount ?? 0;
  const eventTypeCount = preview.eventTheme?.eventTypeCount ?? 0;

  const confirmed = window.confirm(
    `Import preset "${preset.name}"?\n\n${preset.path}\n\nRotation: ${rotationStatus}\nEvent types: ${eventTypeCount}\nGoals: ${goalCount}\n\nFlora will back up the current config and goals before importing.`
  );

  if (!confirmed) {
    return;
  }

  const data = await postJson("/api/admin/presets/import", {
    filename: preset.filename,
  });

  await loadConfig();
  await loadGoals();
  await loadRotation();
  await loadEventTheme();
  await loadBackups();
  await floraLoadPresets();

  setStatus(`Imported preset ${data.imported.name}.`, "success");
}

if (
  floraPresetName &&
  floraPresetNote &&
  floraExportPresetButton &&
  floraReloadPresetsButton &&
  floraPresetSelect &&
  floraPresetStatus &&
  floraPresetPreview &&
  floraImportPresetButton &&
  floraDeletePresetButton
) {
  floraReloadPresetsButton.addEventListener("click", () => {
    floraLoadPresets().catch((error) => setStatus(error.message, "error"));
  });

  floraExportPresetButton.addEventListener("click", () => {
    floraExportPreset().catch((error) => setStatus(error.message, "error"));
  });

  floraImportPresetButton.addEventListener("click", () => {
    floraImportPreset().catch((error) => setStatus(error.message, "error"));
  });

  floraDeletePresetButton.addEventListener("click", () => {
    floraDeletePreset().catch((error) => setStatus(error.message, "error"));
  });

  floraPresetSelect.addEventListener("change", () => {
    floraLoadPresetDetail().catch((error) => {
      floraPresetStatus.textContent = `Could not load preset preview: ${error.message}`;
      floraImportPresetButton.disabled = true;
      floraDeletePresetButton.disabled = true;
    });
  });

  floraLoadPresets().catch((error) => {
    floraPresetStatus.textContent = `Could not load presets: ${error.message}`;
    floraImportPresetButton.disabled = true;
    floraDeletePresetButton.disabled = true;
  });
}
// FLORA_PRESETS_UI_END


// FLORA_OBS_SOURCE_QUICK_COPY_START
const floraObsSourceSingleList = document.getElementById("obs-source-single-list");
const floraObsSourceRotationList = document.getElementById("obs-source-rotation-list");
const floraObsSourceStatus = document.getElementById("obs-source-status");

const FLORA_OBS_SINGLE_SOURCES = [
  ["Raid leaderboard", "/panel.html?type=raids"],
  ["Raid count leaderboard", "/panel.html?type=raids-count"],
  ["Biggest raid leaderboard", "/panel.html?type=raids-biggest"],
  ["Bits leaderboard", "/panel.html?type=bits"],
  ["Cheer count leaderboard", "/panel.html?type=bits-count"],
  ["Biggest cheer leaderboard", "/panel.html?type=bits-biggest"],
  ["Total sub months leaderboard", "/panel.html?type=sub-months-total"],
  ["Sub streak leaderboard", "/panel.html?type=sub-months-streak"],
  ["Gift sub leaderboard", "/panel.html?type=gift-subs"],
  ["Stream streak leaderboard", "/panel.html?type=stream-streaks"],
  ["Watch streak leaderboard", "/panel.html?type=watch-streaks"],
  ["Follower goal", "/panel.html?type=follower-goal"],
  ["Subscriber goal", "/panel.html?type=sub-goal"],
  ["Recent events", "/panel.html?type=recent-events"],
];

const FLORA_OBS_ROTATION_SOURCES = [
  ["Default rotation", "/panel.html?rotation=true"],
  ["Fast default rotation", "/panel.html?rotation=true&duration=3"],
  ["Leaderboards rotation", "/panel.html?rotation=leaderboards"],
  ["Goals rotation", "/panel.html?rotation=goals"],
];

function floraObsAbsoluteUrl(path) {
  return `${window.location.origin}${path}`;
}

async function floraCopyObsUrl(url, label) {
  try {
    await navigator.clipboard.writeText(url);
    setStatus(`Copied OBS source URL: ${label}.`, "success");
    if (floraObsSourceStatus) {
      floraObsSourceStatus.textContent = `Copied: ${label}`;
    }
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = url;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.left = "-9999px";
    document.body.append(temporary);
    temporary.select();
    document.execCommand("copy");
    temporary.remove();

    setStatus(`Copied OBS source URL: ${label}.`, "success");
    if (floraObsSourceStatus) {
      floraObsSourceStatus.textContent = `Copied: ${label}`;
    }
  }
}

function floraOpenObsPreview(url, label) {
  window.open(url, "_blank", "noopener,noreferrer");
  setStatus(`Opened OBS source preview: ${label}.`, "success");
  if (floraObsSourceStatus) {
    floraObsSourceStatus.textContent = `Opened preview: ${label}`;
  }
}

function floraCreateObsSourceRow(label, path) {
  const url = floraObsAbsoluteUrl(path);

  const row = document.createElement("div");
  row.className = "obs-source-row";

  const title = document.createElement("div");
  title.className = "obs-source-title";
  title.textContent = label;

  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.value = url;
  input.className = "obs-source-url";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "secondary-button";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", () => {
    floraCopyObsUrl(url, label).catch((error) => setStatus(error.message, "error"));
  });

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "secondary-button";
  previewButton.textContent = "Preview";
  previewButton.addEventListener("click", () => {
    floraOpenObsPreview(url, label);
  });

  row.append(title, input, copyButton, previewButton);

  return row;
}

function floraRenderObsSources() {
  if (floraObsSourceSingleList) {
    floraObsSourceSingleList.replaceChildren();

    for (const [label, path] of FLORA_OBS_SINGLE_SOURCES) {
      floraObsSourceSingleList.append(floraCreateObsSourceRow(label, path));
    }
  }

  if (floraObsSourceRotationList) {
    floraObsSourceRotationList.replaceChildren();

    for (const [label, path] of FLORA_OBS_ROTATION_SOURCES) {
      floraObsSourceRotationList.append(floraCreateObsSourceRow(label, path));
    }
  }
}

if (floraObsSourceSingleList && floraObsSourceRotationList) {
  floraRenderObsSources();
}
// FLORA_OBS_SOURCE_QUICK_COPY_END


// FLORA_ACTION_BUILDER_START
const floraActionBuilderType = document.getElementById("action-builder-type");
const floraActionBuilderTarget = document.getElementById("action-builder-target");
const floraActionBuilderTargetWrap = document.getElementById("action-builder-target-wrap");
const floraActionBuilderNamePreset = document.getElementById("action-builder-name-preset");
const floraActionBuilderName = document.getElementById("action-builder-name");
const floraActionBuilderAmountPreset = document.getElementById("action-builder-amount-preset");
const floraActionBuilderAmountPresetWrap = document.getElementById("action-builder-amount-preset-wrap");
const floraActionBuilderAmount = document.getElementById("action-builder-amount");
const floraActionBuilderAmountWrap = document.getElementById("action-builder-amount-wrap");
const floraActionBuilderAmountRole = document.getElementById("action-builder-amount-role");
const floraActionBuilderAmountRoleWrap = document.getElementById("action-builder-amount-role-wrap");
const floraActionBuilderUpdateGoal = document.getElementById("action-builder-update-goal");
const floraActionBuilderUpdateGoalWrap = document.getElementById("action-builder-update-goal-wrap");
const floraActionBuilderCheers = document.getElementById("action-builder-cheers");
const floraActionBuilderCheersWrap = document.getElementById("action-builder-cheers-wrap");
const floraActionBuilderAvatar = document.getElementById("action-builder-avatar");
const floraActionBuilderAvatarWrap = document.getElementById("action-builder-avatar-wrap");
const floraActionBuilderAvatarVariable = document.getElementById("action-builder-avatar-variable");
const floraActionBuilderAvatarVariableWrap = document.getElementById("action-builder-avatar-variable-wrap");
const floraActionBuilderUrl = document.getElementById("action-builder-url");
const floraCopyActionBuilderUrl = document.getElementById("copy-action-builder-url");
const floraPreviewActionBuilderUrl = document.getElementById("preview-action-builder-url");
const floraActionBuilderStatus = document.getElementById("action-builder-status");

function floraActionBuilderSetVisible(element, visible) {
  if (!element) {
    return;
  }

  element.hidden = !visible;
}

function floraActionBuilderApplyPreset() {
  const preset = floraActionBuilderType.value;

  if (preset === "raid") {
    floraActionBuilderTarget.value = "raid";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderAmountPreset.value = "%viewers%";
    floraActionBuilderAmount.value = "%viewers%";
    floraActionBuilderAmountRole.value = "viewers";
    floraActionBuilderUpdateGoal.checked = false;
    floraActionBuilderCheers.checked = false;
    floraActionBuilderAvatar.checked = false;
  }

  if (preset === "bits") {
    floraActionBuilderTarget.value = "bits";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderAmountPreset.value = "%bits%";
    floraActionBuilderAmount.value = "%bits%";
    floraActionBuilderAmountRole.value = "bits";
    floraActionBuilderUpdateGoal.checked = false;
    floraActionBuilderCheers.checked = true;
    floraActionBuilderAvatar.checked = false;
  }

  if (preset === "follow") {
    floraActionBuilderTarget.value = "follow";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderUpdateGoal.checked = true;
    floraActionBuilderCheers.checked = false;
    floraActionBuilderAvatar.checked = false;
  }

  if (preset === "sub") {
    floraActionBuilderTarget.value = "sub";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderUpdateGoal.checked = true;
    floraActionBuilderCheers.checked = false;
    floraActionBuilderAvatar.checked = false;
  }

  if (preset === "sub-leaderboard") {
    floraActionBuilderTarget.value = "sub-leaderboard";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderUpdateGoal.checked = false;
    floraActionBuilderCheers.checked = false;
    floraActionBuilderAvatar.checked = true;
    floraActionBuilderAvatarVariable.value = "%targetUserProfileImageUrlEscaped%";
  }

  if (preset === "gift-sub") {
    floraActionBuilderTarget.value = "gift-sub";
    floraActionBuilderNamePreset.value = "%userName%";
    floraActionBuilderName.value = "%userName%";
    floraActionBuilderUpdateGoal.checked = true;
    floraActionBuilderCheers.checked = false;
    floraActionBuilderAvatar.checked = true;
    floraActionBuilderAvatarVariable.value = "%targetUserProfileImageUrlEscaped%";
  }

  floraActionBuilderUpdateVisibility();
  floraActionBuilderGenerateUrl();
}

function floraActionBuilderUpdateVisibility() {
  const preset = floraActionBuilderType.value;
  const target = floraActionBuilderTarget.value;
  const isCustom = preset === "custom";
  const usesAmount = target === "raid" || target === "bits";
  const usesCheers = target === "bits";
  const usesGoalUpdate = target === "follow" || target === "sub" || target === "sub-leaderboard" || target === "gift-sub";
  const usesAvatar = target === "raid" || target === "bits" || target === "follow" || target === "sub" || target === "sub-leaderboard" || target === "gift-sub";

  floraActionBuilderSetVisible(floraActionBuilderTargetWrap, isCustom);
  floraActionBuilderSetVisible(floraActionBuilderAmountPresetWrap, usesAmount);
  floraActionBuilderSetVisible(floraActionBuilderAmountWrap, usesAmount);
  floraActionBuilderSetVisible(floraActionBuilderAmountRoleWrap, isCustom && usesAmount);
  floraActionBuilderSetVisible(floraActionBuilderCheersWrap, usesCheers);
  floraActionBuilderSetVisible(floraActionBuilderUpdateGoalWrap, usesGoalUpdate);
  floraActionBuilderSetVisible(floraActionBuilderAvatarWrap, usesAvatar);
  floraActionBuilderSetVisible(floraActionBuilderAvatarVariableWrap, usesAvatar && floraActionBuilderAvatar.checked);
}

function floraActionBuilderParameterValue(value) {
  return String(value || "").trim();
}

function floraActionBuilderEncodeValue(value) {
  const text = floraActionBuilderParameterValue(value);

  if (/^%[A-Za-z0-9_]+%$/.test(text)) {
    return text;
  }

  return encodeURIComponent(text);
}

function floraActionBuilderQueryString(params) {
  return params
    .filter(([key, value]) => floraActionBuilderParameterValue(key) && floraActionBuilderParameterValue(value))
    .map(([key, value]) => `${encodeURIComponent(key)}=${floraActionBuilderEncodeValue(value)}`)
    .join("&");
}

function floraActionBuilderBuildUrl() {
  const target = floraActionBuilderTarget.value;
  const name = floraActionBuilderParameterValue(floraActionBuilderName.value);
  const amount = floraActionBuilderParameterValue(floraActionBuilderAmount.value);
  const avatarUrl = floraActionBuilderParameterValue(floraActionBuilderAvatarVariable.value);
  const params = [];

  if (name) {
    params.push(["name", name]);
  }

  if (target === "raid") {
    params.push(["viewers", amount || "%viewers%"]);

    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    return `/api/raid?${floraActionBuilderQueryString(params)}`;
  }

  if (target === "bits") {
    params.push(["bits", amount || "%bits%"]);

    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    if (floraActionBuilderCheers.checked) {
      params.push(["cheers", "1"]);
    }

    return `/api/bits?${floraActionBuilderQueryString(params)}`;
  }

  if (target === "follow") {
    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    if (floraActionBuilderUpdateGoal.checked) {
      params.push(["updateGoal", "true"]);
    }

    return `/api/follow?${floraActionBuilderQueryString(params)}`;
  }

  if (target === "sub") {
    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    if (floraActionBuilderUpdateGoal.checked) {
      params.push(["updateGoal", "true"]);
    }

    return `/api/sub?${floraActionBuilderQueryString(params)}`;
  }

  if (target === "sub-leaderboard") {
    params.push(["totalMonths", "%badgeCount%"]);
    params.push(["streakMonths", "%monthsSubscribed%"]);
    params.push(["tier", "%tier%"]);
    params.push(["isPrimeSub", "%isPrimeSub%"]);

    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    if (floraActionBuilderUpdateGoal.checked) {
      params.push(["updateGoal", "true"]);
    }

    return `/api/sub?${floraActionBuilderQueryString(params)}`;
  }

  if (target === "gift-sub") {
    params.push(["recipient", "%recipientUserName%"]);
    params.push(["giftCount", "1"]);
    params.push(["totalGifted", "%totalSubsGifted%"]);
    params.push(["tier", "%tier%"]);
    params.push(["anonymous", "%anonymous%"]);
    params.push(["monthsGifted", "%monthsGifted%"]);

    if (floraActionBuilderAvatar.checked && avatarUrl) {
      params.push(["avatarUrl", avatarUrl]);
    }

    if (floraActionBuilderUpdateGoal.checked) {
      params.push(["updateGoal", "true"]);
    }

    return `/api/gift-sub?${floraActionBuilderQueryString(params)}`;
  }

  return "";
}

function floraActionBuilderGenerateUrl() {
  floraActionBuilderUpdateVisibility();

  const path = floraActionBuilderBuildUrl();
  const url = path ? `${window.location.origin}${path}` : "";

  floraActionBuilderUrl.value = url;

  if (!url) {
    floraActionBuilderStatus.textContent = "Could not generate URL for the selected options.";
    return;
  }

  const preset = floraActionBuilderType.value;
  const modeText = preset === "custom" ? "Custom role mapping" : "Preset mapping";
  const avatarNote = floraActionBuilderAvatar.checked
    ? " Add Twitch → User → Get User Info For Target before the Fetch URL so %targetUserProfileImageUrlEscaped% is populated."
    : "";
  floraActionBuilderStatus.textContent = `${modeText}: copy this URL into a Streamer.bot Fetch action.${avatarNote}`;
}

function floraActionBuilderApplyVariablePreset(selectElement, inputElement) {
  if (selectElement.value === "custom") {
    inputElement.focus();
    inputElement.select();
    return;
  }

  inputElement.value = selectElement.value;
  floraActionBuilderGenerateUrl();
}

if (
  floraActionBuilderType &&
  floraActionBuilderTarget &&
  floraActionBuilderNamePreset &&
  floraActionBuilderName &&
  floraActionBuilderAmountPreset &&
  floraActionBuilderAmount &&
  floraActionBuilderAmountRole &&
  floraActionBuilderUpdateGoal &&
  floraActionBuilderCheers &&
  floraActionBuilderAvatar &&
  floraActionBuilderAvatarVariable &&
  floraActionBuilderUrl &&
  floraCopyActionBuilderUrl &&
  floraPreviewActionBuilderUrl &&
  floraActionBuilderStatus
) {
  floraActionBuilderType.addEventListener("change", floraActionBuilderApplyPreset);

  floraActionBuilderTarget.addEventListener("change", () => {
    const target = floraActionBuilderTarget.value;

    if (target === "raid") {
      floraActionBuilderAmountPreset.value = "%viewers%";
      floraActionBuilderAmount.value = "%viewers%";
      floraActionBuilderAmountRole.value = "viewers";
    }

    if (target === "bits") {
      floraActionBuilderAmountPreset.value = "%bits%";
      floraActionBuilderAmount.value = "%bits%";
      floraActionBuilderAmountRole.value = "bits";
    }

    floraActionBuilderGenerateUrl();
  });

  floraActionBuilderNamePreset.addEventListener("change", () => {
    floraActionBuilderApplyVariablePreset(floraActionBuilderNamePreset, floraActionBuilderName);
  });

  floraActionBuilderAmountPreset.addEventListener("change", () => {
    floraActionBuilderApplyVariablePreset(floraActionBuilderAmountPreset, floraActionBuilderAmount);
  });

  [
    floraActionBuilderName,
    floraActionBuilderAmount,
    floraActionBuilderAmountRole,
    floraActionBuilderUpdateGoal,
    floraActionBuilderCheers,
    floraActionBuilderAvatar,
    floraActionBuilderAvatarVariable,
  ].forEach((element) => {
    element.addEventListener("input", floraActionBuilderGenerateUrl);
    element.addEventListener("change", floraActionBuilderGenerateUrl);
  });

  floraCopyActionBuilderUrl.addEventListener("click", async () => {
    await navigator.clipboard.writeText(floraActionBuilderUrl.value);
    setStatus("Copied Streamer.bot Fetch URL.", "success");
  });

  floraPreviewActionBuilderUrl.addEventListener("click", () => {
    if (!floraActionBuilderUrl.value) {
      setStatus("No Action Builder URL generated.", "error");
      return;
    }

    window.open(floraActionBuilderUrl.value, "_blank", "noopener,noreferrer");
  });

  floraActionBuilderApplyPreset();
}
// FLORA_ACTION_BUILDER_END

// FLORA_NAMED_ROTATION_ADMIN_START

const namedRotationSelect = document.getElementById("named-rotation-select");
const namedRotationNewName = document.getElementById("named-rotation-new-name");
const createNamedRotationButton = document.getElementById("create-named-rotation-button");
const deleteNamedRotationButton = document.getElementById("delete-named-rotation-button");
const namedRotationForm = document.getElementById("named-rotation-form");
const namedRotationEnabled = document.getElementById("named-rotation-enabled");
const namedRotationSequenceMode = document.getElementById("named-rotation-sequence-mode");
const namedRotationTransition = document.getElementById("named-rotation-transition");
const namedRotationPanelList = document.getElementById("named-rotation-panel-list");
const namedRotationUrl = document.getElementById("named-rotation-url");
const copyNamedRotationUrlButton = document.getElementById("copy-named-rotation-url-button");
const openNamedRotationPreviewButton = document.getElementById("open-named-rotation-preview-button");
const namedRotationStatus = document.getElementById("named-rotation-status");

let namedRotations = {};
let namedRotationPanels = {};

function normalizeNamedRotationName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function namedRotationPanelTitle(panelKey) {
  const panel = namedRotationPanels[panelKey];

  if (panel && typeof panel === "object" && typeof panel.title === "string") {
    return panel.title;
  }

  return panelKey;
}

function namedRotationEntryMap(rotation) {
  const map = new Map();

  for (const entry of rotation?.panels || []) {
    if (entry && typeof entry.panel === "string") {
      map.set(entry.panel, entry);
    }
  }

  return map;
}

function orderedNamedRotationPanelKeys(rotation) {
  return orderedRotationPanelKeys(rotation, namedRotationPanels);
}

function populateNamedRotationSelect(selectedName = "") {
  namedRotationSelect.replaceChildren();

  const names = Object.keys(namedRotations).sort();

  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    namedRotationSelect.append(option);
  }

  if (names.includes(selectedName)) {
    namedRotationSelect.value = selectedName;
  } else if (names.length > 0) {
    namedRotationSelect.value = names[0];
  }
}

function updateNamedRotationUrl() {
  const name = namedRotationSelect.value;

  if (!name) {
    namedRotationUrl.value = "";
    return;
  }

  const params = new URLSearchParams();
  params.set("rotation", name);
  namedRotationUrl.value = `${window.location.origin}/panel.html?${params.toString()}`;
}

function populateNamedRotationPanelList(rotation) {
  namedRotationPanelList.replaceChildren();

  const entryMap = namedRotationEntryMap(rotation);

  for (const panelKey of orderedNamedRotationPanelKeys(rotation)) {
    const entry = entryMap.get(panelKey);

    const row = document.createElement("div");
    row.className = "rotation-panel-row";
    row.dataset.panel = panelKey;

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox-label rotation-panel-checkbox";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "named-rotation-panel-enabled";
    checkbox.checked = Boolean(entry);

    const checkboxText = document.createElement("span");
    checkboxText.textContent = `${namedRotationPanelTitle(panelKey)} (${panelKey})`;

    checkboxLabel.append(checkbox, checkboxText);

    const durationLabel = document.createElement("label");
    durationLabel.className = "rotation-duration-label";

    const durationText = document.createElement("span");
    durationText.textContent = "Duration seconds";

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "1";
    durationInput.step = "1";
    durationInput.className = "named-rotation-panel-duration";
    durationInput.value = entry?.durationSeconds ?? 10;

    durationLabel.append(durationText, durationInput);

    row.append(checkboxLabel, durationLabel);
    addRotationOrderControls(row);
    namedRotationPanelList.append(row);
  }
}

function populateNamedRotationEditor() {
  const name = namedRotationSelect.value;
  const rotation = namedRotations[name];

  if (!rotation) {
    namedRotationEnabled.checked = false;
    namedRotationSequenceMode.value = "manual";
    namedRotationTransition.value = 500;
    namedRotationPanelList.replaceChildren();
    updateNamedRotationUrl();
    namedRotationStatus.textContent = "No named rotation selected.";
    return;
  }

  namedRotationEnabled.checked = rotation.enabled === true;
  namedRotationSequenceMode.value = normalizeRotationSequenceMode(rotation.sequenceMode);
  namedRotationTransition.value = rotation.transitionMilliseconds ?? 500;
  populateNamedRotationPanelList(rotation);
  updateNamedRotationUrl();
  namedRotationStatus.textContent = `Editing rotation group: ${name}`;
}

function collectNamedRotation() {
  const rows = [...namedRotationPanelList.querySelectorAll(".rotation-panel-row")];
  const panels = [];

  for (const row of rows) {
    const enabled = row.querySelector(".named-rotation-panel-enabled").checked;

    if (!enabled) {
      continue;
    }

    const durationInput = row.querySelector(".named-rotation-panel-duration");

    panels.push({
      panel: row.dataset.panel,
      durationSeconds: positiveNumberValue(durationInput, `${row.dataset.panel} duration`),
    });
  }

  if (panels.length === 0) {
    throw new Error("Named rotation must include at least one panel.");
  }

  return {
    enabled: namedRotationEnabled.checked,
    sequenceMode: normalizeRotationSequenceMode(namedRotationSequenceMode.value),
    panels,
    transitionMilliseconds: nonNegativeIntegerValue(
      namedRotationTransition,
      "Named rotation transition milliseconds",
    ),
    startPanel: panels[0].panel,
  };
}

async function loadNamedRotations(selectedName = "") {
  if (!namedRotationSelect) {
    return;
  }

  const data = await getJson("/api/admin/rotations");
  namedRotations = data.rotations || {};
  namedRotationPanels = data.panels || {};
  populateNamedRotationSelect(selectedName);
  populateNamedRotationEditor();
}

async function saveNamedRotation(event) {
  event.preventDefault();

  const name = namedRotationSelect.value;

  if (!name) {
    throw new Error("Select or create a named rotation group first.");
  }

  namedRotations[name] = collectNamedRotation();

  const data = await postJson("/api/admin/rotations", {
    rotations: namedRotations,
  });

  namedRotations = data.rotations || {};
  namedRotationPanels = data.panels || namedRotationPanels;
  populateNamedRotationSelect(name);
  populateNamedRotationEditor();
  setStatus(`Saved named rotation group: ${name}`, "success");
}

async function createNamedRotation() {
  const name = normalizeNamedRotationName(namedRotationNewName.value);

  if (!name) {
    throw new Error("Enter a rotation group name.");
  }

  if (namedRotations[name]) {
    throw new Error(`Rotation group already exists: ${name}`);
  }

  const panelKeys = Object.keys(namedRotationPanels);
  const startPanel = panelKeys.includes("raids") ? "raids" : panelKeys[0];

  namedRotations[name] = {
    enabled: true,
    panels: [
      {
        panel: startPanel,
        durationSeconds: 10,
      },
    ],
    transitionMilliseconds: 500,
    startPanel,
  };

  namedRotationNewName.value = "";

  const data = await postJson("/api/admin/rotations", {
    rotations: namedRotations,
  });

  namedRotations = data.rotations || {};
  namedRotationPanels = data.panels || namedRotationPanels;
  populateNamedRotationSelect(name);
  populateNamedRotationEditor();
  setStatus(`Created named rotation group: ${name}`, "success");
}

async function deleteNamedRotation() {
  const name = namedRotationSelect.value;

  if (!name) {
    return;
  }

  if (!confirm(`Delete named rotation group "${name}"?`)) {
    return;
  }

  delete namedRotations[name];

  const data = await postJson("/api/admin/rotations", {
    rotations: namedRotations,
  });

  namedRotations = data.rotations || {};
  namedRotationPanels = data.panels || namedRotationPanels;
  populateNamedRotationSelect();
  populateNamedRotationEditor();
  setStatus(`Deleted named rotation group: ${name}`, "success");
}

if (namedRotationSelect) {
  namedRotationSelect.addEventListener("change", populateNamedRotationEditor);

  namedRotationForm.addEventListener("submit", (event) => {
    saveNamedRotation(event).catch((error) => setStatus(error.message, "error"));
  });

  createNamedRotationButton.addEventListener("click", () => {
    createNamedRotation().catch((error) => setStatus(error.message, "error"));
  });

  deleteNamedRotationButton.addEventListener("click", () => {
    deleteNamedRotation().catch((error) => setStatus(error.message, "error"));
  });

  copyNamedRotationUrlButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(namedRotationUrl.value);
    setStatus("Copied named rotation URL.", "success");
  });

  openNamedRotationPreviewButton.addEventListener("click", () => {
    window.open(namedRotationUrl.value, "_blank", "noopener,noreferrer");
  });

  namedRotationPanelList.addEventListener("click", (event) => {
    if (event.target.closest(".rotation-move-up")) {
      moveRotationPanelRow(event.target, "up");
    }

    if (event.target.closest(".rotation-move-down")) {
      moveRotationPanelRow(event.target, "down");
    }
  });


  loadNamedRotations().catch((error) => {
    namedRotationStatus.textContent = `Could not load named rotations: ${error.message}`;
  });
}

// FLORA_NAMED_ROTATION_ADMIN_END

// FLORA_ADMIN_TABS_START
function floraInitializeAdminTabs() {
  const buttons = [...document.querySelectorAll("[data-admin-tab]")];
  const panels = [...document.querySelectorAll("[data-admin-tab-panel]")];

  if (!buttons.length || !panels.length) {
    return;
  }

  const availableTabs = new Set(buttons.map(button => button.dataset.adminTab));
  const savedTab = localStorage.getItem("flora-admin-active-tab");
  const defaultTab = availableTabs.has(savedTab) ? savedTab : buttons[0].dataset.adminTab;

  function activateTab(tabName) {
    buttons.forEach(button => {
      const isActive = button.dataset.adminTab === tabName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach(panel => {
      const isActive = panel.dataset.adminTabPanel === tabName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    localStorage.setItem("flora-admin-active-tab", tabName);
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.adminTab);
    });
  });

  activateTab(defaultTab);
}


// FLORA_UNIFIED_ROTATION_EDITOR_START
function initializeRotationEditorMode() {
  const modeSelect = document.getElementById("rotation-editor-mode");
  const note = document.getElementById("rotation-editor-note");
  const panels = [...document.querySelectorAll("[data-rotation-editor-panel]")];

  if (!modeSelect || panels.length === 0) {
    return;
  }

  const notes = {
    default: "Default Rotation is used by /panel.html?rotation=true.",
    named: "Named Profiles are used by /panel.html?rotation=<name>.",
  };

  function activateMode(mode) {
    const activeMode = mode === "named" ? "named" : "default";

    panels.forEach((panel) => {
      const isActive = panel.dataset.rotationEditorPanel === activeMode;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    modeSelect.value = activeMode;

    if (note) {
      note.textContent = notes[activeMode];
    }

    localStorage.setItem("flora-rotation-editor-mode", activeMode);
  }

  modeSelect.addEventListener("change", () => {
    activateMode(modeSelect.value);
  });

  activateMode(localStorage.getItem("flora-rotation-editor-mode") || "default");
}
// FLORA_UNIFIED_ROTATION_EDITOR_END

floraInitializeAdminTabs();
initializeRotationEditorMode();
// FLORA_ADMIN_TABS_END
