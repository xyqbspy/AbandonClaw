import { redirect } from "next/navigation";

export default async function LegacyLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/scene/${id}`);
}
