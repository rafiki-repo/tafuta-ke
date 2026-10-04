# PRD-18: Website Color Palettes

**Product Requirements Document**
**Version:** 1.0
**Last Updated:** October 2026
**Status:** Implemented — builds clean; awaiting visual check on phone and desktop

---

## 1. Overview

Business one-page websites ([PRD-15](PRD-15-business-website-templates.md)) used fixed colors hardcoded into each template. This PRD adds **color palettes**: owners choose a palette on the Website tab, and every template on that site uses it. A palette is a set of colors per template, so each template keeps its own look within the same color family.

## 2. Goals

- Owners choose a color scheme for their website without editing code.
- Owners preview a palette on their site before saving.
- A saved website never changes unless its owner picks a different palette, even when the list of palettes changes.
- Existing websites keep their current look.
- The public site needs no extra lookup to render colors.

## 3. Palette Data

Palettes live in `frontend/public/palettes/palettes.json` and are served as static files.

Each palette:

```json
{
  "id": "royal-blue",
  "title": "Royal Blue",
  "icon": "/palettes/icons/royal-blue.svg",
  "templates": {
    "classic": { "base": "#ffffff", "text": "#172554", "accent": "#1d4ed8", "...": "..." },
    "bold":    { "base": "#0c1a3d", "text": "#eff6ff", "accent": "#3b82f6", "...": "..." },
    "minimal": { "base": "#ffffff", "dark": "#1e3a8a", "...": "..." },
    "vibrant": { "page": "#1d4ed8", "card": "#2563eb", "...": "..." }
  }
}
```

- **ID and title:** the ID is stable and is what preview links carry. The title is shown to owners.
- **Per-template colors:** each template has its own set of keys. The keys are the same for every palette, so a palette always defines every color a template uses.
- **Icon:** `icons/{id}.svg`, a rounded square with a letter T and a letter H. The square's fill is the Bold template's `base`. Its border is `accent`. The T is `text`, and the H is `highlight`.
- **Default palette:** `id: "default"`. Its colors are the templates' original colors, exactly as they were before palettes existed.
- **Set:** 25 palettes in total, including Default. The set covers black, white, deep grays, blue, light blue, orange, red, hot pink, green, teal, and variations of each.

The 24 non-default palettes were generated once by a one-off script (not kept in the repository) from a few seed colors per template. Shades in between are derived from those seeds. The generator also nudges any text color that falls below 4.5:1 contrast on its background.

## 4. Storage

- The owner's choice is saved as `content_json.color_palette`, a full copy of the palette object (ID, title, icon and all template colors).
- Saving copies the whole palette into the business record. Later changes to `palettes.json` do not affect saved websites.
- The public site endpoint (`GET /api/site/:tag`) returns `color_palette` as stored. When it is absent, the site uses Default.

## 5. Owner Experience (Website tab)

- Under the template picker is a **Colors:** row showing the current palette's icon and title, with a **Change** button.
- **Change** opens a scrollable list of palettes, each with its icon and name. The current one is marked.
- Choosing a palette does not save it. The owner presses **Save** like any other change.
- A business with no saved palette shows Default, and Default is saved on its first save.

## 6. Preview

- Each template's existing **Preview** link adds the currently selected palette: `/site/{tag}?template={template}&palette={id}`.
- The preview shows the unsaved selection and reflects the palette without saving.
- The preview banner names the palette when one is applied.
- Limit: preview works only when the website is live, as it already does. This PRD does not change that.

## 7. Rendering

- `frontend/src/lib/palette.js` holds the Default colors for each template and a helper that merges a palette over Default. Any missing key falls back to Default.
- Each template sets its colors as CSS variables (`--c-<key>`) on its root element. Classes read those variables.
- Fixed colors are not part of any palette:
  - WhatsApp green, since it is a brand color.
  - Black and white overlays on photos.
  - Cart and booking UI, which remains disabled ([PRD-15 §4.7](PRD-15-business-website-templates.md)).
- The photo lightbox ([PRD-15](PRD-15-business-website-templates.md)) uses fixed colors.

## 8. Out of Scope

- Owner-created or custom palettes. The list is maintained by the developer.
- Per-element color overrides. An owner picks a whole palette, not individual colors.
- Dark mode switching.
- Changing the palette list from the admin area.

## 9. Known Limits

- **Icon caching:** icons are images, and the service worker caches images for 30 days. If a palette's icon changes, a visitor may see the old one for a while.
- **Preview needs a live website:** the owner preview returns "not available" while the website is off.

## 10. Verification

- Each palette renders on all four templates without missing colors.
- A business with no saved palette looks the same as before this change.
- Changing a palette does not change a saved website.
- The palette preview shows the selection without saving.
- The Default palette in `palettes.json` matches the code's Default values.
