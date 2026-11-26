import { normalizeRoomNumber } from './rooms.js';

const titleCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function parseLaboratoryRoom(value) {
  // The hundreds digit is the floor. Ground-floor room numbers start with 0.
  const match = /^(?:l\s*[-.]?\s*)?([0-5]\d{2})$/.exec(normalizeRoomNumber(value));
  return match ? { floor: Number(match[1][0]), number: Number(match[1]) } : null;
}

export function groupLaboratoriesByFloor(laboratories) {
  const groups = new Map();

  for (const lab of laboratories) {
    const room = parseLaboratoryRoom(lab.roomNumber);
    const floor = room?.floor ?? null;
    if (!groups.has(floor)) groups.set(floor, []);
    groups.get(floor).push({ lab, roomNumber: room?.number ?? 0 });
  }

  return Array.from(groups)
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([floor, entries]) => ({
      floor,
      laboratories: entries
        .sort((a, b) => a.roomNumber - b.roomNumber || titleCollator.compare(a.lab.title || '', b.lab.title || ''))
        .map(({ lab }) => lab),
    }));
}
