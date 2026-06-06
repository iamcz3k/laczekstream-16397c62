import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/adminv3")({
  component: AdminV3Page,
});

function AdminV3Page() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      <AdminPanel onClose={() => navigate({ to: "/" })} />
    </div>
  );
}