import type { GetServerSideProps } from 'next';

const DEFAULT_OMIO_URL = 'https://www.omio.es/';

type QueryValue = string | string[] | undefined;

function first(value: QueryValue, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function applyTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(origin|destination|date|passengers|mode)\}/g, (_, key: string) => encodeURIComponent(values[key] ?? ''));
}

function buildTargetUrl(query: Record<string, QueryValue>) {
  const values = {
    origin: first(query.origin),
    destination: first(query.destination),
    date: first(query.date),
    passengers: first(query.passengers, '1'),
    mode: first(query.mode, 'tren')
  };

  const template = process.env.OMIO_DEEPLINK_TEMPLATE || process.env.NEXT_PUBLIC_OMIO_DEEPLINK_TEMPLATE;

  if (template && template.trim()) {
    return applyTemplate(template, values);
  }

  const base = process.env.OMIO_AFFILIATE_URL || process.env.NEXT_PUBLIC_OMIO_AFFILIATE_URL || DEFAULT_OMIO_URL;
  const url = new URL(base);

  url.searchParams.set('utm_source', 'sharewaypro');
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_campaign', values.mode);
  url.searchParams.set('utm_content', `${values.origin}-${values.destination}-${values.date}-${values.passengers}`);

  return url.toString();
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  return {
    redirect: {
      destination: buildTargetUrl(query),
      permanent: false
    }
  };
};

export default function OmioRedirectPage() {
  return null;
}
