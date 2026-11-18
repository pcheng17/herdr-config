# lazygit-tab

Opens `lazygit` in a new tab named `lazygit`, at the focused space's folder. It
has no UI: it opens the tab and closes itself.

## Use

`ctrl-space g` (the leader's `g` binding in `../leader/main.js`).

## Notes

- The tab runs `exec lazygit`, so the shell is replaced: `q` closes the tab.
- A space with no folder (home) opens at the pane's cwd instead.
