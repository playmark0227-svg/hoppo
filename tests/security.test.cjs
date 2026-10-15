const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../functions/security.cjs');
const now = Date.parse('2026-10-15T06:00:00Z');
const current = { auth_time: now / 1000 - 60, email_verified: true };
const identity = { emailVerified: true, tokensValidAfterTime: new Date(now - 120000).toISOString() };

test('requests accept only the published origins and small object payloads', () => {
  for (const origin of [...S.ORIGINS, undefined]) {
    assert.doesNotThrow(() => S.validateRequest({ data: {}, rawRequest: { get: () => origin } }));
  }
  assert.throws(() => S.validateRequest({ data: {}, rawRequest: { get: () => 'https://attacker.example' } }), { code: 'permission-denied' });
  for (const data of [null, [], 'payload', { text: 'a'.repeat(16384) }]) {
    assert.throws(() => S.validateRequest({ data }), { code: 'invalid-argument' });
  }
  assert.doesNotThrow(() => S.validateRequest({ data: {}, rawRequest: { get: () => 'http://localhost' } }, true));
});

test('disabled, deleted, revoked and malformed sessions cannot reach account handlers', () => {
  assert.doesNotThrow(() => S.validateSession(current, identity, now));
  assert.throws(() => S.validateSession(current, null, now), { code: 'unauthenticated' });
  assert.throws(() => S.validateSession(current, { ...identity, disabled: true }, now), { code: 'unauthenticated' });
  assert.throws(() => S.validateSession(current, { ...identity, tokensValidAfterTime: new Date(now).toISOString() }, now), { code: 'unauthenticated' });
  for (const auth_time of [undefined, 0, -1, '123', Infinity, now / 1000 + 61]) {
    assert.throws(() => S.validateSession({ ...current, auth_time }, identity, now), { code: 'unauthenticated' });
  }
});

test('current email verification is required, while verified LINE claims remain supported', () => {
  assert.throws(() => S.validateSession(current, { ...identity, emailVerified: false }, now), { code: 'permission-denied' });
  assert.throws(() => S.validateSession({ ...current, email_verified: false }, identity, now), { code: 'permission-denied' });
  assert.doesNotThrow(() => S.validateSession({ auth_time: current.auth_time, lineVerified: true }, { ...identity, emailVerified: false }, now));
});

test('LINE linking and account deletion require a recent real sign-in', () => {
  assert.doesNotThrow(() => S.requireRecentLogin(current, now));
  for (const auth_time of [undefined, now / 1000 - 301, now / 1000 + 61]) {
    assert.throws(() => S.requireRecentLogin({ auth_time }, now), error => error.code === 'failed-precondition' && error.details.reason === 'recent-login-required');
  }
});
