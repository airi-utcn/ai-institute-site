"use client";

import { FaCube } from "react-icons/fa";
import VirtualTourShowcase from "@/components/tour/VirtualTourShowcase";
import { normalizeExternalUrl } from "@/lib/matterport";

const DEFAULT_LEAD =
  "Explore AIRi's facilities at the Technical University of Cluj-Napoca in an interactive 3D tour.";

export default function Client({ aboutData }) {
  const title = aboutData?.virtualTourTitle || "Virtual Tour";
  const tourUrl = normalizeExternalUrl(aboutData?.virtualTourUrl);
  const content = aboutData?.virtualTourLead || (tourUrl ? DEFAULT_LEAD : "");

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10 animate-fade-in">
        <header className="mx-auto mb-8 max-w-3xl text-center animate-slide-down">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 text-blue-600 dark:text-yellow-400 tracking-tight">
            {title}
          </h1>
          {content && (
            <p className="text-gray-700 dark:text-gray-300 animate-slide-up animate-delay-1">
              {content}
            </p>
          )}
        </header>

        {tourUrl ? (
          <VirtualTourShowcase url={tourUrl} title={title} />
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
            <FaCube
              className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {aboutData?.virtualTourComingSoon || "Content coming soon."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
