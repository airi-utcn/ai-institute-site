import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupLaboratoriesByFloor } from '../src/lib/laboratory-floors.js';

test('orders floors by their room-number prefix and sorts labs within each floor', () => {
  const labs = [
    { title: 'First by title', roomNumber: 'L206' },
    { title: 'Upper floor', roomNumber: 'L501' },
    { title: 'Ground room B', roomNumber: ' L 002 ' },
    { title: 'Earlier upstairs room', roomNumber: 'Room L-201' },
    { title: 'Ground room A', roomNumber: '001' },
    { title: 'First floor', roomNumber: 'L101' },
    { title: 'Room 201, second lab', roomNumber: 'L201' },
  ];
  const original = structuredClone(labs);
  const groups = groupLaboratoriesByFloor(labs);

  assert.deepEqual(groups.map(({ floor }) => floor), [0, 1, 2, 5]);
  assert.deepEqual(groups[0].laboratories, [labs[4], labs[2]]);
  assert.deepEqual(groups[2].laboratories, [labs[3], labs[6], labs[0]]);
  assert.deepEqual(labs, original);
});

test('keeps laboratories with missing or ambiguous room numbers in the final group', () => {
  const labs = [
    { title: 'Unspecified' },
    { title: 'Outside supported floors', roomNumber: 'L601' },
    { title: 'Multiple rooms', roomNumber: 'L101 / L204' },
    { title: 'Fifth floor', roomNumber: 'L502' },
  ];
  const groups = groupLaboratoriesByFloor(labs);

  assert.deepEqual(groups.map(({ floor }) => floor), [5, null]);
  assert.deepEqual(groups[1].laboratories, [labs[2], labs[1], labs[0]]);
  assert.deepEqual(groupLaboratoriesByFloor([]), []);
});
