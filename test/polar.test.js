// The readers of the AccessLink answers and the HTTP client.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDuration,
  parseActivity,
  parseExercise,
  parseNight,
  parseRecharge,
  parseCardioLoad,
  parsePhysical,
  readList,
  sportFamily,
} from '../src/polar.js';
import {
  buildAuthorizeUrl,
  createPolarClient,
  readRateLimit,
  AUTHORIZE_URL,
  TOKEN_URL,
  API_URL,
  SCOPE,
} from '../src/polar-api.js';
import { localDate, addDays, isDate, safeTimeZone, jitterOf, JITTER_SECONDS } from '../src/time.js';
import { answers } from './helpers/polar-data.js';
import { fakePolar, CLIENT, REDIRECT } from './helpers/fakes.js';

test('ISO 8601 durations of the documentation', () => {
  assert.equal(parseDuration('PT2H44M'), 9840);
  assert.equal(parseDuration('PT18H23M30S'), 66210);
  assert.equal(parseDuration('PT4S'), 4);
  assert.equal(parseDuration('PT210.026S'), 210);
  assert.equal(parseDuration('P1DT1H'), 90000);
  assert.equal(parseDuration('PT'), null);
  assert.equal(parseDuration('2 hours'), null);
  assert.equal(parseDuration(null), null);
});

test('daily activity: the day of start_time, the documented fields', () => {
  const [first] = answers().activities;
  assert.deepEqual(parseActivity(first), {
    date: '2026-10-23',
    steps: 9412,
    calories: 2214,
    activeCalories: 708,
    activeSeconds: 10920,
    distanceMeters: 6820.4,
    goalPercent: 96.4,
    inactivityAlerts: 0,
  });
  assert.equal(parseActivity({ steps: 3 }), null);
  assert.equal(parseActivity({ start_time: 'yesterday' }), null);
});

test('training session: local start, its UTC instant, heart rate, cardio load', () => {
  const run = parseExercise(answers().exercises[0]);
  assert.equal(run.id, 'aQlC83');
  assert.equal(run.startLocal, '2026-10-29T18:05');
  assert.equal(run.date, '2026-10-29');
  // 18:05 at UTC+60 min is 17:05 UTC.
  assert.equal(run.startAt, Date.parse('2026-10-29T17:05:00Z'));
  assert.equal(run.durationSeconds, 2832);
  assert.equal(run.heartRateAvg, 151);
  assert.equal(run.cardioLoad, 98.4);
  assert.equal(run.device, 'Polar Vantage V3');
  const strength = parseExercise(answers().exercises[2]);
  assert.equal(strength.distanceMeters, null);
  assert.equal(strength.cardioLoad, null);
  assert.equal(parseExercise({}), null);
  assert.equal(parseExercise({ id: 12 }).id, '12');
});

test('night, Nightly Recharge, cardio load, physical info', () => {
  const night = parseNight(answers().sleep.nights.at(-1));
  assert.equal(night.date, '2026-10-30');
  assert.equal(night.sleepSeconds, 15420 + 5280 + 6360);
  assert.equal(night.score, 82);
  assert.equal(night.charge, 4);
  assert.equal(parseNight({ date: 'x' }), null);

  const recharge = parseRecharge(answers().recharges.recharges.at(-1));
  assert.deepEqual(recharge, {
    date: '2026-10-30',
    status: 5,
    ansCharge: 3.2,
    ansChargeStatus: 4,
    heartRateAvg: 54,
    hrvAvg: 46,
    breathingRateAvg: 14.2,
  });
  assert.equal(parseRecharge({ date: '2026-10-30', nightly_recharge_status: 9 }).status, null);

  assert.equal(parseCardioLoad(answers().cardio[1]).status, 'PRODUCTIVE');
  assert.equal(
    parseCardioLoad({ date: '2026-10-30', cardio_load_status: 'NEW' }).status,
    'UNRECOGNIZED',
  );
  assert.equal(parseCardioLoad({ date: '2026-10-30' }).status, null);

  assert.deepEqual(parsePhysical(answers().physical), {
    weight: 61.4,
    restingHeartRate: 52,
    maximumHeartRate: 186,
    vo2max: 47,
    modified: '2026-10-20T07:30:00Z',
  });
  assert.equal(parsePhysical(null), null);
});

test('lists: unreadable items dropped, newest first', () => {
  const nights = readList(answers().sleep.nights, parseNight, (n) => n.date);
  assert.equal(nights[0].date, '2026-10-30');
  assert.equal(nights.length, 7);
  assert.deepEqual(
    readList([{}, null, 'x'], parseNight, (n) => n.date),
    [],
  );
  assert.deepEqual(
    readList(undefined, parseNight, (n) => n.date),
    [],
  );
});

test('sport families', () => {
  assert.equal(sportFamily({ detailedSport: 'TRAIL_RUNNING' }), 'running');
  assert.equal(sportFamily({ detailedSport: 'ROAD_BIKING' }), 'cycling');
  assert.equal(sportFamily({ detailedSport: 'OPEN_WATER_SWIMMING' }), 'swimming');
  assert.equal(sportFamily({ detailedSport: 'NORDIC_WALKING' }), 'walking');
  assert.equal(sportFamily({ detailedSport: 'DOWNHILL_SKIING' }), 'winter');
  assert.equal(sportFamily({ detailedSport: 'STRENGTH_TRAINING' }), 'strength');
  assert.equal(sportFamily({ sport: 'RUNNING' }), 'running');
  assert.equal(sportFamily({ detailedSport: 'YOGA' }), 'other');
  assert.equal(sportFamily({}), 'other');
});

test('days in the timezone of Gladys', () => {
  assert.equal(localDate(Date.parse('2026-10-29T23:30:00Z'), 'Europe/Paris'), '2026-10-30');
  assert.equal(localDate(Date.parse('2026-10-29T23:30:00Z'), 'America/New_York'), '2026-10-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.ok(isDate('2026-10-30'));
  assert.ok(!isDate('2026-1-3'));
  assert.equal(safeTimeZone('Nowhere/City'), undefined);
  assert.equal(safeTimeZone('Europe/Paris'), 'Europe/Paris');
  assert.equal(jitterOf('10579'), jitterOf('10579'));
  assert.ok(jitterOf('x') < JITTER_SECONDS * 1000);
});

test('the documented endpoints and scope', () => {
  assert.equal(AUTHORIZE_URL, 'https://flow.polar.com/oauth2/authorization');
  assert.equal(TOKEN_URL, 'https://polarremote.com/v2/oauth2/token');
  assert.equal(API_URL, 'https://www.polaraccesslink.com');
  assert.equal(SCOPE, 'accesslink.read_all');
  const url = new URL(buildAuthorizeUrl({ clientId: 'abc', redirectUri: REDIRECT, state: 's' }));
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    response_type: 'code',
    client_id: 'abc',
    redirect_uri: REDIRECT,
    scope: 'accesslink.read_all',
    state: 's',
  });
});

test('client: token exchange, its errors, the user id required', async () => {
  const server = fakePolar();
  const client = createPolarClient({ fetch: server, now: () => 1000 });
  const token = await client.exchangeCode({
    clientId: CLIENT.id,
    clientSecret: CLIENT.secret,
    code: 'c1',
    redirectUri: REDIRECT,
  });
  assert.deepEqual(token, {
    accessToken: '2YotnFZFEjr1zCsicMWpAA',
    userId: '10579',
    expiresAt: 1000 + 31535999 * 1000,
  });
  assert.equal(server.calls('token')[0].headers.Accept, 'application/json;charset=UTF-8');
  await assert.rejects(
    client.exchangeCode({ clientId: 'bad', clientSecret: 'x', code: 'c2', redirectUri: REDIRECT }),
    (err) => err.kind === 'oauth' && err.code === 'invalid_client',
  );
  server.answers.token = { access_token: 'abc', token_type: 'bearer' };
  await assert.rejects(
    client.exchangeCode({ clientId: CLIENT.id, clientSecret: CLIENT.secret, code: 'c3' }),
    (err) => err.code === 'no_user_id',
  );
  // Without redirect URI, none is sent (Polar then uses the default one).
  assert.equal(server.calls('token').at(-1).form.redirect_uri, undefined);
});

test('client: lists, 204, errors with their kind, rate limit headers', async () => {
  const server = fakePolar();
  const token = '2YotnFZFEjr1zCsicMWpAA';
  const client = createPolarClient({ fetch: server });
  assert.equal((await client.listNights(token)).length, 7);
  assert.equal((await client.listRecharges(token)).length, 3);
  assert.equal((await client.listCardioLoads(token)).length, 3);
  assert.equal((await client.listExercises(token)).length, 4);
  assert.equal((await client.listActivities(token, '2026-10-29', '2026-10-30')).length, 2);
  assert.deepEqual(client.stats.rateLimit.usage, [6, 40]);
  assert.deepEqual((await client.registerUser(token, 'gladys-1')).already, false);
  assert.deepEqual((await client.registerUser(token, 'gladys-1')).already, true);
  await assert.rejects(client.listNights('wrong'), (err) => err.kind === 'unauthorized');
  server.errors.sleep = 403;
  await assert.rejects(client.listNights(token), (err) => err.kind === 'consent');
  server.errors.sleep = 429;
  await assert.rejects(
    client.listNights(token),
    (err) => err.kind === 'rate_limited' && err.retryAfter === 600,
  );
  server.errors.sleep = 503;
  await assert.rejects(client.listNights(token), (err) => err.kind === 'server');
  server.errors.sleep = 'network';
  await assert.rejects(client.listNights(token), (err) => err.kind === 'network');
  server.errors.physical = 404;
  assert.equal(await client.physicalInfo(token), null);
  const empty = createPolarClient({ fetch: async () => new Response(null, { status: 204 }) });
  assert.deepEqual(await empty.listExercises(token), []);
  const html = createPolarClient({ fetch: async () => new Response('<html>', { status: 200 }) });
  await assert.rejects(html.listExercises(token), (err) => err.kind === 'invalid');
  assert.equal(readRateLimit(new Headers({ 'RateLimit-Usage': 'x' })), null);
});
