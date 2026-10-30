// Made-up answers of Polar AccessLink v3, shaped exactly like the examples of
// the official documentation (https://www.polar.com/accesslink-api/), for one
// user on Friday 30 October 2026 in Paris. Used by the tests and by the
// widget illustrations (docs/illustrations/gen.mjs). No real account behind.

const USER_ID = 10579;
// Friday 30 October 2026, 18:40 in Paris (UTC+1).
const NOW = Date.parse('2026-10-30T17:40:00Z');
const TZ = 'Europe/Paris';

const TOKEN_ANSWER = {
  access_token: '2YotnFZFEjr1zCsicMWpAA',
  token_type: 'bearer',
  expires_in: 31535999,
  x_user_id: USER_ID,
};

const USER = {
  'polar-user-id': USER_ID,
  'member-id': `gladys-${USER_ID}`,
  'registration-date': '2026-10-01T08:12:00.000Z',
  'first-name': 'Marie',
  'last-name': 'Durand',
  birthdate: '1988-05-14',
  gender: 'FEMALE',
  weight: 61,
  height: 168,
  'extra-info': [],
};

const activity = (date, steps, active, goal, calories, distance, alerts = 0) => ({
  start_time: `${date}T00:00:00`,
  end_time: `${date}T23:59:59`,
  active_duration: active,
  inactive_duration: 'PT15H2M',
  daily_activity: goal,
  calories,
  active_calories: Math.round(calories * 0.32),
  steps,
  inactivity_alert_count: alerts,
  distance_from_steps: distance,
});

const ACTIVITIES = [
  activity('2026-10-23', 9412, 'PT3H2M', 96.4, 2214, 6820.4),
  activity('2026-10-24', 13804, 'PT4H25M', 131.2, 2588, 10115.8),
  activity('2026-10-25', 6120, 'PT2H11M', 71.5, 2016, 4402.1, 2),
  activity('2026-10-26', 7835, 'PT2H40M', 84, 2105, 5630.2),
  activity('2026-10-27', 10950, 'PT3H48M', 118.6, 2702, 7954.7),
  activity('2026-10-28', 5420, 'PT1H52M', 63.2, 1950, 3901.5, 3),
  activity('2026-10-29', 12208, 'PT3H55M', 112.3, 2618, 8846.3),
  activity('2026-10-30', 8823, 'PT3H11M', 89.1, 2120, 6372.6, 1),
];

const exercise = (id, start, sport, detailed, duration, extra) => ({
  id,
  upload_time: `${start.slice(0, 10)}T20:00:00.000Z`,
  polar_user: `https://www.polaraccesslink.com/v3/users/${USER_ID}`,
  device: 'Polar Vantage V3',
  device_id: '1111AAAA',
  start_time: start,
  start_time_utc_offset: 60,
  duration,
  sport,
  detailed_sport_info: detailed,
  has_route: Boolean(extra.distance),
  ...extra,
});

const EXERCISES = [
  exercise('aQlC83', '2026-10-29T18:05:00', 'RUNNING', 'ROAD_RUNNING', 'PT47M12S', {
    calories: 612,
    distance: 8240,
    heart_rate: { average: 151, maximum: 174 },
    training_load: 98.4,
    training_load_pro: {
      date: '2026-10-29',
      'cardio-load': 98.4,
      'muscle-load': 0,
      'perceived-load': 0,
      'cardio-load-interpretation': 'MEDIUM',
      'muscle-load-interpretation': 'UNKNOWN',
      'perceived-load-interpretation': 'UNKNOWN',
      'user-rpe': 'UNKNOWN',
    },
  }),
  exercise('bR7x2Q', '2026-10-27T12:30:00', 'CYCLING', 'ROAD_BIKING', 'PT1H32M', {
    calories: 890,
    distance: 38500,
    heart_rate: { average: 132, maximum: 165 },
    training_load: 121,
  }),
  exercise('cT90pz', '2026-10-25T09:10:00', 'OTHER', 'STRENGTH_TRAINING', 'PT55M', {
    calories: 380,
    heart_rate: { average: 112, maximum: 148 },
    training_load: 45.2,
  }),
  exercise('dK4mWe', '2026-10-23T07:45:00', 'RUNNING', 'TRAIL_RUNNING', 'PT1H8M', {
    calories: 845,
    distance: 11300,
    heart_rate: { average: 147, maximum: 178 },
    training_load: 132.6,
  }),
];

const night = (date, score, light, deep, rem, start, end, charge, interruptions = 1500) => ({
  polar_user: `https://www.polaraccesslink.com/v3/users/${USER_ID}`,
  date,
  sleep_start_time: start,
  sleep_end_time: end,
  device_id: '1111AAAA',
  continuity: 3.4,
  continuity_class: 3,
  light_sleep: light,
  deep_sleep: deep,
  rem_sleep: rem,
  unrecognized_sleep_stage: 0,
  sleep_score: score,
  total_interruption_duration: interruptions,
  sleep_charge: charge,
  sleep_goal: 28800,
  sleep_rating: 0,
  short_interruption_duration: 600,
  long_interruption_duration: interruptions - 600,
  sleep_cycles: 5,
  group_duration_score: 90,
  group_solidity_score: 75,
  group_regeneration_score: 70.5,
  hypnogram: { '23:12': 2, '23:40': 4 },
  heart_rate_samples: { '23:15': 61, '23:20': 58 },
});

const NIGHTS = [
  night(
    '2026-10-24',
    74,
    14100,
    4800,
    5400,
    '2026-10-23T23:40:00+02:00',
    '2026-10-24T07:10:00+02:00',
    3,
  ),
  night(
    '2026-10-25',
    68,
    13200,
    4200,
    4900,
    '2026-10-25T00:20:00+02:00',
    '2026-10-25T07:30:00+02:00',
    2,
  ),
  night(
    '2026-10-26',
    79,
    15000,
    5100,
    6000,
    '2026-10-25T23:05:00+01:00',
    '2026-10-26T06:55:00+01:00',
    3,
  ),
  night(
    '2026-10-27',
    85,
    15600,
    5600,
    6600,
    '2026-10-26T22:50:00+01:00',
    '2026-10-27T06:58:00+01:00',
    4,
  ),
  night(
    '2026-10-28',
    71,
    13900,
    4500,
    5200,
    '2026-10-27T23:35:00+01:00',
    '2026-10-28T06:50:00+01:00',
    3,
  ),
  night(
    '2026-10-29',
    77,
    14800,
    4900,
    5900,
    '2026-10-28T23:20:00+01:00',
    '2026-10-29T07:00:00+01:00',
    3,
  ),
  night(
    '2026-10-30',
    82,
    15420,
    5280,
    6360,
    '2026-10-29T23:12:30+01:00',
    '2026-10-30T07:05:10+01:00',
    4,
    1920,
  ),
];

const recharge = (date, status, ans, ansStatus, hrv, hr, breathing) => ({
  polar_user: `https://www.polaraccesslink.com/v3/users/${USER_ID}`,
  date,
  heart_rate_avg: hr,
  beat_to_beat_avg: Math.round(60000 / hr),
  heart_rate_variability_avg: hrv,
  breathing_rate_avg: breathing,
  nightly_recharge_status: status,
  ans_charge: ans,
  ans_charge_status: ansStatus,
  hrv_samples: { '23:15': hrv },
  breathing_samples: { '23:15': breathing },
});

const RECHARGES = [
  recharge('2026-10-28', 3, -2.4, 2, 38, 58, 14.6),
  recharge('2026-10-29', 4, 0.6, 3, 42, 56, 14.4),
  recharge('2026-10-30', 5, 3.2, 4, 46, 54, 14.2),
];

const cardio = (date, status, load, strain, tolerance, ratio) => ({
  date,
  cardio_load_status: status,
  cardio_load: load,
  strain,
  tolerance,
  cardio_load_ratio: ratio,
  cardio_load_level: { very_low: 20, low: 45, medium: 80, high: 120, 'very-high': 170 },
});

const CARDIO_LOADS = [
  cardio('2026-10-28', 'MAINTAINING', 0, 64.1, 63.2, 1.01),
  cardio('2026-10-29', 'PRODUCTIVE', 98.4, 72.4, 64.8, 1.12),
  cardio('2026-10-30', 'LOAD_STATUS_NOT_AVAILABLE', 0, 0, 0, 0),
];

const PHYSICAL = {
  weight: 61.4,
  height: 168,
  created: '2026-10-01T08:12:00Z',
  modified: '2026-10-20T07:30:00Z',
  birthday: '1988-05-14',
  gender: 'FEMALE',
  maximum_heart_rate: 186,
  resting_heart_rate: 52,
  aerobic_threshold: 140,
  anaerobic_threshold: 168,
  vo2_max: 47,
  weight_source: 'SOURCE_USER',
  training_background: 'REGULAR',
  typical_day: 'MOSTLY_SITTING',
  sleep_goal: 'PT8H',
};

/**
 * @description A fresh copy of every answer (tests change them freely).
 * @returns {object} The answers.
 */
const answers = () =>
  structuredClone({
    token: TOKEN_ANSWER,
    user: USER,
    activities: ACTIVITIES,
    exercises: EXERCISES,
    sleep: { nights: NIGHTS },
    recharges: { recharges: RECHARGES },
    cardio: CARDIO_LOADS,
    physical: PHYSICAL,
  });

export { USER_ID, NOW, TZ, answers, exercise, night, recharge, activity };
