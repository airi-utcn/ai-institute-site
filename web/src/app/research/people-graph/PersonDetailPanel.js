"use client";

import Link from "next/link";

// Side panel shown when a person node is clicked. Pure presentational.
export default function PersonDetailPanel({ node, neighbors = [], onClose, onSelectNeighbor }) {
  if (!node) return null;

  return (
    <aside className="absolute top-0 right-0 z-20 h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#0e1320]/95 backdrop-blur-sm text-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: node.color }}
            />
            <h2 className="text-lg font-semibold leading-tight">{node.name}</h2>
          </div>
          {node.title && (
            <p className="mt-1 text-sm text-white/60">{node.title}</p>
          )}
          {node.departmentName && (
            <p className="mt-0.5 text-xs text-white/40">{node.departmentName}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 p-5 text-center">
        <Stat label="Collaborators" value={node.degree} />
        <Stat label="Publications" value={node.publicationCount} />
        <Stat label="Projects" value={node.projectCount} />
        <Stat label="Teams" value={node.teamCount} />
      </div>

      {node.projects?.length > 0 && (
        <Section title="Projects">
          <ul className="space-y-1">
            {node.projects.map((p) => (
              <li key={p.id} className="text-sm text-white/70">
                {p.title}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {node.teams?.length > 0 && (
        <Section title="Teams">
          <ul className="space-y-1">
            {node.teams.map((t) => (
              <li key={t.id} className="text-sm text-white/70">
                {t.title}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {neighbors.length > 0 && (
        <Section title={`Direct collaborators (${neighbors.length})`}>
          <ul className="space-y-1">
            {neighbors.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onSelectNeighbor?.(n)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm text-white/70 hover:bg-white/10"
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: n.color }}
                  />
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {node.slug && (
        <div className="p-5">
          <Link
            href={`/people/${node.slug}`}
            className="inline-block rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
          >
            View full profile →
          </Link>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-white/5 py-2">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-t border-white/10 p-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </h3>
      {children}
    </div>
  );
}
