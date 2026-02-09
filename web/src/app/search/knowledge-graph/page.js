export const metadata = { title: "Search – Knowledge Graphs" };

import KnowledgeGraphClient from "./KnowledgeGraphClient";

export default function KGPSoon() {
  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <KnowledgeGraphClient />
        </section>
      </div>
    </main>
  );
}
