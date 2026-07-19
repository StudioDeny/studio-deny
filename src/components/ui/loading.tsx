import { Loader2 } from "lucide-react";

export function Loading({ className = "min-h-[40vh]" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="size-6 animate-spin text-foreground" strokeWidth={1.75} />
    </div>
  );
}
