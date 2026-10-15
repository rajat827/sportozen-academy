/** Keep ordinary words intact; only split a token wider than a fresh line. */
export function wrapFinanceDocumentText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const paragraphs = text
    .replaceAll(/[\u0000-\u0008\u000B-\u001F]/g, "")
    .split("\n");
  const lines: string[] = [];
  for (let index = 0; index < paragraphs.length; index++) {
    let current = "";
    for (const word of paragraphs[index].trim().split(/\s+/).filter(Boolean)) {
      if (current && measure(`${current} ${word}`) <= maxWidth) {
        current += ` ${word}`;
        continue;
      }
      if (current) {
        lines.push(current);
        current = "";
      }
      if (measure(word) <= maxWidth) {
        current = word;
        continue;
      }
      for (const character of word) {
        if (current && measure(current + character) > maxWidth) {
          lines.push(current);
          current = character;
        } else current += character;
      }
    }
    // Explicit blank paragraphs advance the document; a trailing newline does not.
    if (current || index < paragraphs.length - 1) lines.push(current);
  }
  return lines;
}
