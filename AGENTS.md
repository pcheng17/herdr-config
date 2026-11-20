# Agent Instructions

- Mods that call `cx.bind_keys` must bind on every open, never behind a once-only flag: the app rebuilds its keymap when `keys.json` changes, which drops a mod's bindings.
- Ask before running a focus-changing command (`tab.select`, `tab.new`, `mod.open`, `space.select`) against the live window: the person is working in it. When cleared to, pass explicit `space` and `id` arguments, never rely on the shown space or tab.
