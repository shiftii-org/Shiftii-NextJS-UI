import { DashboardRoute } from "@/app/components/DashboardRoute";

export const dynamic = "force-dynamic";

export default function RequestsPage() {
  return <DashboardRoute view="requests" />;
}
