export default function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-base-300"></div>
      </div>

      {/* Message content skeleton */}
      <div className="flex flex-col max-w-[75%] gap-2">
        <div className="bg-base-300 rounded-lg px-4 py-3 space-y-2">
          <div className="h-4 bg-base-200 rounded w-3/4"></div>
          <div className="h-4 bg-base-200 rounded w-full"></div>
          <div className="h-4 bg-base-200 rounded w-5/6"></div>
        </div>
        <div className="h-3 bg-base-300 rounded w-20"></div>
      </div>
    </div>
  );
}
