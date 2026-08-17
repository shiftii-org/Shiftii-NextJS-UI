import { DashboardRoute } from "@/app/components/DashboardRoute";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return <DashboardRoute view="overview" />;
}
