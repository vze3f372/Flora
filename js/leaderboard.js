async function loadJson(path, fallback) {
    try {
        const response = await fetch(path + "?cacheBust=" + Date.now());

        if (!response.ok) {
            throw new Error("Could not load " + path);
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        return fallback;
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

function sortEntries(entries, boardConfig) {
    const primary = boardConfig.sortBy;
    const secondary = boardConfig.sortThenBy;

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

function renderColumns(boardConfig) {
    const columns = document.getElementById("leaderboard-columns");

    columns.innerHTML = `
        <div>Rank</div>
        <div>Name</div>
        ${boardConfig.columns.map(column => `<div>${escapeHtml(column.label)}</div>`).join("")}
    `;
}

function createRow(rank, name, stats, boardConfig) {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    const valueCells = boardConfig.columns.map(column => {
        const value = stats[column.field] ?? 0;
        return `<div class="leaderboard-value leaderboard-value--${escapeHtml(column.field)}">${escapeHtml(value)}</div>`;
    }).join("");

    row.innerHTML = `
        <div class="leaderboard-rank">${rank}.</div>
        <div class="leaderboard-name">${escapeHtml(name)}</div>
        ${valueCells}
    `;

    return row;
}

async function renderLeaderboard() {
    const config = await loadJson("config.json", {});
    const type = getQueryValue("type", "raids");

    const boardConfig = config.leaderboards?.[type];

    if (!boardConfig) {
        document.getElementById("leaderboard-title").textContent = "UNKNOWN PANEL";
        document.getElementById("leaderboard-subtitle").textContent = type;
        document.getElementById("leaderboard-rows").innerHTML =
            `<div class="leaderboard-empty">No configuration found</div>`;
        return;
    }

    document.getElementById("leaderboard-title").textContent = boardConfig.title;
    document.getElementById("leaderboard-subtitle").textContent = boardConfig.subtitle;

    renderColumns(boardConfig);

    const data = await loadJson(boardConfig.dataFile, {});
    const rowsContainer = document.getElementById("leaderboard-rows");

    rowsContainer.innerHTML = "";

    const entries = sortEntries(Object.entries(data), boardConfig);
    const maxRows = boardConfig.maxRows ?? 10;

    if (entries.length === 0) {
        rowsContainer.innerHTML = `<div class="leaderboard-empty">No entries yet</div>`;
        return;
    }

    entries.slice(0, maxRows).forEach(([name, stats], index) => {
        rowsContainer.appendChild(createRow(index + 1, name, stats, boardConfig));
    });
}

async function start() {
    const config = await loadJson("config.json", {});
    const refreshSeconds = config.refreshSeconds ?? 5;

    await renderLeaderboard();

    setInterval(renderLeaderboard, refreshSeconds * 1000);
}

start();
