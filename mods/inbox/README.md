# inbox

An inbox of agents that need you: blocked ones (waiting on input or a
permission) and ones that finished. It's a side panel, and the same mod also
draws the tab bar with the button that opens it.

## Use

`cmd-i` (`keys.json`: `inbox.toggle`) or the tab bar's Inbox button toggles the
panel. In `layouts/pcheng.json` the tab bar is the `tabs` block
(`"props": { "part": "tabs" }`) and the panel is the `inbox` child of the
`panel-body` stack on the right.

### Panel

| Part | What |
|---|---|
| Header | `Inbox` and how many items are open |
| Filter chips | `All`, then one per source (e.g. `Agents`), each with its count |
| `NEEDS YOU NOW` | Blocked agents, with what the agent is asking when it can be read from the screen |
| `REVIEW` | Agents that finished |
| Row click | Focus that agent (a background sub-agent with no pane opens over the tab) |

Newest items sort first within a section.

### Tab bar

Herdr's shipped `tabs` mod, cloned to add the Inbox and PRs buttons.

| Part | What |
|---|---|
| Tab | Click to select, double-click to rename, drag to reorder, right-click for the tab menu, the close icon on the active tab closes it |
| Scroll wheel | Previous / next tab |
| `+` | New-tab menu |
| `PRs` | Flips the layout's `main-stack` to the PRs dashboard and back, with the dashboard's Needs me count (`shared("prs.needs")`); the dashboard is documented in `../prs/README.md` |
| `Inbox` | Toggles the inbox panel; shows the open item count |
| `Files`, `Changes` | Toggle the shipped files and changes panels |

The side panel is remembered per space: switching spaces shows the panel that
space last had open (or none).

## Config

Sources live in `sources/`. To add one (GitHub, Slack, ...), write a module there
that default-exports a source and add it to `SOURCES` in `sources/index.js`.

A source is `{ id, label, items(), sync?(cx) }`:

| Field | What |
|---|---|
| `id` | Tags its items |
| `label` | Its filter chip's name |
| `items()` | Its open items; runs on every render, so read live herdr state or a cache in shared state, never fetch here |
| `sync(cx)` | Optional; runs on the tab bar's renders. Start background work with `cx.spawn` and put results in shared state for `items()` |

Each item has `key` (unique across sources), `section` (`"now"` or `"later"`),
`badge`, `tone` (a theme color name), `title`, optional `body` and `time` (ms),
and `open()` for clicks. See `sources/index.js` for the details and
`sources/agents.js` for an example.

A source that throws shows as an `ERROR` row instead of blanking the inbox.

## Notes

- Sources only sync while the tab bar is shown, since `sync` runs from its
  render.
- Tab bar and panel share one folder because a mod can't import another mod's
  files.
