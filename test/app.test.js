// The whole integration against the fake Gladys of the SDK
// (`@gladysassistant/integration-sdk/testing`), which checks the discovered
// devices, the states and the scene events like the host API does, and a
// fake Polar (test/helpers/fakes.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import {
  createApp,
  ACTIONS,
  SCENE_ACTIONS,
  RATE_LIMIT_DELAY_MIN,
  REFRESH_MIN_INTERVAL_MS,
  fingerprint,
} from '../src/app.js';
import { WIDGETS, WIDGET_ACTIONS } from '../src/widgets.js';
import { TRIGGERS, ACTION_OUTPUTS } from '../src/events.js';
import { INTERNAL_KEYS } from '../src/config.js';
import { MINUTE_MS, HOUR_MS } from '../src/time.js';
import { NOW, TZ, USER_ID, exercise, night } from './helpers/polar-data.js';
import { CLIENT, CONFIG, REDIRECT, silent, fakePolar, storePath } from './helpers/fakes.js';

const DEVICE = `ext:test-integration:account:${USER_ID}`;

/**
 * @description The integration, connected to a fake Gladys and a fake Polar.
 * @param {object} [options] - `{ config, server, path, now, gladys }`.
 * @returns {Promise<object>} `{ gladys, app, server, clock, path }`.
 */
async function startApp({
  config = CONFIG,
  server = fakePolar(),
  path = storePath(),
  now = NOW,
  gladys = createFakeGladys({ config }),
} = {}) {
  const clock = { now };
  const app = createApp(gladys, {
    fetch: server,
    storePath: path,
    now: () => clock.now,
    timeZone: TZ,
    timers: false,
    logger: silent,
  });
  await gladys.connect();
  await app.whenReady();
  return { gladys, app, server, clock, path };
}

/**
 * @description Click Connect, come back from Polar with a code.
 * @param {object} gladys - The fake Gladys.
 * @param {string} [code] - The code.
 * @returns {Promise<object>} `{ url, ack }`.
 */
async function link(gladys, code = 'SplxlOBeZQQYbYS6WxSbIA') {
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  assert.equal(start.success, true, start.error);
  const url = new URL(start.data.authorize_url);
  const ack = await gladys.fake.oauthCallback('polar_account', {
    code,
    state: url.searchParams.get('state'),
    redirectUri: REDIRECT,
  });
  return { url, ack };
}

/**
 * @description A linked integration, its device created.
 * @param {object} [options] - startApp options.
 * @returns {Promise<object>} startApp result.
 */
async function linkedApp(options) {
  const started = await startApp(options);
  const { ack } = await link(started.gladys);
  assert.equal(ack.success, true, ack.error);
  const device = started.gladys.fake.discoveredDevices.find((d) => d.external_id === DEVICE);
  assert.ok(device, 'the account is offered');
  await started.gladys.fake.deviceCreated(device);
  return started;
}

test('without a client: a status asking for it, no request to Polar', async (t) => {
  const { gladys, server } = await startApp({ config: {} });
  t.after(() => gladys.fake.shutdown());
  assert.equal(server.requests.length, 0);
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(gladys.fake.connectionStatus.message.fr, /Client ID/);
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  assert.equal(start.success, false);
});

test('Connect: the Polar Flow authorization URL, its state kept in the config', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());
  assert.match(gladys.fake.connectionStatus.message.en, /Connect with Polar/);
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  const url = new URL(start.data.authorize_url);
  assert.equal(url.origin + url.pathname, 'https://flow.polar.com/oauth2/authorization');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), CLIENT.id);
  assert.equal(url.searchParams.get('redirect_uri'), REDIRECT);
  assert.equal(url.searchParams.get('scope'), 'accesslink.read_all');
  const state = url.searchParams.get('state');
  assert.ok(state.length >= 24);
  assert.equal(gladys.fake.config[INTERNAL_KEYS.oauthState], state);
  assert.equal(gladys.fake.config[INTERNAL_KEYS.oauthRedirectUri], REDIRECT);
});

test('callback: one token request (Basic auth, code, redirect URI), registration, reading', async (t) => {
  const { gladys, server } = await startApp();
  t.after(() => gladys.fake.shutdown());
  const { ack } = await link(gladys);
  assert.equal(ack.success, true, ack.error);
  const [token] = server.calls('token');
  assert.equal(server.calls('token').length, 1);
  assert.equal(
    token.headers.Authorization,
    `Basic ${Buffer.from(`${CLIENT.id}:${CLIENT.secret}`).toString('base64')}`,
  );
  assert.deepEqual(token.form, {
    grant_type: 'authorization_code',
    code: 'SplxlOBeZQQYbYS6WxSbIA',
    redirect_uri: REDIRECT,
  });
  const [register] = server.calls('register');
  assert.deepEqual(JSON.parse(register.body), { 'member-id': `gladys-${USER_ID}` });
  assert.equal(register.headers['Content-Type'], 'application/json');
  assert.deepEqual(
    server.requests.map((request) => request.name),
    ['token', 'register', 'activities', 'exercises', 'sleep', 'recharges', 'cardio', 'physical'],
  );
  // Today and the seven days before, in the timezone of Gladys.
  const activities = new URL(server.calls('activities')[0].url);
  assert.equal(activities.searchParams.get('from'), '2026-10-23');
  assert.equal(activities.searchParams.get('to'), '2026-10-30');
  // The token is stored outside the config_schema; the state is burnt.
  assert.equal(gladys.fake.config[INTERNAL_KEYS.accessToken], '2YotnFZFEjr1zCsicMWpAA');
  assert.equal(gladys.fake.config[INTERNAL_KEYS.userId], String(USER_ID));
  assert.equal(gladys.fake.config[INTERNAL_KEYS.oauthState], '');
  assert.equal(gladys.fake.config[INTERNAL_KEYS.usedCodes], fingerprint('SplxlOBeZQQYbYS6WxSbIA'));
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.match(gladys.fake.connectionStatus.message.fr, /Connecté à Polar Flow \(Marie\)/);
  const [device] = gladys.fake.discoveredDevices;
  assert.equal(device.external_id, DEVICE);
  assert.equal(device.name, 'Polar Marie');
  // First reading: a baseline, no event.
  assert.equal(gladys.fake.sceneEvents.length, 0);
});

test('a code is never sent twice: replay, concurrent callbacks, restart', async (t) => {
  const path = storePath();
  const server = fakePolar();
  const { gladys } = await startApp({ server, path });
  t.after(() => gladys.fake.shutdown());
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  const state = new URL(start.data.authorize_url).searchParams.get('state');
  const params = { code: 'abc123', state, redirectUri: REDIRECT };
  // Two callbacks at once (a double delivery): one exchange.
  const [first, second] = await Promise.all([
    gladys.fake.oauthCallback('polar_account', params),
    gladys.fake.oauthCallback('polar_account', params),
  ]);
  assert.equal(first.success, true, first.error);
  assert.equal(second.success, true, second.error);
  // A late replay: still none, and the connection stays.
  const replay = await gladys.fake.oauthCallback('polar_account', params);
  assert.equal(replay.success, true);
  assert.equal(server.calls('token').length, 1);
  assert.equal(server.revoked, false);

  // A restart with the same code: the fingerprint is in the config.
  const restarted = createFakeGladys({ config: { ...gladys.fake.config } });
  const again = await startApp({ server, path, gladys: restarted });
  t.after(() => again.gladys.fake.shutdown());
  const replayAfterRestart = await restarted.fake.oauthCallback('polar_account', params);
  assert.equal(replayAfterRestart.success, true);
  assert.equal(server.calls('token').length, 1);
  assert.equal(server.revoked, false);
});

test('a code already used while not connected: refused without asking Polar', async (t) => {
  const server = fakePolar({ errors: { register: 403 } });
  const { gladys, app } = await startApp({ server });
  t.after(() => gladys.fake.shutdown());
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  const state = new URL(start.data.authorize_url).searchParams.get('state');
  await gladys.fake.oauthCallback('polar_account', { code: 'xyz', state, redirectUri: REDIRECT });
  await gladys.fake.action(ACTIONS.DISCONNECT);
  assert.equal(app.getAuth().accessToken, '');
  const replay = await gladys.fake.oauthCallback('polar_account', {
    code: 'xyz',
    state,
    redirectUri: REDIRECT,
  });
  assert.equal(replay.success, false);
  assert.equal(server.calls('token').length, 1);
  assert.match(gladys.fake.connectionStatus.message.en, /already used/);
});

test('a wrong state is refused before any request to Polar', async (t) => {
  const { gladys, server } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  const ack = await gladys.fake.oauthCallback('polar_account', {
    code: 'abc',
    state: 'forged',
    redirectUri: REDIRECT,
  });
  assert.equal(ack.success, false);
  assert.equal(server.calls('token').length, 0);
  assert.match(gladys.fake.connectionStatus.message.fr, /ne correspond pas/);
  // The code was not burnt: the real callback still works.
  const ok = await link(gladys, 'abc');
  assert.equal(ok.ack.success, true, ok.ack.error);
});

test('the state survives a restart between Connect and the return from Polar', async (t) => {
  const path = storePath();
  const server = fakePolar();
  const { gladys } = await startApp({ server, path });
  t.after(() => gladys.fake.shutdown());
  const start = await gladys.fake.oauthAuthorizeUrl('polar_account', REDIRECT);
  const state = new URL(start.data.authorize_url).searchParams.get('state');
  const restarted = createFakeGladys({ config: { ...gladys.fake.config } });
  const again = await startApp({ server, path, gladys: restarted });
  t.after(() => again.gladys.fake.shutdown());
  const ack = await restarted.fake.oauthCallback('polar_account', {
    code: 'late',
    state,
    redirectUri: REDIRECT,
  });
  assert.equal(ack.success, true, ack.error);
  assert.equal(server.calls('token').length, 1);
});

test('the token endpoint refuses: a status naming the reason, nothing stored', async (t) => {
  const server = fakePolar({ errors: { token: 400 } });
  const { gladys } = await startApp({ server });
  t.after(() => gladys.fake.shutdown());
  const { ack } = await link(gladys);
  assert.equal(ack.success, false);
  assert.match(gladys.fake.connectionStatus.message.en, /invalid_grant/);
  assert.equal(gladys.fake.config[INTERNAL_KEYS.accessToken] ?? '', '');
});

test('already registered (409) is fine; the first name is then read', async (t) => {
  const server = fakePolar({ registered: true });
  const { gladys } = await startApp({ server });
  t.after(() => gladys.fake.shutdown());
  const { ack } = await link(gladys);
  assert.equal(ack.success, true, ack.error);
  assert.equal(server.calls('user').length, 1);
  assert.equal(gladys.fake.discoveredDevices[0].name, 'Polar Marie');
  assert.equal(gladys.fake.connectionStatus.connected, true);
});

test('consents missing (403): a status pointing to account.polar.com', async (t) => {
  const server = fakePolar({ errors: { register: 403 } });
  const { gladys, app } = await startApp({ server });
  t.after(() => gladys.fake.shutdown());
  const { ack } = await link(gladys);
  assert.equal(ack.success, true, 'the link itself worked');
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(gladys.fake.connectionStatus.message.fr, /account\.polar\.com/);
  assert.equal(server.calls('activities').length, 0);
  // Consents accepted: the next reading registers and reads.
  delete server.errors.register;
  assert.equal(await app.read(), true);
  assert.equal(server.calls('register').length, 2);
});

test('states: today, last night, Nightly Recharge, cardio load; republished on creation', async (t) => {
  const { gladys } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  const state = (key) => gladys.fake.lastState(`${DEVICE}:${key}`);
  assert.equal(state('steps'), 8823);
  assert.equal(state('active_time'), 191);
  assert.equal(state('calories'), 2120);
  assert.equal(state('distance'), 6.37);
  assert.equal(state('daily_goal'), 89);
  assert.equal(state('sleep_score'), 82);
  assert.equal(state('sleep_time'), 7.52);
  assert.equal(state('nightly_recharge'), 5);
  assert.equal(state('ans_charge'), 3.2);
  assert.equal(state('hrv'), 46);
  assert.equal(state('night_heart_rate'), 54);
  assert.equal(state('breathing_rate'), 14.2);
  // Today's cardio load is "not available": the last known status is shown.
  assert.equal(state('cardio_load_ratio'), 1.12);
  assert.equal(state('cardio_load_status'), 'Productif');
});

test('scene events: none at first, then one per new session, night, recharge, goal', async (t) => {
  const { gladys, app, server, clock } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  assert.equal(gladys.fake.sceneEvents.length, 0);
  clock.now += 40 * MINUTE_MS;
  server.answers.exercises.unshift(
    exercise('eN55aa', '2026-10-30T17:20:00', 'RUNNING', 'RUNNING', 'PT32M', {
      calories: 410,
      distance: 6100,
      heart_rate: { average: 149, maximum: 170 },
      training_load: 61.3,
    }),
  );
  server.answers.activities[7].daily_activity = 104.2;
  server.answers.activities[7].steps = 11020;
  server.answers.sleep.nights.push(
    night('2026-10-20', 70, 1, 1, 1, '2026-10-19T23:00:00+02:00', '2026-10-20T07:00:00+02:00', 3),
  );
  assert.equal(await app.read(), true);
  const keys = gladys.fake.sceneEvents.map((event) => event.key);
  assert.deepEqual(keys, [TRIGGERS.EXERCISE_SYNCED, TRIGGERS.DAILY_GOAL_REACHED]);
  const run = gladys.fake.sceneEvents[0].data;
  assert.equal(run.account, DEVICE);
  assert.equal(run.sport_label, 'Course à pied');
  assert.equal(run.sport_family, 'running');
  assert.equal(run.duration_minutes, 32);
  assert.equal(run.distance_km, 6.1);
  assert.equal(run.start_time, '2026-10-30T17:20');
  const goal = gladys.fake.sceneEvents[1].data;
  assert.equal(goal.daily_goal_percent, 104);
  assert.equal(goal.steps, 11020);
  // Nothing new: nothing fired again.
  clock.now += 40 * MINUTE_MS;
  await app.read();
  assert.equal(gladys.fake.sceneEvents.length, 2);
});

test('a restart fires nothing again (the store in /data)', async (t) => {
  const path = storePath();
  const server = fakePolar();
  const first = await linkedApp({ server, path });
  t.after(() => first.gladys.fake.shutdown());
  server.answers.exercises.unshift(
    exercise('fA1', '2026-10-30T17:00:00', 'CYCLING', 'INDOOR_CYCLING', 'PT40M', {
      calories: 300,
    }),
  );
  first.clock.now += HOUR_MS;
  await first.app.read();
  assert.equal(first.gladys.fake.sceneEvents.length, 1);
  const restarted = createFakeGladys({
    config: { ...first.gladys.fake.config },
    devices: [...first.gladys.fake.devices],
  });
  const again = await startApp({ server, path, gladys: restarted, now: first.clock.now + HOUR_MS });
  t.after(() => again.gladys.fake.shutdown());
  await again.app.read();
  assert.equal(restarted.fake.sceneEvents.length, 0);
});

test('a revoked token (401): stop, ask to connect again, remember it across restarts', async (t) => {
  const { gladys, app, server, clock } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  server.revoked = true;
  clock.now += HOUR_MS;
  const before = server.requests.length;
  assert.equal(await app.read(), false);
  assert.equal(server.requests.length, before + 1, 'stopped at the first 401');
  assert.equal(gladys.fake.connectionStatus.connected, false);
  assert.match(gladys.fake.connectionStatus.message.fr, /Se connecter avec Polar/);
  assert.equal(gladys.fake.config[INTERNAL_KEYS.lost], 'true');
  await app.read();
  assert.equal(server.requests.length, before + 1, 'no request while the token is lost');
  const widget = await gladys.fake.widgetGet(WIDGETS.TODAY, { language: 'en' });
  assert.match(widget.data.content.components[0].text, /refused the access/);
});

test('rate limited (429): a pause of at least 15 minutes, from RateLimit-Reset', async (t) => {
  const { gladys, app, server, clock } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  server.errors.sleep = 429;
  clock.now += HOUR_MS;
  assert.equal(await app.read(), false);
  assert.equal(server.calls('recharges').length, 1, 'nothing after the 429');
  // RateLimit-Reset says 600 s: the 15-minute floor wins.
  assert.equal(app.getRetryAt() - clock.now, RATE_LIMIT_DELAY_MIN * MINUTE_MS);
  assert.match(gladys.fake.connectionStatus.message.en, /slow down/);
});

test('one endpoint failing does not stop the others', async (t) => {
  const { gladys, app, server, clock } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  server.errors.exercises = 500;
  clock.now += HOUR_MS;
  assert.equal(await app.read(), true);
  assert.equal(server.calls('cardio').length, 2);
  assert.equal(gladys.fake.connectionStatus.connected, true);
  // Everything down: a failure with a backoff.
  server.errors['*'] = 'network';
  clock.now += HOUR_MS;
  assert.equal(await app.read(), false);
  assert.equal(app.getRetryAt() - clock.now, 5 * MINUTE_MS);
  assert.match(gladys.fake.connectionStatus.message.fr, /injoignable/);
});

test('widgets: valid contents in four languages, a message before linking', async (t) => {
  const before = await startApp();
  t.after(() => before.gladys.fake.shutdown());
  const empty = await before.gladys.fake.widgetGet(WIDGETS.NIGHT, { language: 'de' });
  assert.match(empty.data.content.components[0].text, /Mit Polar verbinden/);

  const { gladys } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  for (const language of ['en', 'fr', 'de', 'es']) {
    for (const [key, settings] of [
      [WIDGETS.TODAY, {}],
      [WIDGETS.NIGHT, {}],
      [WIDGETS.EXERCISES, {}],
      [WIDGETS.WEEK, { metric: 'steps' }],
      [WIDGETS.WEEK, { metric: 'active_time' }],
      [WIDGETS.WEEK, { metric: 'sleep_score' }],
    ]) {
      const ack = await gladys.fake.widgetGet(key, { language, settings });
      assert.equal(ack.success, true, ack.error);
      assert.deepEqual(validateWidgetContent(ack.data.content), [], `${key} ${language}`);
    }
  }
});

test('the Sync button reads Polar, but not twice within two minutes', async (t) => {
  const { gladys, server, clock } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  const reads = () => server.calls('sleep').length;
  const soon = await gladys.fake.widgetAction(WIDGETS.TODAY, WIDGET_ACTIONS.SYNC);
  assert.match(soon.data.message.en, /was read 1 min ago/);
  assert.equal(reads(), 1);
  clock.now += REFRESH_MIN_INTERVAL_MS + 1000;
  const done = await gladys.fake.widgetAction(WIDGETS.TODAY, WIDGET_ACTIONS.SYNC);
  assert.equal(reads(), 2);
  assert.match(done.data.message.fr, /^Polar lu : 8\s823 pas · score 82 · Nightly Recharge bonne$/);
  for (const text of Object.values(done.data.message)) {
    assert.ok(text.length <= 200);
  }
});

test('scene action: only the declared outputs, from the kept data, no request', async (t) => {
  const { gladys, server } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  const before = server.requests.length;
  const ack = await gladys.fake.sceneAction(SCENE_ACTIONS.GET_SUMMARY, { account: DEVICE });
  assert.equal(ack.success, true, ack.error);
  const outputs = ack.data.outputs;
  assert.deepEqual(Object.keys(outputs), ACTION_OUTPUTS);
  assert.equal(server.requests.length, before);
  assert.equal(outputs.steps, 8823);
  assert.equal(outputs.sleep_score, 82);
  assert.equal(outputs.nightly_recharge_label, 'Bonne');
  assert.equal(outputs.last_exercise_sport, 'Course sur route');
  assert.equal(outputs.weight_kg, 61.4);
  for (const value of Object.values(outputs)) {
    assert.ok(value === null || ['string', 'number'].includes(typeof value));
  }
  const other = await gladys.fake.sceneAction(SCENE_ACTIONS.GET_SUMMARY, {
    account: 'ext:test-integration:account:42',
  });
  assert.equal(other.success, false);
  // No event in response to a scene action.
  assert.equal(gladys.fake.sceneEvents.length, 0);
});

test('Unlink: de-registers the user, forgets the token, offers no device', async (t) => {
  const { gladys, server } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  const ack = await gladys.fake.action(ACTIONS.DISCONNECT);
  assert.match(ack.data.message.en, /unlinked/);
  assert.equal(server.calls('delete').length, 1);
  assert.equal(gladys.fake.config[INTERNAL_KEYS.accessToken], '');
  assert.deepEqual(gladys.fake.discoveredDevices, []);
  assert.equal(gladys.fake.connectionStatus.connected, false);
});

test('diagnostic: in the logs, never the token, the secret or the name', async (t) => {
  const lines = [];
  const logger = { ...silent, info: (line) => lines.push(String(line)) };
  const gladys = createFakeGladys({ config: CONFIG });
  const server = fakePolar();
  const app = createApp(gladys, {
    fetch: server,
    storePath: storePath(),
    now: () => NOW,
    timeZone: TZ,
    timers: false,
    logger,
  });
  t.after(() => gladys.fake.shutdown());
  await gladys.connect();
  await app.whenReady();
  await link(gladys);
  const ack = await gladys.fake.action(ACTIONS.DIAGNOSTIC);
  assert.match(ack.data.message.en, /Polar diagnostic/);
  const text = lines.filter((line) => line.startsWith('Polar diagnostic')).join('\n');
  assert.ok(text.length > 100);
  for (const secret of ['2YotnFZFEjr1zCsicMWpAA', CLIENT.secret, CLIENT.id, 'Marie', 'Durand']) {
    assert.ok(!text.includes(secret), secret);
  }
  assert.ok(!lines.join('\n').includes('2YotnFZFEjr1zCsicMWpAA'));
});

test('another Client ID saved: the old token is dropped', async (t) => {
  const { gladys, app } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  await gladys.fake.configUpdated({ ...gladys.fake.config, client_id: 'another-client' });
  assert.equal(app.getAuth().accessToken, '');
  assert.match(gladys.fake.connectionStatus.message.en, /Connect with Polar/);
});

test('the user agent names the project, the store file lives where asked', async (t) => {
  const { gladys, server, path } = await linkedApp();
  t.after(() => gladys.fake.shutdown());
  for (const request of server.requests) {
    assert.match(request.headers['User-Agent'], /^gladys-polar\/\d+\.\d+\.\d+ /);
  }
  const kept = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(kept.userId, String(USER_ID));
  assert.equal(kept.name, 'Marie');
  assert.ok(!JSON.stringify(kept).includes('2YotnFZFEjr1zCsicMWpAA'), 'no token in /data');
});
