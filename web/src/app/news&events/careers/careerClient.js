import Link from "next/link";

export default function CareerClient({ pageData }) {
  const title = pageData?.careersTitle || "Careers & Job Opportunities";
  const subtitle = pageData?.careersSubtitle || "Join our team of researchers, engineers, and staff pushing the boundaries of Artificial Intelligence.";
  const comingSoon = pageData?.careersComingSoon || "Coming soon — check back for open positions!";

  return (
    <main className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg border border-gray-100 dark:border-gray-800">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-primary-600 dark:text-accent-400 animate-slide-down">
        {title}
      </h1>

      {subtitle && (
        <p className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto animate-fade-in animate-delay-1 mb-10 text-lg">
          {subtitle}
        </p>
      )}

      <div className="mt-10 space-y-8 animate-fade-in">
        {/* UNDERGRADUATE */}
        <section className="space-y-3 animate-slide-up animate-delay-1 p-5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-gray-900 dark:text-gray-100">
            {pageData?.careersUndergrad || "Undergraduate Research"}
          </h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium">
            {comingSoon}
          </p>
        </section>

        {/* POST-GRADUATE */}
        <section className="space-y-3 animate-slide-up animate-delay-2 p-5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-gray-900 dark:text-gray-100">
            {pageData?.careersPostgrad || "Post-Graduate (MSc & PhD)"}
          </h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium">
            {comingSoon}
          </p>
        </section>

        {/* POSTDOCTORAL */}
        <section className="space-y-3 animate-slide-up animate-delay-3 p-5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-gray-900 dark:text-gray-100">
            {pageData?.careersPostdoc || "Postdoctoral Researchers"}
          </h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium">
            {comingSoon}
          </p>
        </section>

        {/* VISITING RESEARCHER */}
        <section className="space-y-3 animate-slide-up animate-delay-4 p-5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-gray-900 dark:text-gray-100">
            {pageData?.careersVisiting || "Visiting Researchers & Faculty"}
          </h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium">
            {comingSoon}
          </p>
        </section>

        {/* SOFTWARE ENGINEER */}
        <section className="space-y-3 animate-slide-up animate-delay-5 p-5 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-extrabold tracking-wide uppercase text-gray-900 dark:text-gray-100">
            {pageData?.careersSoftwareEngineer || "Software & ML Engineers"}
          </h2>
          <p className="text-gray-700 dark:text-gray-400 font-medium">
            {comingSoon}
          </p>
        </section>

        {/* Anchor target for open positions summary/list */}
        <section id="open-positions" className="animate-slide-up animate-delay-6">
          <div className="mt-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 bg-white/40 dark:bg-gray-900/40 font-medium text-lg">
            {comingSoon}
          </div>
        </section>
      </div>
    </main>
  );
}
