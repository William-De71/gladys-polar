// -----------------------------------------------------------------------------
// Client of Polar AccessLink v3 (https://www.polar.com/accesslink-api/).
//
// OAuth 2.0, with the AccessLink client the user created on
// https://admin.polaraccesslink.com:
//   - authorization: https://flow.polar.com/oauth2/authorization with
//     `response_type=code`, `client_id`, `redirect_uri`, the
//     `accesslink.read_all` scope and a random `state` (no PKCE: Polar
//     documents none);
//   - token: POST https://polarremote.com/v2/oauth2/token, HTTP Basic
//     `client_id:client_secret`, form `grant_type=authorization_code`, `code`
//     and the `redirect_uri` sent to the authorization endpoint. The answer
//     carries `access_token`, `token_type`, `expires_in` (about a year in the
//     example) and `x_user_id`; no refresh token. The code lives 10 minutes
//     and is single use: "if it's used more than once, the request will be
//     denied and ALL issued tokens will be deleted" (app.js never sends a
//     code twice);
//   - every `/v3/users…` and `/v3/exercises…` request carries the user token
//     (`Authorization: Bearer`). "Access tokens will not expire unless
//     explicitly revoked by partners or users": a 401 means the user must
//     connect again.
//
// The user is then registered to the client (POST /v3/users, 409 when it
// already is) before any data can be read. Rate limits (per client, so per
// user here): 500 + 20 × users requests per 15 minutes, 5,000 + 100 × users
// per 24 hours, reported in the RateLimit-* headers; 429 beyond.
//
// One request at a time, a 20-second timeout, a user agent naming the
// project. Errors are PolarApiError with a `kind`.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const API_URL = 'https://www.polaraccesslink.com';
const AUTHORIZE_URL = 'https://flow.polar.com/oauth2/authorization';
const TOKEN_URL = 'https://polarremote.com/v2/oauth2/token';
const SCOPE = 'accesslink.read_all';
const TIMEOUT_MS = 20 * 1000;
const { version: VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const USER_AGENT = `gladys-polar/${VERSION} (+https://github.com/William-De71/gladys-polar)`;

/** An error of Polar AccessLink, with its kind. */
class PolarApiError extends Error {
  /**
   * @param {string} kind - unauthorized, consent, not_found, rate_limited,
   * server, refused, network, invalid, oauth.
   * @param {string} message - The message (never a token).
   * @param {object} [details] - `{ status, code, retryAfter }`.
   */
  constructor(kind, message, { status = 0, code = '', retryAfter = null } = {}) {
    super(message);
    this.name = 'PolarApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * @description The kind of an HTTP error status.
 * @param {number} status - The status.
 * @returns {string} The kind.
 */
function kindOf(status) {
  if (status === 401) {
    return 'unauthorized';
  }
  if (status === 403) {
    return 'consent';
  }
  if (status === 404) {
    return 'not_found';
  }
  if (status === 429) {
    return 'rate_limited';
  }
  return status >= 500 ? 'server' : 'refused';
}

/**
 * @description Read the "short, long" pairs of the RateLimit-* headers.
 * @param {Headers} headers - The headers.
 * @returns {object|null} `{ usage, limit, reset }`, each `[short, long]`.
 */
function readRateLimit(headers) {
  const pair = (name) => {
    const value = headers?.get?.(name);
    if (!value) {
      return null;
    }
    const numbers = value.split(',').map((part) => Number(part.trim()));
    return numbers.length === 2 && numbers.every(Number.isFinite) ? numbers : null;
  };
  const usage = pair('RateLimit-Usage');
  const limit = pair('RateLimit-Limit');
  const reset = pair('RateLimit-Reset');
  return usage || limit || reset ? { usage, limit, reset } : null;
}

/**
 * @description The authorization URL of Polar Flow.
 * @param {object} params - `{ clientId, redirectUri, state }`.
 * @returns {string} The URL to open.
 * @example
 * buildAuthorizeUrl({ clientId: 'abc', redirectUri: 'https://my.gladysassistant.com/redirect/oauth', state: 'x' });
 */
function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  }).toString();
  return url.toString();
}

/**
 * @description The client.
 * @param {object} [options] - `{ fetch, now }`.
 * @returns {object} The client.
 */
function createPolarClient({ fetch: fetchFn = globalThis.fetch, now = () => Date.now() } = {}) {
  let queue = Promise.resolve();
  const stats = { day: '', count: 0, last: null, rateLimit: null };

  /**
   * @description Count a request (per UTC day: the 24-hour window of Polar
   * starts at the first request, the day is close enough for a diagnostic).
   */
  function count() {
    const day = new Date(now()).toISOString().slice(0, 10);
    if (stats.day !== day) {
      stats.day = day;
      stats.count = 0;
    }
    stats.count += 1;
    stats.last = now();
  }

  /**
   * @description Run one request at a time.
   * @param {Function} task - `async () => value`.
   * @returns {Promise<unknown>} Its result.
   */
  function serial(task) {
    const run = queue.catch(() => {}).then(task);
    queue = run.catch(() => {});
    return run;
  }

  /**
   * @description Send a request, read its JSON answer.
   * @param {string} url - The URL.
   * @param {object} init - fetch init.
   * @returns {Promise<{ status: number, body: unknown, headers: Headers }>} The answer.
   */
  async function send(url, init) {
    count();
    let response;
    try {
      response = await fetchFn(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new PolarApiError('network', `Polar unreachable: ${err.message}`);
    }
    const rateLimit = readRateLimit(response.headers);
    if (rateLimit) {
      stats.rateLimit = { ...rateLimit, at: now() };
    }
    const text = await response.text().catch(() => '');
    let body = null;
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }
    return { status: response.status, body, headers: response.headers, text };
  }

  /**
   * @description A request to AccessLink with the user token.
   * @param {string} method - GET, POST, DELETE.
   * @param {string} path - '/v3/users/sleep'.
   * @param {object} options - `{ token, query, json, accept }`.
   * @returns {Promise<{ status: number, body: unknown }>} The answer (2xx, or a status in `accept`).
   */
  function request(method, path, { token, query, json, accept = [] }) {
    return serial(async () => {
      const url = new URL(path, API_URL);
      if (query) {
        url.search = new URLSearchParams(query).toString();
      }
      const answer = await send(url.toString(), {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(json ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(json ? { body: JSON.stringify(json) } : {}),
      });
      const { status, body } = answer;
      if ((status >= 200 && status < 300) || accept.includes(status)) {
        if (body === undefined) {
          throw new PolarApiError('invalid', `Polar sent an unreadable answer to ${path}`, {
            status,
          });
        }
        return { status, body };
      }
      const reset = stats.rateLimit?.reset?.[0];
      throw new PolarApiError(kindOf(status), `Polar answered HTTP ${status} to ${path}`, {
        status,
        retryAfter: status === 429 && Number.isFinite(reset) ? reset : null,
      });
    });
  }

  /**
   * @description A list endpoint: an array, empty on 204.
   * @param {string} path - The path.
   * @param {string} token - The user token.
   * @param {object} [options] - `{ query, key }`: `key` names the envelope.
   * @returns {Promise<unknown[]>} The items.
   */
  async function list(path, token, { query, key } = {}) {
    const { status, body } = await request('GET', path, { token, query });
    if (status === 204 || body === null) {
      return [];
    }
    const items = key ? body?.[key] : body;
    if (!Array.isArray(items)) {
      throw new PolarApiError('invalid', `Polar sent no list to ${path}`, { status });
    }
    return items;
  }

  return {
    stats,

    /**
     * @description Exchange the authorization code (once, ever).
     * @param {object} params - `{ clientId, clientSecret, code, redirectUri }`.
     * @returns {Promise<{ accessToken: string, userId: string, expiresAt: number|null }>} The token.
     */
    exchangeCode({ clientId, clientSecret, code, redirectUri }) {
      return serial(async () => {
        const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
        const form = { grant_type: 'authorization_code', code };
        if (redirectUri) {
          form.redirect_uri = redirectUri;
        }
        const { status, body } = await send(TOKEN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json;charset=UTF-8',
          },
          body: new URLSearchParams(form).toString(),
        });
        const token = typeof body?.access_token === 'string' ? body.access_token : '';
        const userId = body?.x_user_id;
        if (status !== 200 || !token) {
          const code_ = typeof body?.error === 'string' ? body.error : `http_${status}`;
          throw new PolarApiError('oauth', `Polar token endpoint refused: ${code_}`, {
            status,
            code: code_,
          });
        }
        if (userId === undefined || userId === null || !/^\d+$/.test(String(userId))) {
          throw new PolarApiError('oauth', 'Polar sent no user id with the token', {
            status,
            code: 'no_user_id',
          });
        }
        const expiresIn = Number(body.expires_in);
        return {
          accessToken: token,
          userId: String(userId),
          expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? now() + expiresIn * 1000 : null,
        };
      });
    },

    /**
     * @description Register the user to the client: 200 the first time, 409
     * when already registered (both fine).
     * @param {string} token - The user token.
     * @param {string} memberId - A stable id of ours.
     * @returns {Promise<{ already: boolean, user: object|null }>} The result.
     */
    async registerUser(token, memberId) {
      const { status, body } = await request('POST', '/v3/users', {
        token,
        json: { 'member-id': memberId },
        accept: [409],
      });
      return {
        already: status === 409,
        user: status === 200 && body && typeof body === 'object' ? body : null,
      };
    },

    /**
     * @description The user's base information (first name…).
     * @param {string} token - The user token.
     * @param {string} userId - The Polar user id.
     * @returns {Promise<object|null>} The user, null on 204.
     */
    async getUser(token, userId) {
      const { status, body } = await request('GET', `/v3/users/${encodeURIComponent(userId)}`, {
        token,
      });
      return status === 204 ? null : body;
    },

    /**
     * @description De-register the user: the token stops working.
     * @param {string} token - The user token.
     * @param {string} userId - The Polar user id.
     * @returns {Promise<void>}
     */
    async deleteUser(token, userId) {
      await request('DELETE', `/v3/users/${encodeURIComponent(userId)}`, { token });
    },

    listActivities: (token, from, to) =>
      list('/v3/users/activities', token, { query: { from, to } }),
    listExercises: (token) => list('/v3/exercises', token),
    listNights: (token) => list('/v3/users/sleep', token, { key: 'nights' }),
    listRecharges: (token) => list('/v3/users/nightly-recharge', token, { key: 'recharges' }),
    listCardioLoads: (token) => list('/v3/users/cardio-load', token),

    /**
     * @description The physical info, null when Polar has none.
     * @param {string} token - The user token.
     * @returns {Promise<object|null>} The raw answer.
     */
    async physicalInfo(token) {
      try {
        const { status, body } = await request('GET', '/v3/users/physical-info', { token });
        return status === 204 ? null : body;
      } catch (err) {
        if (err.kind === 'not_found') {
          return null;
        }
        throw err;
      }
    },
  };
}

export {
  API_URL,
  AUTHORIZE_URL,
  TOKEN_URL,
  SCOPE,
  USER_AGENT,
  PolarApiError,
  buildAuthorizeUrl,
  createPolarClient,
  readRateLimit,
};
