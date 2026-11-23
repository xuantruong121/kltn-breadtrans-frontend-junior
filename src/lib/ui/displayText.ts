/**
 * Text a person reads in a source file: its string literals and its JSX text,
 * with their line numbers. Source guards (uiConsistency.test.ts, the landing's
 * content.test.ts) check words here, so code names such as `streakCount` are
 * not touched. It reads the source text, not the rendered page: a value built
 * at runtime from another module is not seen.
 *
 * No React and no I/O, so the tests run under the Node test runner.
 */
export type Shown = { line: number; value: string; jsx: boolean };

export function displayText(text: string): Shown[] {
  const out: Shown[] = [];
  const lineOf = (index: number) => text.slice(0, index).split("\n").length;
  const literal = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  for (const m of text.matchAll(literal))
    // A ${...} inside a template is code, not text.
    out.push({ line: lineOf(m.index!), value: m[0].slice(1, -1).replace(/\$\{[^}]*\}/g, " "), jsx: false });
  // A /* comment */ between two tags is not text; blank it but keep the line breaks.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const jsx = />([^<>{}=;]*[A-Za-zÀ-ỹ][^<>{}=;]*)</g;
  for (const m of code.matchAll(jsx)) out.push({ line: lineOf(m.index!), value: m[1], jsx: true });
  return out;
}
