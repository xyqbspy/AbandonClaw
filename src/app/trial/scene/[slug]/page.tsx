import { redirect } from "next/navigation";
import { isAnonymousTrialEnabled } from "@/lib/server/anonymous/env-gate";

export default async function TrialScenePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isAnonymousTrialEnabled()) {
    redirect(`/login?redirect=/trial/scene/${encodeURIComponent(slug)}`);
  }

  redirect(`/share/scene/${encodeURIComponent(slug)}`);
}
