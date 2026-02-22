export function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="h-8 bg-surface-light rounded-xl animate-pulse w-3/4" />
        <div className="h-4 bg-surface-light rounded-xl animate-pulse w-1/2" />
        <div className="h-32 bg-surface-light rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
