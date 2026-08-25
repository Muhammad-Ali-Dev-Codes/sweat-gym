export default function ProtectedLoading() {
  return (
    <div className="space-y-6 font-[family-name:var(--font-geist-sans)] animate-pulse">
      <div className="h-10 w-48 rounded-full bg-muted" />
      <div className="h-4 w-72 rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
