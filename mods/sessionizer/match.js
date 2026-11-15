// fzf's matching, in memory: vendor/fzf.js is fzf-for-js 0.5.2
// (github.com/ajitid/fzf-for-js, BSD-3-Clause, vendor/fzf-LICENSE.txt), a
// port of fzf's v2 algorithm. Extended syntax as in fzf ('exact, ^prefix,
// suffix$, !not, a | b), smart case, and ties broken by shorter text first
// (fzf's default --tiebreak=length).

import { Fzf, extendedMatch, byLengthAsc } from "./vendor/fzf.js";

// Returns a function from a query to the matching items, best first; all of
// them, in order, for an empty query. Builds the index once, for these items.
export function matcher(items, textOf) {
  const fzf = new Fzf(items, { selector: textOf, match: extendedMatch, tiebreakers: [byLengthAsc] });
  return (query) => fzf.find(query).map((r) => r.item);
}
