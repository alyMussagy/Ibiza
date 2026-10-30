import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"article">) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-border bg-card",
        className,
      )}
      {...props}
    />
  );
}
