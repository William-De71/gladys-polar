// -----------------------------------------------------------------------------
// The answers of Polar AccessLink v3, read into plain records.
//
// Field names come from the data models of the official documentation
// (https://www.polar.com/accesslink-api/, non-transactional endpoints):
//   - daily activity (`/v3/users/activities`): `start_time`, `active_duration`
//     (ISO 8601), `daily_activity` (percentage of the daily goal), `calories`,
//     `active_calories`, `steps`, `distance_from_steps` (m). The day is the
//     date of `start_time`: "begin and end of day are determined by the time
//     set on the device used";
//   - training sessions (`/v3/exercises`): hashed `id`, `start_time` in the
//     local time of the watch with `start_time_utc_offset` (minutes),
//     `duration` (ISO 8601), `calories`, `distance` (m), `heart_rate.average`
//     / `.maximum`, `training_load`, `sport`, `detailed_sport_info`,
//     `training_load_pro["cardio-load"]`, `device`;
//   - nights (`/v3/users/sleep`, `nights`): `date`, `sleep_start_time`,
//     `sleep_end_time`, `light_sleep`, `deep_sleep`, `rem_sleep`,
//     `unrecognized_sleep_stage`, `total_interruption_duration` (seconds),
//     `sleep_score` (1-100), `sleep_charge` (1-5), `continuity` (1.0-5.0);
//   - Nightly Recharge (`/v3/users/nightly-recharge`, `recharges`): `date`,
//     `nightly_recharge_status` (1-6), `ans_charge` (-10 to +10),
//     `ans_charge_status` (1-5), `heart_rate_avg`, `heart_rate_variability_avg`
//     (RMSSD, ms), `breathing_rate_avg`;
//   - cardio load (`/v3/users/cardio-load`): `date`, `cardio_load_status`,
//     `cardio_load`, `strain`, `tolerance`, `cardio_load_ratio`;
//   - physical info (`/v3/users/physical-info`): `weight` (kg), `height`,
//     `resting_heart_rate`, `maximum_heart_rate`, `vo2_max`, `modified`.
// A missing or malformed value is null: Polar leaves out what the watch did
// not measure.
// -----------------------------------------------------------------------------

import { isDate } from './time.js';

const DURATION_REGEX =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
const LOCAL_TIME_REGEX = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/;

const CARDIO_LOAD_STATUSES = [
  'LOAD_STATUS_NOT_AVAILABLE',
  'DETRAINING',
  'MAINTAINING',
  'PRODUCTIVE',
  'OVERREACHING',
  'RECOVERY_AFTER_OVERREACHING',
  'PRODUCTIVE_DROPPED_FROM_OVERREACHING',
  'PRODUCTIVE_ALMOST_OVERREACHING',
  'UNRECOGNIZED',
];

// Families of sports, for the filter of the "training synced" trigger.
const SPORT_FAMILIES = ['running', 'cycling', 'walking', 'swimming', 'winter', 'strength', 'other'];
const FAMILY_RULES = [
  ['swimming', /SWIMMING/],
  ['running', /RUNNING|JOGGING/],
  ['cycling', /CYCLING|BIKING|E_BIKE|GRAVEL|SPINNING|KICKBIKE/],
  ['walking', /WALKING|HIKING|RUCKING|SNOWSHOE|STAIR_WORKOUT/],
  ['winter', /SKIING|SNOWBOARD|ICE_SKATING|ICE_HOCKEY|BIATHLON|CURLING|SKIERG/],
  [
    'strength',
    /STRENGTH|KETTLEBELL|CALISTHENICS|^CORE$|FUNCTIONAL|CIRCUIT|HIIT|BOOTCAMP|BODYPUMP|GRIT_STRENGTH/,
  ],
];

/**
 * @description A finite number, or null.
 * @param {unknown} value - The value.
 * @returns {number|null} The number.
 */
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * @description A non-empty trimmed string, or null.
 * @param {unknown} value - The value.
 * @returns {string|null} The string.
 */
const str = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * @description An ISO 8601 duration in seconds.
 * @param {unknown} value - 'PT2H44M', 'PT18H23M30S', 'PT210.026S'…
 * @returns {number|null} The seconds.
 * @example
 * parseDuration('PT3H11M'); // -> 11460
 */
function parseDuration(value) {
  const match = typeof value === 'string' ? DURATION_REGEX.exec(value.trim()) : null;
  if (!match || value.trim() === 'P' || value.trim() === 'PT') {
    return null;
  }
  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  return Math.round(days * 86400 + hours * 3600 + minutes * 60 + seconds);
}

/**
 * @description The date of a local date-time ('2026-10-29T18:05:00').
 * @param {unknown} value - The value.
 * @returns {string|null} 'YYYY-MM-DD'.
 */
function dateOf(value) {
  const date = typeof value === 'string' ? value.slice(0, 10) : null;
  return isDate(date) ? date : null;
}

/**
 * @description An ISO instant in ms, or null.
 * @param {unknown} value - The value.
 * @returns {number|null} The instant.
 */
function instantOf(value) {
  const instant = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(instant) ? instant : null;
}

/**
 * @description A daily activity summary.
 * @param {object} raw - One item of `/v3/users/activities`.
 * @returns {object|null} The activity, null without a day.
 */
function parseActivity(raw) {
  const date = dateOf(raw?.start_time);
  if (!date) {
    return null;
  }
  return {
    date,
    steps: num(raw.steps),
    calories: num(raw.calories),
    activeCalories: num(raw.active_calories),
    activeSeconds: parseDuration(raw.active_duration),
    distanceMeters: num(raw.distance_from_steps),
    goalPercent: num(raw.daily_activity),
    inactivityAlerts: num(raw.inactivity_alert_count),
  };
}

/**
 * @description The instant a training session started, from its local time
 * and its offset to UTC.
 * @param {string|null} local - '2026-10-29T18:05:00' (watch time).
 * @param {number|null} offset - Minutes ahead of UTC.
 * @returns {number|null} The instant, in ms.
 */
function startInstant(local, offset) {
  const match = local ? LOCAL_TIME_REGEX.exec(local) : null;
  if (!match) {
    return null;
  }
  const asUtc = Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4] ?? '00'}Z`);
  return Number.isFinite(asUtc) ? asUtc - (offset ?? 0) * 60 * 1000 : null;
}

/**
 * @description A training session.
 * @param {object} raw - One item of `/v3/exercises`.
 * @returns {object|null} The session, null without an id.
 */
function parseExercise(raw) {
  const id = str(raw?.id) ?? (num(raw?.id) === null ? null : String(raw.id));
  if (!id) {
    return null;
  }
  const local = str(raw.start_time);
  const offset = num(raw.start_time_utc_offset);
  const pro = raw.training_load_pro && typeof raw.training_load_pro === 'object';
  return {
    id,
    sport: str(raw.sport),
    detailedSport: str(raw.detailed_sport_info),
    startLocal: local && LOCAL_TIME_REGEX.test(local) ? local.slice(0, 16) : null,
    startAt: startInstant(local, offset),
    uploadAt: instantOf(raw.upload_time),
    date: dateOf(local),
    durationSeconds: parseDuration(raw.duration),
    calories: num(raw.calories),
    distanceMeters: num(raw.distance),
    heartRateAvg: num(raw.heart_rate?.average),
    heartRateMax: num(raw.heart_rate?.maximum),
    trainingLoad: num(raw.training_load),
    cardioLoad: pro ? num(raw.training_load_pro['cardio-load']) : null,
    device: str(raw.device),
  };
}

/**
 * @description A night of sleep.
 * @param {object} raw - One item of `nights`.
 * @returns {object|null} The night, null without a date.
 */
function parseNight(raw) {
  const date = isDate(raw?.date) ? raw.date : null;
  if (!date) {
    return null;
  }
  const stages = [raw.light_sleep, raw.deep_sleep, raw.rem_sleep, raw.unrecognized_sleep_stage]
    .map(num)
    .filter((value) => value !== null);
  return {
    date,
    start: str(raw.sleep_start_time),
    end: str(raw.sleep_end_time),
    lightSeconds: num(raw.light_sleep),
    deepSeconds: num(raw.deep_sleep),
    remSeconds: num(raw.rem_sleep),
    // The time asleep: every stage between falling asleep and waking up,
    // the unrecognised one included, the interruptions not.
    sleepSeconds: stages.length > 0 ? stages.reduce((sum, value) => sum + value, 0) : null,
    interruptionSeconds: num(raw.total_interruption_duration),
    score: num(raw.sleep_score),
    charge: num(raw.sleep_charge),
    continuity: num(raw.continuity),
    goalSeconds: num(raw.sleep_goal),
  };
}

/**
 * @description A Nightly Recharge.
 * @param {object} raw - One item of `recharges`.
 * @returns {object|null} The recharge, null without a date.
 */
function parseRecharge(raw) {
  const date = isDate(raw?.date) ? raw.date : null;
  if (!date) {
    return null;
  }
  const status = num(raw.nightly_recharge_status);
  return {
    date,
    status: status !== null && status >= 1 && status <= 6 ? Math.round(status) : null,
    ansCharge: num(raw.ans_charge),
    ansChargeStatus: num(raw.ans_charge_status),
    heartRateAvg: num(raw.heart_rate_avg),
    hrvAvg: num(raw.heart_rate_variability_avg),
    breathingRateAvg: num(raw.breathing_rate_avg),
  };
}

/**
 * @description A cardio load day.
 * @param {object} raw - One item of `/v3/users/cardio-load`.
 * @returns {object|null} The day, null without a date.
 */
function parseCardioLoad(raw) {
  const date = isDate(raw?.date) ? raw.date : null;
  if (!date) {
    return null;
  }
  const status = str(raw.cardio_load_status);
  return {
    date,
    status:
      status && CARDIO_LOAD_STATUSES.includes(status) ? status : status ? 'UNRECOGNIZED' : null,
    load: num(raw.cardio_load),
    strain: num(raw.strain),
    tolerance: num(raw.tolerance),
    ratio: num(raw.cardio_load_ratio),
  };
}

/**
 * @description The physical info.
 * @param {object|null} raw - The answer of `/v3/users/physical-info`.
 * @returns {object|null} The record.
 */
function parsePhysical(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return {
    weight: num(raw.weight),
    restingHeartRate: num(raw.resting_heart_rate),
    maximumHeartRate: num(raw.maximum_heart_rate),
    vo2max: num(raw.vo2_max),
    modified: str(raw.modified),
  };
}

/**
 * @description Read a list, dropping what cannot be read, newest first.
 * @param {unknown} list - The raw list.
 * @param {Function} parse - The reader.
 * @param {Function} order - `(record) => sortable string`.
 * @returns {object[]} The records.
 */
function readList(list, parse, order) {
  return (Array.isArray(list) ? list : [])
    .map(parse)
    .filter(Boolean)
    .sort((a, b) => (order(a) < order(b) ? 1 : order(a) > order(b) ? -1 : 0));
}

/**
 * @description The family of a sport.
 * @param {object} exercise - `{ sport, detailedSport }`.
 * @returns {string} One of SPORT_FAMILIES.
 * @example
 * sportFamily({ detailedSport: 'TRAIL_RUNNING' }); // -> 'running'
 */
function sportFamily({ sport, detailedSport } = {}) {
  const code = String(detailedSport ?? sport ?? '').toUpperCase();
  const rule = FAMILY_RULES.find(([, pattern]) => pattern.test(code));
  return rule ? rule[0] : 'other';
}

export {
  CARDIO_LOAD_STATUSES,
  SPORT_FAMILIES,
  parseDuration,
  parseActivity,
  parseExercise,
  parseNight,
  parseRecharge,
  parseCardioLoad,
  parsePhysical,
  readList,
  sportFamily,
};
