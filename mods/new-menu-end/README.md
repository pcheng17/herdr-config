# new-menu-end

The tab bar's `+` menu. A clone of Herdr's shipped `new-menu` (0.1.16, recorded
in `mod.json`) whose Terminal and agent rows make their tab through
[`new-tab`](../new-tab/README.md), so it opens at the end of the space.

## Use

Click `+` in the tab bar (`../inbox/tabs.js`). `1`-`9` start the installed agents.

## Notes

- Clones are never updated: a change to the shipped `new-menu` has to be
  copied over by hand. Diff against `~/.config/herdr-app/mods/new-menu/main.js`.
