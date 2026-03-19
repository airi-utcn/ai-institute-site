export const metadata = {
  title: "Knowledge Graphs",
  description: "Explore AIRi's research landscape through interactive knowledge graphs.",
};

import KnowledgeGraphClient from "./KnowledgeGraphClient";

export default function KGPSoon() {
  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <KnowledgeGraphClient />
        </section>
      </div>
    </div>
  );
}
