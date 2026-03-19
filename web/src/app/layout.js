import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DarkModeBubble from "@/components/DarkModeBubble";
import ThemeProvider from "@/components/ThemeProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Script from "next/script";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";

// 1. Import next-intl requirements
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

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

// 2. Make the layout async
export default async function RootLayout({ children }) {
  // 3. Fetch the locale and messages on the server side
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale} // 4. Use the dynamic locale here
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

        {/* Structured Data for SEO from master branch */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

        {/* 5. Wrap the app with NextIntlClientProvider from localization branch */}
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <DarkModeBubble />
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}