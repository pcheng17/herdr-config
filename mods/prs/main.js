// A pull request dashboard, filling the main area in place of the tabs: the
// layout's main-stack shows it (the leader's p flips it). Views across the
// top (Needs me, from needs.js, then github.js's), filter chips under them, a
// search box, then one row per PR. Refreshes on open and every few minutes,
// and shares the Needs me count as "prs.needs" for the tab bar's PRs button.
//
// Keys: 1-5 or [ ] pick the view, f / F step the filter, / searches (Esc
// back to the list), j/k or ↑/↓ move, Enter or o opens the PR in the browser,
// r refreshes, 0 clears the filter and search.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { exec, theme, checking, nextCommand, layout, setShared } from "herdr";
import { VIEWS as SEARCHES, fetchPrs } from "./github.js";
import { needsMe } from "./needs.js";

const REFRESH_MS = 5 * 60000;
const STALE_MS = 7 * 86400000;

const VIEWS = [{ id: "needs", label: "Needs me" }, ...SEARCHES];

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "draft", label: "Draft", test: (p) => p.draft },
  { id: "ready", label: "Ready", test: (p) => !p.draft },
  { id: "approved", label: "Approved", test: (p) => p.review === "APPROVED" },
  { id: "changes", label: "Changes requested", test: (p) => p.review === "CHANGES_REQUESTED" },
  { id: "waiting", label: "Needs review", test: (p) => p.review === "REVIEW_REQUIRED" },
  { id: "failing", label: "CI failing", test: (p) => p.ci === "FAILURE" || p.ci === "ERROR" },
  { id: "pending", label: "CI pending", test: (p) => p.ci === "PENDING" || p.ci === "EXPECTED" },
  { id: "conflicts", label: "Conflicts", test: (p) => p.conflicts },
  { id: "threads", label: "Open threads", test: (p) => p.threads > 0 },
  { id: "stale", label: "Stale (7d)", test: (p) => Date.now() - p.updated > STALE_MS },
];

const find = (node, id) => {
  if (!node || typeof node !== "object") return null;
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
};

const age = (ms) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  if (m < 60 * 24 * 14) return `${Math.round(m / 1440)}d`;
  return `${Math.round(m / 10080)}w`;
};

const clock = (ms) => new Date(ms).toTimeString().slice(0, 5);

// [text, theme color name] per CI state and review decision.
const CI = {
  SUCCESS: ["✓ pass", "ansi2"],
  FAILURE: ["✗ fail", "ansi1"],
  ERROR: ["✗ error", "ansi1"],
  PENDING: ["● running", "ansi3"],
  EXPECTED: ["● waiting", "ansi3"],
};
const REVIEW = {
  APPROVED: ["Approved", "ansi2"],
  CHANGES_REQUESTED: ["Changes", "ansi1"],
  REVIEW_REQUIRED: ["Needs review", "ansi3"],
};
// Theme color name per needs.js reason.
const REASON = {
  "Changes requested": "ansi1",
  "CI failing": "ansi1",
  Threads: "ansi3",
  "Ready to merge": "ansi2",
  Review: "accent",
};

export default class Prs extends View {
  init(_props, cx) {
    this.prs = null; // { [view id]: PR[] } once fetched
    this.totals = {}; // { [view id]: matches on GitHub, more than prs holds past github.js's PAGE }
    this.error = null;
    this.loading = false;
    this.fetchedAt = null;
    this.view = 0;
    this.filter = 0;
    this.query = "";
    this.at = 0;
    this.typing = false;
    this.shownBefore = false;
    this.handle = cx.focus_handle();
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "Filter by repo, title, branch or author… (/)" });
    this.input.on("change", (_e, cx) => {
      this.query = this.input.value().trim().toLowerCase();
      this.top();
      cx.notify();
    });
    this.input.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    this.input.on("submit", (_e, cx) => { this.handle.focus(); cx.notify(); });
    this.handle.focus();
    if (checking()) return;
    cx.spawn(async () => {
      for (;;) if ((await nextCommand()) === "focus") this.handle.focus();
    });
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const { prs, totals } = await fetchPrs();
        this.prs = { needs: needsMe(prs), ...prs };
        this.totals = totals;
        setShared("prs.needs", this.prs.needs.length);
        this.error = null;
        this.fetchedAt = Date.now();
      } catch (e) {
        this.error = `${e?.message ?? e}`;
        console.error("prs:", e);
      }
      this.loading = false;
      cx.notify();
    });
  }

  // The shown view's PRs that pass the filter chip and the search.
  shown() {
    const all = this.prs?.[VIEWS[this.view].id] ?? [];
    const test = FILTERS[this.filter].test;
    const q = this.query;
    return all.filter((p) => test(p) && (!q || [p.repo, p.title, p.branch, p.author, `#${p.number}`].some((s) => s.toLowerCase().includes(q))));
  }

  setView(i) {
    this.view = (i + VIEWS.length) % VIEWS.length;
    this.top();
  }

  setFilter(i) {
    this.filter = (i + FILTERS.length) % FILTERS.length;
    this.top();
  }

  // Back to the first row, scrolled into view.
  top() {
    this.at = 0;
    this.scroll.scroll_to_item(0);
  }

  move(by, count) {
    if (!count) return;
    this.at = Math.max(0, Math.min(count - 1, this.at + by));
    this.scroll.scroll_to_item(this.at);
  }

  open(pr) {
    if (pr) exec("open", [pr.url]).catch((e) => console.error("prs: open:", e));
  }

  key(e, cx, rows) {
    const k = e.key_char ?? e.key;
    const ctrl = e.modifiers.control;
    if (e.key === "down" || (ctrl && e.key === "n")) this.move(1, rows.length);
    else if (e.key === "up" || (ctrl && e.key === "p")) this.move(-1, rows.length);
    else if (this.typing) {
      if (e.key !== "escape") return; // the search box has it
      this.handle.focus();
    } else if (e.modifiers.platform || ctrl || e.modifiers.alt) return; // chords are the app's
    else if (e.key === "enter" || k === "o") this.open(rows[this.at]);
    else if (k === "j") this.move(1, rows.length);
    else if (k === "k") this.move(-1, rows.length);
    else if (k === "/") this.input.focus();
    else if (k === "r") this.refresh(cx);
    else if (k === "f") this.setFilter(this.filter + 1);
    else if (k === "F") this.setFilter(this.filter - 1);
    else if (k === "]") this.setView(this.view + 1);
    else if (k === "[") this.setView(this.view - 1);
    else if (k >= "1" && k <= String(VIEWS.length)) this.setView(Number(k) - 1);
    else if (k === "0" || e.key === "escape") {
      this.setFilter(0);
      this.input.set_value("");
      this.query = "";
    } else return;
    cx.stop_propagation();
    cx.notify();
  }

  tabs(t) {
    return h_flex().gap(4).items_center().children(VIEWS.map((v, i) => {
      const on = i === this.view;
      const n = this.prs?.[v.id]?.length;
      const total = this.totals[v.id];
      return h_flex().id(`view-${v.id}`).px(10).py(5).gap(6).rounded(7).cursor_pointer()
        .when(on, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { this.setView(i); cx.notify(); })
        .child(div().text_color(on ? t.foreground : t.muted).when(on, (d) => d.font_semibold()).child(`${i + 1} ${v.label}`))
        .when(n != null, (el) => el.child(div().text_size(11).text_color(t.dim).child(total > n ? `${n} of ${total}` : String(n))));
    }));
  }

  chips(t) {
    const all = this.prs?.[VIEWS[this.view].id] ?? [];
    return h_flex().gap(6).flex_wrap().children(FILTERS.map((f, i) => {
      const on = i === this.filter;
      const n = all.filter(f.test).length;
      return div().id(`filter-${f.id}`).px(8).py(3).rounded(6).border_1().cursor_pointer().text_size(11.5)
        .border_color(on ? t.accent : t.border)
        .when(on, (el) => el.bg(t.accent).text_color(t.accent_foreground))
        .when(!on, (el) => el.text_color(n ? t.foreground : t.dim))
        .hover((s) => s.border_color(t.accent))
        .on_click((_e, cx) => { this.setFilter(i); cx.notify(); })
        .child(`${f.label} ${n}`);
    }));
  }

  cell(width, text, color) {
    return div().w(width).flex_none().truncate().text_color(color).child(text);
  }

  header(t, showAuthor) {
    return h_flex().px(10).gap(12).h(24).flex_none().items_center().text_size(11).text_color(t.dim)
      .child(this.cell(200, "Repo", t.dim))
      .child(div().flex_1().child("Title"))
      .when(showAuthor, (el) => el.child(this.cell(120, "Author", t.dim)))
      .child(this.cell(80, "CI", t.dim))
      .child(this.cell(90, "Review", t.dim))
      .child(this.cell(60, "Threads", t.dim))
      .child(this.cell(90, "Size", t.dim))
      .child(this.cell(50, "Age", t.dim));
  }

  row(t, p, i, showAuthor) {
    const on = i === this.at;
    const [ci, ciColor] = CI[p.ci] ?? ["–", "dim"];
    const [review, reviewColor] = p.merged ? ["Merged", "ansi5"] : (REVIEW[p.review] ?? ["–", "dim"]);
    return h_flex().id(`pr-${i}`).px(10).gap(12).h(32).flex_none().items_center().rounded(7).cursor_pointer()
      .when(on, (el) => el.bg(t.hover))
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.at = i; this.open(p); cx.notify(); })
      .child(this.cell(200, p.repo, t.muted))
      .child(h_flex().flex_1().min_w(0).gap(8).items_center()
        .child(div().flex_none().text_color(t.dim).child(`#${p.number}`))
        .when(p.draft, (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.raised).text_size(10.5).text_color(t.muted).child("Draft")))
        .when(p.conflicts, (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.raised).text_size(10.5).text_color(t.ansi1).child("Conflicts")))
        .children((p.reasons ?? []).map((r) => div().flex_none().px(5).rounded(4).bg(t.raised).text_size(10.5).text_color(t[REASON[r]]).child(r)))
        .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).when(on, (d) => d.font_semibold()).child(p.title)))
      .when(showAuthor, (el) => el.child(this.cell(120, p.author, t.muted)))
      .child(this.cell(80, ci, t[ciColor]))
      .child(this.cell(90, review, t[reviewColor]))
      .child(this.cell(60, p.threads ? `${p.threads} open` : "–", p.threads ? t.ansi3 : t.dim))
      .child(h_flex().w(90).flex_none().gap(6).text_size(11.5)
        .child(div().text_color(t.ansi2).child(`+${p.additions}`))
        .child(div().text_color(t.ansi1).child(`-${p.deletions}`)))
      .child(this.cell(50, age(p.merged ?? p.updated), t.dim));
  }

  // Why the list is empty, or null when it isn't.
  empty(count) {
    if (count) return null;
    if (this.error && !this.prs) return null; // the status line says why
    if (!this.prs) return "Loading pull requests…";
    return "No pull requests here";
  }

  status(t) {
    const text = this.error
      ? `Couldn't refresh: ${this.error}`
      : this.loading
        ? "Refreshing…"
        : this.fetchedAt ? `Updated ${clock(this.fetchedAt)}` : "";
    return h_flex().px(10).h(24).flex_none().items_center().justify_between().text_size(11)
      .child(div().flex_1().min_w(0).truncate().text_color(this.error ? t.blocked : t.dim).child(text))
      .child(div().flex_none().text_color(t.dim).child("1-5 [ ] view · f F filter · / search · j k move · ⏎ open · r refresh · 0 clear"));
  }

  render(cx) {
    // Take the keyboard each time the main-stack switches to this. Focus
    // can't move during render, so a task does it.
    const shownNow = find(layout(), "main-stack")?.active === "prs";
    if (shownNow && !this.shownBefore) cx.spawn(async () => this.handle.focus());
    this.shownBefore = shownNow;
    const t = theme();
    const rows = this.shown();
    this.at = Math.min(this.at, Math.max(0, rows.length - 1));
    const showAuthor = VIEWS[this.view].id !== "mine" && VIEWS[this.view].id !== "merged";
    const empty = this.empty(rows.length);
    return v_flex().id("prs").size_full().min_h(0).p(14).gap(10).bg(t.background).text_size(13)
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx, rows))
      .child(h_flex().justify_between().items_center()
        .child(this.tabs(t))
        .child(div().id("refresh").px(10).py(5).rounded(7).cursor_pointer().text_color(t.muted)
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.refresh(cx))
          .child(this.loading ? "Refreshing…" : "Refresh")))
      .child(this.chips(t))
      // Its own press, so the root's track_focus doesn't take the keyboard back.
      .child(h_flex().id("search").h(34).flex_none().on_mouse_down("left", (_e, cx) => cx.stop_propagation()).px(10).items_center().rounded(8).border_1()
        .border_color(this.typing ? t.accent : t.input).bg(t.surface)
        .child(Input.new(this.input).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(this.header(t, showAuthor))
      .child(v_flex().id("rows").flex_1().min_h(0).overflow_y_scrollbar().track_scroll(this.scroll)
        .when(Boolean(empty), (el) => el.child(div().p(20).text_color(t.dim).child(empty)))
        .children(rows.map((p, i) => this.row(t, p, i, showAuthor))))
      .child(this.status(t));
  }
}
