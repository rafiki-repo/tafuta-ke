// Coordinates for the business map (PRD-17).
// Stored in content_json.location as decimal degrees; hide_map suppresses public exposure.

const isUnset = (value) => value === undefined || value === null || value === '';

// Returns an error message when the location block is invalid, otherwise null.
export function validateLocation(location) {
  if (!location || typeof location !== 'object') return null;

  const { latitude, longitude, hide_map } = location;

  if (!isUnset(latitude) && (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return 'Latitude must be a number between -90 and 90';
  }
  if (!isUnset(longitude) && (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return 'Longitude must be a number between -180 and 180';
  }
  if (hide_map !== undefined && typeof hide_map !== 'boolean') {
    return 'hide_map must be true or false';
  }
  return null;
}

// Removes coordinates from a location block when the owner has hidden the map.
// Used for public responses so hidden coordinates never reach the browser.
export function redactHiddenCoordinates(location) {
  if (!location || location.hide_map !== true) return location;
  const { latitude, longitude, ...rest } = location;
  return rest;
}
