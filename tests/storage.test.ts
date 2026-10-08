import { readFileSync } from 'node:fs';
import test, { before, after } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, deleteObject, getMetadata } from 'firebase/storage';
let environment: RulesTestEnvironment;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-alamin-security', storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('storage.rules', 'utf8') } });
});
after(async () => { await environment?.cleanup(); });
const tinyImage = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
test('only a verified admin can upload permitted image types, and public images remain readable', async () => {
  const admin = environment.authenticatedContext('admin', { email: 'twagdy067@gmail.com', email_verified: true }).storage();
  await assertSucceeds(uploadBytes(ref(admin, 'gallery/security-test.png'), tinyImage, { contentType: 'image/png' }));
  const publicStore = environment.unauthenticatedContext().storage();
  await assertSucceeds(getMetadata(ref(publicStore, 'gallery/security-test.png')));
  await assertFails(uploadBytes(ref(publicStore, 'gallery/forged.png'), tinyImage, { contentType: 'image/png' }));
  const unverified = environment.authenticatedContext('unverified', { email: 'twagdy067@gmail.com', email_verified: false }).storage();
  await assertFails(uploadBytes(ref(unverified, 'gallery/forged.png'), tinyImage, { contentType: 'image/png' }));
});
test('SVG, oversized uploads and unknown paths are denied even to the admin', async () => {
  const admin = environment.authenticatedContext('admin', { email: 'twagdy067@gmail.com', email_verified: true }).storage();
  await assertFails(uploadBytes(ref(admin, 'gallery/unsafe.svg'), tinyImage, { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(admin, 'before_after/large.png'), new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(admin, 'unknown/file.png'), tinyImage, { contentType: 'image/png' }));
});
test('only the verified admin can delete an image', async () => {
  const admin = environment.authenticatedContext('admin', { email: 'twagdy067@gmail.com', email_verified: true }).storage();
  await assertSucceeds(uploadBytes(ref(admin, 'before_after/delete-test.png'), tinyImage, { contentType: 'image/png' }));
  const visitor = environment.unauthenticatedContext().storage();
  await assertFails(deleteObject(ref(visitor, 'before_after/delete-test.png')));
  await assertSucceeds(deleteObject(ref(admin, 'before_after/delete-test.png')));
});
