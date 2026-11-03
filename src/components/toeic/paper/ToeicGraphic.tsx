import { parseListeningGraphic } from "@/lib/toeic/examPaper";

/** The small table a Part 3 or 4 question reads alongside the audio. */
export function ToeicGraphic({ text }: { text: string }) {
  const { title, rows } = parseListeningGraphic(text);
  return (
    <figure className="max-w-xl rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900">
      {title && (
        <figcaption className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</figcaption>
      )}
      <table className="w-full text-[15px] text-slate-800 dark:text-slate-100">
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200 dark:border-slate-700">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-1.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
