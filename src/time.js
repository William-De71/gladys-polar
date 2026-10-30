// -----------------------------------------------------------------------------
// Time helpers.
//
// "Today" is the local day of the Gladys instance: the supervisor gives the
// container the timezone of Gladys in TZ. Polar dates its daily activity, its
// nights and its Nightly Recharge with the local day of the watch ("no
// timezone information is available"), so the two agree as long as the watch
// and Gladys live in the same timezone. Days are handled as 'YYYY-MM-DD'
// strings, never as instants: no daylight saving surprise.
// -----------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const JITTER_SECONDS = 120;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @description The timezone of the instance, when the runtime knows it.
 * @param {string} [value] - An IANA name (TZ by default).
 * @returns {string|undefined} The name, undefined for the system one.
 * @example
 * safeTimeZone('Europe/Paris'); // -> 'Europe/Paris'
 */
function safeTimeZone(value = process.env.TZ) {
  if (!value) {
    return undefined;
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
    return value;
  } catch {
    return undefined;
  }
}

/**
 * @description The local day of an instant.
 * @param {number} instant - The instant, in ms.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {string} 'YYYY-MM-DD'.
 * @example
 * localDate(Date.parse('2026-10-29T23:30:00Z'), 'Europe/Paris'); // -> '2026-10-30'
 */
function localDate(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date(instant));
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * @description A day plus (or minus) a number of days.
 * @param {string} date - 'YYYY-MM-DD'.
 * @param {number} days - Days to add.
 * @returns {string} 'YYYY-MM-DD'.
 * @example
 * addDays('2026-03-01', -1); // -> '2026-02-28'
 */
function addDays(date, days) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/**
 * @description Whether a value is a calendar day.
 * @param {unknown} value - The value.
 * @returns {boolean} True for 'YYYY-MM-DD'.
 */
function isDate(value) {
  return typeof value === 'string' && DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * @description A stable jitter, in ms, from a seed: the same instance always
 * reads Polar at the same offset, thousands of instances never at the same
 * second.
 * @param {string} seed - The seed.
 * @returns {number} 0 to JITTER_SECONDS seconds, in ms.
 */
function jitterOf(seed) {
  let hash = 0;
  for (const char of String(seed ?? '')) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return (hash % JITTER_SECONDS) * 1000;
}

export {
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  JITTER_SECONDS,
  safeTimeZone,
  localDate,
  addDays,
  isDate,
  jitterOf,
};
