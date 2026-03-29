import { requireCurrentProfile } from "@/lib/server/auth";
import SceneDetailClientPage from "./scene-detail-page";

export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireCurrentProfile();
  await params;
  return <SceneDetailClientPage />;
}
