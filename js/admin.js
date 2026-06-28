const DEFAULT_STYLE = {
  colors: {
    background: "#0f172a",
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
  startPanel: document.getElementById("rotation-start-panel"),
  transitionMilliseconds: document.getElementById("rotation-transition"),
  rotationUrl: document.getElementById("rotation-url"),
};

const obsUrls = [
  ["/panel.html?type=raids", "Raids"],
  ["/panel.html?type=bits", "Bits"],
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

function rotationEntryMap(rotation) {
  const map = new Map();

  for (const entry of rotation?.panels || []) {
    if (entry && typeof entry.panel === "string") {
      map.set(entry.panel, entry);
    }
  }

  return map;
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
  const panelKeys = Object.keys(availablePanels);

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
    rotationPanelList.append(row);
  }
}

function populateRotationStartPanel(rotation) {
  const panelKeys = Object.keys(availablePanels);
  rotationFields.startPanel.replaceChildren();

  for (const panelKey of panelKeys) {
    const option = document.createElement("option");
    option.value = panelKey;
    option.textContent = `${panelTitle(panelKey)} (${panelKey})`;
    rotationFields.startPanel.append(option);
  }

  if (panelKeys.includes(rotation.startPanel)) {
    rotationFields.startPanel.value = rotation.startPanel;
  } else if (panelKeys.length > 0) {
    rotationFields.startPanel.value = panelKeys[0];
  }
}

function updateRotationUrl() {
  const start = rotationFields.startPanel.value;
  const params = new URLSearchParams();
  params.set("rotation", "true");

  if (start) {
    params.set("start", start);
  }

  rotationFields.rotationUrl.value = `${window.location.origin}/panel.html?${params.toString()}`;
}

function populateRotation(rotation) {
  currentRotation = normalizeRotation(rotation);
  rotationFields.enabled.checked = currentRotation.enabled;
  rotationFields.transitionMilliseconds.value = currentRotation.transitionMilliseconds;
  populateRotationStartPanel(currentRotation);
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

  const startPanel = rotationFields.startPanel.value;

  if (!startPanel || !availablePanels[startPanel]) {
    throw new Error("Start panel must reference an existing panel.");
  }

  return {
    enabled: rotationFields.enabled.checked,
    panels,
    transitionMilliseconds: nonNegativeIntegerValue(
      rotationFields.transitionMilliseconds,
      "transitionMilliseconds",
    ),
    startPanel,
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
rotationFields.startPanel.addEventListener("change", updateRotationUrl);
eventThemeForm.addEventListener("submit", saveEventTheme);
resetEventThemeButton.addEventListener("click", resetEventThemeDefaults);

renderUrlList("obs-url-list", obsUrls, { preview: true });
renderUrlList("streamerbot-url-list", streamerbotUrls);

loadAdminData().catch((error) => setStatus(error.message, "error"));


loadBackups().catch((error) => {
  setStatus(`Could not load backup status: ${error.message}`, "error");
});

// FLORA_PRESETS_UI_START
const floraPresetName = document.getElementById("preset-name");
const floraPresetNote = document.getElementById("preset-note");
const floraExportPresetButton = document.getElementById("export-preset-button");
const floraReloadPresetsButton = document.getElementById("reload-presets-button");
const floraPresetSelect = document.getElementById("preset-select");
const floraPresetStatus = document.getElementById("preset-status");
const floraImportPresetButton = document.getElementById("import-preset-button");

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

function floraRenderPresets(presets) {
  floraPresetState.presets = Array.isArray(presets) ? presets : [];
  floraPresetSelect.replaceChildren();

  if (!floraPresetState.presets.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No presets available";
    floraPresetSelect.append(option);

    floraPresetStatus.textContent = "No presets exported yet.";
    floraImportPresetButton.disabled = true;
    return;
  }

  for (const preset of floraPresetState.presets) {
    const option = document.createElement("option");
    option.value = preset.filename;
    option.textContent = floraPresetOptionLabel(preset);
    floraPresetSelect.append(option);
  }

  const current = floraSelectedPreset();
  floraPresetStatus.textContent = current
    ? `Selected: ${current.path}`
    : "Select a preset.";
  floraImportPresetButton.disabled = false;
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

async function floraImportPreset() {
  const preset = floraSelectedPreset();

  if (!preset) {
    setStatus("No preset is selected.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Import preset "${preset.name}"?\n\n${preset.path}\n\nFlora will back up the current config and goals before importing.`
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
  floraImportPresetButton
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

  floraPresetSelect.addEventListener("change", () => {
    const preset = floraSelectedPreset();
    floraPresetStatus.textContent = preset ? `Selected: ${preset.path}` : "Select a preset.";
  });

  floraLoadPresets().catch((error) => {
    floraPresetStatus.textContent = `Could not load presets: ${error.message}`;
    floraImportPresetButton.disabled = true;
  });
}
// FLORA_PRESETS_UI_END
