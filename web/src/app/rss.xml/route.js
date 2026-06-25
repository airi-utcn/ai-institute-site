import { fetchAPI } from '@/lib/strapi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchAPI('/news-articles?sort=publishedDate:desc');
  const articles = data.data || [];

  const siteUrl = 'https://airi.utcluj.ro';

  const items = articles.map((article) => {
    const link = article.slug
      ? `${siteUrl}/news&events/news/${article.slug}`
      : article.linkUrl || siteUrl;

    const pubDate = article.publishedDate
      ? new Date(article.publishedDate).toUTCString()
      : new Date().toUTCString();

    return `
    <item>
      <title><![CDATA[${article.title || ''}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${article.summary || ''}]]></description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AIRi @ UTCN – News</title>
    <link>${siteUrl}</link>
    <description>Latest news and updates from the AI Research Institute at UTCN</description>
    <language>en</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}