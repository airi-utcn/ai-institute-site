import PageHeader from "@/components/PageHeader";

const STRAPI_URL =
  process.env.STRAPI_INTERNAL_URL || "http://strapi:1337";


async function fetchCount(endpoint) {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/${endpoint}?pagination[pageSize]=1`,
      { cache: "no-store" }
    );

    if (!res.ok) return 0;

    const data = await res.json();
    return data.meta?.pagination?.total || 0;
  } catch {
    return 0;
  }
}

function AnalyticsCard({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg hover:shadow-yellow-500/10 transition-all duration-300">
      <p className="text-sm uppercase tracking-wider text-gray-400 mb-3">
        {label}
      </p>
      <p className="text-4xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

export default async function ResearchAnalyticsPage() {
  const publications = await fetchCount("publications");
  const projects = await fetchCount("projects");
  const people = await fetchCount("people");
  const departments = await fetchCount("departments");
  const researchUnits = await fetchCount("research-units");

  const stats = [
    { label: "Publications", value: publications },
    { label: "Projects", value: projects },
    { label: "Researchers", value: people },
    { label: "Departments", value: departments },
    { label: "Research Units", value: researchUnits },
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <PageHeader
        title="Research Analytics"
        subtitle="Institutional research metrics overview"
      />

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {stats.map((stat, index) => (
          <AnalyticsCard
            key={index}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </main>
  );
}
