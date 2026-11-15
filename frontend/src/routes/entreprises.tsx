import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/entreprises")({
  component: Layout,
});
function Layout() {
  return <Outlet />;
}
