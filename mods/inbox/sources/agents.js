// Agents that need you: blocked ones (waiting on input or a permission) and
// ones that finished while you weren't looking. Live from herdr.

import { agents, spaces, run } from "herdr";

const KINDS = {
  blocked: { section: "now", badge: "BLOCKED", tone: "blocked" },
  done: { section: "later", badge: "DONE", tone: "done" },
};

function tabChangedAt() {
  return new Map(spaces().flatMap((s) => s.tabs.map((t) => [t.id, t.changed_at])));
}

function items() {
  const changedAt = tabChangedAt();
  return agents()
    .filter((a) => KINDS[a.status])
    .map((a) => ({
      ...KINDS[a.status],
      key: `agent-${a.address}`,
      title: `${a.space_name} · ${a.tab_name}`,
      body: a.title || a.program?.name || "",
      time: changedAt.get(a.tab) ?? null,
      open: () => run("agent.focus", { terminal: a.address }),
    }));
}

export default { id: "agents", items };
