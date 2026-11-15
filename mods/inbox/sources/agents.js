// Agents that need you: blocked ones (waiting on input or a permission) and
// ones that finished while you weren't looking. Live from herdr. A blocked
// agent's row shows what it's asking, read from its screen.

import { agents, spaces, run, hc, shared, setShared } from "herdr";
import { promptSnippet } from "./prompt.js";

const KINDS = {
  blocked: { section: "now", badge: "BLOCKED", tone: "blocked" },
  done: { section: "later", badge: "DONE", tone: "done" },
};

// { [address]: snippet } for agents blocked now; "" while a read is under way
// or when the screen had nothing to show. Shared, so the tab bar and the panel
// read each screen once between them.
const PROMPTS = "inbox.prompts";

function tabChangedAt() {
  return new Map(spaces().flatMap((s) => s.tabs.map((t) => [t.id, t.changed_at])));
}

async function readPrompt(address) {
  let snippet = "";
  try {
    const r = await hc(["read", address]);
    if (r.code === 0) snippet = promptSnippet(r.stdout) ?? "";
  } catch {
    // Unreadable screen: the row keeps the terminal title.
  }
  const now = shared(PROMPTS) ?? {};
  if (address in now) setShared(PROMPTS, { ...now, [address]: snippet });
}

// Reads each blocked agent's screen once per blocked spell; forgets agents that moved on.
function syncPrompts(blocked) {
  const stored = shared(PROMPTS) ?? {};
  const kept = Object.fromEntries(Object.entries(stored).filter(([a]) => blocked.has(a)));
  const fresh = [...blocked].filter((a) => !(a in kept));
  if (fresh.length === 0 && Object.keys(kept).length === Object.keys(stored).length) return stored;
  const next = { ...kept, ...Object.fromEntries(fresh.map((a) => [a, ""])) };
  setShared(PROMPTS, next);
  fresh.forEach(readPrompt);
  return next;
}

function items() {
  const changedAt = tabChangedAt();
  const mine = agents().filter((a) => KINDS[a.status]);
  const prompts = syncPrompts(new Set(mine.filter((a) => a.status === "blocked").map((a) => a.address)));
  return mine.map((a) => ({
    ...KINDS[a.status],
    key: `agent-${a.address}`,
    title: `${a.space_name} · ${a.tab_name}`,
    body: prompts[a.address] || a.title || a.program?.name || "",
    time: changedAt.get(a.tab) ?? null,
    open: () => run("agent.focus", { terminal: a.address }),
  }));
}

export default { id: "agents", label: "Agents", items };
