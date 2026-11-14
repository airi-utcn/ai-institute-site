import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { getLaboratoryLocation, groupLaboratoriesByFloor } from '../src/lib/laboratories.js';
import { LABORATORY_FLOOR_PLANS } from '../src/lib/laboratory-floor-plans.js';

test('room numbers locate laboratories on all six supplied floors', () => {
  for (let floor = 0; floor <= 5; floor++) {
    assert.deepEqual(getLaboratoryLocation(`L${floor}01`), {
      floor, room: `L${floor}01`, number: floor * 100 + 1,
    });
  }
  assert.equal(getLaboratoryLocation(' l - 203 ').room, 'L203');
  assert.equal(getLaboratoryLocation('S.211').floor, 2);
  assert.equal(getLaboratoryLocation('101').room, 'L101');
});

test('missing, ambiguous, or unsupported rooms never acquire an invented floor', () => {
  for (const room of [null, undefined, '', 'TBD', 'L601', 'L101 / L201', '1010', 'Building 2', 'L10']) {
    assert.equal(getLaboratoryLocation(room), null, String(room));
  }
});

test('shuffled labs are grouped in building order and sorted by room before title', () => {
  const labs = [
    { title: 'Alphabetically first', roomNumber: 'L206', slug: 'second-last' },
    { title: 'Unknown location', slug: 'unknown' },
    { title: 'Last floor', roomNumber: 'L501', slug: 'fifth' },
    { title: 'First room', roomNumber: 'L201', slug: 'second-first' },
    { title: 'Ground', roomNumber: 'L002', slug: 'ground' },
    { title: 'First', roomNumber: ' l-101 ', slug: 'first' },
    { title: 'Unknown room', roomNumber: 'Annex', slug: 'annex' },
  ];
  const original = structuredClone(labs);
  const groups = groupLaboratoriesByFloor(labs);
  assert.deepEqual(groups.map((group) => group.floor), [0, 1, 2, 5, null]);
  assert.deepEqual(groups[2].laboratories.map((lab) => lab.slug), ['second-first', 'second-last']);
  assert.equal(groups.at(-1).laboratories.length, 2);
  assert.equal(groups.flatMap((group) => group.laboratories).length, labs.length);
  assert.deepEqual(labs, original, 'grouping must not reorder the caller’s data');
});

test('filtered subsets contain only matching floors and empty results have no groups', () => {
  const labs = [
    { title: 'AI', roomNumber: 'L001' },
    { title: 'Robotics', roomNumber: 'L301' },
    { title: 'AI', roomNumber: 'L202' },
  ];
  assert.deepEqual(groupLaboratoriesByFloor(labs.filter((lab) => lab.title === 'AI')).map((group) => group.floor), [0, 2]);
  assert.deepEqual(groupLaboratoriesByFloor([]), []);
});

test('all six supplied floor plans are available', () => {
  assert.equal(LABORATORY_FLOOR_PLANS.length, 6);
  LABORATORY_FLOOR_PLANS.forEach((plan) => {
    assert.ok(existsSync(new URL(`../public${plan.src}`, import.meta.url)));
  });
});
