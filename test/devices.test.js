// The discovered device, checked against what the Gladys core expects
// (community thread 11005): every feature carries min / max / read_only /
// has_feedback, `should_poll` is explicit and no `poll_frequency` is sent
// (Polar is read on the integration's own timer), category / type pairs and
// units come from the SDK constants and the units the core allows per
// category (DEVICE_FEATURE_UNITS_BY_CATEGORY of server/utils/constants.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';

import { buildDevice, buildStates, FEATURES, userIdOfDevice } from '../src/device.js';
import { LANGUAGES } from '../src/i18n.js';
import { fakeGladys } from './helpers/fakes.js';

// Units the core offers for the categories used here (Gladys 5.3.0);
// counter-sensor and text have none.
const UNITS_BY_CATEGORY = {
  [CATEGORIES.DURATION]: [UNITS.MILLISECONDS, UNITS.SECONDS, UNITS.MINUTES, UNITS.HOURS],
  [CATEGORIES.DISTANCE_SENSOR]: [UNITS.M, UNITS.KM],
  [CATEGORIES.LEVEL_SENSOR]: [UNITS.M, UNITS.PERCENT],
  [CATEGORIES.COUNTER_SENSOR]: [],
  [CATEGORIES.TEXT]: [],
};
// Pairs the front knows (deviceFeatureCategory of front/src/config/i18n/en.json).
const PAIRS = [
  `${CATEGORIES.COUNTER_SENSOR}/${TYPES.SENSOR.INTEGER}`,
  `${CATEGORIES.DURATION}/${TYPES.DURATION.INTEGER}`,
  `${CATEGORIES.DURATION}/${TYPES.DURATION.DECIMAL}`,
  `${CATEGORIES.DISTANCE_SENSOR}/${TYPES.SENSOR.DECIMAL}`,
  `${CATEGORIES.LEVEL_SENSOR}/${TYPES.SENSOR.DECIMAL}`,
  `${CATEGORIES.TEXT}/${TYPES.TEXT.TEXT}`,
];

const account = { userId: '10579', name: 'Marie' };

test('one device per account, its id from the Polar user id, never polled by Gladys', () => {
  const device = buildDevice(fakeGladys, account, { language: 'fr' });
  assert.equal(device.external_id, 'ext:test-integration:account:10579');
  assert.equal(device.name, 'Polar Marie');
  assert.equal(device.should_poll, false);
  assert.equal(device.poll_frequency, undefined);
  assert.deepEqual(device.params, [{ name: 'POLAR_USER_ID', value: '10579' }]);
  assert.equal(
    buildDevice(fakeGladys, { userId: '1' }, { language: 'de' }).name,
    'Polar-Flow-Konto',
  );
  assert.equal(userIdOfDevice(device.external_id), '10579');
  assert.equal(userIdOfDevice(`${device.external_id}:steps`), '10579');
  assert.equal(userIdOfDevice('ext:x:spot:1'), null);
});

test('every feature: required fields, a known pair, an allowed unit, a name in 4 languages', () => {
  for (const language of LANGUAGES) {
    const device = buildDevice(fakeGladys, account, { language });
    assert.equal(device.features.length, FEATURES.length);
    for (const feature of device.features) {
      for (const key of ['min', 'max', 'read_only', 'has_feedback']) {
        assert.notEqual(feature[key], undefined, `${feature.external_id}.${key}`);
      }
      assert.equal(feature.read_only, true);
      assert.ok(feature.min <= feature.max);
      assert.ok(PAIRS.includes(`${feature.category}/${feature.type}`), feature.external_id);
      if (feature.unit !== undefined) {
        assert.ok(UNITS_BY_CATEGORY[feature.category].includes(feature.unit), feature.external_id);
      }
      assert.ok(feature.name && !feature.name.startsWith('feature_'), feature.external_id);
      assert.match(feature.external_id, /^ext:test-integration:account:10579:[a-z_]+$/);
    }
    assert.equal(new Set(device.features.map((f) => f.name)).size, FEATURES.length);
  }
});

test('states: numbers within the bounds, the text feature as text, nothing unknown', () => {
  const snapshot = {
    activity: {
      steps: 250000,
      activeSeconds: 600,
      calories: 1800,
      distanceMeters: 1234,
      goalPercent: 12.4,
    },
    night: { score: 80, sleepSeconds: 27000 },
    recharge: { status: 4, ansCharge: -12, hrvAvg: 40, heartRateAvg: 55, breathingRateAvg: 13.4 },
    cardio: { status: 'OVERREACHING', ratio: 1.5 },
  };
  const states = buildStates(fakeGladys, '10579', snapshot, 'es');
  const byKey = Object.fromEntries(
    states.map((s) => [s.device_feature_external_id.split(':').pop(), s.state ?? s.text]),
  );
  assert.equal(byKey.steps, 200000, 'clamped to max');
  assert.equal(byKey.ans_charge, -10, 'clamped to min');
  assert.equal(byKey.active_time, 10);
  assert.equal(byKey.distance, 1.23);
  assert.equal(byKey.sleep_time, 7.5);
  assert.equal(byKey.cardio_load_status, 'Sobrecarga');
  assert.equal(states.find((s) => s.text).state, undefined);
  assert.deepEqual(buildStates(fakeGladys, '10579', {}, 'en'), []);
});
