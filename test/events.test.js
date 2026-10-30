// Scene trigger transitions and payloads, and the scene action outputs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRIGGERS,
  ACTION_OUTPUTS,
  MAX_EXERCISE_EVENTS,
  detectEvents,
  actionOutputs,
} from '../src/events.js';
import { EMPTY } from '../src/store.js';
import { parseExercise, parseNight, parseRecharge, parseActivity, readList } from '../src/polar.js';
import { answers } from './helpers/polar-data.js';

const ALL = { exercises: true, nights: true, recharges: true, goals: true };
const context = { account: 'ext:x:account:1', accountName: 'Marie', language: 'en' };

/**
 * @description A store filled with the made-up answers.
 * @returns {object} The data.
 */
function data() {
  const a = answers();
  const store = EMPTY();
  store.exercises = readList(a.exercises, parseExercise, (e) => e.startLocal);
  store.nights = readList(a.sleep.nights, parseNight, (n) => n.date);
  store.recharges = readList(a.recharges.recharges, parseRecharge, (r) => r.date);
  for (const item of a.activities) {
    const activity = parseActivity(item);
    store.activities[activity.date] = activity;
  }
  return store;
}

const checkPayload = (event) => {
  const entries = Object.entries(event.data);
  assert.ok(entries.length <= 30, event.key);
  for (const [key, value] of entries) {
    assert.ok(
      value === null ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)) ||
        (typeof value === 'string' && value.length <= 1000),
      `${event.key}.${key}`,
    );
  }
};

test('the first reading of each kind is a baseline: no event', () => {
  const store = data();
  store.activities['2026-10-30'].goalPercent = 120;
  const { events, seen, baseline } = detectEvents({
    read: ALL,
    data: store,
    today: '2026-10-30',
    context,
  });
  assert.deepEqual(events, []);
  assert.equal(seen.exercises.length, 4);
  assert.equal(seen.nights.length, 7);
  assert.deepEqual(seen.goals, ['2026-10-30']);
  assert.deepEqual(baseline, ALL);
});

test('a kind not read keeps its baseline for later', () => {
  const store = data();
  const { baseline, seen } = detectEvents({
    read: { ...ALL, exercises: false },
    data: store,
    today: '2026-10-30',
    context,
  });
  assert.equal(baseline.exercises, false);
  assert.deepEqual(seen.exercises, []);
});

test('new items after the baseline: one event each, recent nights only, valid payloads', () => {
  const store = data();
  Object.assign(store, detectEvents({ read: ALL, data: store, today: '2026-10-30', context }));
  // Forget the last two nights and recharges and one old night: as if new.
  store.seen.nights = store.seen.nights.filter(
    (date) => !['2026-10-30', '2026-10-29', '2026-10-24'].includes(date),
  );
  store.seen.recharges = store.seen.recharges.filter((date) => date !== '2026-10-30');
  store.seen.exercises = store.seen.exercises.slice(2);
  store.activities['2026-10-30'].goalPercent = 101;
  const { events } = detectEvents({ read: ALL, data: store, today: '2026-10-30', context });
  assert.deepEqual(
    events.map((e) => `${e.key} ${e.data.date ?? ''}`),
    [
      `${TRIGGERS.EXERCISE_SYNCED} 2026-10-27`,
      `${TRIGGERS.EXERCISE_SYNCED} 2026-10-29`,
      `${TRIGGERS.SLEEP_AVAILABLE} 2026-10-29`,
      `${TRIGGERS.SLEEP_AVAILABLE} 2026-10-30`,
      `${TRIGGERS.NIGHTLY_RECHARGE_AVAILABLE} 2026-10-30`,
      `${TRIGGERS.DAILY_GOAL_REACHED} 2026-10-30`,
    ],
  );
  events.forEach(checkPayload);
  const night = events.find(
    (e) => e.key === TRIGGERS.SLEEP_AVAILABLE && e.data.date === '2026-10-30',
  );
  assert.equal(night.data.sleep_score, 82);
  assert.equal(night.data.sleep_start, '23:12');
  assert.equal(night.data.sleep_end, '07:05');
  assert.equal(night.data.sleep_minutes, 451);
  assert.equal(night.data.summary, 'Sleep score 82, 7 h 31 asleep.');
  const recharge = events.find((e) => e.key === TRIGGERS.NIGHTLY_RECHARGE_AVAILABLE);
  assert.equal(recharge.data.status, 5);
  assert.equal(recharge.data.status_label, 'Good');
  assert.equal(recharge.data.account, context.account);
  const ride = events.find((e) => e.data.sport === 'ROAD_BIKING');
  assert.equal(ride.data.sport_family, 'cycling');
  assert.equal(
    ride.data.summary,
    'Road cycling: 1 h 32, 38.5 km, 890 kcal, average heart rate 132 bpm',
  );
});

test('a watch synced after a long trip: five sessions at most', () => {
  const store = data();
  store.baseline.exercises = true;
  store.exercises = Array.from({ length: 9 }, (_, i) => ({
    ...store.exercises[0],
    id: `x${i}`,
  }));
  const { events, seen } = detectEvents({
    read: { exercises: true },
    data: store,
    today: '2026-10-30',
    context,
  });
  assert.equal(events.length, MAX_EXERCISE_EVENTS);
  assert.equal(seen.exercises.length, 9, 'all remembered');
});

test('the daily goal fires once a day', () => {
  const store = data();
  store.baseline.goals = true;
  store.activities['2026-10-30'].goalPercent = 100;
  const first = detectEvents({ read: { goals: true }, data: store, today: '2026-10-30', context });
  assert.equal(first.events.length, 1);
  store.seen = first.seen;
  const second = detectEvents({ read: { goals: true }, data: store, today: '2026-10-30', context });
  assert.equal(second.events.length, 0);
});

test('scene action outputs: the declared keys, scalars, a summary even without data', () => {
  const store = data();
  const outputs = actionOutputs(
    {
      activity: store.activities['2026-10-30'],
      night: store.nights[0],
      recharge: store.recharges[0],
      cardio: { status: 'PRODUCTIVE', ratio: 1.123 },
      exercise: store.exercises[0],
      physical: { weight: 61.44 },
    },
    { language: 'de' },
  );
  assert.deepEqual(Object.keys(outputs), ACTION_OUTPUTS);
  assert.equal(outputs.cardio_load_status, 'Produktiv');
  assert.equal(outputs.cardio_load_ratio, 1.12);
  assert.equal(outputs.weight_kg, 61.4);
  assert.equal(outputs.last_exercise_sport, 'Straßenlauf');
  assert.match(outputs.summary, /Schritte.*Schlafwert 82.*Nightly Recharge gut/);
  const empty = actionOutputs({}, { language: 'es' });
  assert.deepEqual(Object.keys(empty), ACTION_OUTPUTS);
  assert.equal(empty.steps, null);
  assert.match(empty.summary, /Polar Flow/);
  assert.ok(ACTION_OUTPUTS.length <= 20);
});
