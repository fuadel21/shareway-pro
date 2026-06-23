export type TravelMode = 'tren' | 'autobus' | 'transfer';

export type SearchParams = {
  origin: string;
  destination: string;
  date: string;
  passengers: string;
  mode: TravelMode;
};

const DEFAULT_OMIO_URL = 'https://www.omio.es/';

function replaceTokens(template: string, params: SearchParams) {
  const values: Record<string, string> = {
    origin: params.origin,
    destination: params.destination,
    date: params.date,
    passengers: params.passengers,
    mode: params.mode
  };

  return template.replace(/\{(origin|destination|date|passengers|mode)\}/g, (_, key: keyof typeof values) => encodeURIComponent(values[key] ?? ''));
}

export function buildOmioAffiliateUrl(params: SearchParams) {
  const template = process.env.NEXT_PUBLIC_OMIO_DEEPLINK_TEMPLATE;

  if (template && template.trim().length > 0) {
    return replaceTokens(template, params);
  }

  const base = process.env.NEXT_PUBLIC_OMIO_AFFILIATE_URL || DEFAULT_OMIO_URL;
  const url = new URL(base);

  url.searchParams.set('utm_source', 'sharewaypro');
  url.searchParams.set('utm_medium', 'affiliate');
  url.searchParams.set('utm_campaign', params.mode);
  url.searchParams.set('utm_content', `${params.origin}-${params.destination}-${params.date}-${params.passengers}`);

  return url.toString();
}
