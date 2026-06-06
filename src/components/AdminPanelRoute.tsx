import { createRoute } from "@tanstack/react-router";
import { AdminPanel } from "./AdminPanel";

export const adminv3Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adminv3",
  component: () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <AdminPanel onClose={() => window.history.back()} />
      </div>
    );
  },
});