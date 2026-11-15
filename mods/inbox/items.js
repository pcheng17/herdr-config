// Every open item from every source, each tagged with its source's id.
// Shared by the inbox panel and the tab bar's Inbox count.

import { shared, setShared } from "herdr";
import { SOURCES } from "./sources/index.js";

// { [source id]: message } for sources whose last sync(cx) threw.
const SYNC_ERRORS = "inbox.syncErrors";

// One broken source shows as a row instead of blanking the inbox.
function errorItem(source, message) {
  return { key: `error-${source.id}`, section: "now", badge: "ERROR", tone: "blocked",
    title: `${source.label} source failed`, body: message, time: null, open: () => {} };
}

function sourceItems(source) {
  const syncError = (shared(SYNC_ERRORS) ?? {})[source.id];
  if (syncError) return [errorItem(source, `sync: ${syncError}`)];
  try {
    const items = source.items();
    if (!Array.isArray(items)) return [errorItem(source, "items() must return an array")];
    return items;
  } catch (err) {
    return [errorItem(source, String(err?.message ?? err))];
  }
}

// Lets sources start background work (reads, fetches) with a view's cx.
// Called from the tab bar's render, which is always shown in main-inbox.
export function syncSources(cx) {
  const errors = {};
  for (const source of SOURCES) {
    try {
      source.sync?.(cx);
    } catch (err) {
      errors[source.id] = String(err?.message ?? err);
    }
  }
  if (JSON.stringify(errors) !== JSON.stringify(shared(SYNC_ERRORS) ?? {})) setShared(SYNC_ERRORS, errors);
}

export function allItems() {
  return SOURCES.flatMap((source) => sourceItems(source).map((item) => ({ ...item, source: source.id })));
}

export { SOURCES };
