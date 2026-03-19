export const metadata = {
  title: "AIRi Chatbot",
  description: "Ask questions about AIRi's research, people, and projects using our AI-powered chatbot.",
};

import ChatbotClient from "./ChatbotClient";

export default function ChatbotSoon() {
  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <section className="card p-6 md:p-10">
          <ChatbotClient />
        </section>
      </div>
    </div>
  );
}
