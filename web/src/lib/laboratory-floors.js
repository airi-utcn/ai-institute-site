import { normalizeRoomNumber } from './rooms.js';

const roomCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function getLaboratoryRoom(value) {
  const match = /^(?:([ls])\s*[-.]?\s*)?([0-5]\d{2})$/.exec(normalizeRoomNumber(value));
  if (!match) return null;

  const [, prefix = 'l', digits] = match;
  return {
    room: prefix.toUpperCase() + digits,
    floor: Number(digits[0]),
    number: Number(digits),
  };
}

export function groupLaboratoriesByFloor(laboratories) {
  const groups = new Map();

  for (const lab of laboratories) {
    const location = getLaboratoryRoom(lab.roomNumber);
    const floor = location?.floor ?? null;
    if (!groups.has(floor)) groups.set(floor, []);
    groups.get(floor).push({ lab, location });
  }

  return Array.from(groups)
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([floor, entries]) => ({
      floor,
      laboratories: entries
        .sort((a, b) =>
          (a.location?.number ?? Infinity) - (b.location?.number ?? Infinity)
          || roomCollator.compare(a.location?.room || '', b.location?.room || '')
          || roomCollator.compare(a.lab.title || '', b.lab.title || '')
        )
        .map(({ lab }) => lab),
    }));
}
