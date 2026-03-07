import { notFound } from "next/navigation";
import { getLessonBySlug } from "@/lib/data/mock-lessons";
import { LessonReader } from "@/features/lesson/components/lesson-reader";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = getLessonBySlug(id);

  if (!lesson) return notFound();

  return <LessonReader lesson={lesson} />;
}
