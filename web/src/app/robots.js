/**
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/search/"],
      },
    ],
    sitemap: "https://airi.utcluj.ro/sitemap.xml",
  };
}
