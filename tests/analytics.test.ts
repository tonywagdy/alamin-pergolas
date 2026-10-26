import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Run the actual browser module with Vite's build-time configuration and a
// controlled DOM. Never send test conversions to Google.
function measurement(options: { consent?: string; path?: string; hash?: string; fail?: boolean; brokenDom?: boolean; env?: Record<string, string> } = {}) {
  const env = {
    VITE_GA_MEASUREMENT_ID: 'G-TEST123', VITE_GOOGLE_ADS_ID: 'AW-123456',
    VITE_GOOGLE_ADS_LEAD_LABEL: 'form_label', VITE_GOOGLE_ADS_WHATSAPP_LABEL: 'whatsapp_label',
    VITE_GOOGLE_ADS_PHONE_LABEL: 'phone_label', ...options.env
  };
  const source = readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env', JSON.stringify(env));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const values = new Map([['alamin_measurement_consent_v1', options.consent || 'granted']]);
  const scripts: any[] = [];
  const location = { origin: 'https://www.alaminpergolas.com', pathname: options.path || '/', hash: options.hash || '', search: '?phone=private&gclid=test' };
  const window: any = { location, dispatchEvent: () => {}, dataLayer: [] };
  if (options.fail) window.gtag = () => { throw new Error('tag blocked'); };
  const exports: any = {};
  runInNewContext(compiled, { exports, window, location, Event,
    localStorage: { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) },
    document: { createElement: () => { if (options.brokenDom) throw Error('DOM unavailable'); return {}; }, head: { appendChild: (script: any) => scripts.push(script) } }
  });
  return { api: exports, window, scripts, events: () => Array.from(window.dataLayer as any[]).filter(item => item[0] === 'event'),
    conversions: () => Array.from(window.dataLayer as any[]).filter(item => item[0] === 'event' && item[1] === 'conversion') };
}

test('three customer actions use separate conversion labels; only confirmed forms have transaction IDs', () => {
  const m = measurement();
  m.api.initializeMeasurement();
  m.api.trackEvent('whatsapp_click', { source: 'hero', phone: 'private' });
  m.api.trackEvent('phone_call_click', { source: 'contact' });
  m.api.trackEvent('generate_lead', { lead_id: 'saved-lead-123', name: 'private' });
  assert.deepEqual(m.conversions().map(item => item[2].send_to), ['AW-123456/whatsapp_label', 'AW-123456/phone_label', 'AW-123456/form_label']);
  assert.equal(m.conversions()[0][2].transaction_id, undefined);
  assert.equal(m.conversions()[2][2].transaction_id, 'saved-lead-123');
  assert.equal(JSON.stringify(m.events()).includes('private'), false);
  assert.equal(JSON.stringify(m.events()).includes('gclid='), false);
});

test('rejecting or withdrawing consent prevents conversion events', () => {
  const denied = measurement({ consent: 'denied' });
  denied.api.initializeMeasurement();
  denied.api.trackEvent('whatsapp_click');
  assert.equal(denied.scripts.length, 0);
  assert.equal(denied.events().length, 0);
  const m = measurement();
  m.api.initializeMeasurement();
  m.api.setConsent('denied');
  m.api.trackEvent('generate_lead');
  assert.equal(m.events().length, 0);
});

test('blocked Google tags cannot break startup, consent choices, links or form success', () => {
  const m = measurement({ fail: true });
  assert.doesNotThrow(() => m.api.initializeMeasurement());
  assert.doesNotThrow(() => m.api.setConsent('granted'));
  for (const event of ['whatsapp_click', 'phone_call_click', 'generate_lead']) assert.doesNotThrow(() => m.api.trackEvent(event));
  const loaded = measurement();
  loaded.api.initializeMeasurement();
  loaded.window.gtag = () => { throw Error('late tag failure'); };
  assert.doesNotThrow(() => loaded.api.trackEvent('generate_lead', { lead_id: 'saved' }));
  const broken = measurement({ brokenDom: true });
  assert.doesNotThrow(() => broken.api.initializeMeasurement());
  assert.equal(broken.events().length, 0);
});

test('admin routes and hash navigation never send conversion events', () => {
  for (const config of [{ path: '/admin' }, { hash: '#admin' }]) {
    const m = measurement(config);
    m.api.initializeMeasurement();
    m.api.trackEvent('whatsapp_click');
    assert.equal(m.scripts.length, 0);
    assert.equal(m.events().length, 0);
  }
  const m = measurement();
  m.api.initializeMeasurement();
  m.window.location.hash = '#admin';
  m.api.trackEvent('generate_lead');
  assert.equal(m.events().length, 0);
});

test('tags load once and button/unknown events cannot invent form conversions', () => {
  const m = measurement();
  m.api.initializeMeasurement();
  m.api.setConsent('granted');
  m.api.initializeMeasurement();
  assert.equal(m.scripts.length, 1);
  m.api.trackEvent('quote_request_click');
  m.api.trackEvent('unknown');
  assert.equal(m.conversions().length, 0);
});

test('missing or invalid Ads labels do not send a conversion to another action', () => {
  const m = measurement({ env: { VITE_GOOGLE_ADS_WHATSAPP_LABEL: '', VITE_GOOGLE_ADS_PHONE_LABEL: 'invalid/label' } });
  m.api.initializeMeasurement();
  m.api.trackEvent('whatsapp_click');
  m.api.trackEvent('phone_call_click');
  assert.equal(m.conversions().length, 0);
  assert.equal(m.events().length, 2);
});
