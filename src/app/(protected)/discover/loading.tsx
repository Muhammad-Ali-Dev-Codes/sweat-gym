export default function DiscoverLoading() {
  return (
    <div className="space-y-6 font-[family-name:var(--font-geist-sans)] animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-full bg-muted" />
        <div className="h-4 w-56 rounded-full bg-muted" />
      </div>
      <div className="h-12 w-full rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
