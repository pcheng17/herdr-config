# herdr-config

My [Herdr](https://herdr.dev) app config: keys, settings, themes, layouts and mods.
Split out of `~/.dotfiles` so Herdr work doesn't crowd its history, and so it's
only installed on machines that run the Herdr app.

```sh
git clone <this repo> ~/.herdr-config
~/.herdr-config/install
```

`install` symlinks into `~/.config/herdr-app` (or `$HERDR_APP_HOME`). Rerun it
after adding a theme, layout or mod. Then pick the layout with
`herdr-app do layout.switch '{"name":"pcheng"}'` (or cmd-shift-l).

| Path | What |
|---|---|
| `keys.json`, `settings.json` | Key bindings and app settings |
| `sessionizer.json` | Where the sessionizer looks: `roots` (each one's subfolders) and fixed `folders`, plus the same per remote machine under `machines` (named as in `hc machine ls`) |
| `prs.json` | Which GitHub the PRs dashboard asks: `host`, as `gh --hostname` takes it (`gh`'s login there is whose PRs it shows) |
| `themes/` | Catppuccin mocha and latte |
| `layouts/pcheng.json` | Herdr's `main` layout plus the Inbox panel and tab bar button, and a `main-stack` that swaps the tabs for the PRs dashboard |
| [`mods/inbox`](mods/inbox/README.md) | Inbox of agents that need you (blocked or finished), with a sources seam for more connections; also draws the tab bar, with Inbox and PRs buttons |
| [`mods/leader`](mods/leader/README.md) | ctrl-space: tmux-style prefix popup |
| [`mods/sessionizer`](mods/sessionizer/README.md) | ctrl-space ctrl-f: tmux-sessionizer, fuzzy-pick a folder and open (or switch to) its space |
| [`mods/nvim-tab`](mods/nvim-tab/README.md) | ctrl-space e: nvim in a new tab at the space's folder |
| [`mods/lazygit-tab`](mods/lazygit-tab/README.md) | ctrl-space g: lazygit in a new tab at the space's folder |
| [`mods/smart-close`](mods/smart-close/README.md) | cmd-w: confirm, then close the pane if the tab has several, else the tab |
| [`mods/prs`](mods/prs/README.md) | ctrl-space p: a dashboard of your PRs (Needs me, mine, review requested, involved, merged) in place of the tabs, with filter chips and search |

Herdr doesn't reload a symlinked mod when git changes its files. Switch layouts
away and back to load the new code.

Each mod's README covers its keys, config and files.
