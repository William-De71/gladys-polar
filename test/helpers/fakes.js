// A fake Polar (token endpoint + AccessLink v3), served through the `fetch`
// option of the integration. It behaves like the documentation says:
//   - the token endpoint wants HTTP Basic client_id:client_secret, and a code
//     used twice is refused AND deletes every token issued (`revoked`), which
//     the tests check never happens;
//   - POST /v3/users answers 200 the first time, 409 afterwards;
//   - every /v3 request needs the Bearer token, 401 once revoked.
// Tests never touch the network.

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';

import { answers as defaultAnswers } from './polar-data.js';

const CLIENT = { id: 'd52d533a-3c71-4141-aea6-3402519678aa', secret: 'verySecret' };
const CONFIG = { client_id: CLIENT.id, client_secret: CLIENT.secret, language: 'fr' };
const REDIRECT = 'https://my.gladysassistant.com/redirect/oauth';
const silent = { info() {}, warn() {}, error() {}, debug() {} };

const ROUTES = [
  ['POST', /^\/v2\/oauth2\/token$/, 'token'],
  ['POST', /^\/v3\/users$/, 'register'],
  ['GET', /^\/v3\/users\/activities$/, 'activities'],
  ['GET', /^\/v3\/users\/sleep$/, 'sleep'],
  ['GET', /^\/v3\/users\/nightly-recharge$/, 'recharges'],
  ['GET', /^\/v3\/users\/cardio-load$/, 'cardio'],
  ['GET', /^\/v3\/users\/physical-info$/, 'physical'],
  ['GET', /^\/v3\/users\/\d+$/, 'user'],
  ['DELETE', /^\/v3\/users\/\d+$/, 'delete'],
  ['GET', /^\/v3\/exercises$/, 'exercises'],
];

/**
 * @description A fake Polar.
 * @param {object} [options] - `{ errors, answers, registered }`: `errors`
 * maps a route name (or '*') to an HTTP status or 'network'.
 * @returns {Function} A fetch function with `requests`, `errors`, `answers`,
 * `codes` (every code received), `revoked`.
 */
function fakePolar({ errors = {}, answers = defaultAnswers(), registered = false } = {}) {
  const fake = async (raw, init = {}) => {
    const url = new URL(raw);
    const method = init.method ?? 'GET';
    const route = ROUTES.find(([verb, pattern]) => verb === method && pattern.test(url.pathname));
    const name = route ? route[2] : 'unknown';
    const headers = init.headers ?? {};
    const request = { name, method, url: raw, headers, body: init.body };
    fake.requests.push(request);
    if (fake.delay) {
      await fake.delay;
    }
    const error = fake.errors[name] ?? fake.errors['*'];
    if (error === 'network') {
      throw new TypeError('fetch failed');
    }
    if (name === 'token') {
      if (url.hostname !== 'polarremote.com') {
        return Response.json({ error: 'invalid_request' }, { status: 400 });
      }
      const form = new URLSearchParams(init.body);
      const code = form.get('code');
      request.form = Object.fromEntries(form);
      const basic = `Basic ${Buffer.from(`${CLIENT.id}:${CLIENT.secret}`).toString('base64')}`;
      if (headers.Authorization !== basic) {
        return Response.json({ error: 'invalid_client' }, { status: 400 });
      }
      if (fake.codes.includes(code)) {
        // "ALL issued tokens will be deleted".
        fake.revoked = true;
        return Response.json({ error: 'invalid_grant' }, { status: 400 });
      }
      fake.codes.push(code);
      if (error) {
        return Response.json({ error: 'invalid_grant' }, { status: error });
      }
      fake.revoked = false;
      return Response.json(fake.answers.token);
    }
    if (url.hostname !== 'www.polaraccesslink.com') {
      return new Response('', { status: 404 });
    }
    if (headers.Authorization !== `Bearer ${fake.answers.token.access_token}` || fake.revoked) {
      return new Response('', { status: 401 });
    }
    if (error) {
      const rateHeaders =
        error === 429
          ? {
              'RateLimit-Usage': '520, 900',
              'RateLimit-Limit': '520, 5100',
              'RateLimit-Reset': '600, 50000',
            }
          : {};
      return new Response('', { status: error, headers: rateHeaders });
    }
    const ok = (body, status = 200) =>
      Response.json(body, {
        status,
        headers: {
          'RateLimit-Usage': '6, 40',
          'RateLimit-Limit': '520, 5100',
          'RateLimit-Reset': '840, 80000',
        },
      });
    switch (name) {
      case 'register':
        if (fake.registered) {
          return new Response('', { status: 409 });
        }
        fake.registered = true;
        return ok(fake.answers.user);
      case 'user':
        return ok(fake.answers.user);
      case 'delete':
        fake.registered = false;
        fake.revoked = true;
        return new Response(null, { status: 204 });
      case 'activities': {
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        return ok(
          fake.answers.activities.filter(
            (item) => item.start_time.slice(0, 10) >= from && item.start_time.slice(0, 10) <= to,
          ),
        );
      }
      case 'exercises':
        return ok(fake.answers.exercises);
      case 'sleep':
        return ok(fake.answers.sleep);
      case 'recharges':
        return ok(fake.answers.recharges);
      case 'cardio':
        return ok(fake.answers.cardio);
      case 'physical':
        return ok(fake.answers.physical);
      default:
        return new Response('', { status: 404 });
    }
  };
  fake.requests = [];
  fake.errors = { ...errors };
  fake.answers = answers;
  fake.codes = [];
  fake.revoked = false;
  fake.registered = registered;
  fake.delay = null;
  fake.calls = (name) => fake.requests.filter((request) => request.name === name);
  return fake;
}

/**
 * @description A temporary path for the file kept in /data.
 * @returns {string} The path (its directory exists, the file does not).
 */
const storePath = () => join(mkdtempSync(join(tmpdir(), 'gladys-polar-')), 'polar.json');

// A Gladys client only used for its external ids (selector `test-integration`).
const fakeGladys = createFakeGladys({});

export { CLIENT, CONFIG, REDIRECT, silent, fakePolar, storePath, fakeGladys };
