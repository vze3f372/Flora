let scrollController = null;
let lastRenderSignature = "";

const PANEL_RENDERERS = {
  table: renderTablePanel,
  goal: renderGoalPanel
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

function getPanelConfig(config, type) {
  return config.panels?.[type] ?? config.leaderboards?.[type] ?? null;
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

function sortEntries(entries, panelConfig) {
  const primary = panelConfig.sortBy;
  const secondary = panelConfig.sortThenBy;

  return entries.sort((a, b) => {
    const primaryDiff = getNumber(b[1][primary]) - getNumber(a[1][primary]);

    if (primaryDiff !== 0) {
      return primaryDiff;
    }

    if (!secondary) {
      return 0;
    }

    return getNumber(b[1][secondary]) - getNumber(a[1][secondary]);
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

  const sortFields = [panelConfig.sortBy, panelConfig.sortThenBy].filter(Boolean);
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

function clampPercentage(value) {
  return Math.max(0, Math.min(value, 100));
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
    <div class="table-panel-name">${escapeHtml(name)}</div>
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

async function renderPanel(force = false, configOverride = null) {
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

  const type = getQueryValue("type", "raids");
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

      <div class="goal-panel-progress" aria-label="${escapeHtml(percentLabel)}" style="--goal-progress: ${barPercentage}%"></div>

      ${statusText ? `
        <div class="goal-panel-percent">
          ${escapeHtml(statusText)}
        </div>
      ` : ""}
    </section>
  `;
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

  await renderPanel(true, config);

  if (refreshSeconds > 0) {
    setInterval(() => renderPanel(false), refreshSeconds * 1000);
  }
}

start();
