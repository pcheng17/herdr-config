// What a blocked agent is asking, from its screen text (`hc read <t>`).
// Built for Claude Code's prompts: the dialog sits below the last solid rule,
// starts with what it's about ("Create file", "Bash command") and its target,
// and ends with a question and numbered options. Diff and file previews sit
// between dashed rules and are skipped.
//
//   Create file · ../notes.txt · Do you want to create notes.txt?

const SOLID_RULE = /─{10,}/;
const DASHED_RULE = /╌{10,}/;
const OPTIONS = /^(❯\s*)?1\.\s/;
const FOOTER = /^Esc to cancel/;
const BOX = /[│─╭╮╰╯┌┐└┘├┤┬┴┼═║▔▁▏▕╌]/g;
const HEAD_LINES = 2;
const FALLBACK_LINES = 12;
const MAX_CHARS = 240;

const clean = (line) => line.replace(BOX, " ").replace(/\s+/g, " ").trim();
const meaningful = (line) => /[\p{L}\p{N}]/u.test(line);

// The prompt's lines: below the last solid rule, above its options, outside previews.
function dialogLines(text) {
  const raw = text.split("\n");
  const rule = raw.findLastIndex((l) => SOLID_RULE.test(l));
  const below = rule >= 0 ? raw.slice(rule + 1) : raw.slice(-FALLBACK_LINES);
  const lines = [];
  let inPreview = false;
  for (const line of below) {
    if (DASHED_RULE.test(line)) { inPreview = !inPreview; continue; }
    const c = clean(line);
    if (OPTIONS.test(c) || FOOTER.test(c)) break;
    if (!inPreview && meaningful(c)) lines.push(c);
  }
  return lines;
}

export function promptSnippet(text) {
  const lines = dialogLines(text ?? "");
  if (lines.length === 0) return null;
  const question = lines[lines.findLastIndex((l) => l.endsWith("?"))];
  const parts = [...new Set([...lines.slice(0, HEAD_LINES), ...(question ? [question] : [])])];
  return parts.join(" · ").slice(0, MAX_CHARS);
}
