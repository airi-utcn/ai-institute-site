import Image from 'next/image';
import { LABORATORY_FLOOR_PLANS } from '@/lib/laboratory-floor-plans';
import { getLaboratoryLocation } from '@/lib/laboratories';

export default function LaboratoryFloorPlan({ floor, label, laboratories }) {
  const plan = LABORATORY_FLOOR_PLANS[floor];
  if (!plan) return null;

  // Several laboratories may share a room. Its marker jumps to the first
  // matching card; the other laboratories in that room follow in room order.
  const rooms = new Map();
  laboratories.forEach((lab) => {
    const room = getLaboratoryLocation(lab.roomNumber)?.room;
    if (plan.rooms[room] && !rooms.has(room)) rooms.set(room, lab);
  });

  return (
    <details className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
      <summary className="cursor-pointer rounded-2xl px-5 py-4 text-sm font-semibold text-blue-700 dark:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
        View floor plan — {label}
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Highlighted rooms link to the laboratories listed below. Scroll sideways to explore the plan on smaller screens.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white" role="region" aria-label={`${label} floor plan`} tabIndex={0}>
          <div className="relative min-w-[760px]">
            <Image
              src={plan.src}
              width={plan.width}
              height={plan.height}
              alt={`${label} layout showing laboratory and shared-space room numbers.`}
              unoptimized
              className="block h-auto w-full"
            />
            {Array.from(rooms, ([room, lab]) => {
              const [left, top] = plan.rooms[room];
              return (
                <a
                  key={room}
                  href={`#laboratory-${lab.slug}`}
                  aria-label={`${room}: ${lab.title}`}
                  title={`${room}: ${lab.title}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-50/95 px-1.5 text-xs font-bold text-blue-900 shadow-md transition-colors hover:bg-blue-600 hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {room}
                </a>
              );
            })}
          </div>
        </div>
        <a href={plan.src} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-300">
          Open full-size floor plan (opens in a new tab)
        </a>
      </div>
    </details>
  );
}
