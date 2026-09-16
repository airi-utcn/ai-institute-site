import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import { cookies } from "next/headers";
import { getSingleType } from "@/lib/strapi";
import ChatbotClient from "./ChatbotClient";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const search = await getSingleType("search-page", locale);

  return {
    title: search?.chatbotTitle || "AIRi Chatbot",
    description: "Ask questions about AIRi's research, people, and projects using our AI-powered chatbot.",
  };
}

export default async function ChatbotSoon() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const searchData = await getSingleType("search-page", locale);

  return (
    <>
      <FallbackDisclaimer isFallback={searchData?._isFallback} />
      <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <ChatbotClient searchData={searchData} />
        </section>
      </div>
    </div>
    </>
  );
}
