import { redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { listPublicTrialSceneItems } from "@/lib/server/scene/service";
import { TrialSceneListClient } from "@/features/anonymous-trial/components/trial-scene-list-client";

export default async function TrialPage() {
  if (!isAnonymousTrialEnabled()) {
    redirect("/login?redirect=/trial");
  }

  const scenes = await listPublicTrialSceneItems();

  return (
    <TrialSceneListClient
      initialScenes={scenes}
      registerHref="/signup?from=trial"
    />
  );
}
