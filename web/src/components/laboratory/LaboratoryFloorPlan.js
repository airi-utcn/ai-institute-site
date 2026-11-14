import Image from 'next/image';
import { LABORATORY_FLOOR_PLANS } from '@/lib/laboratory-floor-plans';

export default function LaboratoryFloorPlan({ floor, label }) {
  const plan = LABORATORY_FLOOR_PLANS[floor];
  if (!plan) return null;

  return (
    <details className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
      <summary className="cursor-pointer rounded-2xl px-5 py-4 text-sm font-semibold text-blue-700 dark:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
        View floor plan — {label}
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Scroll sideways to explore the plan on smaller screens.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white" role="region" aria-label={`${label} floor plan`} tabIndex={0}>
          <div className="min-w-[760px]">
            <Image
              src={plan.src}
              width={plan.width}
              height={plan.height}
              alt={`${label} layout showing laboratory and shared-space room numbers.`}
              unoptimized
              className="block h-auto w-full"
            />
          </div>
        </div>
        <a href={plan.src} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-300">
          Open full-size floor plan (opens in a new tab)
        </a>
      </div>
    </details>
  );
}
