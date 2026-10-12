import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveNewUploads } from '../src/utils/gallerySync';

test('keeps photos added while an earlier cloud upload is running', () => {
  const old = { id: 'old' }, added = { id: 'new' };
  assert.deepEqual(preserveNewUploads([old], [], [old, added]), [added]);
});
test('keeps failed photos and new photos without duplicating processed tasks', () => {
  const old = { id: 'old' }, retry = { id: 'old', retryCount: 1 }, added = { id: 'new' };
  assert.deepEqual(preserveNewUploads([old], [retry], [old, added]), [retry, added]);
});
test('removes completed tasks while preserving an unrelated pending upload', () => {
  assert.deepEqual(preserveNewUploads([{ id: 'done' }], [], [{ id: 'done' }, { id: 'waiting' }]), [{ id: 'waiting' }]);
});
