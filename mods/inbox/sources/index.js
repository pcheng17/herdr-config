// The inbox's connections. To add one (GitHub, Slack, ...), write a module
// in this folder that default-exports a source and list it here.
//
// A source is { id, label, items(), sync?(cx) }; label names its filter chip.
// items() runs on every render (panel and tab bar count), so it must be
// cheap: read live herdr state or a cache in shared state, never fetch inline.
// sync(cx), if present, runs on the tab bar's renders: start background work
// there with cx.spawn and put its results in shared state for items().
//
// An item is:
//   key      unique across all sources, e.g. "agent-t7"
//   section  "now" (needs you) or "later" (worth a look)
//   badge    short label in the left column, e.g. "BLOCKED"
//   tone     theme color name for the badge: "blocked", "done", "accent", ...
//   title    one line
//   body     optional second line
//   time     optional ms timestamp; newest sorts first within a section
//   open()   what clicking the row does

import agents from "./agents.js";

export const SOURCES = [agents];
