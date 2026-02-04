export const metadata = { title: "AIRi @ UTCN – Engagement" };
import Link from "next/link";

const items = [
  { href: "/engagement/public", title: "Public Engagement", desc: "Programs, resources and media for the public.", icon: "👥" },
  { href: "/engagement/academic", title: "Academic Engagement", desc: "Academic collaborations, courses, workshops.", icon: "🎓" },
  { href: "/engagement/industry", title: "Industry Engagement", desc: "Industrial projects, consulting, training.", icon: "🏭" },
  { href: "/engagement/high-school", title: "High-School Engagement", desc: "Competitions, events, resources for students.", icon: "📚" },
  { href: "/engagement/partners", title: "Partners", desc: "CLAIRE, ELLIS, AIoD, euRobotics, ADRA, AI4Europe, BDVA.", icon: "🤝" },
  { href: "/engagement/industrial-phd", title: "Industrial PhD", desc: "Doctoral programs with industry partners.", icon: "🔬" },
];

export default function EngagementPage() {
  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <header className="page-header">
          <h1 className="page-header-title">Engagement</h1>
          <p className="page-header-subtitle">
            Connecting AIRI @ UTCN with the public, academia, and industry.
          </p>
        </header>

        <div className="grid-cards">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="card card-hover p-6 group"
            >
              <div className="text-3xl mb-3">{it.icon}</div>
              <h2 className="heading-3 heading-accent group-hover:underline">{it.title}</h2>
              <p className="text-muted mt-2 text-sm">{it.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
