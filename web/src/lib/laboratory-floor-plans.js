// Coordinates are percentages of the original, uncropped issue #256 images.
// Only rooms explicitly labelled on those plans receive a map marker.
const upperRooms = (floor, labY, sharedY, leftY = sharedY, rightY = sharedY) => Object.fromEntries([
  ...[10.7, 19.8, 29.2, 67.3, 76.3, 85.3].map((x, i) => [
    `L${floor}0${i + 1}`, [x, labY],
  ]),
  ...[[7, 85.5], [8, 47], [9, 42], [10, 37], [11, 10]].map(([room, x]) => [
    `S${floor}${String(room).padStart(2, '0')}`, [x, room === 11 ? leftY : room === 7 ? rightY : sharedY],
  ]),
]);

export const LABORATORY_FLOOR_PLANS = [
  {
    src: '/laboratories/floor-plans/ground.png', width: 1280, height: 604,
    rooms: { L001: [10.4, 61.8], L002: [20, 61.8], L003: [66.9, 63.5], L004: [74.9, 63.5], S005: [58.2, 41.8] },
  },
  { src: '/laboratories/floor-plans/first.png', width: 1280, height: 538, rooms: upperRooms(1, 65, 40.5, 44, 45.5) },
  { src: '/laboratories/floor-plans/second.png', width: 1280, height: 538, rooms: upperRooms(2, 63.5, 38.5, 44, 41.5) },
  { src: '/laboratories/floor-plans/third.png', width: 1285, height: 574, rooms: upperRooms(3, 65, 43) },
  { src: '/laboratories/floor-plans/fourth.png', width: 1284, height: 601, rooms: upperRooms(4, 61, 40) },
  {
    src: '/laboratories/floor-plans/fifth.png', width: 1272, height: 586,
    rooms: {
      L501: [13.5, 68.3], L502: [20.9, 68.3], L503: [30.2, 68.3],
      L504: [63.8, 66.5], L505: [73.8, 66.5], L506: [80.3, 66.5],
      S507: [82, 49.5], S508: [46.8, 48.3], S509: [40.8, 48.3], S510: [13.5, 48.3],
    },
  },
];
