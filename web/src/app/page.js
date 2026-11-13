import { canonical } from "@/lib/metadata";
import FallbackDisclaimer from "@/components/FallbackDisclaimer";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { FaNewspaper } from "react-icons/fa";
import SmartMediaImage from "@/components/shared/SmartMediaImage";
import { gridSizes } from "@/lib/media";
import { getNewsArticles, transformNewsData, getSingleType, getGlobal } from "@/lib/strapi";

// The hero artwork is a static front-page asset, so its description is part of
// the code rather than the CMS. `home-page.heroAltHero` is no longer read.
const HERO_ART_ALT = "Abstract artwork with colourful wavy bands, circles, and geometric shapes";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const [home, globalData] = await Promise.all([
    getSingleType("home-page", locale),
    getGlobal(locale),
  ]);

  const title = home?.metaTitle || "AIRI - Home";
  const description = home?.metaDescription || "Advancing Artificial Intelligence Research at Technical University of Cluj-Napoca";
  const siteName = globalData?.siteName || "AIRi @ UTCN";
  const socialTitle = `${siteName} – Artificial Intelligence Research Institute`;
  const ogImage = {
    url: "/homepage/logoart-og.jpg",
    width: 1200,
    height: 630,
    alt: HERO_ART_ALT,
  };

  return {
    title,
    description,
    alternates: canonical('/'),
    // `openGraph` and `twitter` are replaced wholesale when defined here, so
    // the homepage keeps the site-wide fields while swapping in the artwork
    // that now leads the page.
    openGraph: {
      type: "website",
      locale: locale === 'en' ? 'en_US' : `${locale}_${locale.toUpperCase()}`,
      siteName,
      title: socialTitle,
      description,
      url: "https://airi.utcluj.ro",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage.url],
    },
  };
}

export default async function Home() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const home = await getSingleType("home-page", locale);

  let latestNews = [];
  try {
    const newsData = await getNewsArticles({ pageSize: 6, locale });
    latestNews = transformNewsData(newsData);
  } catch (error) {
    console.error("Failed to fetch news for homepage:", error);
  }

  const heroTitle = home?.heroTitle || "Artificial Intelligence Research Institute";
  const heroSubtitle = home?.heroSubtitle || "Advancing research, innovation, and exploration in artificial intelligence at the Technical University of Cluj-Napoca.";
  const noticeText = home?.noticeText || "AIRi@UTCN is currently under construction. Stay tuned to our channels for updates.";
  const aboutTitle = home?.aboutTitle || "About Us";
  const aboutDescription = home?.aboutDescription || "The Artificial Intelligence Research Institute (AIRi) serves as a hub for collaborative research across the Technical University of Cluj-Napoca.";
  const researchCardTitle = home?.researchCardTitle || "Research";
  const researchCardDescription = home?.researchCardDescription || "Explore our research units, themes, and ongoing projects.";
  const peopleCardTitle = home?.peopleCardTitle || "People";
  const peopleCardDescription = home?.peopleCardDescription || "Meet our researchers, faculty, and collaborative teams.";
  const resourcesCardTitle = home?.resourcesCardTitle || "Resources";
  const resourcesCardDescription = home?.resourcesCardDescription || "Discover tools, APIs, and learning materials curated by AIRi.";
  const contactCardTitle = home?.contactCardTitle || "Contact";
  const contactCardDescription = home?.contactCardDescription || (locale === "ro"
    ? "Colaborare, parteneriate sau întrebări — contactează-ne."
    : "Collaboration, partnerships, or questions — get in touch.");
  const latestNewsTitle = home?.latestNewsTitle || "Latest News";
  const latestNewsViewAll = home?.latestNewsViewAll || "View All News →";
  const latestNewsViewArticle = home?.latestNewsViewArticle || "View article";
  const latestNewsReadMore = home?.latestNewsReadMore || "Read more";
  const latestNewsEmptyState = home?.latestNewsEmptyState || "News articles will appear here once published.";
  const latestNewsVisitNews = home?.latestNewsVisitNews || "Visit News & Events →";

  return (
    <div>
      {/*
        Hero Section

        The front-page artwork (`logoart.jpeg`) is a 2:1 painting on a light
        canvas. It is intentionally rendered at its native aspect ratio instead
        of as a full-bleed `object-cover` background: cropping it to a viewport
        banner cuts the horizontal bands that make up the composition, and
        white text over the busy canvas is unreadable. The copy therefore sits
        above the artwork on a cream "gallery wall", and the painting hangs as
        a framed, uncropped print aligned with the rest of the site grid.

        The asset is a static front-page design choice (there is no heroImage
        field on the `home-page` single type); only the copy is CMS-driven.
      */}
      <section className="relative isolate overflow-hidden bg-[#f5f0e6] dark:bg-[#121110]">
        <div className="page-container pt-10 sm:pt-14 lg:pt-16 pb-10 sm:pb-14">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] text-[#1c1917] dark:text-[#f7f2e6]">
              {heroTitle}
            </h1>
            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-[#57534e] dark:text-gray-300 max-w-3xl mx-auto">
              {heroSubtitle}
            </p>
          </div>

          <div className="mt-10 sm:mt-12 overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/15 shadow-[0_30px_60px_-30px_rgba(64,45,20,0.45)]">
            <Image
              src="/homepage/logoart.jpeg"
              alt={HERO_ART_ALT}
              width={1600}
              height={800}
              priority
              sizes="(min-width: 1152px) 1088px, 100vw"
              className="w-full h-auto"
            />
          </div>

          {noticeText && (
            <p className="mt-6 flex items-start justify-center gap-2 text-center text-sm sm:text-base text-[#7a5c17] dark:text-amber-200/90 max-w-3xl mx-auto">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" />
              </svg>
              <span>{noticeText}</span>
            </p>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="page-container py-12 sm:py-16">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] md:gap-12">
          <div>
            <h2 className="heading-2 heading-accent">
              {aboutTitle}
            </h2>
            <div className="mt-4 h-1 w-16 rounded-full bg-accent-400" aria-hidden="true" />
          </div>
          <p className="text-body text-lg leading-relaxed">
            {aboutDescription}
          </p>
        </div>
      </section>

      {/* Quick Links Cards */}
      <section className="page-container pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/research/departments"
            className="card card-hover p-6 group flex flex-col"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-transform group-hover:scale-105 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </span>
              <svg className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600 dark:text-gray-500 dark:group-hover:text-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">{researchCardTitle}</h3>
            <p className="text-muted text-sm leading-relaxed">{researchCardDescription}</p>
          </Link>

          <Link
            href="/people"
            className="card card-hover p-6 group flex flex-col"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-transform group-hover:scale-105 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              <svg className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600 dark:text-gray-500 dark:group-hover:text-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">{peopleCardTitle}</h3>
            <p className="text-muted text-sm leading-relaxed">{peopleCardDescription}</p>
          </Link>

          <Link
            href="/resources"
            className="card card-hover p-6 group flex flex-col"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-transform group-hover:scale-105 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              <svg className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600 dark:text-gray-500 dark:group-hover:text-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">{resourcesCardTitle}</h3>
            <p className="text-muted text-sm leading-relaxed">{resourcesCardDescription}</p>
          </Link>

          <Link
            href="/contact"
            className="card card-hover p-6 group flex flex-col"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-transform group-hover:scale-105 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <svg className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-0.5 group-hover:text-primary-600 dark:text-gray-500 dark:group-hover:text-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </div>
            <h3 className="heading-3 heading-accent mb-2">{contactCardTitle}</h3>
            <p className="text-muted text-sm leading-relaxed">{contactCardDescription}</p>
          </Link>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="page-container pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="heading-2 heading-accent">{latestNewsTitle}</h2>
          <Link
            href="/news&events/news"
            className="btn-secondary text-sm"
          >
            {latestNewsViewAll}
          </Link>
        </div>

        {latestNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestNews.map((article) => (
              <article
                key={article.id || article.slug}
                className="card card-hover overflow-hidden group flex flex-col relative"
              >
                {article.image && (
                  <SmartMediaImage
                    src={article.image}
                    srcSet={article.imageSrcSet}
                    sizes={gridSizes({ columns: 3 })}
                    alt={article.imageAlt || article.title}
                    aspectRatio="h-40"
                    fit="cover"
                    focalPoint={article.focalPoint}
                    imageClassName="group-hover:scale-105"
                    fallbackClassName="bg-gray-100 dark:bg-gray-800 text-gray-400"
                    fallback={<FaNewspaper className="w-8 h-8 opacity-40" aria-hidden="true" />}
                  />
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <time className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                    {article.date ? new Date(article.date).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : ''}
                  </time>
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                      {article.summary}
                    </p>
                  )}
                  <div className="mt-auto pt-4 flex flex-wrap gap-3">
                    {article.slug && (
                      <Link
                        href={`/news&events/news/${article.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline after:absolute after:inset-0"
                      >
                        {latestNewsViewArticle}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                        </svg>
                      </Link>
                    )}
                    {article.linkUrl && (
                      <a
                        href={article.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                          article.slug ? 'relative z-10' : 'after:absolute after:inset-0'
                        }`}
                      >
                        {latestNewsReadMore}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13 5a1 1 0 1 0 0 2h3.586l-7.293 7.293a1 1 0 0 0 1.414 1.414L18 8.414V12a1 1 0 1 0 2 0V5h-7Z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-muted">{latestNewsEmptyState}</p>
            <Link href="/news&events/news" className="link-accent mt-2 inline-block">
              {latestNewsVisitNews}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
