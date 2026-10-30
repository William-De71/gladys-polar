// -----------------------------------------------------------------------------
// Entry point of the Polar external integration.
//
// Brings the data of a Polar Flow account (Polar watches and heart rate
// sensors) into Gladys through the official Polar AccessLink v3 API, with the
// user's own AccessLink client:
//   - device: one per linked account, with today's activity, the last night,
//     the Nightly Recharge and the cardio load (see src/device.js);
//   - scene triggers: training session synced, new night, new Nightly
//     Recharge, daily activity goal reached;
//   - scene action: read the latest values;
//   - dashboard widgets: today, last night, training sessions, seven days.
//
// This file only wires the SDK client: the handlers are in src/app.js.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
//   TZ (the timezone of Gladys: "today" follows it)
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
createApp(gladys);

// --- Startup -----------------------------------------------------------------------
logger.info(`Starting the Polar integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
