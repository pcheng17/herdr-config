// Inbox side panel: what needs you, from every source in ./sources, with a
// filter chip per source. Lives in the main-inbox layout's panel stack and is
// toggled by the tab bar's Inbox button (./tabs.js). Click a row to go there.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme } from "herdr";
import { allItems, SOURCES } from "./items.js";

const SECTIONS = [
  { id: "now", label: "NEEDS YOU NOW" },
  { id: "later", label: "REVIEW" },
];
const ALL = { id: "all", label: "All" };
const MINUTE = 60_000;

function since(ms) {
  if (!ms) return "";
  const m = Math.floor((Date.now() - ms) / MINUTE);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

// Sections in order, newest first within each, empty ones dropped.
function grouped(items) {
  return SECTIONS.map((s) => ({
    ...s,
    items: items.filter((i) => i.section === s.id).sort((a, b) => (b.time ?? 0) - (a.time ?? 0)),
  })).filter((s) => s.items.length > 0);
}

export class Panel {
  constructor(cx) {
    this.filter = ALL.id;
    cx.timer.every(MINUTE, (cx) => cx.notify());
  }

  chip(t, f, all) {
    const n = f.id === ALL.id ? all.length : all.filter((i) => i.source === f.id).length;
    const on = this.filter === f.id;
    return h_flex().id(`f-${f.id}`).h(24).px(9).gap(5).items_center().rounded(12).text_size(11.5).border_1()
      .border_color(on ? t.input : t.border).bg(on ? t.selected : t.background).text_color(on ? t.foreground : t.muted)
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.filter = f.id; cx.notify(); })
      .child(f.label).child(div().text_color(t.dim).child(String(n)));
  }

  row(t, i) {
    return h_flex().id(i.key).w_full().px(14).py(9).gap(10).items_start().border_b(1).border_color(t.border)
      .cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => i.open())
      .child(div().w(62).flex_none().mt(1).py(2).rounded(4).bg(t.raised).text_color(t[i.tone] ?? t.muted)
        .text_size(10).font_semibold().text_center().child(i.badge))
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().gap(8).items_center()
          .child(div().flex_1().min_w(0).truncate().font_medium().child(i.title))
          .child(div().flex_none().text_size(11).text_color(t.dim).child(since(i.time))))
        .when(Boolean(i.body), (el) => el.child(div().text_size(12).text_color(t.muted).child(i.body))));
  }

  render() {
    const t = theme();
    const all = allItems();
    const shown = this.filter === ALL.id ? all : all.filter((i) => i.source === this.filter);
    const heading = (s) => div().px(14).pt(10).pb(4).text_size(11).font_medium().text_color(t.dim).child(s.label);
    const body = grouped(shown).flatMap((s) => [heading(s), ...s.items.map((i) => this.row(t, i))]);

    return v_flex().id("inbox").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background)
      .border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(v_flex().flex_none().px(14).pt(10).pb(8).gap(8).border_b(1).border_color(t.border)
        .child(h_flex().gap(8).items_center()
          .child(div().font_semibold().child("Inbox"))
          .child(div().text_size(11).text_color(t.dim).child(`${all.length} open`)))
        .child(h_flex().gap(4).flex_wrap().children([ALL, ...SOURCES].map((f) => this.chip(t, f, all)))))
      .child(v_flex().id("inbox-list").flex_1().min_h(0).overflow_y_scrollbar()
        .children(body)
        .when(body.length === 0, (el) => el.child(v_flex().p(24).gap(4).items_center()
          .child(div().text_color(t.muted).child("Nothing needs you"))
          .child(div().text_size(11.5).text_color(t.dim).child("Agents update live")))));
  }
}
