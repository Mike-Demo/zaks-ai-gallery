export function SourceBadges({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="sources" aria-label="Sources">
      {sources.map((s) => (
        <span key={s} className="source-badge">
          {s}
        </span>
      ))}
    </div>
  );
}
