// Every open item from every source, each tagged with its source's id.
// Shared by the inbox panel and the tab bar's Inbox count.

import { SOURCES } from "./sources/index.js";

// One broken source shows as a row instead of blanking the inbox.
function errorItem(source, message) {
  return { key: `error-${source.id}`, section: "now", badge: "ERROR", tone: "blocked",
    title: `${source.label} source failed`, body: message, time: null, open: () => {} };
}

function sourceItems(source) {
  try {
    const items = source.items();
    if (!Array.isArray(items)) return [errorItem(source, "items() must return an array")];
    return items;
  } catch (err) {
    return [errorItem(source, String(err?.message ?? err))];
  }
}

export function allItems() {
  return SOURCES.flatMap((source) => sourceItems(source).map((item) => ({ ...item, source: source.id })));
}

export { SOURCES };
