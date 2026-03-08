import { notFound } from "next/navigation";
import { LessonReader } from "@/features/lesson/components/lesson-reader";
import { getSceneBySlug } from "@/lib/data/mock-lessons";

export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scene = getSceneBySlug(id);

  if (!scene) return notFound();

  return <LessonReader lesson={scene} />;
}
