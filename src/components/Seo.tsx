import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://churchmanagementpro.com";

interface SeoProps {
  title: string;
  description: string;
  /** Optional explicit path; defaults to the current route */
  path?: string;
  noIndex?: boolean;
}

/**
 * Per-route head tags: title, description, self-referencing canonical
 * and Open Graph URL/title/description.
 */
export function Seo({ title, description, path, noIndex }: SeoProps) {
  const location = useLocation();
  const pathname = path ?? location.pathname;
  const url = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;

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
    </Helmet>
  );
}

export default Seo;
