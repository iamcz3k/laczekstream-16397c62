export function EmptyState({
  message,
  className = "py-20",
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={`col-span-full text-center text-muted-foreground ${className}`}>{message}</p>
  );
}
