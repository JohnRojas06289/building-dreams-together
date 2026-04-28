import { Wind } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-glow)]">
        <Wind className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="font-display text-xl font-semibold tracking-tight text-foreground">
          AgroSync
        </span>
      )}
    </div>
  );
}
