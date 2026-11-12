import { getNewsArticles, transformNewsData } from '@/lib/strapi';

export const dynamic = 'force-dynamic';

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Route handler for the AIRI @ UTCN news RSS feed (/rss.xml).
 * Generates a valid RSS 2.0 XML document containing the latest published news articles.
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://airi.utcluj.ro';
  let articles = [];

  try {
    const rawArticles = await getNewsArticles({ pageSize: 50 });
    if (rawArticles && rawArticles.length > 0) {
      articles = transformNewsData(rawArticles);
    }
  } catch (error) {
    console.error('Error fetching news articles for RSS feed:', error);
    return new Response('News feed is temporarily unavailable', { status: 503 });
  }

  const itemsXml = articles.map((article) => {
    const link = article.slug
      ? `${siteUrl}/news&events/news/${article.slug}`
      : article.linkUrl || siteUrl;

    const pubDate = article.date
      ? new Date(article.date).toUTCString()
      : new Date().toUTCString();

    const title = article.title || 'AIRI News';
    const summary = article.summary || '';

    return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${summary}]]></description>
    </item>`;
  }).join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AIRi @ UTCN – News &amp; Updates</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Latest research news, press releases, and announcements from the Artificial Intelligence Research Institute at Technical University of Cluj-Napoca.</description>
    <language>en</language>
    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
