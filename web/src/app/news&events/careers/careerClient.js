import Link from "next/link";

export default function CareerClient({ pageData }) {
  const title = pageData?.tabCareers || "Careers & Job Opportunities";
  const subtitle = "Join our team of researchers, engineers, and staff pushing the boundaries of Artificial Intelligence.";
  const comingSoon = "Coming soon — check back for open positions!";

  return (
    <main className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400 animate-slide-down">
        {title}
      </h1>

      <p className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto animate-fade-in animate-delay-1">
        {subtitle}
      </p>

      <div className="mt-10 space-y-8 animate-fade-in">
        {/* UNDERGRADUATE */}
        <section className="space-y-2 animate-slide-up animate-delay-1">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            Undergraduate Research
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {comingSoon}
          </p>
        </section>

        {/* POST-GRADUATE */}
        <section className="space-y-2 animate-slide-up animate-delay-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            Post-Graduate (MSc & PhD)
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {comingSoon}
          </p>
        </section>

        {/* POSTDOCTORAL */}
        <section className="space-y-2 animate-slide-up animate-delay-3">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            Postdoctoral Researchers
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {comingSoon}
          </p>
        </section>

        {/* VISITING RESEARCHER */}
        <section className="space-y-2 animate-slide-up animate-delay-4">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            Visiting Researchers & Faculty
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {comingSoon}
          </p>
        </section>

        {/* SOFTWARE ENGINEER */}
        <section className="space-y-2 animate-slide-up animate-delay-5">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            Software & ML Engineers
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {comingSoon}
          </p>
        </section>

        {/* Anchor target for the top button */}
        <section id="open-positions" className="animate-slide-up animate-delay-6">
          <div className="mt-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center text-gray-600 dark:text-gray-400 bg-white/40 dark:bg-gray-900/40">
            {comingSoon}
          </div>
        </section>
      </div>
    </main>
  );
}
