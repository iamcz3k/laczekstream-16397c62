import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/adminczek")({
  head: () => ({
    meta: [
      { title: "Admin Panel — LaCzek Stream" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "theme-color", content: "#ff8a3d" },
      { name: "apple-mobile-web-app-title", content: "LaCzek Admin" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [{ rel: "manifest", href: "/admin-manifest.json" }],
  }),
  component: AdminV3Page,
});

function AdminV3Page() {
  return <AdminPanel onClose={() => window.history.back()} />;
}
