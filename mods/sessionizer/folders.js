// Lists one place's folders (config.js): each root's direct subfolders, then
// each fixed folder. The same small sh script runs on this computer or, with
// `on`, on another machine through herdr-core, so ~ means that machine's home
// and nothing needs installing there. It uses fd (or Debian's fdfind) when the
// machine has it: fd skips hidden and .gitignored folders. Without fd it falls
// back to find, which skips hidden folders but doesn't read .gitignore.

import { exec } from "herdr";

// How long another machine gets to answer before it's reported as not answering.
const REMOTE_TIMEOUT_MS = 5000;

// Arguments: the roots, then "--", then the fixed folders. Prints "H <home>",
// then "D <folder>" per folder. Missing roots are skipped.
const SCRIPT = `
expand() { case $1 in "~") printf '%s' "$HOME" ;; "~/"*) printf '%s/%s' "$HOME" "\${1#"~/"}" ;; *) printf '%s' "$1" ;; esac; }
list() {
  if command -v fd >/dev/null 2>&1; then fd --max-depth 1 --type d . "$1"
  elif command -v fdfind >/dev/null 2>&1; then fdfind --max-depth 1 --type d . "$1"
  else find "$1" -mindepth 1 -maxdepth 1 -type d ! -name '.*'
  fi
}
printf 'H %s\\n' "$HOME"
fixed=
for a in "$@"; do
  if [ "$a" = -- ]; then fixed=1; continue; fi
  p=$(expand "$a")
  if [ -n "$fixed" ]; then printf 'D %s\\n' "$p"
  elif [ -d "$p" ]; then list "$p" | sed 's|^|D |'
  fi
done
`;

// fd prints folders with a trailing slash; spaces() reports them without.
export const normalize = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

// A folder: { machine (null: this computer), path (absolute there), home (there) }.
// Its display text, the home folder shown as ~ and another machine's name first.
export function pretty(folder) {
  const { machine, path, home } = folder;
  const p = path === home ? "~" : path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
  return machine ? `${machine}:${p}` : p;
}

// Resolves with one place's folders, roots' subfolders first. Rejects when
// the machine can't be reached or doesn't answer in time, or the script fails.
export async function listFolders({ machine, roots, folders }) {
  const options = machine ? { on: machine, timeout: REMOTE_TIMEOUT_MS } : {};
  const r = await exec("sh", ["-c", SCRIPT, "sh", ...roots, "--", ...folders], options);
  const lines = r.stdout.split("\n");
  const homeLine = lines.find((l) => l.startsWith("H "));
  if (!homeLine) throw new Error(r.stderr.trim() || `listing exited ${r.code}`);
  const home = normalize(homeLine.slice(2));
  const paths = lines.filter((l) => l.startsWith("D ")).map((l) => normalize(l.slice(2)));
  return [...new Set(paths)].map((path) => ({ machine, path, home }));
}
