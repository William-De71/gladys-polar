// -----------------------------------------------------------------------------
// Dashboard widgets of the Polar integration.
//
//   - `today`      today's activity: the daily goal as a gauge, steps, active
//                  time, calories, distance, the time of the last reading and
//                  a "Sync now" button;
//   - `night`      the last night and its Nightly Recharge: sleep score, time
//                  asleep, deep and REM sleep, then the recharge status, ANS
//                  charge, heart rate variability, heart rate, breathing rate
//                  and sleep window;
//   - `exercises`  the last training sessions as a card list, and the
//                  training status (cardio load status and ratio);
//   - `week`       the last seven days as a bar chart: steps, active time or
//                  sleep score.
//
// The contents come from what the last reading kept: a widget never costs a
// request to Polar. Colors are semantic. Every text exists in the four
// languages (the content is cached per language). Content budget of a card:
// 8 components, 1 main one, 6 tiles, 2 texts, 1 status, 4 buttons.
// -----------------------------------------------------------------------------

import { addDays } from './time.js';
import {
  t,
  sportLabel,
  rechargeLabel,
  chargeLabel,
  cardioStatusLabel,
  formatNumber,
  formatMinutes,
  shortTime,
  shortDate,
  dayTime,
  clockTime,
} from './i18n.js';

const WIDGETS = { TODAY: 'today', NIGHT: 'night', EXERCISES: 'exercises', WEEK: 'week' };
const WIDGET_ACTIONS = { SYNC: 'sync' };
const WEEK_METRICS = ['steps', 'active_time', 'sleep_score'];
const MAX_CARDS = 8;
// Polar is read every 15 to 120 minutes: ten minutes of cache, nudged after
// each reading.
const TTL = { data: 600, message: 300 };

/**
 * @description Truncate a text to a bound, with an ellipsis.
 * @param {string} value - The text.
 * @param {number} max - The bound.
 * @returns {string} The text.
 */
function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @description A widget content made of one message.
 * @param {string} message - The message.
 * @param {number} [ttl] - Its freshness.
 * @returns {object} The content.
 */
function messageContent(message, ttl = TTL.message) {
  return {
    ttl_seconds: ttl,
    components: [{ type: 'text', variant: 'body', text: clip(message, 300) }],
  };
}

const round = (value, digits = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 10 ** digits) / 10 ** digits
    : null;
const minutesOf = (seconds) => (seconds == null ? null : Math.round(seconds / 60));

/**
 * @description A tile.
 * @param {string} label - The label.
 * @param {number|string|null} value - The value.
 * @param {string} [unit] - The unit.
 * @param {string} [icon] - A Feather icon.
 * @param {string} [color] - A semantic color.
 * @returns {object} The component.
 */
const tile = (label, value, unit, icon, color = 'neutral') => ({
  type: 'value',
  label: clip(label, 24),
  value:
    value === null || value === undefined
      ? '-'
      : typeof value === 'string'
        ? clip(value, 12)
        : value,
  ...(value === null || value === undefined || !unit ? {} : { unit }),
  ...(icon ? { icon } : {}),
  color,
});

/**
 * @description The color of a Nightly Recharge status.
 * @param {number|null} status - 1 (very poor) to 6 (very good).
 * @returns {string} A semantic color.
 */
function rechargeColor(status) {
  if (!Number.isInteger(status)) {
    return 'neutral';
  }
  if (status <= 2) {
    return 'danger';
  }
  if (status === 3) {
    return 'warning';
  }
  return status === 4 ? 'info' : 'success';
}

/**
 * @description The color of a "compared to your usual level" scale.
 * @param {number|null} charge - 1 (much below usual) to 5 (much above).
 * @returns {string} A semantic color.
 */
function chargeColor(charge) {
  if (!Number.isInteger(charge)) {
    return 'neutral';
  }
  if (charge <= 2) {
    return 'warning';
  }
  return charge === 3 ? 'neutral' : 'success';
}

/**
 * @description The color of a cardio load status.
 * @param {string|null} status - The status.
 * @returns {string} A semantic color.
 */
function cardioColor(status) {
  switch (status) {
    case 'PRODUCTIVE':
    case 'PRODUCTIVE_DROPPED_FROM_OVERREACHING':
      return 'success';
    case 'MAINTAINING':
      return 'primary';
    case 'DETRAINING':
      return 'info';
    case 'PRODUCTIVE_ALMOST_OVERREACHING':
    case 'RECOVERY_AFTER_OVERREACHING':
      return 'warning';
    case 'OVERREACHING':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * @description The "last reading" row.
 * @param {number|null} fetchedAt - When Polar was read, in ms.
 * @param {string} language - The language.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {object} The status item.
 */
const updatedItem = (fetchedAt, language, timeZone) => ({
  label: t('widgetUpdated', language),
  value: fetchedAt ? shortTime(fetchedAt, language, timeZone) : '-',
  color: 'neutral',
});

/**
 * @description The today widget.
 * @param {object} input - Input.
 * @param {string} input.name - The account name.
 * @param {object|null} input.activity - Today's activity (null before the first sync of the day).
 * @param {object|null} input.latest - The latest activity known (an earlier day).
 * @param {number|null} input.fetchedAt - When Polar was read, in ms.
 * @param {string} input.language - The language.
 * @param {string} [input.timeZone] - IANA timezone.
 * @returns {object} The content.
 */
function buildTodayWidget({ name, activity, latest, fetchedAt, language, timeZone }) {
  const components = [{ type: 'text', variant: 'heading', text: clip(name, 40) }];
  const items = [];
  if (activity) {
    const goal = round(activity.goalPercent);
    if (goal !== null) {
      components.push({
        type: 'gauge',
        label: clip(t('tileGoal', language), 24),
        value: goal,
        min: 0,
        max: 100,
        unit: '%',
        color: goal >= 100 ? 'success' : 'primary',
      });
    }
    const distance =
      activity.distanceMeters == null ? null : round(activity.distanceMeters / 1000, 1);
    components.push(
      tile(t('tileSteps', language), round(activity.steps), null, 'activity', 'primary'),
      tile(
        t('tileActive', language),
        minutesOf(activity.activeSeconds) === null
          ? null
          : formatMinutes(minutesOf(activity.activeSeconds), language),
        null,
        'clock',
      ),
      tile(t('tileCalories', language), round(activity.calories), 'kcal', 'zap'),
      tile(t('tileDistance', language), distance, 'km', 'map-pin'),
    );
    if (activity.inactivityAlerts) {
      items.push({
        label: t('widgetInactivity', language),
        value: activity.inactivityAlerts,
        color: 'warning',
      });
    }
  } else {
    components.push({
      type: 'text',
      variant: 'body',
      text: clip(
        latest
          ? t('widgetNoActivityToday', language, { date: shortDate(latest.date, language) })
          : t('widgetNoActivity', language),
        300,
      ),
    });
  }
  items.push(updatedItem(fetchedAt, language, timeZone));
  components.push(
    { type: 'status', items },
    {
      type: 'button',
      label: clip(t('buttonSync', language), 24),
      icon: 'refresh-cw',
      style: 'secondary',
      action: { key: WIDGET_ACTIONS.SYNC },
    },
  );
  return { ttl_seconds: TTL.data, components };
}

/**
 * @description The night widget.
 * @param {object} input - Input.
 * @param {object|null} input.night - The last night.
 * @param {object|null} input.recharge - The Nightly Recharge of the same date, or the last one.
 * @param {number|null} input.fetchedAt - When Polar was read, in ms.
 * @param {string} input.language - The language.
 * @param {string} [input.timeZone] - IANA timezone.
 * @returns {object} The content.
 */
function buildNightWidget({ night, recharge, fetchedAt, language, timeZone }) {
  if (!night && !recharge) {
    return messageContent(t('widgetNoNight', language));
  }
  const date = night?.date ?? recharge.date;
  const components = [
    {
      type: 'text',
      variant: 'heading',
      text: clip(t('widgetNightOf', language, { date: shortDate(date, language) }), 40),
    },
  ];
  if (night) {
    const time = (seconds) =>
      minutesOf(seconds) === null ? null : formatMinutes(minutesOf(seconds), language);
    components.push(
      tile(
        t('tileSleepScore', language),
        round(night.score),
        '/100',
        'moon',
        chargeColor(night.charge),
      ),
      tile(t('tileAsleep', language), time(night.sleepSeconds), null, 'clock'),
      tile(t('tileDeep', language), time(night.deepSeconds), null, 'battery-charging'),
      tile(t('tileRem', language), time(night.remSeconds), null, 'eye'),
    );
  }
  const items = [];
  if (recharge && recharge.date === date) {
    if (recharge.status) {
      items.push({
        label: t('widgetRecharge', language),
        value: clip(rechargeLabel(recharge.status, language), 40),
        color: rechargeColor(recharge.status),
      });
    }
    if (recharge.ansCharge !== null) {
      const signed = `${recharge.ansCharge > 0 ? '+' : ''}${formatNumber(recharge.ansCharge, language, 1)}`;
      items.push({
        label: t('widgetAnsCharge', language),
        value: clip(
          recharge.ansChargeStatus
            ? `${signed} · ${chargeLabel(recharge.ansChargeStatus, language)}`
            : signed,
          40,
        ),
        color: chargeColor(recharge.ansChargeStatus),
      });
    }
    if (recharge.hrvAvg !== null) {
      items.push({
        label: t('widgetHrv', language),
        value: `${recharge.hrvAvg} ms`,
        color: 'neutral',
      });
    }
    if (recharge.heartRateAvg !== null) {
      items.push({
        label: t('widgetNightHeartRate', language),
        value: `${recharge.heartRateAvg} ${t('bpm', language)}`,
        color: 'neutral',
      });
    }
    if (recharge.breathingRateAvg !== null) {
      items.push({
        label: t('widgetBreathing', language),
        value: `${formatNumber(recharge.breathingRateAvg, language, 1)} /min`,
        color: 'neutral',
      });
    }
  }
  if (night) {
    const start = clockTime(night.start);
    const end = clockTime(night.end);
    if (start && end) {
      items.push({
        label: t('widgetSleepWindow', language),
        value: `${start} → ${end}`,
        color: 'neutral',
      });
    }
    if (night.interruptionSeconds !== null) {
      items.push({
        label: t('widgetInterruptions', language),
        value: formatMinutes(minutesOf(night.interruptionSeconds), language),
        color: 'neutral',
      });
    }
  }
  items.push(updatedItem(fetchedAt, language, timeZone));
  components.push({ type: 'status', items });
  return { ttl_seconds: TTL.data, components };
}

/**
 * @description The training sessions widget.
 * @param {object} input - Input.
 * @param {object[]} input.exercises - The sessions, newest first.
 * @param {object|null} input.cardio - The latest cardio load day.
 * @param {number|null} input.fetchedAt - When Polar was read, in ms.
 * @param {string} input.language - The language.
 * @param {string} [input.timeZone] - IANA timezone.
 * @returns {object} The content.
 */
function buildExercisesWidget({ exercises, cardio, fetchedAt, language, timeZone }) {
  const components = [];
  if (exercises.length === 0) {
    components.push({ type: 'text', variant: 'body', text: t('widgetNoExercise', language) });
  } else {
    components.push({
      type: 'card-list',
      display: 'list',
      items: exercises.slice(0, MAX_CARDS).map((exercise) => {
        const minutes = minutesOf(exercise.durationSeconds);
        const details = [exercise.startLocal ? dayTime(exercise.startLocal, language) : null];
        if (exercise.distanceMeters) {
          details.push(`${formatNumber(exercise.distanceMeters / 1000, language, 1)} km`);
        }
        if (exercise.calories != null) {
          details.push(`${formatNumber(exercise.calories, language, 0)} kcal`);
        }
        if (exercise.heartRateAvg != null) {
          details.push(`${exercise.heartRateAvg} ${t('bpm', language)}`);
        }
        return {
          title: clip(
            minutes === null
              ? sportLabel(exercise, language)
              : `${sportLabel(exercise, language)} · ${formatMinutes(minutes, language)}`,
            60,
          ),
          subtitle: clip(details.filter(Boolean).join(' · '), 60),
          ...(exercise.trainingLoad == null
            ? {}
            : {
                badge: {
                  text: clip(
                    t('badgeLoad', language, {
                      value: formatNumber(exercise.trainingLoad, language, 0),
                    }),
                    16,
                  ),
                  color: 'neutral',
                },
              }),
        };
      }),
    });
  }
  const items = [];
  if (cardio?.status) {
    items.push({
      label: t('widgetTrainingStatus', language),
      value: clip(cardioStatusLabel(cardio.status, language), 40),
      color: cardioColor(cardio.status),
    });
  }
  if (cardio?.ratio != null) {
    items.push({
      label: t('widgetCardioRatio', language),
      value: formatNumber(cardio.ratio, language, 2),
      color: 'neutral',
    });
  }
  if (cardio?.strain != null && cardio?.tolerance != null) {
    items.push({
      label: t('widgetStrainTolerance', language),
      value: `${formatNumber(cardio.strain, language, 0)} / ${formatNumber(cardio.tolerance, language, 0)}`,
      color: 'neutral',
    });
  }
  items.push(updatedItem(fetchedAt, language, timeZone));
  components.push({ type: 'status', items });
  return { ttl_seconds: TTL.data, components };
}

/**
 * @description The week widget.
 * @param {object} input - Input.
 * @param {object} input.activities - The activities, by date.
 * @param {object[]} input.nights - The nights.
 * @param {string} input.today - Today, 'YYYY-MM-DD'.
 * @param {string} input.metric - One of WEEK_METRICS.
 * @param {string} input.language - The language.
 * @returns {object} The content.
 */
function buildWeekWidget({ activities, nights, today, metric, language }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const valueOf = (date) => {
    if (metric === 'sleep_score') {
      return round(nights.find((night) => night.date === date)?.score);
    }
    const activity = activities[date];
    if (metric === 'active_time') {
      return minutesOf(activity?.activeSeconds);
    }
    return round(activity?.steps);
  };
  const points = days
    .map((date) => ({ t: `${date}T00:00:00.000Z`, v: valueOf(date) }))
    .filter((point) => point.v !== null);
  if (points.length === 0) {
    return messageContent(t('widgetNoWeek', language));
  }
  const unit = { steps: '', active_time: 'min', sleep_score: '/100' }[metric];
  const values = points.map((point) => point.v);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const best = points.reduce((top, point) => (point.v > top.v ? point : top), points[0]);
  const format = (value) =>
    metric === 'active_time'
      ? formatMinutes(Math.round(value), language)
      : formatNumber(value, language, 0);
  return {
    ttl_seconds: TTL.data,
    components: [
      {
        type: 'chart',
        chart_type: 'bar',
        title: clip(t(`chart_${metric}`, language), 40),
        ...(unit ? { unit } : {}),
        series: [{ name: clip(t(`series_${metric}`, language), 24), points }],
      },
      {
        type: 'status',
        items: [
          { label: t('widgetAverage', language), value: format(average), color: 'neutral' },
          {
            label: t('widgetBestDay', language),
            value: clip(`${shortDate(best.t.slice(0, 10), language)} · ${format(best.v)}`, 40),
            color: 'success',
          },
        ],
      },
    ],
  };
}

/**
 * @description Read the settings of the week widget.
 * @param {object} [settings] - The settings.
 * @returns {{ metric: string }} The metric.
 */
function readWeekSettings(settings = {}) {
  return { metric: WEEK_METRICS.includes(settings?.metric) ? settings.metric : 'steps' };
}

export {
  WIDGETS,
  WIDGET_ACTIONS,
  WEEK_METRICS,
  MAX_CARDS,
  TTL,
  clip,
  messageContent,
  rechargeColor,
  chargeColor,
  cardioColor,
  buildTodayWidget,
  buildNightWidget,
  buildExercisesWidget,
  buildWeekWidget,
  readWeekSettings,
};
