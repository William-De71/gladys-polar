// -----------------------------------------------------------------------------
// Configuration of the Polar integration.
//
// Fields of the config_schema:
//   - `client_id` / `client_secret`  the AccessLink API client the user
//                                    created on admin.polaraccesslink.com:
//                                    never shipped with the image;
//   - `polar_account`                the Connect button (oauth2 field);
//   - `interval`                     minutes between two readings of Polar:
//                                    15, 30, 60 or 120;
//   - `language`                     language of the texts Gladys does not
//                                    ask for in a language (device and
//                                    feature names, cardio load status,
//                                    scene summaries): `auto` follows the
//                                    language of the last widget displayed.
//
// Internal keys, outside the config_schema (never shown in the UI, never sent
// to the front): the user token and what goes with it, the pending
// authorization (state and redirect URI, kept across a restart between
// "Connect" and the return from Polar), the fingerprints of the codes
// already exchanged (a code must never be sent twice), the language of the
// last widget request.
// -----------------------------------------------------------------------------

const ACCOUNT_FIELD = 'polar_account';
const LANGUAGES = ['en', 'fr', 'de', 'es'];
const AUTO_LANGUAGE = 'auto';
const DEFAULT_TEXT_LANGUAGE = 'en';
const INTERVALS = [15, 30, 60, 120];
const DEFAULT_INTERVAL = 30;
const MAX_USED_CODES = 10;

const INTERNAL_KEYS = {
  accessToken: 'access_token',
  expiresAt: 'token_expires_at',
  userId: 'polar_user_id',
  tokenClientId: 'token_client_id',
  lost: 'token_lost',
  oauthState: 'oauth_state',
  oauthRedirectUri: 'oauth_redirect_uri',
  usedCodes: 'oauth_used_codes',
  language: 'last_language',
};

/**
 * @description A trimmed string, '' when absent.
 * @param {unknown} raw - The raw value.
 * @returns {string} The string.
 * @example
 * readString(' abc '); // -> 'abc'
 */
function readString(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * @description A stored instant (ms), 0 when absent.
 * @param {unknown} raw - The raw value.
 * @returns {number} The instant.
 */
function readInstant(raw) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {object} The config.
 * @example
 * normalizeConfig({ client_id: 'abc', interval: '60' }).interval; // -> 60
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  const interval = Number(config.interval);
  return {
    clientId: readString(config.client_id),
    clientSecret: readString(config.client_secret),
    interval: INTERVALS.includes(interval) ? interval : DEFAULT_INTERVAL,
    language: LANGUAGES.includes(config.language) ? config.language : AUTO_LANGUAGE,
    token: {
      accessToken: readString(config[INTERNAL_KEYS.accessToken]),
      expiresAt: readInstant(config[INTERNAL_KEYS.expiresAt]),
      userId: /^\d+$/.test(readString(config[INTERNAL_KEYS.userId]))
        ? readString(config[INTERNAL_KEYS.userId])
        : '',
      clientId: readString(config[INTERNAL_KEYS.tokenClientId]),
      lost: readString(config[INTERNAL_KEYS.lost]) === 'true',
    },
    pendingAuth: {
      state: readString(config[INTERNAL_KEYS.oauthState]),
      redirectUri: readString(config[INTERNAL_KEYS.oauthRedirectUri]),
    },
    usedCodes: readString(config[INTERNAL_KEYS.usedCodes])
      .split(',')
      .filter((code) => /^[0-9a-f]{16,64}$/.test(code))
      .slice(-MAX_USED_CODES),
  };
}

/**
 * @description Read the stored language of the last widget request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string|null} fallback - The language to keep when nothing valid is stored.
 * @returns {string|null} The language.
 * @example
 * readLanguage({ last_language: 'fr' }, null); // -> 'fr'
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return LANGUAGES.includes(language) ? language : fallback;
}

export {
  ACCOUNT_FIELD,
  LANGUAGES,
  AUTO_LANGUAGE,
  DEFAULT_TEXT_LANGUAGE,
  INTERVALS,
  DEFAULT_INTERVAL,
  MAX_USED_CODES,
  INTERNAL_KEYS,
  readString,
  normalizeConfig,
  readLanguage,
};
