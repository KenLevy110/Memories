/**
 * Minimal KEY=value parser for repo-root dotenv files (no multiline values).
 */
export function parseDotenvKey(fileContent: string, key: string): string | null {
  const needle = `${key}=`;
  const text = fileContent.startsWith("\ufeff") ? fileContent.slice(1) : fileContent;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const unexported = line.startsWith("export ") ? line.slice(7).trim() : line;
    if (!unexported.startsWith(needle)) {
      continue;
    }
    let value = unexported.slice(needle.length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.length > 0 ? value : null;
  }
  return null;
}

export function readMemoriesEnvProfileFromEnvContent(content: string): "dashboard" | "standalone" {
  const raw = parseDotenvKey(content, "MEMORIES_ENV_PROFILE")?.trim().toLowerCase() ?? "";
  return raw === "standalone" ? "standalone" : "dashboard";
}

export function extractVitePrefixedKeys(fileContent: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = fileContent.startsWith("\ufeff") ? fileContent.slice(1) : fileContent;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const unexported = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = unexported.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = unexported.slice(0, eq).trim();
    if (!key.startsWith("VITE_")) {
      continue;
    }
    let value = unexported.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}
