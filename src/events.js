// -----------------------------------------------------------------------------
// Scene triggers and the outputs of the scene action.
//
// Triggers (one event per transition, never a periodic snapshot):
//   - `exercise_synced`         a training session Polar did not have at the
//                               previous reading (the watch synced it);
//   - `sleep_available`         the night of a new date, from the last two
//                               days (older nights synced late are only
//                               remembered);
//   - `nightly_recharge_available`  the Nightly Recharge of a new date, same
//                               rule;
//   - `daily_goal_reached`      today's activity reached 100 % of the daily
//                               goal, once a day.
// What was announced is kept in `seen` (in /data). The first successful
// reading of each kind only fills `seen` (`baseline`): installing the
// integration or restarting it never fires old events. At most five
// sessions are announced per reading (a watch synced after a long trip).
// A scene action or a widget never fires an event.
// -----------------------------------------------------------------------------

import { KEEP } from './store.js';
import { addDays } from './time.js';
import { sportFamily } from './polar.js';
import {
  t,
  sportLabel,
  rechargeLabel,
  chargeLabel,
  cardioStatusLabel,
  formatNumber,
  formatMinutes,
  clockTime,
} from './i18n.js';

const TRIGGERS = {
  EXERCISE_SYNCED: 'exercise_synced',
  SLEEP_AVAILABLE: 'sleep_available',
  NIGHTLY_RECHARGE_AVAILABLE: 'nightly_recharge_available',
  DAILY_GOAL_REACHED: 'daily_goal_reached',
};
const MAX_EXERCISE_EVENTS = 5;
// Nights and recharges older than this (days before today) are not announced.
const RECENT_DAYS = 2;
const GOAL_PERCENT = 100;

const ACTION_OUTPUTS = [
  'steps',
  'active_minutes',
  'calories',
  'distance_km',
  'daily_goal_percent',
  'activity_date',
  'sleep_score',
  'sleep_hours',
  'sleep_date',
  'nightly_recharge_status',
  'nightly_recharge_label',
  'ans_charge',
  'hrv_avg',
  'cardio_load_status',
  'cardio_load_ratio',
  'last_exercise_sport',
  'last_exercise_date',
  'last_exercise_minutes',
  'weight_kg',
  'summary',
];

const round = (value, digits = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const minutes = (seconds) => (seconds == null ? null : round(seconds / 60));
const hours = (seconds) => (seconds == null ? null : round(seconds / 3600, 2));
const km = (meters) => (meters == null ? null : round(meters / 1000, 2));
const clip = (value, max = 1000) => String(value ?? '').slice(0, max);

/**
 * @description The sentence of a training session.
 * @param {object} exercise - The session.
 * @param {string} language - The language.
 * @returns {string} "Running: 45 min, 8.2 km, 520 kcal, average heart rate 148".
 */
function exerciseSummary(exercise, language) {
  const parts = [formatMinutes(minutes(exercise.durationSeconds), language)];
  if (exercise.distanceMeters) {
    parts.push(`${formatNumber(km(exercise.distanceMeters), language, 1)} km`);
  }
  if (exercise.calories != null) {
    parts.push(`${formatNumber(exercise.calories, language, 0)} kcal`);
  }
  if (exercise.heartRateAvg != null) {
    parts.push(t('heartRateAvgText', language, { value: exercise.heartRateAvg }));
  }
  return `${sportLabel(exercise, language)}: ${parts.join(', ')}`;
}

/**
 * @description The data of a `exercise_synced` event.
 * @param {object} exercise - The session.
 * @param {object} context - `{ account, accountName, language }`.
 * @returns {object} Flat data, scalars only.
 */
function exerciseData(exercise, { account, accountName, language }) {
  return {
    account,
    account_name: clip(accountName, 100),
    exercise_id: clip(exercise.id, 100),
    sport: clip(exercise.detailedSport ?? exercise.sport ?? 'OTHER', 100),
    sport_label: clip(sportLabel(exercise, language), 100),
    sport_family: sportFamily(exercise),
    start_time: exercise.startLocal ?? null,
    date: exercise.date ?? null,
    duration_minutes: minutes(exercise.durationSeconds),
    distance_km: km(exercise.distanceMeters),
    calories: round(exercise.calories),
    heart_rate_avg: round(exercise.heartRateAvg),
    heart_rate_max: round(exercise.heartRateMax),
    training_load: round(exercise.trainingLoad, 1),
    cardio_load: round(exercise.cardioLoad, 1),
    device_model: clip(exercise.device, 100),
    summary: clip(exerciseSummary(exercise, language)),
  };
}

/**
 * @description The data of a `sleep_available` event.
 * @param {object} night - The night.
 * @param {object} context - `{ account, accountName, language }`.
 * @returns {object} Flat data, scalars only.
 */
function nightData(night, { account, accountName, language }) {
  return {
    account,
    account_name: clip(accountName, 100),
    date: night.date,
    sleep_score: round(night.score),
    sleep_hours: hours(night.sleepSeconds),
    sleep_minutes: minutes(night.sleepSeconds),
    deep_minutes: minutes(night.deepSeconds),
    rem_minutes: minutes(night.remSeconds),
    light_minutes: minutes(night.lightSeconds),
    interruptions_minutes: minutes(night.interruptionSeconds),
    continuity: round(night.continuity, 1),
    sleep_charge: round(night.charge),
    sleep_charge_label: night.charge == null ? null : chargeLabel(night.charge, language),
    sleep_start: clockTime(night.start),
    sleep_end: clockTime(night.end),
    summary: clip(
      t('summaryNight', language, {
        score: night.score ?? '?',
        duration: formatMinutes(minutes(night.sleepSeconds), language),
      }),
    ),
  };
}

/**
 * @description The data of a `nightly_recharge_available` event.
 * @param {object} recharge - The recharge.
 * @param {object} context - `{ account, accountName, language }`.
 * @returns {object} Flat data, scalars only.
 */
function rechargeData(recharge, { account, accountName, language }) {
  return {
    account,
    account_name: clip(accountName, 100),
    date: recharge.date,
    status: recharge.status,
    status_label: rechargeLabel(recharge.status, language),
    ans_charge: round(recharge.ansCharge, 1),
    ans_charge_label:
      recharge.ansChargeStatus == null ? null : chargeLabel(recharge.ansChargeStatus, language),
    hrv_avg: round(recharge.hrvAvg),
    heart_rate_avg: round(recharge.heartRateAvg),
    breathing_rate_avg: round(recharge.breathingRateAvg, 1),
    summary: clip(
      t('summaryRecharge', language, {
        status: rechargeLabel(recharge.status, language).toLowerCase(),
        ans: formatNumber(recharge.ansCharge, language, 1),
        hrv: recharge.hrvAvg ?? '?',
      }),
    ),
  };
}

/**
 * @description The data of a `daily_goal_reached` event.
 * @param {object} activity - Today's activity.
 * @param {object} context - `{ account, accountName, language }`.
 * @returns {object} Flat data, scalars only.
 */
function goalData(activity, { account, accountName, language }) {
  return {
    account,
    account_name: clip(accountName, 100),
    date: activity.date,
    daily_goal_percent: round(activity.goalPercent),
    steps: round(activity.steps),
    active_minutes: minutes(activity.activeSeconds),
    calories: round(activity.calories),
    distance_km: km(activity.distanceMeters),
    summary: clip(
      t('summaryGoal', language, {
        steps: formatNumber(activity.steps, language, 0),
        active: formatMinutes(minutes(activity.activeSeconds), language),
      }),
    ),
  };
}

/**
 * @description Add values to a remembered list, keep the last ones.
 * @param {string[]} list - The list.
 * @param {string[]} values - New values.
 * @param {number} max - How many to keep.
 * @returns {string[]} The list.
 */
function remember(list, values, max) {
  const next = [...list.filter((value) => !values.includes(value)), ...values];
  return next.slice(-max);
}

/**
 * @description The events of a reading, and what is remembered after it.
 * @param {object} input - Input.
 * @param {object} input.read - The kinds read successfully this time:
 * `{ exercises, nights, recharges, goals }` booleans.
 * @param {object} input.data - The store data (exercises, nights, recharges,
 * activities, seen, baseline).
 * @param {string} input.today - Today, 'YYYY-MM-DD'.
 * @param {object} input.context - `{ account, accountName, language }`.
 * @returns {{ events: object[], seen: object, baseline: object }} The result.
 */
function detectEvents({ read, data, today, context }) {
  const seen = { ...data.seen };
  const baseline = { ...data.baseline };
  const events = [];
  const recentFrom = addDays(today, -RECENT_DAYS);

  if (read.exercises) {
    const fresh = data.exercises.filter((exercise) => !seen.exercises.includes(exercise.id));
    if (baseline.exercises) {
      // Oldest first, the newest five at most.
      [...fresh]
        .reverse()
        .slice(-MAX_EXERCISE_EVENTS)
        .forEach((exercise) =>
          events.push({ key: TRIGGERS.EXERCISE_SYNCED, data: exerciseData(exercise, context) }),
        );
    }
    seen.exercises = remember(
      seen.exercises,
      fresh.map((exercise) => exercise.id),
      KEEP.seenIds,
    );
    baseline.exercises = true;
  }

  const dated = (kind, list, trigger, build) => {
    if (!read[kind]) {
      return;
    }
    const fresh = list.filter((entry) => !seen[kind].includes(entry.date));
    if (baseline[kind]) {
      [...fresh]
        .reverse()
        .filter((entry) => entry.date >= recentFrom)
        .forEach((entry) => events.push({ key: trigger, data: build(entry, context) }));
    }
    seen[kind] = remember(
      seen[kind],
      fresh.map((entry) => entry.date),
      KEEP.seenDates,
    );
    baseline[kind] = true;
  };
  dated('nights', data.nights, TRIGGERS.SLEEP_AVAILABLE, nightData);
  dated(
    'recharges',
    data.recharges.filter((recharge) => recharge.status !== null),
    TRIGGERS.NIGHTLY_RECHARGE_AVAILABLE,
    rechargeData,
  );

  if (read.goals) {
    const activity = data.activities[today];
    if (activity && activity.goalPercent >= GOAL_PERCENT && !seen.goals.includes(today)) {
      if (baseline.goals) {
        events.push({ key: TRIGGERS.DAILY_GOAL_REACHED, data: goalData(activity, context) });
      }
      seen.goals = remember(seen.goals, [today], KEEP.seenDates);
    }
    baseline.goals = true;
  }
  return { events, seen, baseline };
}

/**
 * @description The outputs of the `get_summary` scene action, from what the
 * last reading kept (no request to Polar).
 * @param {object} snapshot - `{ activity, night, recharge, cardio, exercise, physical }`.
 * @param {object} options - `{ language }`.
 * @returns {object} Only the declared outputs, scalars or null.
 */
function actionOutputs({ activity, night, recharge, cardio, exercise, physical }, { language }) {
  const parts = [];
  if (activity) {
    parts.push(
      t('summaryActivity', language, {
        steps: formatNumber(activity.steps, language, 0),
        goal: formatNumber(activity.goalPercent, language, 0),
      }),
    );
  }
  if (night) {
    parts.push(
      t('summaryNight', language, {
        score: night.score ?? '?',
        duration: formatMinutes(minutes(night.sleepSeconds), language),
      }),
    );
  }
  if (recharge?.status) {
    parts.push(
      t('summaryRechargeShort', language, {
        status: rechargeLabel(recharge.status, language).toLowerCase(),
      }),
    );
  }
  const data = {
    steps: round(activity?.steps),
    active_minutes: minutes(activity?.activeSeconds),
    calories: round(activity?.calories),
    distance_km: km(activity?.distanceMeters),
    daily_goal_percent: round(activity?.goalPercent),
    activity_date: activity?.date,
    sleep_score: round(night?.score),
    sleep_hours: hours(night?.sleepSeconds),
    sleep_date: night?.date,
    nightly_recharge_status: recharge?.status,
    nightly_recharge_label: recharge?.status ? rechargeLabel(recharge.status, language) : null,
    ans_charge: round(recharge?.ansCharge, 1),
    hrv_avg: round(recharge?.hrvAvg),
    cardio_load_status: cardio?.status ? cardioStatusLabel(cardio.status, language) : null,
    cardio_load_ratio: round(cardio?.ratio, 2),
    last_exercise_sport: exercise ? sportLabel(exercise, language) : null,
    last_exercise_date: exercise?.date,
    last_exercise_minutes: minutes(exercise?.durationSeconds),
    weight_kg: round(physical?.weight, 1),
    summary: parts.length > 0 ? parts.join(' ') : t('summaryNothing', language),
  };
  return Object.fromEntries(ACTION_OUTPUTS.map((key) => [key, data[key] ?? null]));
}

export {
  TRIGGERS,
  MAX_EXERCISE_EVENTS,
  RECENT_DAYS,
  GOAL_PERCENT,
  ACTION_OUTPUTS,
  exerciseSummary,
  exerciseData,
  nightData,
  rechargeData,
  goalData,
  detectEvents,
  actionOutputs,
};
