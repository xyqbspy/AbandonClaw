import { notFound, redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { detectAnonymousSsrContext } from "@/lib/server/anonymous/ssr-response";
import { getPublicSceneBySlug } from "@/lib/server/scene/service";
import { AnonymousGuidanceState } from "@/features/anonymous-trial/components/anonymous-guidance-state";
import { ShareScenePreviewClient } from "@/features/anonymous-trial/components/share-scene-preview-client";

export default async function TrialScenePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isAnonymousTrialEnabled()) {
    redirect(`/login?redirect=/trial/scene/${encodeURIComponent(slug)}`);
  }

  const registerHref = `/signup?from=trial&scene=${encodeURIComponent(slug)}`;
  const { isSearchEngineBot } = await detectAnonymousSsrContext();
  if (isSearchEngineBot) {
    return <AnonymousGuidanceState page="chunks" registerHref={registerHref} />;
  }

  const lesson = await getPublicSceneBySlug(slug);
  if (!lesson) {
    notFound();
  }

  return (
    <ShareScenePreviewClient
      initialLesson={lesson}
      registerHref={registerHref}
      showPracticePreview
      backHref="/trial"
    />
  );
}
