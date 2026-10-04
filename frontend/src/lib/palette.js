// Color palettes for business websites.
//
// Each template reads its colors from a palette's `templates[template]` block. The Default
// values below are exactly the colors the templates used before palettes existed, so a
// business with no stored palette renders unchanged. The Default palette in
// public/palettes/palettes.json is generated from these same values.

export const DEFAULT_PALETTE_ID = "default";
export const DEFAULT_PALETTE_TITLE = "Default";

// Colours per template. Keys are CSS-variable names (--c-<key>) used by the template classes.
export const DEFAULT_TEMPLATE_COLORS = {
  classic: {
    base: "#ffffff",
    wash: "#f9fafb",
    soft: "#f3f4f6",
    line: "#f3f4f6",
    lineStrong: "#e5e7eb",
    rule: "#d1d5db",
    faint: "#9ca3af",
    muted: "#6b7280",
    secondary: "#4b5563",
    body: "#374151",
    ink: "#1f2937",
    text: "#111827",
    hero: "#1f2937",
    heroFrom: "#374151",
    heroTo: "#111827",
    accent: "#111827",
    accentText: "#ffffff",
    highlight: "#2563eb",
  },
  bold: {
    base: "#030712",
    panel: "#111827",
    panelHover: "#1f2937",
    line: "#1f2937",
    lineStrong: "#374151",
    tile: "#1f2937",
    faint: "#4b5563",
    muted: "#6b7280",
    soft: "#9ca3af",
    body: "#d1d5db",
    text: "#ffffff",
    accent: "#f97316",
    accentText: "#ffffff",
    highlight: "#fb923c",
    highlightHover: "#fdba74",
    heroFrom: "#ea580c",
    heroTo: "#f97316",
  },
  minimal: {
    base: "#ffffff",
    dark: "#111111",
    deepDark: "#0a0a0a",
    darkLine: "#1f2937",
    darkBorder: "#374151",
    onDark: "#ffffff",
    onDarkSubtle: "#4b5563",
    onDarkMuted: "#6b7280",
    onDarkBody: "#9ca3af",
    onDarkSoft: "#d1d5db",
    strip: "#f5f5f5",
    wash: "#f9fafb",
    line: "#f3f4f6",
    lineStrong: "#e5e7eb",
    rule: "#d1d5db",
    faint: "#9ca3af",
    muted: "#6b7280",
    secondary: "#4b5563",
    body: "#374151",
    ink: "#1f2937",
    text: "#111827",
    accent: "#222222",
    accentText: "#ffffff",
  },
  vibrant: {
    page: "#db2777",
    card: "#ec4899",
    deep: "#be185d",
    text: "#ffffff",
    highlight: "#831843",
    pill: "#ffffff",
  },
};

export const DEFAULT_PALETTE = {
  id: DEFAULT_PALETTE_ID,
  title: DEFAULT_PALETTE_TITLE,
  icon: `/palettes/icons/${DEFAULT_PALETTE_ID}.svg`,
  templates: DEFAULT_TEMPLATE_COLORS,
};

// Colours for one template: the palette's values, falling back to Default for anything missing.
export function resolveColors(palette, template) {
  return { ...DEFAULT_TEMPLATE_COLORS[template], ...(palette?.templates?.[template] || {}) };
}

// Inline style object that exposes a template's colours as CSS variables (--c-<key>).
export function colorVars(colors) {
  const vars = {};
  for (const [key, value] of Object.entries(colors)) {
    vars[`--c-${key}`] = value;
  }
  return vars;
}

// Loads the palette list once per page load (used by the palette picker and ?palette= previews).
let paletteListPromise = null;
export function loadPalettes() {
  if (!paletteListPromise) {
    paletteListPromise = fetch("/palettes/palettes.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Palettes failed to load (${res.status})`);
        return res.json();
      })
      .catch((err) => {
        paletteListPromise = null;
        throw err;
      });
  }
  return paletteListPromise;
}
