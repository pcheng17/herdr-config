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
`herdr-app do layout.switch '{"name":"main-inbox"}'` (or cmd-shift-l).

| Path | What |
|---|---|
| `keys.json`, `settings.json` | Key bindings and app settings |
| `themes/` | Catppuccin mocha and latte |
| `layouts/main-inbox.json` | Herdr's `main` layout plus the Inbox panel and tab bar button |
| `mods/inbox` | Inbox of agents that need you (blocked or finished), with a sources seam for more connections |
| `mods/leader` | tmux-style ctrl-space prefix popup |
| `mods/nvim-tab` | cmd-e: nvim in a new tab at the space's folder |

Herdr doesn't reload a symlinked mod when git changes its files. Switch layouts
away and back to load the new code.
