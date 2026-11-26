import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getLaboratoryRoom, groupLaboratoriesByFloor } from '../src/lib/laboratory-floors.js';
import { LABORATORY_FLOOR_PLANS } from '../src/lib/laboratory-floor-plans.js';

test('room numbers identify all six floors, including formatted room labels', () => {
  for (let floor = 0; floor <= 5; floor++) {
    assert.deepEqual(getLaboratoryRoom(`L${floor}01`), {
      floor, room: `L${floor}01`, number: floor * 100 + 1,
    });
  }
  assert.equal(getLaboratoryRoom(' L 306 ').room, 'L306');
  assert.equal(getLaboratoryRoom('Room L-305').room, 'L305');
  assert.equal(getLaboratoryRoom('S.211').room, 'S211');
  assert.equal(getLaboratoryRoom('101').room, 'L101');
  for (const room of [null, '', 'Annex', 'L601', 'L101 / L201', 'L10']) {
    assert.equal(getLaboratoryRoom(room), null);
  }
});

test('groups by building floor and room number, with unknown floors at the end', () => {
  const labs = [
    { title: 'Latter ground room', roomNumber: 'L006' },
    { title: 'Second floor', roomNumber: 'L201' },
    { title: 'Same room B', roomNumber: 'L001' },
    { title: 'Unknown location' },
    { title: 'First floor', roomNumber: 'L101' },
    { title: 'Same room A', roomNumber: ' l-001 ' },
  ];
  const original = structuredClone(labs);
  const groups = groupLaboratoriesByFloor(labs);
  assert.deepEqual(groups.map(({ floor }) => floor), [0, 1, 2, null]);
  assert.deepEqual(groups[0].laboratories.map(({ title }) => title), [
    'Same room A', 'Same room B', 'Latter ground room',
  ]);
  assert.deepEqual(groups.at(-1).laboratories, [labs[3]]);
  assert.deepEqual(labs, original);
  assert.deepEqual(groupLaboratoriesByFloor([]), []);
});

test('plan dimensions match the source files and all markers are on their floor', () => {
  assert.equal(LABORATORY_FLOOR_PLANS.length, 6);
  LABORATORY_FLOOR_PLANS.forEach(({ src, width, height, rooms }, floor) => {
    const image = readFileSync(new URL(`../public${src}`, import.meta.url));
    assert.equal(image.readUInt32BE(16), width);
    assert.equal(image.readUInt32BE(20), height);
    for (const [room, [x, y]] of Object.entries(rooms)) {
      assert.equal(getLaboratoryRoom(room).floor, floor);
      assert.ok(x > 0 && x < width && y > 0 && y < height, room);
    }
  });
});
