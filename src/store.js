// -----------------------------------------------------------------------------
// What the integration keeps across restarts, in /data/polar.json (the only
// writable place of the container):
//   - `userId`, `name`  the linked Polar account (its first name only, for
//                       the device name);
//   - `registered`      the user is registered to the AccessLink client;
//   - `activities`      the daily activity of the last days, by date;
//   - `exercises`       the last training sessions, newest first;
//   - `nights`, `recharges`, `cardio`  the last nights, Nightly Recharges and
//                       cardio load days, newest first;
//   - `physical`, `physicalAt`  the physical info and when it was read;
//   - `seen`            what the scene triggers already announced (session
//                       ids, dates of nights, recharges and daily goals), and
//                       `baseline`, the kinds read at least once: the first
//                       reading of a kind announces nothing, so neither the
//                       first start nor a restart fires old events;
//   - `fetchedAt`       when the last reading ran.
// A store belongs to one Polar user: linking another account starts afresh.
// -----------------------------------------------------------------------------

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_PATH = '/data/polar.json';
const KEEP = { days: 14, exercises: 20, seenIds: 200, seenDates: 60 };
const KINDS = ['exercises', 'nights', 'recharges', 'goals'];

const EMPTY = () => ({
  userId: null,
  name: null,
  registered: false,
  activities: {},
  exercises: [],
  nights: [],
  recharges: [],
  cardio: [],
  physical: null,
  physicalAt: 0,
  seen: Object.fromEntries(KINDS.map((kind) => [kind, []])),
  baseline: Object.fromEntries(KINDS.map((kind) => [kind, false])),
  fetchedAt: null,
});

/**
 * @description Merge a stored object over the empty store (unknown or broken
 * parts fall back to their empty value).
 * @param {object} raw - The stored object.
 * @returns {object} The data.
 */
function sanitize(raw) {
  const data = EMPTY();
  if (!raw || typeof raw !== 'object') {
    return data;
  }
  for (const key of ['userId', 'name']) {
    data[key] = typeof raw[key] === 'string' ? raw[key] : null;
  }
  data.registered = raw.registered === true;
  data.activities = raw.activities && typeof raw.activities === 'object' ? raw.activities : {};
  for (const key of ['exercises', 'nights', 'recharges', 'cardio']) {
    data[key] = Array.isArray(raw[key]) ? raw[key] : [];
  }
  data.physical = raw.physical && typeof raw.physical === 'object' ? raw.physical : null;
  data.physicalAt = Number.isFinite(raw.physicalAt) ? raw.physicalAt : 0;
  for (const kind of KINDS) {
    data.seen[kind] = Array.isArray(raw.seen?.[kind]) ? raw.seen[kind].map(String) : [];
    data.baseline[kind] = raw.baseline?.[kind] === true;
  }
  data.fetchedAt = Number.isFinite(raw.fetchedAt) ? raw.fetchedAt : null;
  return data;
}

/**
 * @description The store.
 * @param {object} [options] - `{ path, logger }`.
 * @returns {object} `{ data, load, save, reset }`.
 */
function createStore({ path = DEFAULT_PATH, logger } = {}) {
  const store = {
    data: EMPTY(),
    /**
     * @description Read the file; an absent or broken file is an empty store.
     * @returns {Promise<void>}
     */
    async load() {
      try {
        store.data = sanitize(JSON.parse(await readFile(path, 'utf8')));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger?.warn(`Unable to read ${path}: ${err.message}`);
        }
        store.data = EMPTY();
      }
    },
    /**
     * @description Write the file (atomically: a temporary file, then a rename).
     * @returns {Promise<void>}
     */
    async save() {
      try {
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.tmp`;
        await writeFile(temporary, JSON.stringify(store.data));
        await rename(temporary, path);
      } catch (err) {
        logger?.warn(`Unable to write ${path}: ${err.message}`);
      }
    },
    /**
     * @description Start afresh for a Polar user.
     * @param {string|null} userId - The user id.
     */
    reset(userId) {
      store.data = { ...EMPTY(), userId };
    },
  };
  return store;
}

export { DEFAULT_PATH, KEEP, KINDS, EMPTY, sanitize, createStore };
