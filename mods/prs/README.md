# prs

A dashboard of your pull requests on one GitHub host, fetched through `gh`.
It fills the main area in place of your tabs, in whichever space you're in.

## Opening it

- `ctrl-space p` (the leader) flips the main area between your tabs and the dashboard.
- The **PRs** button in the tab bar (drawn by [inbox](../inbox/README.md)) does
  the same, and shows the Needs me count. Clicking a tab while the dashboard
  shows goes back to the tabs.

It lives in the layout's `main-stack` (`layouts/pcheng.json`), so it stays
loaded while hidden: it fetches when it loads and every 5 minutes, and is
already up to date when you look. A refresh takes about 20 s.

## Config

`prs.json` at the repo root (linked into `~/.config/herdr-app` by `install`):

```json
{ "host": "github.rbx.com" }
```

`host` is passed to `gh --hostname`. Whoever `gh` is logged in as there is
whose PRs it shows (`gh auth status --hostname <host>`). It's read on every
refresh, so an edit shows on the next one.

## Views

| Key | View | What |
|---|---|---|
| `1` | Needs me | Your non-draft PRs with changes requested, CI failing, unresolved threads, or ready to merge (approved, CI green, no conflicts), plus non-draft PRs where your review is requested. Pills on each row say why. |
| `2` | Mine | Your open PRs |
| `3` | Review requested | Open PRs where your review is requested, directly or through a team you're on |
| `4` | Involved | Open PRs by others that you commented on, are assigned to or are mentioned in |
| `5` | Merged | Your PRs merged in the last 14 days |

Each view fetches up to 200 PRs; past that its tab reads "200 of N".

## Filters

One chip at a time, counted within the current view. A PR can match several.

| Chip | Means |
|---|---|
| Draft / Ready | Is or isn't a draft. Ready means not a draft, not ready to merge. |
| Approved | GitHub's review decision is approved |
| Changes requested | A reviewer's latest review asks for changes |
| Needs review | The repo requires approval and it doesn't have enough yet |
| CI failing | The latest commit's checks failed or errored (one red check is enough) |
| CI pending | Checks still running, or a required check that hasn't reported |
| Conflicts | Merging into the base would conflict |
| Open threads | Has unresolved review threads |
| Stale (7d) | No activity (pushes, comments, reviews) for 7 days |

## Keys

| Key | Does |
|---|---|
| `1`-`5`, `[` `]` | Pick the view |
| `f` / `F` | Next / previous filter chip |
| `/` | Search repo, title, branch, author or `#number`; `Esc` or `Enter` back to the list |
| `j` `k`, `↑` `↓`, `ctrl-n` `ctrl-p` | Move |
| `Enter`, `o` | Open the PR in the browser |
| `r` | Refresh now |
| `0`, `Esc` | Clear the filter and search |

Clicking views, chips and rows works too.

## Files

| File | What |
|---|---|
| `main.js` | The dashboard: views, chips, search, rows, keys |
| `github.js` | The searches behind each view, one paged GraphQL call through `gh` |
| `needs.js` | Builds Needs me from Mine and Review requested |
| `config.js` | Reads `prs.json` |
