let scrollController = null;
let lastRenderSignature = "";

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

function renderColumns(boardConfig) {
    const columns = document.getElementById("leaderboard-columns");

    columns.innerHTML = `
        <div class="leaderboard-column leaderboard-column--rank">Rank</div>
        <div class="leaderboard-column leaderboard-column--name">Name</div>
        ${boardConfig.columns.map(column => `
            <div class="leaderboard-column leaderboard-column--${escapeHtml(column.className || column.field)}" style="${getColumnStyle(column)}">
                ${escapeHtml(column.label)}
            </div>
        `).join("")}
    `;
}

function getRankClass(rank) {
    if (rank === 1) return "leaderboard-row--gold";
    if (rank === 2) return "leaderboard-row--silver";
    if (rank === 3) return "leaderboard-row--bronze";
    return "";
}

function createRow(rank, name, stats, boardConfig) {
    const row = document.createElement("div");
    row.className = `leaderboard-row ${getRankClass(rank)}`.trim();

    const valueCells = boardConfig.columns.map(column => {
        const value = stats[column.field] ?? 0;
        const className = column.className || column.field;

        return `<div class="leaderboard-value leaderboard-value--${escapeHtml(className)}" style="${getColumnStyle(column)}">${escapeHtml(value)}</div>`;
    }).join("");

    row.innerHTML = `
        <div class="leaderboard-rank">${rank}.</div>
        <div class="leaderboard-name">${escapeHtml(name)}</div>
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
        gap.className = "leaderboard-scroll-gap";
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

function buildRenderSignature(type, boardConfig, data) {
    return JSON.stringify({
        type,
        boardConfig,
        data
    });
}

async function renderPanel(force = false) {
    const config = await loadJson("config.json", {});
    const type = getQueryValue("type", "raids");
    const boardConfig = config.leaderboards?.[type];

    if (!boardConfig) {
        document.getElementById("leaderboard-title").textContent = "UNKNOWN PANEL";
        document.getElementById("leaderboard-subtitle").textContent = type;
        document.getElementById("leaderboard-scroll-track").innerHTML =
            `<div class="leaderboard-empty">No configuration found</div>`;
        return;
    }

    const data = await loadJson(boardConfig.dataFile, {});
    const signature = buildRenderSignature(type, boardConfig, data);

    if (!force && signature === lastRenderSignature) {
        return;
    }

    lastRenderSignature = signature;

    document.getElementById("leaderboard-title").textContent = boardConfig.title;
    document.getElementById("leaderboard-subtitle").textContent = boardConfig.subtitle;

    renderColumns(boardConfig);

    const viewport = document.getElementById("leaderboard-rows");
    const track = document.getElementById("leaderboard-scroll-track");

    if (!scrollController) {
        scrollController = new ScrollController(track, viewport);
    }

    scrollController.reset();
    track.innerHTML = "";

    const entries = sortEntries(Object.entries(data), boardConfig);
    const maxRows = boardConfig.maxRows ?? 10;

    if (entries.length === 0) {
        track.innerHTML = `<div class="leaderboard-empty">No entries yet</div>`;
        track.classList.add("is-static");
        return;
    }

    entries.slice(0, maxRows).forEach(([name, stats], index) => {
        track.appendChild(createRow(index + 1, name, stats, boardConfig));
    });

    requestAnimationFrame(() => {
        scrollController.apply(boardConfig.scroll);
    });
}

async function start() {
    const config = await loadJson("config.json", {});
    const refreshSeconds = config.refreshSeconds ?? 5;

    await renderPanel(true);

    if (refreshSeconds > 0) {
        setInterval(() => renderPanel(false), refreshSeconds * 1000);
    }
}

start();
