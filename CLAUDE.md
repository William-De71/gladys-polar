# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** for Polar watches and heart rate
sensors: a Node.js service (Node 22+, ESM, no build step) that runs in its own
sandboxed Docker container and talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It reads the **official Polar AccessLink v3 API**
(https://www.polar.com/accesslink-api/) with the **user's own API client**
(created on https://admin.polaraccesslink.com), every 15 to 120 minutes on its
own timer, and keeps the last days in `/data`. Transport: cloud only. Never
tested with a real Polar account: every answer shape comes from the
documentation.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/app.test.js              # one file
DEBUG=gladys-integration-sdk npm test     # with the SDK debug logs
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check   # store checks
scripts/build-cover.sh                    # cover.jpg from docs/assets/cover.svg
docs/illustrations/render.sh              # docs/assets/widgets.<lang>.png
node .github/scripts/release.mjs next     # the version the next release would get
```

## Architecture

```
index.js                SDK wiring only (new GladysIntegration + createApp)
src/app.js              every handler, registered before connect(): OAuth2
                        (authorize URL, callback, code exchange once), the
                        reading round and its errors, timer, widgets, actions
src/polar-api.js        AccessLink client: authorization URL, token exchange
                        (HTTP Basic), Bearer requests, one at a time, error
                        kinds, RateLimit-* headers
src/polar.js            the answers read into records (ISO 8601 durations,
                        local dates of the watch), sport families
src/store.js            /data/polar.json: account, last days, `seen`, `baseline`
src/events.js           trigger transitions, payloads, scene action outputs
src/device.js           one device per account, its features and states
src/widgets.js          today, night, exercises and week widgets
src/config.js           configuration and internal keys (token, OAuth state,
                        fingerprints of the codes already exchanged)
src/time.js             local days in the TZ of Gladys, jitter
src/i18n.js             runtime texts, Polar scales, sport names, en/fr/de/es
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md   user documentation, re-hosted by the store
docs/illustrations/     generated widget images (render.sh, gen.mjs, render.js)
test/helpers/           made-up answers shaped like the documentation, a fake Polar
.github/scripts/release.mjs         version, changelog, bump (tested in test/)
```

## Rules

- **Never send an authorization code twice.** Polar deletes every token of
  the user when a code is used twice. The callback checks the state, then
  stores the fingerprint of the code and clears the state BEFORE calling the
  token endpoint; a concurrent callback waits for the first one; a known
  fingerprint never reaches Polar. Keep it that way, and keep the tests of
  `test/app.test.js` that count the token requests.
- **Tokens**: no refresh token, about a year of validity, revocable. A 401 is
  final: `token_lost` is stored, the status asks to connect again, nothing is
  requested until then. Tokens and OAuth state live in internal config keys
  (`INTERNAL_KEYS`), never in `/data`, never in the logs.
- **External ids are forever**, and so is every key users store: the device
  (`account:<Polar user id>`, the `x_user_id` of the token answer, never a
  name), the feature keys of `FEATURES` in `src/device.js` and their
  `category` / `type` / `unit` / `min` / `max`, the keys of `config_schema`,
  `actions`, the widgets and their settings, the scene triggers (fields,
  options, variables) and the scene action (fields, outputs).
  `test/structure.test.js` compares them to a baseline: never update the
  baseline to make a test pass without a documented migration.
- **Category / type pairs** come from the SDK constants and the units the
  core allows per category: counts without a Gladys unit (steps, kcal,
  scores, bpm) `counter-sensor/integer` without unit; durations `duration`
  (min, h, ms); distance `distance-sensor/decimal` km; goal `level-sensor/
decimal` %; signed or decimal scores `level-sensor/decimal` without unit;
  cardio load status `text/text`. No weight feature (no mass unit).
- **Be gentle with Polar.** One reading = 5 or 6 requests (physical info
  twice a day), never a request per widget, per scene action or per tick.
  At least 15 minutes after a 429 (or RateLimit-Reset when longer), back-off
  on other errors. Webhooks are not used (no public URL, signature header not
  relayed by Gladys Plus): do not add them without a way to verify them.
- **Only the non-transactional endpoints.** The transactional ones are
  deprecated in the documentation.
- **Events once.** `seen` and `baseline` (in /data) per kind; the first
  successful reading of a kind is a baseline; nights and recharges older than
  two days are only remembered; five sessions per reading at most. A scene
  action or a widget never fires an event.
- **The container rootfs is read-only.** Write only under `/data`.
- **Four languages.** Every user-facing text (manifest, runtime messages in
  `src/i18n.js`, `docs/*.md`, README) exists in English, French, German and
  Spanish. `test/i18n.test.js` checks it. Polar's product names (Nightly
  Recharge, Sleep Plus Stages) stay as Polar writes them.
- **Widget images.** After any change to the content of a widget, run
  `docs/illustrations/render.sh` again and look at the four PNG files.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, the lockfile or the manifest, nor the `docker_image` tag.
  The version stays below 1.0.0 until the maintainer runs the Release workflow
  with `release-as: 1.0.0`.
- **Changelog.** Never edit CHANGELOG.md by hand, it is generated at the
  release. Write the PR title as the line the user will read.
- **Commits and PR titles** follow Conventional Commits, in English: `feat` ->
  minor, `fix` / `perf` -> patch, `!` or `BREAKING CHANGE:` -> major (minor
  below 1.0.0); `docs`, `chore`, `ci`, `test`, `style`, `refactor`, `build`
  release nothing.
- **Manifest.** Texts are objects `{ "en", "fr", "de", "es" }`; the catalog
  `description` holds 10 to 100 characters per language; the file stays under
  100 KB; at most 20 scene action outputs. No `countries`, no permission, no
  webhook. Transport: `["cloud"]`. `gladys_version` `>=5.3.0`. Never suggest
  an official Polar integration: Polar's logo is not used.
- **Forum drafts** (`.github/forum-*.md`) are never committed.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network (a fake `fetch` at most).
