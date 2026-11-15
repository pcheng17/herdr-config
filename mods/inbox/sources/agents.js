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
// or when the screen had nothing to show.
const PROMPTS = "inbox.prompts";
// "Blocked" can be reported before the agent has drawn its prompt, so a read
// waits a moment and tries again while the screen shows nothing to extract.
const READ_DELAY_MS = 400;
const READ_ATTEMPTS = 3;

function tabChangedAt() {
  return new Map(spaces().flatMap((s) => s.tabs.map((t) => [t.id, t.changed_at])));
}

async function readPrompt(cx, address) {
  let snippet = "";
  for (let i = 0; i < READ_ATTEMPTS && !snippet; i++) {
    await cx.sleep(READ_DELAY_MS);
    try {
      const r = await hc(["read", address]);
      if (r.code === 0) snippet = promptSnippet(r.stdout) ?? "";
    } catch {
      // Unreadable screen: the row keeps the terminal title.
    }
  }
  const now = shared(PROMPTS) ?? {};
  if (address in now) setShared(PROMPTS, { ...now, [address]: snippet });
}

// Reads each blocked agent's screen once per blocked spell; forgets agents
// that moved on. Runs from a view's render with its cx, as host work must.
function sync(cx) {
  const blocked = new Set(agents().filter((a) => a.status === "blocked").map((a) => a.address));
  const stored = shared(PROMPTS) ?? {};
  const kept = Object.fromEntries(Object.entries(stored).filter(([a]) => blocked.has(a)));
  const fresh = [...blocked].filter((a) => !(a in kept));
  if (fresh.length === 0 && Object.keys(kept).length === Object.keys(stored).length) return;
  setShared(PROMPTS, { ...kept, ...Object.fromEntries(fresh.map((a) => [a, ""])) });
  for (const address of fresh) cx.spawn((cx) => readPrompt(cx, address));
}

function items() {
  const changedAt = tabChangedAt();
  const prompts = shared(PROMPTS) ?? {};
  return agents()
    .filter((a) => KINDS[a.status])
    .map((a) => ({
      ...KINDS[a.status],
      key: `agent-${a.address}`,
      title: `${a.space_name} · ${a.tab_name}`,
      body: prompts[a.address] || a.title || a.program?.name || "",
      time: changedAt.get(a.tab) ?? null,
      open: () => run("agent.focus", { terminal: a.address }),
    }));
}

export default { id: "agents", label: "Agents", items, sync };
