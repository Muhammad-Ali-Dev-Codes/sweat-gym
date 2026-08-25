export default function ReportsLoading() {
  return (
    <div className="space-y-6 font-[family-name:var(--font-geist-sans)] animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-full bg-muted" />
        <div className="h-4 w-72 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
