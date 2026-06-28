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

const statusElement = document.getElementById("status");
const reloadButton = document.getElementById("reload-button");
const goalsForm = document.getElementById("goals-form");
const styleForm = document.getElementById("style-form");
const resetStyleButton = document.getElementById("reset-style-button");

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

  const [config, goals] = await Promise.all([
    fetchJson("/api/admin/config"),
    fetchJson("/api/admin/goals"),
  ]);

  populateGoals(goals);
  populateStyle(config.style || DEFAULT_STYLE);

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

renderUrlList("obs-url-list", obsUrls);
renderUrlList("streamerbot-url-list", streamerbotUrls);

loadAdminData().catch((error) => setStatus(error.message, "error"));
