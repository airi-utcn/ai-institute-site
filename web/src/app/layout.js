import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DarkModeBubble from "@/components/DarkModeBubble";
import ThemeProvider from "@/components/ThemeProvider";
import Script from "next/script";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://airi.utcluj.ro"),
  title: {
    template: "%s | AIRi @ UTCN",
    default: "AIRi @ UTCN – Artificial Intelligence Research Institute",
  },
  description:
    "The Artificial Intelligence Research Institute (AIRi) at the Technical University of Cluj-Napoca advances research, innovation, and interdisciplinary collaboration in AI across healthcare, industry, energy, and education.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AIRi @ UTCN",
    title: "AIRi @ UTCN – Artificial Intelligence Research Institute",
    description:
      "Advancing research, innovation, and exploration in artificial intelligence at the Technical University of Cluj-Napoca.",
    url: "https://airi.utcluj.ro",
    images: [
      {
        url: "/homepage/hero5.png",
        width: 1200,
        height: 630,
        alt: "AIRi – Artificial Intelligence Research Institute at UTCN",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIRi @ UTCN – Artificial Intelligence Research Institute",
    description:
      "Advancing research, innovation, and exploration in artificial intelligence at the Technical University of Cluj-Napoca.",
    images: ["/homepage/hero5.png"],
  },
  alternates: {
    canonical: "/",
  },
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

        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

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
