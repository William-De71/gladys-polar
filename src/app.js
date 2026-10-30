// -----------------------------------------------------------------------------
// The Polar integration: every handler, registered on a Gladys client.
//
// Brings the data of a Polar Flow account (Polar watches and heart rate
// sensors, through the official AccessLink v3 API) into Gladys:
//   - device (device.js): one per linked account: today's steps, active
//     time, calories, distance and daily goal; the last night's sleep score
//     and time asleep; the Nightly Recharge status, ANS charge, heart rate
//     variability, heart rate and breathing rate; the cardio load status and
//     ratio;
//   - scene triggers (events.js): training session synced, new night, new
//     Nightly Recharge, daily activity goal reached;
//   - scene action: the latest values, for a message or a condition;
//   - dashboard widgets (widgets.js): today, last night, training sessions,
//     last seven days.
//
// Sign-in: OAuth 2.0 with the user's own AccessLink client (HTTP Basic at the
// token endpoint, no PKCE, no refresh token). The integration exchanges the
// code itself (onOAuthCallback): Gladys only relays the redirect. A code is
// sent to Polar at most once, ever: Polar deletes every token of the user
// when a code is used twice.
//
// Polar is read on the integration's own timer (every 15 to 120 minutes,
// five or six requests a reading), never on a Gladys poll: Polar's webhooks
// need a public URL answering its ping and signed requests whose header
// Gladys Plus does not relay. Transport: cloud only.
//
// index.js only creates the SDK client; the tests drive this module with the
// fake Gladys of the SDK (test/app.test.js).
// -----------------------------------------------------------------------------

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { logger as sdkLogger } from '@gladysassistant/integration-sdk';
import {
  ACCOUNT_FIELD,
  AUTO_LANGUAGE,
  DEFAULT_TEXT_LANGUAGE,
  INTERNAL_KEYS,
  MAX_USED_CODES,
  normalizeConfig,
  readLanguage,
} from './config.js';
import { buildAuthorizeUrl, createPolarClient, PolarApiError } from './polar-api.js';
import {
  parseActivity,
  parseExercise,
  parseNight,
  parseRecharge,
  parseCardioLoad,
  parsePhysical,
  readList,
} from './polar.js';
import { createStore, DEFAULT_PATH, KEEP } from './store.js';
import { buildDevice, buildStates, idsOf, userIdOfDevice } from './device.js';
import { detectEvents, actionOutputs } from './events.js';
import {
  WIDGETS,
  WIDGET_ACTIONS,
  messageContent,
  buildTodayWidget,
  buildNightWidget,
  buildExercisesWidget,
  buildWeekWidget,
  readWeekSettings,
} from './widgets.js';
import { MINUTE_MS, HOUR_MS, DAY_MS, safeTimeZone, localDate, addDays, jitterOf } from './time.js';
import { t, all, LANGUAGES, shortTime, formatNumber, rechargeLabel } from './i18n.js';

const ACTIONS = { REFRESH: 'refresh', DIAGNOSTIC: 'diagnostic', DISCONNECT: 'disconnect' };
const SCENE_ACTIONS = { GET_SUMMARY: 'get_summary' };
// After a failed reading: new tries, then the usual pace.
const RETRY_DELAYS_MIN = [5, 10, 20, 40];
// Polar said "too many requests": never sooner than this.
const RATE_LIMIT_DELAY_MIN = 15;
// A manual sync never reads again within this delay.
const REFRESH_MIN_INTERVAL_MS = 2 * MINUTE_MS;
// The physical info (weight) changes rarely.
const PHYSICAL_EVERY_MS = 12 * HOUR_MS;
// Say in the status when the token (about a year) ends within this delay.
const EXPIRY_WARNING_MS = 30 * DAY_MS;
// Daily activity read per reading: today and the seven days before.
const ACTIVITY_DAYS = 8;
const DIAGNOSTIC_CHUNK = 3000;
const { version: VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

/**
 * @description A short, non-reversible fingerprint of an authorization code.
 * @param {string} code - The code.
 * @returns {string} 32 hexadecimal characters.
 */
const fingerprint = (code) => createHash('sha256').update(String(code)).digest('hex').slice(0, 32);

/**
 * @description The member id of a Polar user for this client (stable).
 * @param {string} userId - The Polar user id.
 * @returns {string} The member id.
 */
const memberIdOf = (userId) => `gladys-${userId}`;

/**
 * @description Register every handler of the integration on a Gladys client.
 * @param {object} gladys - A GladysIntegration (or the fake Gladys of the SDK).
 * @param {object} [options] - Options.
 * @param {Function} [options.fetch] - HTTP transport to Polar (tests).
 * @param {string} [options.storePath] - The file kept in /data.
 * @param {Function} [options.now] - `() => number` in ms (tests).
 * @param {string} [options.timeZone] - IANA timezone of "today" (TZ by default).
 * @param {boolean} [options.timers] - Arm the reading timer (false in tests).
 * @param {object} [options.logger] - Logger.
 * @returns {object} Handles for the tests.
 */
function createApp(
  gladys,
  {
    fetch: fetchFn,
    storePath = DEFAULT_PATH,
    now = () => Date.now(),
    timeZone = safeTimeZone(),
    timers = true,
    logger = sdkLogger,
  } = {},
) {
  let config = normalizeConfig();
  let auth = { ...config.token };
  let pendingAuth = { state: '', redirectUri: '' };
  let usedCodes = [];
  const inflight = new Map();
  // Language of the last widget request: the fallback of the texts Gladys does
  // not ask for in a language, when the `language` setting is `auto`.
  let language = null;
  let createdDevices = new Set();
  let lastStatus = null;
  let lastDiscovery = null;
  let lastError = null;
  let endpointErrors = {};
  let failures = 0;
  let retryAt = null;
  let timer = null;
  let running = null;
  let stopped = false;

  const client = createPolarClient({ now, ...(fetchFn ? { fetch: fetchFn } : {}) });
  const store = createStore({ path: storePath, logger });

  const today = () => localDate(now(), timeZone);
  const intervalMs = () => config.interval * MINUTE_MS;
  const linked = () => Boolean(auth.accessToken && auth.userId);
  const connected = () => linked() && !auth.lost;
  const accountName = (lang) => store.data.name ?? t('deviceNameDefault', lang);
  const deviceId = () => (store.data.userId ? idsOf(gladys, store.data.userId).device : null);

  /**
   * @description Remember the language of a widget request, and store it when it changed.
   * @param {string} next - The language.
   */
  function rememberLanguage(next) {
    if (!LANGUAGES.includes(next) || next === language) {
      return;
    }
    language = next;
    gladys
      .setConfig({ [INTERNAL_KEYS.language]: next })
      .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
  }

  /**
   * @description Language of the texts Gladys does not ask for in a language.
   * @returns {string} The language.
   */
  const textLanguage = () =>
    config.language === AUTO_LANGUAGE ? (language ?? DEFAULT_TEXT_LANGUAGE) : config.language;

  /**
   * @description Report the connection status, only when it changed.
   * @param {boolean} isConnected - Connected or not.
   * @param {object} message - The multi-language message.
   * @returns {Promise<void>}
   */
  async function reportStatus(isConnected, message) {
    const signature = JSON.stringify([isConnected, message]);
    if (signature === lastStatus) {
      return;
    }
    lastStatus = signature;
    try {
      await gladys.setConnectionStatus(isConnected, message);
    } catch (err) {
      lastStatus = null;
      logger.error('Unable to report the connection status', err);
    }
  }

  /**
   * @description Refresh the list of the devices the user created.
   * @returns {Promise<void>}
   */
  async function refreshCreatedDevices() {
    try {
      const devices = await gladys.getDevices();
      createdDevices = new Set(devices.map((device) => device.external_id));
    } catch (err) {
      logger.warn(`Unable to read the devices: ${err.message}`);
    }
  }

  /**
   * @description Store the token and what goes with it (internal config keys).
   * @param {object} next - `{ accessToken, expiresAt, userId, clientId, lost }`.
   * @returns {Promise<void>}
   */
  async function saveAuth(next) {
    auth = { ...next };
    await gladys.setConfig({
      [INTERNAL_KEYS.accessToken]: next.accessToken,
      [INTERNAL_KEYS.expiresAt]: next.expiresAt ? String(next.expiresAt) : '',
      [INTERNAL_KEYS.userId]: next.userId,
      [INTERNAL_KEYS.tokenClientId]: next.clientId,
      [INTERNAL_KEYS.lost]: next.lost ? 'true' : '',
    });
  }

  const NO_AUTH = { accessToken: '', expiresAt: 0, userId: '', clientId: '', lost: false };

  // --- Snapshot of the kept data -----------------------------------------------------

  /**
   * @description The latest values kept from Polar.
   * @returns {object} `{ activity, latestActivity, night, recharge, cardio, exercise, physical }`.
   */
  function snapshot() {
    const { activities, nights, recharges, cardio, exercises, physical } = store.data;
    const dates = Object.keys(activities).sort();
    const night = nights[0] ?? null;
    return {
      activity: activities[today()] ?? null,
      latestActivity: dates.length > 0 ? activities[dates[dates.length - 1]] : null,
      night,
      recharge: recharges.find((recharge) => recharge.status !== null) ?? recharges[0] ?? null,
      nightRecharge: night
        ? (recharges.find((recharge) => recharge.date === night.date) ?? null)
        : (recharges[0] ?? null),
      // Today's entry says "not available" until the day has a training
      // load: the last known status is the useful one.
      cardio:
        cardio.find((day) => day.status && day.status !== 'LOAD_STATUS_NOT_AVAILABLE') ??
        cardio[0] ??
        null,
      exercise: exercises[0] ?? null,
      physical,
    };
  }

  // --- Devices and states ------------------------------------------------------------

  /**
   * @description Offer the account device on the Discovery screen, when it changed.
   * @param {boolean} [force] - Publish even when unchanged.
   * @returns {Promise<number>} The count.
   */
  async function publishDiscoveredDevices(force = false) {
    const devices =
      linked() && store.data.userId === auth.userId
        ? [
            buildDevice(
              gladys,
              { userId: store.data.userId, name: store.data.name },
              { language: textLanguage() },
            ),
          ]
        : [];
    const signature = JSON.stringify(devices);
    if (force || signature !== lastDiscovery) {
      await gladys.publishDiscoveredDevices(devices);
      lastDiscovery = signature;
    }
    return devices.length;
  }

  /**
   * @description Publish the states of the created device (only the changed ones).
   * @returns {Promise<void>}
   */
  async function publishStates() {
    const id = deviceId();
    if (!id || !createdDevices.has(id)) {
      return;
    }
    const states = buildStates(gladys, store.data.userId, snapshot(), textLanguage());
    if (states.length > 0) {
      await gladys.publishChangedStates(states, { heartbeat: 6 * HOUR_MS });
    }
  }

  const publishQuietly = () =>
    publishStates().catch((err) => logger.warn(`Unable to publish the states: ${err.message}`));

  /**
   * @description Ask every open widget to pull its content again.
   */
  function refreshWidgets() {
    for (const key of Object.values(WIDGETS)) {
      Promise.resolve(gladys.requestWidgetRefresh(key)).catch(() => {});
    }
  }

  // --- Reading -----------------------------------------------------------------------

  /**
   * @description When the next reading is due.
   * @returns {number} The instant, in ms.
   */
  const nextReading = () =>
    store.data.fetchedAt
      ? store.data.fetchedAt + intervalMs() + jitterOf(auth.userId || 'polar')
      : now();

  /**
   * @description A one-line summary of the kept data, for a message.
   * @param {string} l - The language.
   * @returns {string} "8,823 steps · sleep score 80 · Nightly Recharge good".
   */
  function dataText(l) {
    const s = snapshot();
    const parts = [];
    if (s.activity?.steps != null) {
      parts.push(`${formatNumber(s.activity.steps, l, 0)} ${t('tileSteps', l).toLowerCase()}`);
    }
    if (s.night?.score != null) {
      parts.push(`${t('tileSleepScore', l).toLowerCase()} ${s.night.score}`);
    }
    if (s.recharge?.status) {
      parts.push(`Nightly Recharge ${rechargeLabel(s.recharge.status, l).toLowerCase()}`);
    }
    return parts.join(' · ') || t('summaryNothing', l);
  }

  /**
   * @description The status message after a reading.
   * @returns {object} The multi-language message.
   */
  function connectedMessage() {
    const next = Math.min(nextReading(), retryAt ?? Infinity);
    return Object.fromEntries(
      LANGUAGES.map((l) => {
        const parts = [
          t('statusConnected', l, {
            name: accountName(l),
            time: store.data.fetchedAt ? shortTime(store.data.fetchedAt, l, timeZone) : '-',
            next: shortTime(next, l, timeZone),
          }),
        ];
        if (auth.expiresAt && auth.expiresAt - now() < EXPIRY_WARNING_MS) {
          parts.push(
            t('statusExpiresSoon', l, {
              date: new Intl.DateTimeFormat(l, { dateStyle: 'medium', timeZone }).format(
                new Date(auth.expiresAt),
              ),
            }),
          );
        }
        return [l, parts.join(' ')];
      }),
    );
  }

  /**
   * @description The multi-language message of a failed reading.
   * @param {Error} err - The error.
   * @param {number} minutes - Minutes before the next try.
   * @returns {object} The message.
   */
  function errorMessage(err, minutes) {
    switch (err.kind) {
      case 'rate_limited':
        return all('statusRateLimited', { minutes });
      case 'server':
        return all('statusServer', { status: err.status || '?', minutes });
      case 'refused':
      case 'invalid':
      case 'not_found':
        return all('statusRefused', { detail: String(err.message).slice(0, 100), minutes });
      default:
        return all('statusUnreachable', { detail: String(err.message).slice(0, 80), minutes });
    }
  }

  /**
   * @description The delay before the next try after a failed reading.
   * @param {Error} err - The error.
   * @returns {number} The delay, in ms.
   */
  function retryDelay(err) {
    const backoff = RETRY_DELAYS_MIN[Math.min(failures, RETRY_DELAYS_MIN.length) - 1] * MINUTE_MS;
    if (err.kind === 'rate_limited') {
      return Math.max(backoff, RATE_LIMIT_DELAY_MIN * MINUTE_MS, (err.retryAfter ?? 0) * 1000);
    }
    return backoff;
  }

  /**
   * @description Polar refused the token: stop until the user connects again.
   * @returns {Promise<void>}
   */
  async function tokenLost() {
    logger.warn('Polar refused the token (401): connect again');
    await saveAuth({ ...auth, lost: true }).catch((err) =>
      logger.warn(`Unable to store the token state: ${err.message}`),
    );
    retryAt = null;
    await reportStatus(false, all('statusReauth'));
    refreshWidgets();
  }

  /**
   * @description Register the user to the client when not done yet, and read
   * the first name once.
   * @param {string} token - The user token.
   * @returns {Promise<void>}
   */
  async function ensureRegistered(token) {
    if (!store.data.registered) {
      const result = await client.registerUser(token, memberIdOf(auth.userId));
      store.data.registered = true;
      logger.info(`Polar user ${result.already ? 'already registered' : 'registered'}`);
      const first = result.user?.['first-name'];
      if (typeof first === 'string' && first.trim()) {
        store.data.name = first.trim().slice(0, 40);
      }
    }
    if (!store.data.name) {
      try {
        const user = await client.getUser(token, auth.userId);
        const first = user?.['first-name'];
        if (typeof first === 'string' && first.trim()) {
          store.data.name = first.trim().slice(0, 40);
        }
      } catch (err) {
        if (['unauthorized', 'consent', 'rate_limited'].includes(err.kind)) {
          throw err;
        }
        logger.warn(`Unable to read the Polar user: ${err.message}`);
      }
    }
  }

  /**
   * @description Read Polar once, publish everything.
   * @returns {Promise<boolean>} True when the reading went through.
   */
  async function round() {
    if (!config.clientId || !config.clientSecret) {
      await reportStatus(false, all('statusNoClient'));
      return false;
    }
    if (!linked()) {
      await reportStatus(false, all('statusNotConnected'));
      return false;
    }
    if (auth.lost) {
      await reportStatus(false, all('statusReauth'));
      return false;
    }
    if (store.data.userId !== auth.userId) {
      // Another Polar account: everything kept belongs to the previous one.
      store.reset(auth.userId);
      lastDiscovery = null;
    }
    const token = auth.accessToken;
    const day = today();
    const read = { exercises: false, nights: false, recharges: false, goals: false };
    const errors = {};

    /**
     * @description Run one endpoint; only the errors that concern every
     * endpoint (token, consents, rate limit) stop the reading.
     * @param {string} name - The endpoint.
     * @param {Function} task - `async () => void`.
     * @returns {Promise<void>}
     */
    const step = async (name, task) => {
      try {
        await task();
      } catch (err) {
        if (['unauthorized', 'consent', 'rate_limited'].includes(err.kind)) {
          throw err;
        }
        errors[name] = err;
        logger.warn(`Polar ${name}: ${err.kind ?? 'error'} ${err.message}`);
      }
    };

    try {
      await ensureRegistered(token);
      await step('activities', async () => {
        const list = readList(
          await client.listActivities(token, addDays(day, 1 - ACTIVITY_DAYS), day),
          parseActivity,
          (activity) => activity.date,
        );
        const merged = { ...store.data.activities };
        for (const activity of list) {
          merged[activity.date] = activity;
        }
        const keepFrom = addDays(day, 1 - KEEP.days);
        store.data.activities = Object.fromEntries(
          Object.entries(merged).filter(([date]) => date >= keepFrom),
        );
        read.goals = true;
      });
      await step('exercises', async () => {
        store.data.exercises = readList(
          await client.listExercises(token),
          parseExercise,
          (exercise) => exercise.startLocal ?? '',
        ).slice(0, KEEP.exercises);
        read.exercises = true;
      });
      await step('sleep', async () => {
        store.data.nights = readList(
          await client.listNights(token),
          parseNight,
          (n) => n.date,
        ).slice(0, KEEP.days);
        read.nights = true;
      });
      await step('nightly-recharge', async () => {
        store.data.recharges = readList(
          await client.listRecharges(token),
          parseRecharge,
          (recharge) => recharge.date,
        ).slice(0, KEEP.days);
        read.recharges = true;
      });
      await step('cardio-load', async () => {
        store.data.cardio = readList(
          await client.listCardioLoads(token),
          parseCardioLoad,
          (entry) => entry.date,
        ).slice(0, KEEP.days);
      });
      if (now() - store.data.physicalAt >= PHYSICAL_EVERY_MS) {
        await step('physical-info', async () => {
          store.data.physical = parsePhysical(await client.physicalInfo(token));
          store.data.physicalAt = now();
        });
      }
    } catch (err) {
      await store.save();
      lastError = { at: now(), kind: err.kind ?? 'error', message: err.message };
      if (err.kind === 'unauthorized') {
        await tokenLost();
        return false;
      }
      if (err.kind === 'consent') {
        failures = 0;
        retryAt = null;
        logger.warn('Polar: the mandatory consents of the account are not accepted (403)');
        await reportStatus(false, all('statusConsent'));
        return false;
      }
      failures += 1;
      const delay = retryDelay(err);
      retryAt = now() + delay;
      logger.warn(`Polar reading stopped (${err.kind}): ${err.message}`);
      await reportStatus(false, errorMessage(err, Math.round(delay / MINUTE_MS)));
      return false;
    }

    endpointErrors = Object.fromEntries(
      Object.entries(errors).map(([name, err]) => [name, `${err.kind}: ${err.message}`]),
    );
    const anyRead = Object.values(read).some(Boolean) || !errors['cardio-load'];
    if (!anyRead) {
      const first = Object.values(errors)[0];
      failures += 1;
      const delay = retryDelay(first);
      retryAt = now() + delay;
      lastError = { at: now(), kind: first.kind ?? 'error', message: first.message };
      await store.save();
      await reportStatus(false, errorMessage(first, Math.round(delay / MINUTE_MS)));
      return false;
    }

    failures = 0;
    retryAt = null;
    lastError = Object.keys(errors).length
      ? { at: now(), kind: 'partial', message: Object.keys(errors).join(', ') }
      : null;
    store.data.fetchedAt = now();
    const lang = textLanguage();
    const { events, seen, baseline } = detectEvents({
      read,
      data: store.data,
      today: day,
      context: { account: deviceId(), accountName: accountName(lang), language: lang },
    });
    store.data.seen = seen;
    store.data.baseline = baseline;
    await store.save();
    for (const event of events) {
      try {
        await gladys.publishSceneEvent(event.key, event.data);
      } catch (err) {
        logger.warn(`Unable to fire ${event.key}: ${err.message}`);
      }
    }
    logger.info(
      `Polar read: ${events.length} scene event(s), ${Object.keys(errors).length} endpoint error(s), ${client.stats.count} request(s) today`,
    );
    await publishDiscoveredDevices().catch((err) =>
      logger.warn(`Unable to offer the device: ${err.message}`),
    );
    await publishQuietly();
    refreshWidgets();
    await reportStatus(true, connectedMessage());
    return true;
  }

  /**
   * @description Run one reading at a time.
   * @returns {Promise<boolean>} The result of round().
   */
  function read() {
    if (!running) {
      running = round().finally(() => {
        running = null;
      });
    }
    return running;
  }

  // --- Timer -------------------------------------------------------------------------

  /**
   * @description Arm the timer for the next reading or retry.
   */
  function schedule() {
    if (!timers || stopped) {
      return;
    }
    clearTimeout(timer);
    timer = null;
    if (!connected()) {
      return;
    }
    const at = Math.min(nextReading(), retryAt ?? Infinity);
    timer = setTimeout(tick, Math.max(1000, at - now()));
    timer.unref?.();
  }

  /**
   * @description What the timer does when it fires.
   * @returns {Promise<void>}
   */
  async function tick() {
    try {
      await read();
    } catch (err) {
      logger.error('Timer', err);
    }
    schedule();
  }

  /**
   * @description Read when due (or now), then arm the timer.
   * @param {object} [options] - `{ force }`.
   * @returns {Promise<void>}
   */
  async function refreshAll({ force = false } = {}) {
    if (!force && connected() && store.data.fetchedAt && now() < nextReading()) {
      await publishDiscoveredDevices().catch((err) =>
        logger.warn(`Unable to offer the device: ${err.message}`),
      );
      await publishQuietly();
      refreshWidgets();
      await reportStatus(true, connectedMessage());
    } else {
      await read();
    }
    schedule();
  }

  // --- OAuth2 ------------------------------------------------------------------------

  gladys.onOAuthAuthorizeUrl(async (key, redirectUri) => {
    if (key !== ACCOUNT_FIELD) {
      throw new Error(`Unknown account field: ${key}`);
    }
    if (!config.clientId || !config.clientSecret) {
      throw new Error(t('statusNoClient', textLanguage()));
    }
    if (!redirectUri) {
      throw new Error('Gladys gave no redirect URI: update Gladys');
    }
    const state = randomBytes(24).toString('base64url');
    pendingAuth = { state, redirectUri };
    // Persisted: the container may restart between "Connect" and the return
    // from Polar (the memory alone would then refuse a valid answer).
    await gladys.setConfig({
      [INTERNAL_KEYS.oauthState]: state,
      [INTERNAL_KEYS.oauthRedirectUri]: redirectUri,
    });
    logger.info(`Polar authorization started (redirect URI ${redirectUri})`);
    return buildAuthorizeUrl({ clientId: config.clientId, redirectUri, state });
  });

  /**
   * @description The connection itself: check the state, burn the code, then
   * exchange it (once), register the user and read.
   * @param {object} params - `{ code, state, redirectUri, hash }`.
   * @returns {Promise<void>}
   */
  async function connect({ code, state, redirectUri, hash }) {
    let expected = pendingAuth;
    if (!expected.state) {
      expected = normalizeConfig(await gladys.getConfig()).pendingAuth;
    }
    if (!expected.state || expected.state !== state) {
      lastStatus = null;
      await reportStatus(false, all('connectState'));
      throw new Error('OAuth state mismatch');
    }
    // Burn the code and the state BEFORE sending the code to Polar: a second
    // callback with the same code (a reload, a retry, a restart) never
    // reaches the token endpoint, where it would delete every token.
    usedCodes = [...usedCodes.filter((used) => used !== hash), hash].slice(-MAX_USED_CODES);
    pendingAuth = { state: '', redirectUri: '' };
    await gladys.setConfig({
      [INTERNAL_KEYS.usedCodes]: usedCodes.join(','),
      [INTERNAL_KEYS.oauthState]: '',
      [INTERNAL_KEYS.oauthRedirectUri]: '',
    });
    const token = await client.exchangeCode({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      // Polar wants the redirect URI of the authorization request.
      redirectUri: expected.redirectUri || redirectUri,
    });
    stopTimer();
    await saveAuth({
      accessToken: token.accessToken,
      expiresAt: token.expiresAt ?? 0,
      userId: token.userId,
      clientId: config.clientId,
      lost: false,
    });
    logger.info('Connected to Polar Flow');
    if (store.data.userId !== token.userId) {
      store.reset(token.userId);
    } else {
      // The same account again: register again (harmless, 409) in case it
      // had been de-registered.
      store.data.registered = false;
    }
    failures = 0;
    retryAt = null;
    lastStatus = null;
    lastDiscovery = null;
    // The connection succeeded even if this first reading fails: its status
    // says why (consents, Polar unavailable…).
    await read().catch((err) => logger.error('First reading', err));
    schedule();
  }

  gladys.onOAuthCallback(async (key, { code, state, redirectUri } = {}) => {
    if (key !== ACCOUNT_FIELD) {
      throw new Error(`Unknown account field: ${key}`);
    }
    if (typeof code !== 'string' || !code) {
      lastStatus = null;
      await reportStatus(false, all('connectFailed', { reason: 'no code' }));
      throw new Error('Polar sent no authorization code');
    }
    const hash = fingerprint(code);
    // The same callback twice at once: the second one waits for the first.
    if (inflight.has(hash)) {
      return inflight.get(hash);
    }
    if (usedCodes.includes(hash)) {
      if (connected()) {
        logger.info('Authorization code already exchanged: nothing to do');
        return undefined;
      }
      lastStatus = null;
      await reportStatus(false, all('connectCodeUsed'));
      throw new Error('This authorization code was already used');
    }
    const run = connect({ code, state, redirectUri, hash })
      .catch(async (err) => {
        // The SDK turns the exception into a refused connection without
        // logging it: say why here (never the code nor a token).
        logger.error(`Polar connection failed: ${err.message}`);
        if (err instanceof PolarApiError) {
          lastStatus = null;
          await reportStatus(false, all('connectFailed', { reason: err.code || err.kind }));
        }
        throw err;
      })
      .finally(() => {
        // Only while it runs: afterwards `usedCodes` answers a replay.
        inflight.delete(hash);
      });
    inflight.set(hash, run);
    return run;
  });

  // --- Dashboard widgets -------------------------------------------------------------

  /**
   * @description The message a widget shows instead of data, or null.
   * @param {string} lang - The language.
   * @returns {object|null} A content, or null when there is data to show.
   */
  function widgetProblem(lang) {
    if (!linked() || auth.lost) {
      return messageContent(t(auth.lost ? 'statusReauth' : 'widgetNotConnected', lang), 60);
    }
    if (!store.data.fetchedAt || store.data.userId !== auth.userId) {
      return messageContent(t('widgetNotRead', lang), 60);
    }
    return null;
  }

  const timing = () => ({ fetchedAt: store.data.fetchedAt, timeZone });

  gladys.onWidgetGet(WIDGETS.TODAY, async ({ language: lang }) => {
    rememberLanguage(lang);
    const s = snapshot();
    return (
      widgetProblem(lang) ??
      buildTodayWidget({
        name: accountName(lang),
        activity: s.activity,
        latest: s.latestActivity,
        language: lang,
        ...timing(),
      })
    );
  });

  gladys.onWidgetAction(WIDGETS.TODAY, async (actionKey) => {
    if (actionKey !== WIDGET_ACTIONS.SYNC) {
      throw new Error(`Unknown action ${actionKey}`);
    }
    return syncNow();
  });

  gladys.onWidgetGet(WIDGETS.NIGHT, async ({ language: lang }) => {
    rememberLanguage(lang);
    const s = snapshot();
    return (
      widgetProblem(lang) ??
      buildNightWidget({ night: s.night, recharge: s.nightRecharge, language: lang, ...timing() })
    );
  });

  gladys.onWidgetGet(WIDGETS.EXERCISES, async ({ language: lang }) => {
    rememberLanguage(lang);
    return (
      widgetProblem(lang) ??
      buildExercisesWidget({
        exercises: store.data.exercises,
        cardio: snapshot().cardio,
        language: lang,
        ...timing(),
      })
    );
  });

  gladys.onWidgetGet(WIDGETS.WEEK, async ({ settings = {}, language: lang }) => {
    rememberLanguage(lang);
    return (
      widgetProblem(lang) ??
      buildWeekWidget({
        activities: store.data.activities,
        nights: store.data.nights,
        today: today(),
        metric: readWeekSettings(settings).metric,
        language: lang,
      })
    );
  });

  // --- Scene action ------------------------------------------------------------------

  gladys.onSceneAction(SCENE_ACTIONS.GET_SUMMARY, async (fields = {}) => {
    const wanted = userIdOfDevice(fields.account);
    if (fields.account && !wanted) {
      throw new Error(`Unknown Polar account: ${fields.account}`);
    }
    if (!store.data.userId || (wanted && wanted !== store.data.userId)) {
      throw new Error('No Polar data for this account: connect it and wait for a reading');
    }
    return actionOutputs(snapshot(), { language: textLanguage() });
  });

  // --- Configuration screen actions --------------------------------------------------

  /**
   * @description Read Polar now (configuration button or widget button).
   * @returns {Promise<object>} The multi-language message (≤ 200 characters).
   */
  async function syncNow() {
    if (!config.clientId || !config.clientSecret) {
      return all('statusNoClient');
    }
    if (!linked()) {
      return all('statusNotConnected');
    }
    if (auth.lost) {
      return all('statusReauth');
    }
    const fetchedAt = store.data.fetchedAt;
    if (fetchedAt && now() - fetchedAt < REFRESH_MIN_INTERVAL_MS && !lastError) {
      return all('refreshTooSoon', {
        minutes: Math.max(1, Math.round((now() - fetchedAt) / MINUTE_MS)),
      });
    }
    const ok = await read();
    schedule();
    if (!ok) {
      return lastStatus ? JSON.parse(lastStatus)[1] : all('statusNotConnected');
    }
    return Object.fromEntries(
      LANGUAGES.map((l) => [l, t('refreshDone', l, { summary: dataText(l) }).slice(0, 200)]),
    );
  }

  gladys.onAction(ACTIONS.REFRESH, syncNow);

  gladys.onAction(ACTIONS.DIAGNOSTIC, async () => {
    // Gladys passes no DEBUG variable to the container: this writes an
    // anonymized summary in the logs instead. No token, no name, no code.
    const s = snapshot();
    const iso = (instant) => (instant ? new Date(instant).toISOString() : null);
    const report = {
      version: VERSION,
      node: process.version,
      timeZone: timeZone ?? null,
      today: today(),
      interval: config.interval,
      language: textLanguage(),
      client: {
        id: config.clientId ? `set (${config.clientId.length} characters)` : 'missing',
        secret: config.clientSecret ? 'set' : 'missing',
      },
      token: {
        present: Boolean(auth.accessToken),
        sameClient: !auth.clientId || auth.clientId === config.clientId,
        lost: auth.lost,
        expiresAt: iso(auth.expiresAt),
        user: auth.userId ? `…${auth.userId.slice(-3)}` : null,
      },
      pendingAuthorization: Boolean(pendingAuth.state),
      registered: store.data.registered,
      deviceCreated: Boolean(deviceId() && createdDevices.has(deviceId())),
      fetchedAt: iso(store.data.fetchedAt),
      nextReading: iso(nextReading()),
      retryAt: iso(retryAt),
      lastError,
      endpointErrors,
      requests: client.stats,
      kept: {
        activityDays: Object.keys(store.data.activities).sort(),
        exercises: store.data.exercises.length,
        nights: store.data.nights.map((night) => night.date),
        recharges: store.data.recharges.map((recharge) => recharge.date),
        cardio: store.data.cardio.map((entry) => `${entry.date} ${entry.status}`),
        physicalAt: iso(store.data.physicalAt),
      },
      today_: s.activity ? { steps: s.activity.steps, goal: s.activity.goalPercent } : null,
      seen: Object.fromEntries(Object.entries(store.data.seen).map(([k, v]) => [k, v.length])),
      baseline: store.data.baseline,
    };
    const json = JSON.stringify(report);
    const count = Math.max(1, Math.ceil(json.length / DIAGNOSTIC_CHUNK));
    for (let chunk = 0; chunk < count; chunk += 1) {
      logger.info(
        `Polar diagnostic ${chunk + 1}/${count}: ${json.slice(chunk * DIAGNOSTIC_CHUNK, (chunk + 1) * DIAGNOSTIC_CHUNK)}`,
      );
    }
    return all('diagnosticDone', { count });
  });

  gladys.onAction(ACTIONS.DISCONNECT, async () => {
    stopTimer();
    if (linked() && !auth.lost) {
      try {
        await client.deleteUser(auth.accessToken, auth.userId);
        logger.info('Polar user de-registered');
      } catch (err) {
        logger.warn(`Unable to de-register the Polar user: ${err.message}`);
      }
    }
    await saveAuth(NO_AUTH);
    store.data.registered = false;
    await store.save();
    lastStatus = null;
    await publishDiscoveredDevices(true).catch(() => {});
    await reportStatus(false, all('statusNotConnected'));
    refreshWidgets();
    return all('disconnected');
  });

  // --- Devices -----------------------------------------------------------------------

  gladys.onScanRequest(async () => {
    const count = await publishDiscoveredDevices(true);
    logger.info(`Scan: ${count} Polar account(s) offered`);
  });

  gladys.onDeviceCreated(async () => {
    await refreshCreatedDevices();
    // States sent before the device existed were dropped by Gladys, and the SDK
    // forgot what it sent for this device: send everything known again.
    await publishQuietly();
    refreshWidgets();
  });

  gladys.onDeviceDeleted(refreshCreatedDevices);

  // --- Configuration -----------------------------------------------------------------

  /**
   * @description Reload the whole config (internal keys included).
   * @param {object} [fallback] - Raw values to use when the read fails.
   * @returns {Promise<void>}
   */
  async function loadConfig(fallback) {
    try {
      const raw = await gladys.getConfig();
      config = normalizeConfig(raw);
      language = readLanguage(raw, language);
    } catch (err) {
      if (fallback) {
        config = { ...normalizeConfig(fallback), token: config.token };
      }
      logger.error('Unable to read the configuration', err);
    }
    auth = { ...config.token };
    usedCodes = [...new Set([...usedCodes, ...config.usedCodes])].slice(-MAX_USED_CODES);
    if (config.pendingAuth.state && !pendingAuth.state) {
      pendingAuth = config.pendingAuth;
    }
  }

  /**
   * @description Forget a token that belongs to another AccessLink client.
   * @returns {Promise<void>}
   */
  async function dropForeignToken() {
    if (auth.accessToken && auth.clientId && config.clientId && auth.clientId !== config.clientId) {
      logger.info('The stored token belongs to another Client ID: connect again');
      await saveAuth(NO_AUTH).catch((err) =>
        logger.warn(`Unable to clear the token: ${err.message}`),
      );
    }
  }

  gladys.onConfigUpdated(async (rawConfig) => {
    const before = JSON.stringify([config.clientId, config.clientSecret, config.interval]);
    await loadConfig(rawConfig);
    await dropForeignToken();
    const after = JSON.stringify([config.clientId, config.clientSecret, config.interval]);
    lastDiscovery = null;
    if (before !== after) {
      logger.info('Configuration updated');
      lastStatus = null;
      failures = 0;
      retryAt = null;
      await refreshAll();
    } else {
      // A language change only rewrites the texts.
      await publishDiscoveredDevices().catch(() => {});
      await publishQuietly();
    }
  });

  // --- Connection lifecycle ----------------------------------------------------------

  /** Stop the timer. */
  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }

  // Each (re)connection resynchronizes; the promise lets the tests wait for it.
  let startup = Promise.resolve();
  gladys.on('connected', () => {
    startup = (async () => {
      await loadConfig();
      await dropForeignToken();
      await store.load();
      await refreshCreatedDevices();
      lastStatus = null;
      lastDiscovery = null;
      await refreshAll();
    })().catch((err) => logger.error('Startup', err));
  });

  // --- Graceful shutdown -------------------------------------------------------------
  gladys.handleShutdown(async (signal) => {
    logger.info(`Received ${signal} -> graceful shutdown`);
    stopped = true;
    stopTimer();
  });

  return {
    store,
    client,
    read,
    tick,
    refreshAll,
    snapshot,
    getAuth: () => ({ ...auth }),
    getConfig: () => config,
    getRetryAt: () => retryAt,
    whenReady: () => startup,
  };
}

export {
  createApp,
  ACTIONS,
  SCENE_ACTIONS,
  RETRY_DELAYS_MIN,
  RATE_LIMIT_DELAY_MIN,
  REFRESH_MIN_INTERVAL_MS,
  PHYSICAL_EVERY_MS,
  ACTIVITY_DAYS,
  fingerprint,
  memberIdOf,
};
