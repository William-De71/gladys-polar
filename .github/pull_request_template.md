<!--
The TITLE of this pull request becomes the squash commit, then the line users
read in CHANGELOG.md and in the GitHub Release. Write it in English, as a
Conventional Commit describing the change for the user:

  feat(widgets): show the heart rate zones of the last training session
  fix(sync): keep the last night when Polar answers an empty list
  perf: skip the reading when no account is linked
  docs: explain the redirect URL of the AccessLink client

feat -> minor version, fix / perf -> patch, `!` or a "BREAKING CHANGE:" footer
-> breaking (a minor while the version is below 1.0.0). docs, chore, ci, test,
style, refactor and build alone publish no release. Never edit CHANGELOG.md.
-->

## What changes for the user

## How it was tested

- [ ] `npm run format:check`, `npm run lint` and `npm test` pass
- [ ] Tried in Gladys with a real Polar Flow account (Gladys version: …, watch model: …)
- [ ] The four docs (`docs/en.md`, `fr`, `de`, `es`) and READMEs are up to date
