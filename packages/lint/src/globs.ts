import { readdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const MAGIC = /[*?[\]]/;

function slash(path: string): string {
  return path.split(sep).join("/");
}

function globRegex(pattern: string): RegExp {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        expression += "(?:.*/)?";
      } else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else if (character === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end < 0) expression += "\\[";
      else {
        const body = pattern.slice(index + 1, end).replace(/^!/, "^");
        expression += `[${body}]`;
        index = end;
      }
    } else expression += character.replace(/[\\^$+?.()|{}]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}

async function walk(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

export async function expandPatterns(patterns: readonly string[], cwd = process.cwd()): Promise<string[]> {
  const expanded = new Set<string>();
  for (const pattern of patterns) {
    if (!MAGIC.test(pattern)) {
      expanded.add(pattern);
      continue;
    }
    const normalized = slash(pattern);
    const magicIndex = normalized.search(MAGIC);
    const slashIndex = normalized.lastIndexOf("/", magicIndex);
    const baseText = slashIndex < 0 ? "." : normalized.slice(0, slashIndex) || "/";
    const base = resolve(cwd, baseText);
    const matcher = globRegex(normalized);
    let files: string[];
    try {
      files = await walk(base);
    } catch {
      files = [];
    }
    for (const file of files) {
      const candidate = isAbsolute(pattern) ? slash(file) : slash(relative(cwd, file));
      if (matcher.test(candidate)) expanded.add(isAbsolute(pattern) ? file : candidate);
    }
  }
  return [...expanded].sort((left, right) => left.localeCompare(right, "en"));
}
