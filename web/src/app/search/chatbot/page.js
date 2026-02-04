export const metadata = { title: "Search – AIRi Chatbot" };

import ChatbotClient from "./ChatbotClient";

export default function ChatbotSoon() {
  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <ChatbotClient />
        </section>
      </div>
    </main>
  );
}
