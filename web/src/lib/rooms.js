/**
 * Normalize room labels coming from different sources so they can be compared.
 *
 * Laboratories store values such as "L201", while Snipe-IT room custom fields
 * may be prefixed ("Room L201"). Case and repeated whitespace are ignored.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizeRoomNumber(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^room\s+/i, '')
    .replace(/\s+/g, ' ');
}
