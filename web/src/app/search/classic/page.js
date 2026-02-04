export const metadata = { title: "Search – Classic" };

import ClassicClient from "./ClassicClient";

export default function Page() {
  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <ClassicClient />
        </section>
      </div>
    </main>
  );
}
