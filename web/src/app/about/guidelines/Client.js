import { FaBookOpen, FaChalkboardTeacher, FaFlask, FaIdBadge } from "react-icons/fa";
import { useTranslations } from "next-intl";

function Tile({ label, href, icon: Icon }) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={`group flex flex-col items-center gap-3 p-4 rounded-xl ${
        href
          ? "focus:outline-none focus-visible:ring-2 ring-offset-2 ring-blue-500 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
          : "opacity-60 cursor-default"
      }`}
    >
      <span className="grid place-items-center h-16 w-16 rounded-full bg-[#0b3160] text-white shadow-md group-hover:scale-105 transition">
        <Icon className="h-8 w-8" aria-hidden />
      </span>
      <span className="text-[15px] text-slate-700 dark:text-slate-300 group-hover:underline text-center">
        {label}
      </span>
    </Wrapper>
  );
}

export default function Client() {
  const t = useTranslations("about.guidelines");

  const ITEMS = [
    { label: t("students"),    href: "/engagement/academic",  icon: FaBookOpen },
    { label: t("faculty"),     href: "/people",               icon: FaChalkboardTeacher },
    { label: t("researchers"), href: "/research/departments", icon: FaFlask },
    { label: t("staff"),       href: "/people",               icon: FaIdBadge },
  ];

  return (
    <main className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container max-w-6xl mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-xl p-6 md:p-10 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-10 text-blue-600 dark:text-yellow-400 tracking-tight text-center animate-slide-down">
          {t("title")}
        </h1>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-10">
          {ITEMS.map((it, i) => (
            <div key={it.label} className={`animate-slide-up animate-delay-${i + 1}`}>
              <Tile {...it} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}