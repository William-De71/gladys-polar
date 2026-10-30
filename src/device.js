// -----------------------------------------------------------------------------
// One Gladys device per linked Polar Flow account: "Polar Marie".
//
// External ids: `ext:<selector>:account:<Polar user id>` and
// `…:account:<id>:<feature key>`. The id is `x_user_id`, the Polar ecosystem
// user id the token endpoint returns: renaming the account keeps its device.
//
// Features (category / type from the SDK constants, units from the ones the
// Gladys core allows for the category, DEVICE_FEATURE_UNITS_BY_CATEGORY).
// Gladys has no health category and no step, calorie, heart rate or weight
// unit, so:
//   - counts without a Gladys unit (steps, kilocalories, sleep score 0-100,
//     Nightly Recharge status 1-6, heart rate in bpm): `counter-sensor` /
//     `integer` without unit, the unit written in the feature name;
//   - durations: `duration` / `integer` in minutes (active time),
//     `duration` / `decimal` in hours (time asleep), `duration` / `integer`
//     in milliseconds (heart rate variability, RMSSD);
//   - distance walked: `distance-sensor` / `decimal`, km;
//   - daily goal: `level-sensor` / `decimal`, percent (it goes past 100);
//   - signed or decimal scores without unit (ANS charge -10 to +10,
//     breathing rate, cardio load ratio): `level-sensor` / `decimal`;
//   - cardio load status: `text` / `text`, in the configured language.
// The weight has no feature (no mass unit in Gladys): the scene action
// gives it.
//
// Today's activity is published once Polar has a summary for the local day of
// Gladys; before the first sync of the day the features keep yesterday's
// last value (their date shows it). `should_poll` stays false: Polar is read
// on the integration's own timer.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';

import { t, cardioStatusLabel } from './i18n.js';

const DEVICE_TYPE = 'account';
const MODEL = 'Polar Flow account (AccessLink)';

const sensor = { read_only: true, has_feedback: false, keep_history: true };
const counter = (max, min = 0) => ({
  category: CATEGORIES.COUNTER_SENSOR,
  type: TYPES.SENSOR.INTEGER,
  ...sensor,
  min,
  max,
});
const level = (min, max, unit) => ({
  category: CATEGORIES.LEVEL_SENSOR,
  type: TYPES.SENSOR.DECIMAL,
  ...(unit ? { unit } : {}),
  ...sensor,
  min,
  max,
});

const round = (value, digits = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const clamp = (value, { min, max }) =>
  value === null ? null : Math.min(max, Math.max(min, value));

// The features: key (eternal), its shape, and its value from the snapshot
// `{ activity, night, recharge, cardio }` (null: nothing to publish).
const FEATURES = [
  { key: 'steps', shape: counter(200000), value: (s) => round(s.activity?.steps) },
  {
    key: 'active_time',
    shape: {
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.INTEGER,
      unit: UNITS.MINUTES,
      ...sensor,
      min: 0,
      max: 1440,
    },
    value: (s) => (s.activity?.activeSeconds == null ? null : round(s.activity.activeSeconds / 60)),
  },
  { key: 'calories', shape: counter(20000), value: (s) => round(s.activity?.calories) },
  {
    key: 'distance',
    shape: {
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.DECIMAL,
      unit: UNITS.KM,
      ...sensor,
      min: 0,
      max: 300,
    },
    value: (s) =>
      s.activity?.distanceMeters == null ? null : round(s.activity.distanceMeters / 1000, 2),
  },
  {
    key: 'daily_goal',
    shape: level(0, 1000, UNITS.PERCENT),
    value: (s) => round(s.activity?.goalPercent),
  },
  { key: 'sleep_score', shape: counter(100), value: (s) => round(s.night?.score) },
  {
    key: 'sleep_time',
    shape: {
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.DECIMAL,
      unit: UNITS.HOURS,
      ...sensor,
      min: 0,
      max: 24,
    },
    value: (s) => (s.night?.sleepSeconds == null ? null : round(s.night.sleepSeconds / 3600, 2)),
  },
  { key: 'nightly_recharge', shape: counter(6), value: (s) => s.recharge?.status ?? null },
  { key: 'ans_charge', shape: level(-10, 10), value: (s) => round(s.recharge?.ansCharge, 1) },
  {
    key: 'hrv',
    shape: {
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.INTEGER,
      unit: UNITS.MILLISECONDS,
      ...sensor,
      min: 0,
      max: 300,
    },
    value: (s) => round(s.recharge?.hrvAvg),
  },
  { key: 'night_heart_rate', shape: counter(250), value: (s) => round(s.recharge?.heartRateAvg) },
  {
    key: 'breathing_rate',
    shape: level(0, 60),
    value: (s) => round(s.recharge?.breathingRateAvg, 1),
  },
  {
    key: 'cardio_load_ratio',
    shape: level(0, 10),
    value: (s) => round(s.cardio?.ratio, 2),
  },
  {
    key: 'cardio_load_status',
    shape: {
      category: CATEGORIES.TEXT,
      type: TYPES.TEXT.TEXT,
      read_only: true,
      has_feedback: false,
      keep_history: false,
      min: 0,
      max: 0,
    },
    text: true,
    value: (s, language) =>
      s.cardio?.status ? cardioStatusLabel(s.cardio.status, language) : null,
  },
];

/**
 * @description The ids of an account device.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} userId - The Polar user id.
 * @returns {{ device: string, feature: Function }} The ids.
 */
const idsOf = (gladys, userId) => gladys.externalIds(DEVICE_TYPE, String(userId));

/**
 * @description The Polar user a device (or feature) external id stands for.
 * @param {unknown} externalId - The external id.
 * @returns {string|null} The Polar user id.
 * @example
 * userIdOfDevice('ext:polar:account:10579'); // -> '10579'
 */
function userIdOfDevice(externalId) {
  const match = /:account:(\d{1,20})(?::[a-z_]+)?$/.exec(String(externalId ?? ''));
  return match ? match[1] : null;
}

/**
 * @description The device of an account.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} account - `{ userId, name }`.
 * @param {object} [options] - `{ language }`.
 * @returns {object} The discovered device.
 */
function buildDevice(gladys, { userId, name }, { language = 'en' } = {}) {
  const ids = idsOf(gladys, userId);
  return {
    name: name ? t('deviceName', language, { name }) : t('deviceNameDefault', language),
    external_id: ids.device,
    model: MODEL,
    should_poll: false,
    params: [{ name: 'POLAR_USER_ID', value: String(userId) }],
    features: FEATURES.map((spec) => ({
      name: t(`feature_${spec.key}`, language),
      external_id: ids.feature(spec.key),
      ...spec.shape,
    })),
  };
}

/**
 * @description The states of an account device.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} userId - The Polar user id.
 * @param {object} snapshot - `{ activity, night, recharge, cardio }`.
 * @param {string} language - The language of the text features.
 * @returns {object[]} The states (none for an unknown value).
 */
function buildStates(gladys, userId, snapshot, language = 'en') {
  const ids = idsOf(gladys, userId);
  return FEATURES.flatMap((spec) => {
    const raw = spec.value(snapshot, language);
    if (raw === null || raw === undefined) {
      return [];
    }
    const id = ids.feature(spec.key);
    return spec.text
      ? [{ device_feature_external_id: id, text: String(raw) }]
      : [{ device_feature_external_id: id, state: clamp(raw, spec.shape) }];
  });
}

export { DEVICE_TYPE, MODEL, FEATURES, idsOf, userIdOfDevice, buildDevice, buildStates };
