// The inbox's connections. To add one (GitHub, Slack, ...), write a module
// in this folder that default-exports a source and list it here.
//
// A source is { id, items() }. items() runs on every render, so it must be
// cheap: read live herdr state or a cache that a timer or another mod fills
// (e.g. shared("inbox.github")), never fetch inline.
//
// An item is:
//   key      unique across all sources, e.g. "agent-t7"
//   section  "now" (needs you) or "later" (worth a look)
//   badge    short label in the left column, e.g. "BLOCKED"
//   tone     theme color name for the badge: "blocked", "done", "accent", ...
//   title    one line
//   body     optional second line
//   time     optional ms timestamp; newest sorts first within a section
//   open()   what Enter or a click does; the inbox closes itself afterwards

import agents from "./agents.js";

export const SOURCES = [agents];
