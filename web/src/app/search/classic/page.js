export const metadata = {
  title: "Classic Search",
  description: "Search across AIRi's research, people, projects, and publications.",
};

import { Suspense } from "react";
import ClassicClient from "./ClassicClient";

export default function Page() {
  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading search...</div>}>
            <ClassicClient />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
