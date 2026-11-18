# nvim-tab

Opens `nvim` in a new tab named `nvim`, at the focused space's folder. It has no
UI: it opens the tab and closes itself.

## Use

`ctrl-space e` (the leader's `e` binding in `../leader/main.js`).

## Notes

- The tab runs `exec nvim`, so the shell is replaced: `:q` closes the tab.
- A space with no folder (home) opens at the pane's cwd instead.
