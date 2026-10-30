import { useEffect } from 'react';

const SITE_NAME = 'MAKU';

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function Seo({
  title,
  description,
  image,
  noIndex = false,
  type = 'website',
  jsonLd,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, unknown>;
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — თანამედროვე ატელიე`;

  useEffect(() => {
    document.title = fullTitle;
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('name', 'twitter:description', description);
    }
    setMeta('property', 'og:title', fullTitle);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', window.location.href);
    setLink('canonical', window.location.href);
    if (image) {
      const absolute = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMeta('property', 'og:image', absolute);
      setMeta('name', 'twitter:image', absolute);
    }
    setMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');
    const scriptId = 'maku-jsonld';
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (jsonLd) document.getElementById(scriptId)?.remove();
    };
  }, [fullTitle, description, image, noIndex, type, jsonLd]);

  return null;
}
