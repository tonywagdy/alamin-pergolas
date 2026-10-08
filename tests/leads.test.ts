import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, validateLead, awaitLeadConfirmation } from '../src/utils/leads';
import { safeEventParameters, trackEvent, initializeMeasurement, setConsent } from '../src/utils/analytics';

const valid = { name: 'عميل اختبار', phone: '٠١٠١٢٣٤٥٦٧٨', city: 'التجمع الخامس', service: 'برجولة روف وأسطح', message: '' };
test('normalizes Arabic and international Egyptian mobile numbers', () => {
  for (const phone of ['٠١٠١٢٣٤٥٦٧٨', '۰۱۰۱۲۳۴۵۶۷۸', '+20 1012345678', '00201012345678', '010-1234-5678']) assert.equal(normalizePhone(phone), '01012345678');
});
test('rejects invalid data instead of accepting arbitrary phone and service values', () => {
  assert.equal(validateLead(valid).data?.phone, '01012345678');
  for (const input of [{ phone: '123' }, { phone: '011234567890' }, { service: 'forged' }, { name: 'a' }, { city: '' }, { message: 'x'.repeat(1501) }]) assert.ok(validateLead({ ...valid, ...input }).error);
});
test('confirmation requires a successful remote write', async () => {
  await assert.rejects(awaitLeadConfirmation(Promise.reject(new Error('permission-denied'))), /permission-denied/);
  assert.equal(await awaitLeadConfirmation(Promise.resolve('confirmed')), 'confirmed');
});
test('timeout retry awaits the original write without a duplicate or false success', async () => {
  let finish: (value: string) => void;
  let writes = 0;
  const write = new Promise<string>(resolve => { writes++; finish = resolve; });
  await assert.rejects(awaitLeadConfirmation(write, 5), /confirmation-timeout/);
  finish!('saved');
  assert.equal(await awaitLeadConfirmation(write, 100), 'saved');
  assert.equal(writes, 1);
});
test('measurement parameters exclude names, phones, messages and arbitrary URL values', () => {
  assert.deepEqual(safeEventParameters({ name: 'Customer', phone: '01012345678', message: 'Private', page_location: '?phone=123', source: 'contact_section', service: 'برجولة روف وأسطح', lead_id: 'Abc123', extra: true }), { source: 'contact_section', service: 'برجولة روف وأسطح', lead_id: 'Abc123' });
});
test('unconfigured or rejected measurement never loads a Google script or sends an event', () => {
  const values = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) };
  (globalThis as any).window = { location: { pathname: '/' }, dispatchEvent: () => {} };
  (globalThis as any).document = { createElement: () => { throw Error('must not load tracking'); } };
  initializeMeasurement();
  assert.equal(Object.prototype.toString.call((globalThis as any).window.dataLayer[0]), '[object Arguments]');
  assert.equal((globalThis as any).window.dataLayer[0][0], 'consent');
  setConsent('denied');
  trackEvent('generate_lead', { lead_id: 'Abc123' });
  setConsent('granted');
  trackEvent('generate_lead', { lead_id: 'Abc123' });
  assert.equal((globalThis as any).window.dataLayer.some((item: unknown[]) => item[0] === 'event'), false);
});
