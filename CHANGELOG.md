# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.1.0] - 2026-10-30

### Added

- Polar Flow account through the official Polar AccessLink v3 API, with the user's own AccessLink client: OAuth 2.0 (HTTP Basic at the token endpoint), the user registered to the client, an authorization code never sent twice (replays, double deliveries and restarts are answered without asking Polar).
- One device per linked account: today's steps, active time, calories, distance and daily goal; the last night's sleep score and time asleep; Nightly Recharge status, ANS charge, heart rate variability, heart rate and breathing rate; cardio load status and ratio.
- Scene triggers: training session synced (filtered by sport family), new night, new Nightly Recharge (filtered by status) and daily activity goal reached, each fired once, never for old data at the first start or after a restart.
- Scene action "read the latest data", with 20 outputs (weight included) and a ready-made summary.
- Dashboard widgets: today with a sync button, last night with its Nightly Recharge, the last training sessions with the training status, and the last seven days as a bar chart.
- Cloud transport: Polar read every 15 to 120 minutes on the integration's own timer, pause on 429 from the RateLimit headers, back-off on errors, reconnection asked on a revoked token, data kept in `/data`.
- Configuration actions: sync now, unlink the account, and a diagnostic written to the Logs tab.
- English, French, German and Spanish everywhere: settings, devices, widgets, scenes and documentation.

[0.1.0]: https://github.com/William-De71/gladys-polar/releases/tag/v0.1.0
