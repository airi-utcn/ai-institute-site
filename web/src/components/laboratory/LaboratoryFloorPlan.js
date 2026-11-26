'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getLaboratoryRoom } from '@/lib/laboratory-floors';
import { LABORATORY_FLOOR_PLANS } from '@/lib/laboratory-floor-plans';
import { usePageState } from '@/lib/usePageState';

export default function LaboratoryFloorPlan({ floor, label, laboratories, text }) {
  const [open, setOpen] = usePageState(`floor-plan-${floor}`, false);
  const { src, width, height, rooms } = LABORATORY_FLOOR_PLANS[floor];
  const labsByRoom = new Map();

  for (const lab of laboratories) {
    const room = getLaboratoryRoom(lab.roomNumber)?.room;
    if (!lab.slug || !rooms[room]) continue;
    if (!labsByRoom.has(room)) labsByRoom.set(room, []);
    labsByRoom.get(room).push(lab);
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="mb-6 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
    >
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300">
        {text.plan}
      </summary>
      <div className="px-4 pb-4">
        <p className="mb-2 text-sm text-gray-600 lg:hidden dark:text-gray-300">{text.scroll}</p>
        <div
          role="region"
          aria-label={`${label} · ${text.plan}`}
          tabIndex={0}
          className="overflow-x-auto rounded-lg border border-gray-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {open && (
            <div className="relative min-w-[48rem]">
              <Image
                src={src}
                width={width}
                height={height}
                alt={`${label} · ${text.plan}`}
                unoptimized
                className="block h-auto w-full"
              />
              {Array.from(labsByRoom, ([room, labs]) => {
                const [x, y] = rooms[room];
                const [lab] = labs;
                const sharedRoom = labs.length > 1;
                const href = sharedRoom
                  ? `#laboratory-${encodeURIComponent(lab.slug)}`
                  : `/research/laboratories/${encodeURIComponent(lab.slug)}`;
                const label = sharedRoom ? text.sharedRoom(room) : `${room} · ${lab.title}`;

                return (
                  <Link
                    key={room}
                    href={href}
                    aria-label={label}
                    title={label}
                    className="absolute flex h-8 min-w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-blue-600 bg-white px-1 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-700 hover:text-white focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    style={{ left: `${x / width * 100}%`, top: `${y / height * 100}%` }}
                  >
                    {room}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <a href={src} target="_blank" rel="noopener noreferrer" className="link-accent mt-3 inline-block text-sm">
          {text.fullPlan}
        </a>
      </div>
    </details>
  );
}
