import clsx from "clsx";

// Brand mark. Size via text-* classes from the caller (e.g. "text-4xl").
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Cycles logo"
      className={clsx("leading-none select-none", className)}
    >
      💪
    </span>
  );
}
