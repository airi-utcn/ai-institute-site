import Link from "next/link";
import { useTranslations } from "next-intl";

export default function CareerClient() {
  const t = useTranslations("news&events.careers");

  return (
    <main className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-950 text-black dark:text-white rounded-lg shadow-lg">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-blue-600 dark:text-yellow-400 animate-slide-down">
        {t("title")}
      </h1>

      <p className="text-gray-800 dark:text-gray-200 text-center max-w-3xl mx-auto animate-fade-in animate-delay-1">
        {t("subtitle")}
      </p>

      <div className="mt-10 space-y-8 animate-fade-in">
        {/* UNDERGRADUATE */}
        <section className="space-y-2 animate-slide-up animate-delay-1">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            {t("undergraduate")}
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {t("coming-soon")}
          </p>
        </section>

        {/* POST-GRADUATE */}
        <section className="space-y-2 animate-slide-up animate-delay-2">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            {t("postgraduate")}
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {t("coming-soon")}
          </p>
        </section>

        {/* POSTDOCTORAL */}
        <section className="space-y-2 animate-slide-up animate-delay-3">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            {t("postdoctoral")}
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {t("coming-soon")}
          </p>
        </section>

        {/* VISITING RESEARCHER */}
        <section className="space-y-2 animate-slide-up animate-delay-4">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            {t("visiting-researcher")}
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {t("coming-soon")}
          </p>
        </section>

        {/* SOFTWARE ENGINEER */}
        <section className="space-y-2 animate-slide-up animate-delay-5">
          <h2 className="text-xl font-extrabold tracking-wide uppercase">
            {t("software-engineer")}
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {t("coming-soon")}
          </p>
        </section>

        {/* Anchor target for the top button */}
        <section id="open-positions" className="animate-slide-up animate-delay-6">
          <div className="mt-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center text-gray-600 dark:text-gray-400 bg-white/40 dark:bg-gray-900/40">
            {t("coming-soon")}
          </div>
        </section>
      </div>
    </main>
  );
}