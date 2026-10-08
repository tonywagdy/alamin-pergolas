import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let environment: RulesTestEnvironment;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-alamin-security', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
});
after(async () => { await environment?.cleanup(); });
const payload = () => ({ name: 'عميل اختبار', phone: '01012345678', city: 'التجمع الخامس', service: 'برجولة روف وأسطح', message: '', status: 'new', privacyConsent: true, landingPage: 'roof', createdAt: serverTimestamp() });

test('a public visitor can create a valid request but cannot read, update or delete it', async () => {
  const db = environment.unauthenticatedContext().firestore();
  const request = doc(db, 'leads', 'valid-request');
  await assertSucceeds(setDoc(request, payload()));
  await assertFails(getDoc(request));
  await assertFails(getDocs(collection(db, 'leads')));
  await assertFails(setDoc(request, { status: 'closed' }, { merge: true }));
  await assertFails(deleteDoc(request));
});
test('malformed requests and server-owned fields are rejected', async () => {
  const db = environment.unauthenticatedContext().firestore();
  const invalid = [{ phone: '123' }, { status: 'closed' }, { privacyConsent: false }, { unexpected: 'value' }, { name: '' }, { message: 'x'.repeat(1501) }, { city: '' }, { service: 'forged' }, { landingPage: 'forged' }, { createdAt: new Date(0) }];
  for (let i = 0; i < invalid.length; i++) await assertFails(setDoc(doc(db, 'leads', 'invalid-' + i), { ...payload(), ...invalid[i] }));
});
test('admin email requires a verified authenticated account', async () => {
  const verified = environment.authenticatedContext('admin', { email: 'twagdy067@gmail.com', email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(verified, 'gallery', 'admin-project'), { title: 'مشروع' }));
  await assertSucceeds(getDocs(collection(verified, 'leads')));
  for (const claims of [{ email: 'twagdy067@gmail.com', email_verified: false }, { email: 'other@example.com', email_verified: true }]) {
    const db = environment.authenticatedContext('other', claims).firestore();
    await assertFails(setDoc(doc(db, 'gallery', 'forbidden'), { title: 'forged' }));
    await assertFails(getDocs(collection(db, 'leads')));
  }
});
test('public gallery reads are allowed, all public management writes and unknown collections are denied', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(collection(db, 'gallery')));
  for (const collectionName of ['gallery', 'gallery_order', 'before_after', 'deleted_static_images', 'activity_log', '_chat_limits', 'unknown']) {
    await assertFails(setDoc(doc(db, collectionName, 'forbidden'), { test: true }));
  }
});
