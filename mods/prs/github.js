// Fetches the dashboard's pull requests from prs.json's host through `gh`
// (its login there is the "@me"): one search per view (VIEWS), all in one
// GraphQL call per page, each PR flattened by `flatten`. Pages after the
// first ask only for the views that have more.

import { exec } from "herdr";
import { readConfig } from "./config.js";

const PAGE = 40; // per view; GitHub 502s on much bigger pages of this shape
const MAX_PAGES = 5; // so at most 200 PRs per view
const MERGED_DAYS = 14;

export const VIEWS = [
  { id: "mine", label: "Mine", query: "is:pr is:open author:@me archived:false sort:updated-desc" },
  { id: "review", label: "Review requested", query: "is:pr is:open review-requested:@me archived:false sort:updated-desc" },
  { id: "involved", label: "Involved", query: "is:pr is:open involves:@me -author:@me archived:false sort:updated-desc" },
  { id: "merged", label: "Merged", query: () => `is:pr is:merged author:@me merged:>=${daysAgo(MERGED_DAYS)} sort:updated-desc` },
];

const FRAGMENT = `
fragment pr on PullRequest {
  number title url isDraft reviewDecision mergeable updatedAt mergedAt
  additions deletions headRefName
  author { login }
  repository { nameWithOwner }
  reviewThreads(first: 50) { nodes { isResolved } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

// One page of these views' searches; $<id>After, left unset, is the first page.
const pageQuery = (views) => `${FRAGMENT}
query(${views.map((v) => `$${v.id}: String!, $${v.id}After: String`).join(", ")}) {
${views.map((v) => `  ${v.id}: search(type: ISSUE, query: $${v.id}, first: ${PAGE}, after: $${v.id}After) { issueCount pageInfo { hasNextPage endCursor } nodes { ...pr } }`).join("\n")}
}`;

const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

// ci: SUCCESS, FAILURE, ERROR, PENDING, EXPECTED or null (no checks).
// review: APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED or null (none needed).
const flatten = (n) => ({
  url: n.url,
  repo: n.repository.nameWithOwner,
  number: n.number,
  title: n.title,
  author: n.author?.login ?? "ghost",
  branch: n.headRefName,
  draft: n.isDraft,
  review: n.reviewDecision,
  ci: n.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
  conflicts: n.mergeable === "CONFLICTING",
  threads: n.reviewThreads.nodes.filter((t) => !t.isResolved).length,
  additions: n.additions,
  deletions: n.deletions,
  updated: Date.parse(n.updatedAt),
  merged: n.mergedAt ? Date.parse(n.mergedAt) : null,
});

async function fetchPage(host, pending) {
  const vars = pending.flatMap(({ view, search, after }) => [
    "-f", `${view.id}=${search}`,
    ...(after ? ["-f", `${view.id}After=${after}`] : []),
  ]);
  const query = pageQuery(pending.map((p) => p.view));
  const r = await exec("gh", ["api", "graphql", "--hostname", host, "-f", `query=${query}`, ...vars], { timeout: 60000 });
  if (r.code !== 0) throw new Error(r.stderr.trim() || `gh exited ${r.code}`);
  return JSON.parse(r.stdout).data;
}

// Resolves with { prs: { [view id]: PR[] }, totals: { [view id]: number } }
// (totals still count past MAX_PAGES); rejects with gh's or prs.json's
// error. Reads prs.json each time, so an edit shows on the next refresh.
export async function fetchPrs() {
  const { host } = await readConfig();
  const prs = Object.fromEntries(VIEWS.map((v) => [v.id, []]));
  const totals = {};
  // The search text is fixed once, so every page of a view asks the same.
  let pending = VIEWS.map((view) => ({ view, search: typeof view.query === "function" ? view.query() : view.query, after: null }));
  for (let page = 0; pending.length && page < MAX_PAGES; page++) {
    const data = await fetchPage(host, pending);
    pending = pending.flatMap((p) => {
      const result = data[p.view.id];
      // Search can return non-PR nodes as {} when a result is hidden from us.
      prs[p.view.id].push(...result.nodes.filter((n) => n.url).map(flatten));
      totals[p.view.id] = result.issueCount;
      return result.pageInfo.hasNextPage ? [{ ...p, after: result.pageInfo.endCursor }] : [];
    });
  }
  return { prs, totals };
}
