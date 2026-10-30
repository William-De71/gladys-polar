// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
//
// The widgets of a made-up Polar Flow account on Friday 30 October 2026 at
// 18:40 in Paris: the answers of test/helpers/polar-data.js (shaped like the
// examples of the AccessLink documentation, no real account) are read by the
// real readers (src/polar.js) and drawn by the real widget builders
// (src/widgets.js).
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { buildTodayWidget, buildNightWidget, buildExercisesWidget, buildWeekWidget } =
  await load('src/widgets.js');
const { parseActivity, parseExercise, parseNight, parseRecharge, parseCardioLoad, readList } =
  await load('src/polar.js');
const { LANGUAGES } = await load('src/i18n.js');
const { answers, NOW, TZ } = await load('test/helpers/polar-data.js');
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

const a = answers();
const activities = Object.fromEntries(
  a.activities.map((item) => [item.start_time.slice(0, 10), parseActivity(item)]),
);
const nights = readList(a.sleep.nights, parseNight, (night) => night.date);
const recharges = readList(a.recharges.recharges, parseRecharge, (recharge) => recharge.date);
const exercises = readList(a.exercises, parseExercise, (exercise) => exercise.startLocal ?? '');
const cardio = parseCardioLoad(a.cardio[1]);
const common = { fetchedAt: NOW - 6 * 60 * 1000, timeZone: TZ };

const contents = {};
for (const language of LANGUAGES) {
  contents[language] = {
    today: buildTodayWidget({
      ...common,
      name: 'Marie',
      activity: activities['2026-10-30'],
      latest: activities['2026-10-30'],
      language,
    }),
    night: buildNightWidget({ ...common, night: nights[0], recharge: recharges[0], language }),
    exercises: buildExercisesWidget({ ...common, exercises, cardio, language }),
    week: buildWeekWidget({ activities, nights, today: '2026-10-30', metric: 'steps', language }),
  };
}
const widgets = Object.fromEntries(
  manifest.widgets.map((w) => [w.key, { icon: w.icon, label: w.label }]),
);
writeFileSync(out, JSON.stringify({ now: NOW, widgets, contents }));
