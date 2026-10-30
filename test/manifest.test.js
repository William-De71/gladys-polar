// The manifest against the code: the keys it declares are the ones the code
// handles, the store limits hold, the transport and permissions are right.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

import { TRIGGERS, ACTION_OUTPUTS } from '../src/events.js';
import { SCENE_ACTIONS, ACTIONS } from '../src/app.js';
import { WIDGETS, WEEK_METRICS } from '../src/widgets.js';
import {
  ACCOUNT_FIELD,
  AUTO_LANGUAGE,
  INTERVALS,
  DEFAULT_INTERVAL,
  INTERNAL_KEYS,
} from '../src/config.js';
import { API_URL, TOKEN_URL, AUTHORIZE_URL } from '../src/polar-api.js';
import { SPORT_FAMILIES } from '../src/polar.js';
import { LANGUAGES, RECHARGE } from '../src/i18n.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('../gladys-assistant-integration.json');
const pkg = read('../package.json');
const lock = read('../package-lock.json');
const byKey = (list) => new Map(list.map((entry) => [entry.key, entry]));
const values = (field) => field.options.map((option) => option.value);
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const REDIRECT = 'https://my.gladysassistant.com/redirect/oauth';

test('a device integration, in lockstep with package.json, at 0.x until 1.0.0 is decided', () => {
  assert.equal(manifest.type, 'device');
  assert.equal(manifest.name, 'Polar');
  assert.equal(manifest.version, pkg.version);
  assert.match(pkg.version, /^0\.\d+\.\d+$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(lock.name, pkg.name);
  assert.equal(manifest.docker_image, `ghcr.io/william-de71/gladys-polar:${pkg.version}`);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/William-De71/gladys-polar/main/cover.jpg',
  );
  assert.equal(pkg.license, 'Apache-2.0');
  assert.equal(pkg.name, 'gladys-polar');
});

test('declares the cloud transport only: Polar AccessLink', () => {
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.doesNotMatch(source('../src/app.js'), /publishTransports|GLADYS_PREFER_LOCAL/);
  assert.equal(API_URL, 'https://www.polaraccesslink.com');
  assert.equal(TOKEN_URL, 'https://polarremote.com/v2/oauth2/token');
  assert.equal(AUTHORIZE_URL, 'https://flow.polar.com/oauth2/authorization');
});

test('requires Gladys 5.3.0 (catalog keywords); worldwide; no permission, no webhook', () => {
  assert.equal(manifest.gladys_version, '>=5.3.0');
  assert.deepEqual(manifest.categories, ['leisure', 'services']);
  assert.equal(manifest.countries, undefined, 'Polar Flow works worldwide');
  for (const key of ['location', 'network_wake', 'containers', 'network_discovery', 'webhooks']) {
    assert.equal(manifest[key], undefined, key);
  }
});

test('declares exactly the scene triggers, actions and widgets the code handles', () => {
  assert.deepEqual(
    manifest.scene_triggers.map((trigger) => trigger.key).sort(),
    Object.values(TRIGGERS).sort(),
  );
  assert.deepEqual(
    manifest.scene_actions.map((action) => action.key).sort(),
    Object.values(SCENE_ACTIONS).sort(),
  );
  assert.deepEqual(
    manifest.widgets.map((widget) => widget.key).sort(),
    Object.values(WIDGETS).sort(),
  );
  const app = source('../src/app.js');
  for (const key of Object.keys(WIDGETS)) {
    assert.match(app, new RegExp(`onWidgetGet\\(WIDGETS\\.${key}`), key);
  }
  assert.match(app, /onWidgetAction\(WIDGETS\.TODAY/);
  for (const key of Object.keys(SCENE_ACTIONS)) {
    assert.match(app, new RegExp(`onSceneAction\\(SCENE_ACTIONS\\.${key}`), key);
  }
  assert.deepEqual(
    manifest.actions.map((action) => action.key),
    Object.values(ACTIONS),
  );
  for (const key of Object.keys(ACTIONS)) {
    assert.match(app, new RegExp(`onAction\\(ACTIONS\\.${key}`), key);
  }
});

test('trigger filters: the account, the sport family, the recharge status', () => {
  const triggers = byKey(manifest.scene_triggers);
  for (const trigger of manifest.scene_triggers) {
    const account = byKey(trigger.fields).get('account');
    assert.equal(account.source, 'devices', trigger.key);
    assert.equal(account.required, false);
  }
  const sport = byKey(triggers.get(TRIGGERS.EXERCISE_SYNCED).fields).get('sport_family');
  assert.deepEqual(values(sport), SPORT_FAMILIES);
  const status = byKey(triggers.get(TRIGGERS.NIGHTLY_RECHARGE_AVAILABLE).fields).get('status');
  assert.deepEqual(values(status), ['1', '2', '3', '4', '5', '6']);
  assert.equal(status.options[4].label.fr, `5 – ${RECHARGE.fr[5]}`);
});

test('the scene action: an optional account, the outputs of the code', () => {
  const action = byKey(manifest.scene_actions).get(SCENE_ACTIONS.GET_SUMMARY);
  assert.deepEqual(
    action.outputs.map((output) => output.key),
    ACTION_OUTPUTS,
  );
  const account = byKey(action.fields).get('account');
  assert.equal(account.source, 'devices');
  assert.equal(account.required, false);
});

test('widget settings: the metric of the week chart', () => {
  const week = byKey(byKey(manifest.widgets).get(WIDGETS.WEEK).settings);
  assert.deepEqual(values(week.get('metric')), WEEK_METRICS);
  assert.equal(week.get('metric').default, 'steps');
  assert.ok(byKey(manifest.widgets).get(WIDGETS.TODAY).action_timeout_seconds >= 30);
});

test('OAuth2 with the user’s own client: id, secret, the Connect button, the redirect URL', () => {
  const config = byKey(manifest.config_schema);
  assert.equal(config.get('client_id').type, 'string');
  assert.equal(config.get('client_secret').type, 'secret');
  assert.equal(config.get(ACCOUNT_FIELD).type, 'oauth2');
  for (const language of LANGUAGES) {
    assert.ok(config.get('intro').description[language].includes(REDIRECT), language);
  }
  assert.ok(
    config.get('intro').links.some((link) => link.url === 'https://admin.polaraccesslink.com'),
  );
  // Internal keys never collide with the form.
  for (const key of Object.values(INTERNAL_KEYS)) {
    assert.equal(config.get(key), undefined, key);
  }
  for (const field of manifest.config_schema) {
    assert.ok(!['text', 'password', 'number'].includes(field.type), field.key);
    assert.equal(field.display_if, undefined, field.key);
  }
});

test('options: interval and language, as the code reads them', () => {
  const config = byKey(manifest.config_schema);
  assert.deepEqual(values(config.get('interval')).map(Number), INTERVALS);
  assert.equal(Number(config.get('interval').default), DEFAULT_INTERVAL);
  assert.deepEqual(values(config.get('language')), [AUTO_LANGUAGE, ...LANGUAGES]);
  assert.equal(config.get('language').default, AUTO_LANGUAGE);
});

test('limits of the store: counts, timeouts, sizes, no secret in widget settings', () => {
  assert.ok(manifest.widgets.length >= 1 && manifest.widgets.length <= 5);
  assert.ok(manifest.scene_triggers.length <= 20);
  assert.ok(manifest.scene_actions.length <= 20);
  for (const trigger of manifest.scene_triggers) {
    assert.ok((trigger.fields ?? []).length <= 10 && trigger.variables.length <= 20, trigger.key);
    assert.ok(trigger.key.length <= 40);
  }
  for (const action of [...manifest.scene_actions, ...manifest.actions]) {
    assert.ok(action.timeout_seconds >= 5 && action.timeout_seconds <= 120, action.key);
    assert.ok(
      (action.fields ?? []).length <= 10 && (action.outputs ?? []).length <= 20,
      action.key,
    );
  }
  for (const widget of manifest.widgets) {
    assert.ok((widget.settings ?? []).length <= 10);
    for (const setting of widget.settings ?? []) {
      assert.ok(!['secret', 'oauth2', 'account_link'].includes(setting.type));
    }
  }
  const size = statSync(new URL('../gladys-assistant-integration.json', import.meta.url)).size;
  assert.ok(size < 100 * 1024, `${size} bytes`);
  const cover = readFileSync(new URL('../cover.jpg', import.meta.url));
  assert.ok(cover.length < 150 * 1024, `cover.jpg: ${cover.length} bytes`);
  assert.equal(cover.readUInt16BE(0), 0xffd8, 'cover.jpg is a JPEG');
});

test('catalog of Gladys 5.3.0: search keywords within the store bounds', () => {
  const { keywords } = manifest;
  assert.ok(Array.isArray(keywords) && keywords.length >= 1 && keywords.length <= 10);
  const normalized = keywords.map((keyword) => keyword.trim().toLowerCase());
  for (const keyword of normalized) {
    assert.ok(keyword.length >= 2 && keyword.length <= 30, keyword);
  }
  assert.equal(new Set(normalized).size, normalized.length, 'unique once trimmed and lowercased');
  assert.ok(!normalized.includes(manifest.name.toLowerCase()), 'never the name itself');
});
