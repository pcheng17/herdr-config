# smart-close

Asks before closing, and picks what to close by how many panes the focused tab
has. It has no UI of its own: it opens the shipped confirm dialog and closes
itself.

## Use

`cmd-w` (`keys.json`: `mod.open:smart-close`). `Enter` confirms, `Esc` cancels.

| The focused tab has | Asks | Runs |
|---|---|---|
| Several panes | Close pane? | `pane.close` on the focused pane |
| One pane | Close tab? | `tab.close` |
| One pane, and is its space's last tab | Close space? | `tab.close`, which closes the space too |

## Notes

- Mod panes count as panes, and so do the panes hidden behind a zoomed one.
- `cmd-shift-w` still closes the pane without asking.
