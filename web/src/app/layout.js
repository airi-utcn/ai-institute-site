import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DarkModeBubble from "@/components/DarkModeBubble";
import ThemeProvider from "@/components/ThemeProvider";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AIRI",
  description:
    "The Artificial Intelligence Research Institute (AIRI) within the Technical University of Cluj-Napoca assumes a catalytic role in advancing research, innovation, and exploration in the field of artificial intelligence. AIRi contributes to the development of an ecosystem of excellence that generates a significant impact on society, the economy, and the academic environment. By integrating expertise from various constituent departments, ICIA aims to surpass individual results by promoting interdisciplinary collaboration, knowledge transfer, and the implementation of AI-based solutions in key sectors such as healthcare, industry, energy, or education. ICIA will also serve as a space for interaction between researchers, as well as between AI and human intelligence. ",
};

// Always render routes on-demand so Strapi data is fetched at first access.
export const dynamic = "force-dynamic";
// Allow individual fetches to opt into caching (we set force-cache in fetchAPI by default).
export const fetchCache = "force-cache";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              const stored = localStorage.getItem('theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const isDark = stored ? stored === 'dark' : prefersDark;
              document.documentElement.classList.toggle('dark', isDark);
              document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
            } catch (e) {}
          `}
        </Script>

        <ThemeProvider>
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <DarkModeBubble />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
