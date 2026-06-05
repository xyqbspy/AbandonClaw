import { redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";
import { ANONYMOUS_TRIAL_SCENE_SLUGS } from "@/lib/server/scene/service";

const DEFAULT_TRIAL_SCENE_SLUG =
  ANONYMOUS_TRIAL_SCENE_SLUGS[0] ?? "canceling-plans-politely";

export default function TrialPage() {
  if (!isAnonymousTrialEnabled()) {
    redirect("/login?redirect=/trial");
  }

  redirect(`/share/scene/${encodeURIComponent(DEFAULT_TRIAL_SCENE_SLUG)}`);
}
