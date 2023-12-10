// Based on https://stackoverflow.com/a/31976060
const forbiddenPattern =
  /[<>:"/\\|?*]|[\x00-\x1F]|^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..+)?$|[ .]$/i;
export function isValidFilename(name: string): boolean {
  return !forbiddenPattern.test(name);
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/(?<! ): /g, " - ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim();
}
