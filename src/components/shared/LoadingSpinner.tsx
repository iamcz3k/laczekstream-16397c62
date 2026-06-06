import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className = "py-20" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
