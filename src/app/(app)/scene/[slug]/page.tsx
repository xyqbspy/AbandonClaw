import { notFound } from "next/navigation";
import { requireCurrentProfile } from "@/lib/server/auth";
import { getSceneBySlug } from "@/lib/server/scene/service";
import SceneDetailClientPage from "./scene-detail-page";

export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user } = await requireCurrentProfile();
  const { slug } = await params;
  const scene = await getSceneBySlug({ slug, userId: user.id });

  if (!scene) {
    notFound();
  }

  return <SceneDetailClientPage initialLesson={scene} />;
}
