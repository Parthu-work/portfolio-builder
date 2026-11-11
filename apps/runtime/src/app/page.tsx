import { loadPortfolio, siteUrl } from "../lib/load";
import { htmlToText } from "../render/sanitize";
import type { Portfolio } from "../schema/portfolio";
import { TemplateView } from "../templates/registry";

// ISR: edits published in the builder appear within the hour, no redeploy needed.
export const revalidate = 3600;

function personJsonLd(p: Portfolio) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.profile.name,
    url,
    ...(p.profile.headline ? { jobTitle: htmlToText(p.profile.headline) } : {}),
    ...(p.meta.description ? { description: p.meta.description } : {}),
    ...(p.profile.email ? { email: `mailto:${p.profile.email}` } : {}),
    ...(p.profile.location ? { address: { "@type": "PostalAddress", addressLocality: p.profile.location } } : {}),
    ...(p.profile.avatar?.src ? { image: new URL(p.profile.avatar.src, url).toString() } : {}),
    ...(p.profile.socials.length ? { sameAs: p.profile.socials.map((s) => s.url).filter(Boolean) } : {}),
  };
}

export default async function Page() {
  const portfolio = await loadPortfolio();
  return (
    <>
      <script
        type="application/ld+json"
        // "<" is escaped so user text can never close the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(portfolio)).replace(/</g, "\\u003c") }}
      />
      <TemplateView portfolio={portfolio} />
    </>
  );
}
