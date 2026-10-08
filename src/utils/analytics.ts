type Consent = 'granted' | 'denied';
type Gtag = (...args: any[]) => void;
const CONSENT_KEY = 'alamin_measurement_consent_v1';
const ALLOWED_EVENTS = new Set(['generate_lead', 'whatsapp_click', 'phone_call_click', 'quote_request_click']);
const ALLOWED_PARAMETERS = new Set(['source', 'service', 'lead_id', 'landing_page']);
const gaId = (import.meta.env || {} as ImportMetaEnv).VITE_GA_MEASUREMENT_ID || '';
const adsId = (import.meta.env || {} as ImportMetaEnv).VITE_GOOGLE_ADS_ID || '';
const adsLabel = (import.meta.env || {} as ImportMetaEnv).VITE_GOOGLE_ADS_LEAD_LABEL || '';
let loaded = false;

export function getConsent(): Consent | null {
  try { const value = localStorage.getItem(CONSENT_KEY); return value === 'granted' || value === 'denied' ? value : null; }
  catch { return null; }
}
export const isMeasurementConfigured = /^G-[A-Z0-9]+$/.test(gaId) || /^AW-\d+$/.test(adsId);

function gtag(): Gtag {
  const win = window as any;
  win.dataLayer ||= [];
  // Google processes gtag commands as Arguments objects, not plain arrays.
  win.gtag ||= function (..._args: any[]) { win.dataLayer.push(arguments); };
  return win.gtag;
}

function loadTags() {
  if (loaded || getConsent() !== 'granted' || !isMeasurementConfigured || window.location.pathname.startsWith('/admin')) return;
  loaded = true;
  const tag = gtag();
  tag('js', new Date());
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(/^G-[A-Z0-9]+$/.test(gaId) ? gaId : adsId)}`;
  document.head.appendChild(script);
  // Do not transmit query strings, hashes, form values, or user-provided URLs.
  const page = location.origin + location.pathname;
  if (/^G-[A-Z0-9]+$/.test(gaId)) tag('config', gaId, { page_location: page, page_referrer: '', allow_google_signals: false });
  if (/^AW-\d+$/.test(adsId)) tag('config', adsId, { page_location: page });
}

export function initializeMeasurement() {
  const tag = gtag();
  tag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  if (getConsent() === 'granted') setConsent('granted');
}

export function setConsent(choice: Consent) {
  try { localStorage.setItem(CONSENT_KEY, choice); } catch {}
  gtag()('consent', 'update', { analytics_storage: choice, ad_storage: choice,
    ad_user_data: 'denied', ad_personalization: 'denied' });
  if (choice === 'granted') loadTags();
  window.dispatchEvent(new Event('alamin-consent-change'));
}

export function safeEventParameters(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([key, value]) =>
    ALLOWED_PARAMETERS.has(key) && typeof value === 'string' && value.length <= 100));
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!ALLOWED_EVENTS.has(name) || !loaded || getConsent() !== 'granted') return;
  const safe = safeEventParameters(params);
  gtag()('event', name, { ...safe, page_location: location.origin + location.pathname });
  if (name === 'generate_lead' && /^AW-\d+$/.test(adsId) && /^[A-Za-z0-9_-]+$/.test(adsLabel)) {
    gtag()('event', 'conversion', { send_to: `${adsId}/${adsLabel}`, transaction_id: safe.lead_id,
      page_location: location.origin + location.pathname });
  }
}
