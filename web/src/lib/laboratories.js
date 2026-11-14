export const FLOOR_LABELS = [
  'Ground floor',
  'First floor',
  'Second floor',
  'Third floor',
  'Fourth floor',
  'Fifth floor',
];

// Room numbers encode the floor: L001 is on the ground floor, L101 on
// the first floor, etc. S rooms are shared/support spaces on the same plans.
export function getLaboratoryLocation(roomNumber) {
  const match = String(roomNumber ?? '').trim().match(/^([LS])?\s*[-.]?\s*([0-5])(\d{2})$/i);
  if (!match) return null;

  return {
    floor: Number(match[2]),
    room: `${(match[1] || 'L').toUpperCase()}${match[2]}${match[3]}`,
    number: Number(`${match[2]}${match[3]}`),
  };
}

export function groupLaboratoriesByFloor(laboratories) {
  const groups = new Map();

  for (const lab of laboratories) {
    const floor = getLaboratoryLocation(lab.roomNumber)?.floor ?? null;
    if (!groups.has(floor)) {
      groups.set(floor, {
        floor,
        id: floor === null ? 'floor-unknown' : `floor-${floor}`,
        label: FLOOR_LABELS[floor] || 'Location to be confirmed',
        laboratories: [],
      });
    }
    groups.get(floor).laboratories.push(lab);
  }

  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  return Array.from(groups.values())
    .sort((a, b) => (a.floor ?? Infinity) - (b.floor ?? Infinity))
    .map((group) => ({
      ...group,
      laboratories: group.laboratories.sort((a, b) => {
        const roomA = getLaboratoryLocation(a.roomNumber);
        const roomB = getLaboratoryLocation(b.roomNumber);
        return (roomA?.number ?? Infinity) - (roomB?.number ?? Infinity)
          || collator.compare(roomA?.room || a.roomNumber || '', roomB?.room || b.roomNumber || '')
          || collator.compare(a.title || '', b.title || '');
      }),
    }));
}
