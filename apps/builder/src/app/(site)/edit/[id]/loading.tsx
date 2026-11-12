export default function Loading() {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-busy="true" aria-label="Loading editor">
      <div className="h-14 border-b border-rule bg-panel" />
      <div className="flex flex-1">
        <div className="grid w-full content-start gap-3 border-r border-rule p-3 lg:w-[440px]">
          <div className="skeleton h-10" />
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
        <div className="skeleton m-4 hidden flex-1 lg:block" />
      </div>
    </div>
  );
}
