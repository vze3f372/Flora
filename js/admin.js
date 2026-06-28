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

let availablePanels = {};
let currentRotation = DEFAULT_ROTATION;

const statusElement = document.getElementById("status");
const reloadButton = document.getElementById("reload-button");
const goalsForm = document.getElementById("goals-form");
const styleForm = document.getElementById("style-form");
const resetStyleButton = document.getElementById("reset-style-button");
const rotationForm = document.getElementById("rotation-form");
const resetRotationButton = document.getElementById("reset-rotation-button");
const copyRotationUrlButton = document.getElementById("copy-rotation-url-button");
const rotationPanelList = document.getElementById("rotation-panel-list");

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

  const [config, goals, rotationData] = await Promise.all([
    fetchJson("/api/admin/config"),
    fetchJson("/api/admin/goals"),
    fetchJson("/api/admin/rotation"),
  ]);

  availablePanels = rotationData.panels || config.panels || {};
  populateGoals(goals);
  populateStyle(config.style || DEFAULT_STYLE);
  populateRotation(rotationData.rotation || config.rotation || DEFAULT_ROTATION);

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

function renderUrlList(elementId, urls) {
  const container = document.getElementById(elementId);
  container.replaceChildren();

  for (const [path, label] of urls) {
    const row = document.createElement("div");
    row.className = "url-row";

    const labelElement = document.createElement("div");
    labelElement.className = "url-label";
    labelElement.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = absoluteUrl(path);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(input.value);
      setStatus(`Copied ${label} URL.`, "success");
    });

    row.append(labelElement, input, button);
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
copyRotationUrlButton.addEventListener("click", copyRotationUrl);
rotationFields.startPanel.addEventListener("change", updateRotationUrl);

renderUrlList("obs-url-list", obsUrls);
renderUrlList("streamerbot-url-list", streamerbotUrls);

loadAdminData().catch((error) => setStatus(error.message, "error"));
