# Agent Instructions

- Mods that call `cx.bind_keys` must bind on every open, never behind a once-only flag: the app rebuilds its keymap when `keys.json` changes, which drops a mod's bindings.
