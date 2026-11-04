export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-3.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto max-w-[1500px] px-3 pt-24 md:px-6">
      <div className="slab p-6">
        <RowsSkeleton />
      </div>
    </div>
  )
}
