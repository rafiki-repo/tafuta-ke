// Map helpers for business coordinates (PRD-17).
// Only coordinates are ever passed to Google — never an address or description.

// True when both coordinates are set and the owner has not hidden the map.
export function hasMapLocation(location) {
  if (!location) return false;
  return (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    location.hide_map !== true
  );
}

export function mapEmbedUrl(location) {
  return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&output=embed`;
}

export function mapLinkUrl(location) {
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}

// Parses a decimal-degrees input. Returns null for empty input, NaN for junk, else a number.
export function parseCoordinate(value, min, max) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < min || n > max) return NaN;
  return n;
}
