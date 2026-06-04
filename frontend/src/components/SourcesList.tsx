import type { Source } from "../types";

export function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sources</p>
      <ul className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors max-w-xs truncate"
              title={s.name}
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
