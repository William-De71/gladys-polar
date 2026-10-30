// Every widget content passes validateWidgetContent (the core's checks) in
// the four languages, the full and the empty cases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import {
  buildTodayWidget,
  buildNightWidget,
  buildExercisesWidget,
  buildWeekWidget,
  readWeekSettings,
  messageContent,
  rechargeColor,
  chargeColor,
  cardioColor,
  WEEK_METRICS,
  WIDGET_ACTIONS,
} from '../src/widgets.js';
import { LANGUAGES } from '../src/i18n.js';
import {
  parseExercise,
  parseNight,
  parseRecharge,
  parseActivity,
  parseCardioLoad,
  readList,
} from '../src/polar.js';
import { answers, NOW, TZ } from './helpers/polar-data.js';

const a = answers();
const activities = Object.fromEntries(
  a.activities.map((i) => [i.start_time.slice(0, 10), parseActivity(i)]),
);
const nights = readList(a.sleep.nights, parseNight, (n) => n.date);
const recharges = readList(a.recharges.recharges, parseRecharge, (r) => r.date);
const exercises = readList(a.exercises, parseExercise, (e) => e.startLocal);
const cardio = parseCardioLoad(a.cardio[1]);
const common = { fetchedAt: NOW, timeZone: TZ };

const valid = (content, label) => {
  assert.deepEqual(validateWidgetContent(content), [], label);
  assert.ok(content.components.length <= 8, label);
};

test('today: gauge, four tiles, status and the sync button; without today, a message', () => {
  for (const language of LANGUAGES) {
    const full = buildTodayWidget({
      ...common,
      name: 'Marie',
      activity: activities['2026-10-30'],
      latest: activities['2026-10-30'],
      language,
    });
    valid(full, `today ${language}`);
    assert.deepEqual(
      full.components.map((c) => c.type),
      ['text', 'gauge', 'value', 'value', 'value', 'value', 'status', 'button'],
    );
    assert.equal(full.components.at(-1).action.key, WIDGET_ACTIONS.SYNC);
    const none = buildTodayWidget({
      ...common,
      name: 'Marie',
      activity: null,
      latest: activities['2026-10-29'],
      language,
    });
    valid(none, `today empty ${language}`);
    valid(
      buildTodayWidget({ ...common, name: 'Marie', activity: null, latest: null, language }),
      language,
    );
  }
  const fr = buildTodayWidget({
    ...common,
    name: 'Marie',
    activity: activities['2026-10-30'],
    language: 'fr',
  });
  assert.equal(fr.components[3].value, '3 h 11');
  assert.equal(fr.components[1].value, 89);
});

test('night: tiles and the Nightly Recharge of the same date', () => {
  for (const language of LANGUAGES) {
    const content = buildNightWidget({
      ...common,
      night: nights[0],
      recharge: recharges[0],
      language,
    });
    valid(content, `night ${language}`);
    assert.equal(content.components.filter((c) => c.type === 'value').length, 4);
    valid(buildNightWidget({ ...common, night: nights[0], recharge: null, language }), language);
    valid(buildNightWidget({ ...common, night: null, recharge: recharges[0], language }), language);
    valid(buildNightWidget({ ...common, night: null, recharge: null, language }), language);
  }
  const en = buildNightWidget({
    ...common,
    night: nights[0],
    recharge: recharges[0],
    language: 'en',
  });
  const items = en.components.find((c) => c.type === 'status').items;
  assert.deepEqual(items[0], { label: 'Nightly Recharge', value: 'Good', color: 'success' });
  assert.equal(items[1].value, '+3.2 · Above usual');
});

test('training sessions: a card list and the training status', () => {
  for (const language of LANGUAGES) {
    valid(
      buildExercisesWidget({ ...common, exercises, cardio, language }),
      `exercises ${language}`,
    );
    valid(buildExercisesWidget({ ...common, exercises: [], cardio: null, language }), language);
  }
  const fr = buildExercisesWidget({ ...common, exercises, cardio, language: 'fr' });
  const [first] = fr.components[0].items;
  assert.equal(first.title, 'Course sur route · 47 min');
  assert.match(first.subtitle, /8,2 km · 612 kcal · 151 bpm$/);
  assert.equal(first.badge.text, 'Charge 98');
  assert.equal(first.date, undefined, 'a date would replace the subtitle');
});

test('week: one bar series per metric, a message when empty', () => {
  for (const language of LANGUAGES) {
    for (const metric of WEEK_METRICS) {
      const content = buildWeekWidget({
        activities,
        nights,
        today: '2026-10-30',
        metric,
        language,
      });
      valid(content, `week ${metric} ${language}`);
      assert.equal(content.components[0].series[0].points.length, 7);
    }
    valid(
      buildWeekWidget({
        activities: {},
        nights: [],
        today: '2026-10-30',
        metric: 'steps',
        language,
      }),
      language,
    );
  }
  assert.deepEqual(readWeekSettings({ metric: 'nope' }), { metric: 'steps' });
  assert.deepEqual(readWeekSettings({ metric: 'sleep_score' }), { metric: 'sleep_score' });
});

test('colors and messages', () => {
  assert.deepEqual([1, 3, 4, 6, null].map(rechargeColor), [
    'danger',
    'warning',
    'info',
    'success',
    'neutral',
  ]);
  assert.deepEqual([1, 3, 5].map(chargeColor), ['warning', 'neutral', 'success']);
  assert.equal(cardioColor('OVERREACHING'), 'danger');
  assert.equal(cardioColor('LOAD_STATUS_NOT_AVAILABLE'), 'neutral');
  valid(messageContent('x'.repeat(500)), 'message');
});
