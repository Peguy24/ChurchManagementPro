import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://churchmanagementpro.com";

interface SeoProps {
  title: string;
  description: string;
  /** Optional explicit path; defaults to the current route */
  path?: string;
  noIndex?: boolean;
  /** Optional JSON-LD structured data object(s) injected into the page head. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head tags: title, description, self-referencing canonical,
 * Open Graph/Twitter metadata, and optional JSON-LD structured data.
 */
export function Seo({ title, description, path, noIndex, jsonLd }: SeoProps) {
  const location = useLocation();
  const pathname = path ?? location.pathname;
  const url = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, follow" /> : null}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;
