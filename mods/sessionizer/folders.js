// The folders to pick from, as in ~/.dotfiles/tmux/scripts/tmux-sessionizer.sh:
// each root's direct subfolders (fd --max-depth 1), then a few fixed folders.

import { exec, home } from "herdr";

const ROOTS = [
  "dev",
  "Workspace",
  "work",
  "git",
  "git/roblox",
  "git/roblox/game-engine",
  "git/roblox/game-engine/master/.claude/worktrees",
];
const EXTRAS = [".dotfiles", ".dotclaude", ".ssh"];

// fd prints folders with a trailing slash; spaces() reports them without.
export const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

// A path for display: the home folder shown as ~.
export const pretty = (path) => {
  const h = home();
  return path === h ? "~" : path.startsWith(h + "/") ? "~" + path.slice(h.length) : path;
};

// Resolves with absolute folder paths, roots' subfolders first. Missing roots
// are skipped (fd reports them on stderr and still lists the rest).
export async function listFolders() {
  const h = home();
  const roots = ROOTS.map((r) => `${h}/${r}`);
  const r = await exec("fd", ["--max-depth", "1", "--type", "d", ".", ...roots]);
  if (r.code !== 0 && !r.stdout) throw new Error(r.stderr.trim() || `fd exited ${r.code}`);
  const found = r.stdout.split("\n").filter(Boolean).map(normalize);
  return [...new Set([...found, ...EXTRAS.map((e) => `${h}/${e}`)])];
}
