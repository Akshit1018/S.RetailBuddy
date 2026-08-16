import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bills")({
  component: BillsLayout,
});

function BillsLayout() {
  return <Outlet />;
}
