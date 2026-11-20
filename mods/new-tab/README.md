# new-tab

Opens a new tab at the end of the focused space, where the built-in `tab.new`
puts it right after the active tab. It has no UI: it opens the tab and closes
itself.

## Use

`cmd-t` (`keys.json`: `mod.open:new-tab`) and the leader's `c`.

Other mods open it as an overlay, with `tab.new`'s `name`, `space`, `folder` and
`argv` as props: the tab bar's `+` menu ([`new-menu-end`](../new-menu-end/README.md)),
[`nvim-tab`](../nvim-tab/README.md) and [`lazygit-tab`](../lazygit-tab/README.md).

```js
openOverlay({ mod: "new-tab", kind: "popup", width: 1, height: 1, props: { name: "nvim", argv: ["exec", "nvim"] } });
```

## Notes

- The tab starts in the focused terminal's folder, as `tab.new` does.
- With no space open it starts one, as `tab.new` does.
