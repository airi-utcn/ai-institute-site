import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import ThemeProvider from "@/components/ThemeProvider";
import RouteShell from "@/components/RouteShell";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { getGlobal } from "@/lib/strapi";
import { LocaleProvider } from "@/context/LocaleContext";

// Keep next-intl client provider during incremental migration until all individual pages are migrated
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

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const globalData = await getGlobal(locale);

  const title = globalData?.siteName || "AIRi @ UTCN";
  const description =
    globalData?.siteDescription ||
    "The Artificial Intelligence Research Institute (AIRi) at the Technical University of Cluj-Napoca advances research, innovation, and interdisciplinary collaboration in AI across healthcare, industry, energy, and education.";

  return {
    metadataBase: new URL("https://airi.utcluj.ro"),
    title: {
      template: `%s | ${title}`,
      default: `${title} – Artificial Intelligence Research Institute`,
    },
    description,
    openGraph: {
      type: "website",
      locale: locale === 'en' ? 'en_US' : `${locale}_${locale.toUpperCase()}`,
      siteName: title,
      title: `${title} – Artificial Intelligence Research Institute`,
      description,
      url: "https://airi.utcluj.ro",
      images: [
        {
          url: "/homepage/hero5.png",
          width: 1200,
          height: 630,
          alt: `${title} – Artificial Intelligence Research Institute at UTCN`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} – Artificial Intelligence Research Institute`,
      description,
      images: ["/homepage/hero5.png"],
    },
    alternates: {
      canonical: "/",
    },
  };
}

// Always render routes on-demand so Strapi data is fetched at first access.
export const dynamic = "force-dynamic";
// Allow individual fetches to opt into caching (we set force-cache in fetchAPI by default).
export const fetchCache = "force-cache";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  let locale = cookieStore.get('NEXT_LOCALE')?.value;

  if (!locale) {
    try {
      locale = await getLocale();
    } catch {
      locale = 'en';
    }
  }

  // Fetch Strapi global data for navbar, footer, metadata
  const globalData = await getGlobal(locale);

  // Temporary fallback for pages still using next-intl
  let messages = {};
  try {
    messages = await getMessages();
  } catch {}

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = stored ? stored === 'dark' : prefersDark;
                document.documentElement.classList.toggle('dark', isDark);
                document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
              } catch (e) {}\n            `,
          }}
        />

        {/* Structured Data for SEO */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

        <NextIntlClientProvider messages={messages}>
          <LocaleProvider locale={locale} globalData={globalData}>
            <ThemeProvider>
              <RouteShell>{children}</RouteShell>
            </ThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
