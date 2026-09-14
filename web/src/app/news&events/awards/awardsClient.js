"use client";

export default function AwardsClient({ pageData }) {
  const title = pageData?.tabAwards || "Awards";
  const subtitle = "Recognizing excellence, impactful contributions, and research achievements across the Artificial Intelligence Research Institute.";
  const comingSoon = "Coming soon — check back for awards and recognitions!";

  return (
    <main className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400 animate-slide-down">
        {title}
      </h1>

      <p className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto animate-fade-in animate-delay-1">
        {subtitle}
      </p>

      <div className="mt-10 animate-fade-in animate-delay-2">
        <p className="text-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-white dark:bg-gray-900 animate-slide-up animate-delay-3">
          {comingSoon}
        </p>
      </div>
    </main>
  );
}
