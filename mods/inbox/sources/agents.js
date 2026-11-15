// Agents that need you: blocked ones (waiting on input or a permission) and
// ones that finished while you weren't looking. Live from herdr. A blocked
// agent's row shows what it's asking, read from its screen.
//
// Background sub-agents (started with `hc run`, no pane) aren't in agents(),
// so blocked ones come from terminals(), as Herdr's own sidebar finds them.

import { agents, terminals, spaces, run, hc, shared, setShared } from "herdr";
import { promptSnippet } from "./prompt.js";

const KINDS = {
  blocked: { section: "now", badge: "BLOCKED", tone: "blocked" },
  done: { section: "later", badge: "DONE", tone: "done" },
};
// A sub-agent's raw status word; Herdr's sidebar counts an error as blocked.
// It's never "done": it reports to its parent, and the parent's done is the news.
const SUB_BLOCKED = new Set(["blocked", "error"]);

// { [address]: { text, since } } for agents blocked now: what the screen asks
// ("" while a read is under way or when it had nothing to show), and when the
// inbox first saw it blocked (sub-agents report no time of their own).
const PROMPTS = "inbox.prompts";
// "Blocked" can be reported before the agent has drawn its prompt, so a read
// waits a moment and tries again while the screen shows nothing to extract.
const READ_DELAY_MS = 400;
const READ_ATTEMPTS = 3;

function tabChangedAt() {
  return new Map(spaces().flatMap((s) => s.tabs.map((t) => [t.id, t.changed_at])));
}

// Blocked sub-agents without a pane, each with the pane agent it hangs under
// (followed up through parents), or null when none is found.
function blockedSubAgents(paneAgents) {
  const byAddress = new Map(paneAgents.map((a) => [a.address, a]));
  const all = terminals();
  const termByAddress = new Map(all.map((t) => [t.address, t]));
  const rootOf = (t) => {
    const seen = new Set();
    for (let p = t.parent; p && !seen.has(p); p = termByAddress.get(p)?.parent) {
      if (byAddress.has(p)) return byAddress.get(p);
      seen.add(p);
    }
    return null;
  };
  return all
    .filter((t) => t.parent && t.state === "live" && !byAddress.has(t.address) && SUB_BLOCKED.has(t.status))
    .map((t) => ({ t, root: rootOf(t) }));
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
  if (address in now) setShared(PROMPTS, { ...now, [address]: { ...now[address], text: snippet } });
}

// Reads each blocked agent's screen once per blocked spell; forgets agents
// that moved on. Runs from a view's render with its cx, as host work must.
function sync(cx) {
  const paneAgents = agents();
  const blocked = new Set([
    ...paneAgents.filter((a) => a.status === "blocked").map((a) => a.address),
    ...blockedSubAgents(paneAgents).map(({ t }) => t.address),
  ]);
  const stored = shared(PROMPTS) ?? {};
  const kept = Object.fromEntries(Object.entries(stored).filter(([a]) => blocked.has(a)));
  const fresh = [...blocked].filter((a) => !(a in kept));
  if (fresh.length === 0 && Object.keys(kept).length === Object.keys(stored).length) return;
  const since = Date.now();
  setShared(PROMPTS, { ...kept, ...Object.fromEntries(fresh.map((a) => [a, { text: "", since }])) });
  for (const address of fresh) cx.spawn((cx) => readPrompt(cx, address));
}

function agentItem(a, prompts, changedAt) {
  return {
    ...KINDS[a.status],
    key: `agent-${a.address}`,
    title: `${a.space_name} · ${a.tab_name}`,
    body: prompts[a.address]?.text || a.title || a.program?.name || "",
    time: changedAt.get(a.tab) ?? null,
    open: () => run("agent.focus", { terminal: a.address }),
  };
}

function subAgentItem({ t, root }, prompts) {
  const name = t.name || t.address;
  return {
    ...KINDS.blocked,
    key: `agent-${t.address}`,
    title: root ? `${root.space_name} · ${root.tab_name} › ${name}` : name,
    body: prompts[t.address]?.text || t.title || t.program?.name || "",
    time: prompts[t.address]?.since ?? null,
    // No pane to focus: open it over the tab, as Herdr's sidebar does.
    open: () => run("terminal.peek", { terminal: t.address }),
  };
}

function items() {
  const changedAt = tabChangedAt();
  const prompts = shared(PROMPTS) ?? {};
  const paneAgents = agents();
  return [
    ...paneAgents.filter((a) => KINDS[a.status]).map((a) => agentItem(a, prompts, changedAt)),
    ...blockedSubAgents(paneAgents).map((s) => subAgentItem(s, prompts)),
  ];
}

export default { id: "agents", label: "Agents", items, sync };
