// The "Needs me" view, derived from github.js's fetched views rather than
// searched for: your non-draft PRs with something to act on, plus non-draft
// PRs waiting on your review. No gpui imports, so Node can test it.

// Why one of your PRs needs you, by the reason's label.
const MINE = [
  ["Changes requested", (p) => p.review === "CHANGES_REQUESTED"],
  ["CI failing", (p) => p.ci === "FAILURE" || p.ci === "ERROR"],
  ["Threads", (p) => p.threads > 0],
  ["Ready to merge", (p) => p.review === "APPROVED" && (p.ci === "SUCCESS" || p.ci === null) && !p.conflicts],
];

// The PRs in prs.mine and prs.review that need you, newest update first, each
// with `reasons` (labels, in MINE's order, or ["Review"]).
export function needsMe(prs) {
  const mine = (prs.mine ?? []).filter((p) => !p.draft)
    .map((p) => ({ ...p, reasons: MINE.filter(([, test]) => test(p)).map(([label]) => label) }))
    .filter((p) => p.reasons.length);
  const review = (prs.review ?? []).filter((p) => !p.draft).map((p) => ({ ...p, reasons: ["Review"] }));
  return [...mine, ...review].sort((a, b) => b.updated - a.updated);
}
