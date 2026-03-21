interface ApiErrorBody {
  error?: string;
}

const toApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.error === "string" && body.error.trim()) {
      return new Error(body.error);
    }
  } catch {
    // Ignore parse failure.
  }
  return new Error(fallback);
};

export async function setExpressionClusterMainFromApi(payload: {
  clusterId: string;
  mainUserPhraseId: string;
}) {
  const response = await fetch(`/api/expression-clusters/${payload.clusterId}/main`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mainUserPhraseId: payload.mainUserPhraseId,
    }),
  });
  if (!response.ok) {
    throw await toApiError(response, "设置主表达失败。");
  }
  return (await response.json()) as {
    clusterId: string;
    mainUserPhraseId: string;
    memberCount: number;
  };
}

export async function mergeExpressionClustersFromApi(payload: {
  targetClusterId: string;
  sourceClusterId: string;
  mainUserPhraseId?: string;
}) {
  const response = await fetch("/api/expression-clusters/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "合并表达簇失败。");
  }
  return (await response.json()) as {
    clusterId: string;
    mergedClusterId: string;
    mainUserPhraseId: string;
    memberCount: number;
  };
}

export async function detachExpressionClusterMemberFromApi(payload: {
  clusterId: string;
  userPhraseId: string;
  nextMainUserPhraseId?: string;
  createNewCluster?: boolean;
}) {
  const response = await fetch(
    `/api/expression-clusters/${payload.clusterId}/members/${payload.userPhraseId}/detach`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nextMainUserPhraseId: payload.nextMainUserPhraseId,
        createNewCluster: payload.createNewCluster,
      }),
    },
  );
  if (!response.ok) {
    throw await toApiError(response, "拆分表达簇失败。");
  }
  return (await response.json()) as {
    clusterId: string;
    detachedUserPhraseId: string;
    nextMainUserPhraseId: string;
    newClusterId: string | null;
    memberCount: number;
  };
}

export async function moveExpressionClusterMemberFromApi(payload: {
  targetClusterId: string;
  userPhraseId: string;
  targetMainUserPhraseId?: string;
}) {
  const response = await fetch("/api/expression-clusters/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await toApiError(response, "移入表达簇失败。");
  }
  return (await response.json()) as {
    clusterId: string;
    movedUserPhraseId: string;
    sourceClusterId?: string | null;
    mergedClusterId?: string;
    mainUserPhraseId: string;
    memberCount: number;
    action: "merged_cluster" | "moved_member" | "attached_member";
  };
}
