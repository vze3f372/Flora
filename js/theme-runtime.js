const FLORA_STYLE_DEFAULTS = {
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

function floraNormalizeHex(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function floraHexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function floraRgba(hex, alpha) {
  const rgb = floraHexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function floraSetVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function floraApplyStyle(style) {
  const inputColors = style?.colors || {};
  const colors = {};

  for (const [key, fallback] of Object.entries(FLORA_STYLE_DEFAULTS.colors)) {
    colors[key] = floraNormalizeHex(inputColors[key], fallback);
  }

  floraSetVar("--flora-background", colors.background);
  floraSetVar("--flora-panel", colors.panel);
  floraSetVar("--flora-panel-alt", colors.panelAlt);
  floraSetVar("--flora-text", colors.text);
  floraSetVar("--flora-muted", colors.muted);
  floraSetVar("--flora-accent", colors.accent);
  floraSetVar("--flora-border", colors.border);
  floraSetVar("--flora-success", colors.success);
  floraSetVar("--flora-error", colors.error);

  floraSetVar("--text-primary", colors.text);
  floraSetVar("--text-secondary", colors.muted);
  floraSetVar("--accent-primary", colors.accent);
  floraSetVar("--accent-secondary", colors.accent);

  floraSetVar(
    "--panel-background",
    `linear-gradient(135deg, ${floraRgba(colors.panel, 0.94)}, ${floraRgba(colors.panelAlt, 0.78)})`
  );
  floraSetVar(
    "--panel-background-alt",
    `linear-gradient(135deg, ${floraRgba(colors.panelAlt, 0.96)}, ${floraRgba(colors.panel, 0.8)})`
  );
  floraSetVar("--panel-border", floraRgba(colors.border, 0.88));
  floraSetVar(
    "--panel-shadow",
    `0 0 18px ${floraRgba(colors.accent, 0.28)}, inset 0 0 28px ${floraRgba(colors.accent, 0.08)}`
  );
  floraSetVar("--panel-text", colors.text);
  floraSetVar("--panel-muted", colors.muted);

  floraSetVar(
    "--row-background",
    `linear-gradient(90deg, ${floraRgba(colors.panelAlt, 0.72)}, ${floraRgba(colors.panel, 0.42)})`
  );
  floraSetVar("--row-border", floraRgba(colors.border, 0.56));

  floraSetVar(
    "--accent-glow",
    `0 0 10px ${floraRgba(colors.accent, 0.82)}, 0 0 24px ${floraRgba(colors.accent, 0.34)}`
  );
  floraSetVar("--value-glow", `0 0 8px ${floraRgba(colors.accent, 0.56)}`);

  floraSetVar("--goal-fill", colors.accent);
  floraSetVar("--goal-empty", colors.panelAlt);
  floraSetVar("--event-type-color", colors.accent);

  document.body.style.background = colors.background;
}

async function floraLoadStyle() {
  try {
    const response = await fetch("/api/admin/config", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const config = await response.json();
    floraApplyStyle(config.style || FLORA_STYLE_DEFAULTS);
  } catch {
    // Keep the static CSS theme if the admin API is unavailable.
  }
}

floraLoadStyle();
