# sessionizer

tmux-sessionizer for Herdr: a popup that fuzzy-picks a folder, on this computer
or another machine, and switches to its space. If that machine has no space at
the folder yet, it makes one there, named after the folder.

## Use

`ctrl-space ctrl-f` (the leader's `ctrl-f` binding in `../leader/main.js`). Type
to filter, then pick.

| Key | Action |
|---|---|
| typing | Filter with fzf's matching: smart case, and its extended syntax (`'exact`, `^prefix`, `suffix$`, `!not`, `a \| b`) |
| `@name` | Show only machines whose name starts with `name` (`@local` is this computer); overrides `Tab` |
| `Tab` / `shift-Tab` | Step the machine shown: all, `local`, then each machine in `sessionizer.json` order |
| `↓` / `ctrl-n` / `ctrl-j` | Next folder |
| `↑` / `ctrl-p` / `ctrl-k` | Previous folder |
| `Enter` or click | Open the highlighted folder's space |
| `Esc` | Close |

## Config

`sessionizer.json` in the repo root (linked into `~/.config/herdr-app` by
`install`):

```json
{
  "roots": ["~/dev"],
  "folders": ["~/.dotfiles"],
  "machines": {
    "worker": { "roots": ["~/src"], "folders": ["/srv/api"] }
  }
}
```

| Key | What |
|---|---|
| `roots` | Folders whose direct subfolders are listed |
| `folders` | Folders listed as they are |
| `machines` | Per remote machine, named as in `hc machine ls`: its own `roots` and `folders` |

Every key is optional; unknown keys are an error. `~` is expanded on the
machine that lists the folder, so it means that machine's home.

## Notes

- Folders are listed with `fd` (or `fdfind`), which skips hidden and
  `.gitignore`d folders. Without it, `find` is used, which skips hidden folders
  but doesn't read `.gitignore`.
- Nothing needs installing on remote machines: the listing is a small `sh`
  script run there through herdr-core.
- This computer's folders show first; each machine's join when it answers. A
  machine that can't be reached, or doesn't answer in 5 seconds, gets a note
  under the list instead of an error.
- Missing roots are skipped.
