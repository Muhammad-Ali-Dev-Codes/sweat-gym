export default function DashboardLoading() {
  return (
    <div className="space-y-6 font-[family-name:var(--font-geist-sans)] animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-full bg-muted" />
        <div className="h-3 w-64 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
      <div className="h-48 rounded-2xl bg-muted" />
    </div>
  );
}
