import HistorySection from "./HistorySection";
import MissionClient from "./MissionClient";
import { FaRegCalendarAlt } from "react-icons/fa";

export const metadata = {
  title: "About – Mission & History | AIRi @ UTCN",
};

export default function AboutPage() {
  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <MissionClient />
          </div>

          <div className="flex flex-col items-center mb-8 border-t border-gray-200 dark:border-gray-700 pt-10 w-full">
            <FaRegCalendarAlt className="h-8 w-8 mb-2 text-primary-600 dark:text-accent-400" />
            <h2 className="heading-2 heading-accent">
              AIRI Timeline
            </h2>
          </div>

          <HistorySection />
        </section>
      </div>
    </main>
  );
}
