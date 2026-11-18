# leader

A tmux-style prefix. `ctrl-space` opens a small popup listing the bindings below;
the next key runs its action and closes the popup. `Esc` or any unbound key just
closes it.

## Use

`ctrl-space` (`keys.json`: `mod.open:leader`), then one of:

| Key | Action |
|---|---|
| `\|` | Split the pane right |
| `_` | Split the pane down |
| `x` | Close the pane, after a confirm dialog (`Enter` closes, `Esc` cancels) |
| `c` | New tab |
| `b` | Toggle the sidebar |
| `s` | Go to a space (the shipped `picker`) |
| `e` | Nvim tab (`../nvim-tab`) |
| `g` | Lazygit tab (`../lazygit-tab`) |
| `p` | Flip the main area between the tab and the PRs dashboard (`../prs`); flipping back refocuses the pane you were in |
| `ctrl-f` | Sessionizer (`../sessionizer`) |
| `ctrl-n` | New space, asking for its name |
| `ctrl-space` | Send `ctrl-space` to the focused terminal |

## Config

Add a row to `BINDINGS` in `main.js`: `key` is matched against the keystroke
(e.g. `ctrl-f`), else the character it types (e.g. `|`). The popup lists
`BINDINGS` in order.

## Notes

- `ctrl-space` inside the popup works because `keys.json` binds it to
  `leader.send` in the `mod:leader` context; without that it would close the
  popup instead.
- `p` looks for a stack with id `main-stack` and a child `prs`, as in
  `layouts/pcheng.json`.
