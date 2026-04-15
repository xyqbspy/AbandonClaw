import { ValidationError } from "@/lib/server/errors";
import {
  UserExpressionClusterMemberRole,
  UserExpressionClusterMemberRow,
  UserExpressionClusterRow,
} from "@/lib/server/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveMergedClusterMainUserPhraseId,
  resolveMoveExpressionClusterAction,
  resolveRemainingClusterMainUserPhraseId,
  resolveTargetClusterMainUserPhraseId,
} from "./logic";

async function createUserScopedExpressionClusterClient() {
  return createSupabaseServerClient();
}

async function getClusterById(userId: string, clusterId: string) {
  const client = await createUserScopedExpressionClusterClient();
  const { data, error } = await client
    .from("user_expression_clusters")
    .select("*")
    .eq("id", clusterId)
    .eq("user_id", userId)
    .maybeSingle<UserExpressionClusterRow>();

  if (error) {
    throw new Error(`Failed to read expression cluster: ${error.message}`);
  }
  if (!data) {
    throw new ValidationError("Expression cluster not found.");
  }
  return data;
}

async function getClusterMembers(clusterId: string) {
  const client = await createUserScopedExpressionClusterClient();
  const { data, error } = await client
    .from("user_expression_cluster_members")
    .select("*")
    .eq("cluster_id", clusterId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read expression cluster members: ${error.message}`);
  }
  return (data ?? []) as UserExpressionClusterMemberRow[];
}

async function getPhraseClusterMembership(params: {
  userId: string;
  userPhraseId: string;
}) {
  const client = await createUserScopedExpressionClusterClient();
  const { data, error } = await client
    .from("user_expression_cluster_members")
    .select("cluster_id,user_phrase_id,role, cluster:user_expression_clusters!inner(id,user_id,main_user_phrase_id)")
    .eq("user_phrase_id", params.userPhraseId)
    .maybeSingle<{
      cluster_id: string;
      user_phrase_id: string;
      role: UserExpressionClusterMemberRole;
      cluster:
        | {
            id: string;
            user_id: string;
            main_user_phrase_id: string | null;
          }
        | Array<{
            id: string;
            user_id: string;
            main_user_phrase_id: string | null;
          }>
        | null;
    }>();

  if (error) {
    throw new Error(`Failed to read expression cluster membership: ${error.message}`);
  }

  const cluster = Array.isArray(data?.cluster) ? (data?.cluster[0] ?? null) : (data?.cluster ?? null);
  if (!data || !cluster || cluster.user_id !== params.userId) {
    return null;
  }

  return {
    clusterId: data.cluster_id,
    role: data.role,
    mainUserPhraseId: cluster.main_user_phrase_id,
  };
}

async function assertOwnedExpressionPhrase(params: {
  userId: string;
  userPhraseId: string;
}) {
  const client = await createUserScopedExpressionClusterClient();
  const { data, error } = await client
    .from("user_phrases")
    .select("id,learning_item_type")
    .eq("id", params.userPhraseId)
    .eq("user_id", params.userId)
    .maybeSingle<{ id: string; learning_item_type: "expression" | "sentence" | null }>();

  if (error) {
    throw new Error(`Failed to verify expression ownership: ${error.message}`);
  }
  if (!data) {
    throw new ValidationError("Expression not found.");
  }
  if (data.learning_item_type === "sentence") {
    throw new ValidationError("Only expression items can be moved between expression clusters.");
  }
}

async function createSingletonCluster(params: {
  userId: string;
  userPhraseId: string;
  title?: string | null;
}) {
  const client = await createUserScopedExpressionClusterClient();
  const { data: clusterRow, error: clusterError } = await client
    .from("user_expression_clusters")
    .insert({
      user_id: params.userId,
      main_user_phrase_id: params.userPhraseId,
      title: params.title ?? null,
    } as never)
    .select("*")
    .single<UserExpressionClusterRow>();
  if (clusterError || !clusterRow) {
    throw new Error(`Failed to create singleton expression cluster: ${clusterError?.message ?? "unknown error"}`);
  }

  const { error: memberError } = await client
    .from("user_expression_cluster_members")
    .insert({
      cluster_id: clusterRow.id,
      user_phrase_id: params.userPhraseId,
      role: "main",
    } as never);
  if (memberError) {
    throw new Error(`Failed to create singleton expression cluster member: ${memberError.message}`);
  }

  return clusterRow;
}

export async function ensureExpressionClusterForPhrase(params: {
  userId: string;
  userPhraseId: string;
  title?: string | null;
}) {
  await assertOwnedExpressionPhrase({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
  });

  const existingMembership = await getPhraseClusterMembership({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
  });
  if (existingMembership?.clusterId) {
    return {
      clusterId: existingMembership.clusterId,
      mainUserPhraseId: existingMembership.mainUserPhraseId ?? params.userPhraseId,
      created: false,
    };
  }

  const singleton = await createSingletonCluster({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
    title: params.title ?? null,
  });

  return {
    clusterId: singleton.id,
    mainUserPhraseId: singleton.main_user_phrase_id ?? params.userPhraseId,
    created: true,
  };
}

async function writeClusterRoles(params: {
  clusterId: string;
  mainUserPhraseId: string;
  userPhraseIds: string[];
}) {
  const client = await createUserScopedExpressionClusterClient();
  const membershipPayload = params.userPhraseIds.map((userPhraseId) => ({
    cluster_id: params.clusterId,
    user_phrase_id: userPhraseId,
    role: (userPhraseId === params.mainUserPhraseId ? "main" : "variant") satisfies UserExpressionClusterMemberRole,
  }));

  const { error: membershipError } = await client
    .from("user_expression_cluster_members")
    .upsert(membershipPayload as never, { onConflict: "user_phrase_id" });
  if (membershipError) {
    throw new Error(`Failed to update expression cluster members: ${membershipError.message}`);
  }
}

export async function setExpressionClusterMain(params: {
  userId: string;
  clusterId: string;
  mainUserPhraseId: string;
}) {
  const cluster = await getClusterById(params.userId, params.clusterId);
  const members = await getClusterMembers(cluster.id);
  if (!members.some((member) => member.user_phrase_id === params.mainUserPhraseId)) {
    throw new ValidationError("Main expression must already belong to the cluster.");
  }

  await writeClusterRoles({
    clusterId: cluster.id,
    mainUserPhraseId: params.mainUserPhraseId,
    userPhraseIds: members.map((member) => member.user_phrase_id),
  });

  const client = await createUserScopedExpressionClusterClient();
  const { error } = await client
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: params.mainUserPhraseId } as never)
    .eq("id", cluster.id)
    .eq("user_id", params.userId);
  if (error) {
    throw new Error(`Failed to update expression cluster main: ${error.message}`);
  }

  return {
    clusterId: cluster.id,
    mainUserPhraseId: params.mainUserPhraseId,
    memberCount: members.length,
  };
}

export async function mergeExpressionClusters(params: {
  userId: string;
  targetClusterId: string;
  sourceClusterId: string;
  mainUserPhraseId?: string;
}) {
  if (params.targetClusterId === params.sourceClusterId) {
    throw new ValidationError("Target cluster and source cluster must be different.");
  }

  const [targetCluster, sourceCluster] = await Promise.all([
    getClusterById(params.userId, params.targetClusterId),
    getClusterById(params.userId, params.sourceClusterId),
  ]);
  const [targetMembers, sourceMembers] = await Promise.all([
    getClusterMembers(targetCluster.id),
    getClusterMembers(sourceCluster.id),
  ]);

  const mergedMemberIds = Array.from(
    new Set(
      [...targetMembers, ...sourceMembers]
        .map((member) => member.user_phrase_id)
        .filter(Boolean),
    ),
  );
  if (mergedMemberIds.length === 0) {
    throw new ValidationError("Cannot merge empty expression clusters.");
  }

  const nextMainId = resolveMergedClusterMainUserPhraseId({
    mergedMemberIds,
    requestedMainUserPhraseId: params.mainUserPhraseId,
    targetClusterMainUserPhraseId: targetCluster.main_user_phrase_id,
    sourceClusterMainUserPhraseId: sourceCluster.main_user_phrase_id,
  });

  await writeClusterRoles({
    clusterId: targetCluster.id,
    mainUserPhraseId: nextMainId,
    userPhraseIds: mergedMemberIds,
  });

  const client = await createUserScopedExpressionClusterClient();
  const { error: updateTargetError } = await client
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: nextMainId } as never)
    .eq("id", targetCluster.id)
    .eq("user_id", params.userId);
  if (updateTargetError) {
    throw new Error(`Failed to update merged target cluster: ${updateTargetError.message}`);
  }

  const { error: deleteSourceError } = await client
    .from("user_expression_clusters")
    .delete()
    .eq("id", sourceCluster.id)
    .eq("user_id", params.userId);
  if (deleteSourceError) {
    throw new Error(`Failed to delete merged source cluster: ${deleteSourceError.message}`);
  }

  return {
    clusterId: targetCluster.id,
    mergedClusterId: sourceCluster.id,
    mainUserPhraseId: nextMainId,
    memberCount: mergedMemberIds.length,
  };
}

export async function detachExpressionClusterMember(params: {
  userId: string;
  clusterId: string;
  userPhraseId: string;
  nextMainUserPhraseId?: string;
  createNewCluster?: boolean;
}) {
  const cluster = await getClusterById(params.userId, params.clusterId);
  const members = await getClusterMembers(cluster.id);
  const targetMember = members.find((member) => member.user_phrase_id === params.userPhraseId);
  if (!targetMember) {
    throw new ValidationError("Expression is not in the cluster.");
  }
  if (members.length <= 1) {
    throw new ValidationError("Cannot detach the only expression in a cluster.");
  }

  const remainingMemberIds = members
    .map((member) => member.user_phrase_id)
    .filter((userPhraseId) => userPhraseId !== params.userPhraseId);
  const nextMainId = resolveRemainingClusterMainUserPhraseId({
    remainingMemberIds,
    requestedMainUserPhraseId: params.nextMainUserPhraseId,
  });

  await writeClusterRoles({
    clusterId: cluster.id,
    mainUserPhraseId: nextMainId,
    userPhraseIds: remainingMemberIds,
  });

  const client = await createUserScopedExpressionClusterClient();
  const { error: updateClusterError } = await client
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: nextMainId } as never)
    .eq("id", cluster.id)
    .eq("user_id", params.userId);
  if (updateClusterError) {
    throw new Error(`Failed to update cluster after detach: ${updateClusterError.message}`);
  }

  const { error: deleteMemberError } = await client
    .from("user_expression_cluster_members")
    .delete()
    .eq("cluster_id", cluster.id)
    .eq("user_phrase_id", params.userPhraseId);
  if (deleteMemberError) {
    throw new Error(`Failed to detach cluster member: ${deleteMemberError.message}`);
  }

  let newClusterId: string | null = null;
  if (params.createNewCluster !== false) {
    const singleton = await createSingletonCluster({
      userId: params.userId,
      userPhraseId: params.userPhraseId,
    });
    newClusterId = singleton.id;
  }

  return {
    clusterId: cluster.id,
    detachedUserPhraseId: params.userPhraseId,
    nextMainUserPhraseId: nextMainId,
    newClusterId,
    memberCount: remainingMemberIds.length,
  };
}

export async function moveExpressionClusterMember(params: {
  userId: string;
  targetClusterId: string;
  userPhraseId: string;
  targetMainUserPhraseId?: string;
}) {
  const targetCluster = await getClusterById(params.userId, params.targetClusterId);
  const sourceMembership = await getPhraseClusterMembership({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
  });

  if (sourceMembership?.clusterId === targetCluster.id) {
    throw new ValidationError("Expression already belongs to the target cluster.");
  }

  await assertOwnedExpressionPhrase({
    userId: params.userId,
    userPhraseId: params.userPhraseId,
  });

  const targetMembers = await getClusterMembers(targetCluster.id);
  const targetMemberIds = targetMembers.map((member) => member.user_phrase_id);
  const targetMainUserPhraseId = resolveTargetClusterMainUserPhraseId({
    targetMemberIds,
    requestedMainUserPhraseId: params.targetMainUserPhraseId,
    targetClusterMainUserPhraseId: targetCluster.main_user_phrase_id,
    movedUserPhraseId: params.userPhraseId,
  });

  if (sourceMembership?.role === "main" && sourceMembership.clusterId) {
    const merged = await mergeExpressionClusters({
      userId: params.userId,
      targetClusterId: targetCluster.id,
      sourceClusterId: sourceMembership.clusterId,
      mainUserPhraseId: targetMainUserPhraseId,
    });

    return {
      ...merged,
      movedUserPhraseId: params.userPhraseId,
      action: "merged_cluster" as const,
    };
  }

  if (sourceMembership?.clusterId) {
    const sourceCluster = await getClusterById(params.userId, sourceMembership.clusterId);
    const sourceMembers = await getClusterMembers(sourceCluster.id);
    const remainingMemberIds = sourceMembers
      .map((member) => member.user_phrase_id)
      .filter((userPhraseId) => userPhraseId !== params.userPhraseId);

    if (remainingMemberIds.length === 0) {
      const client = await createUserScopedExpressionClusterClient();
      const { error: deleteSourceError } = await client
        .from("user_expression_clusters")
        .delete()
        .eq("id", sourceCluster.id)
        .eq("user_id", params.userId);
      if (deleteSourceError) {
        throw new Error(`Failed to delete emptied source cluster: ${deleteSourceError.message}`);
      }
    } else {
      const nextSourceMainId = resolveRemainingClusterMainUserPhraseId({
        remainingMemberIds,
        currentMainUserPhraseId: sourceCluster.main_user_phrase_id,
      });

      await writeClusterRoles({
        clusterId: sourceCluster.id,
        mainUserPhraseId: nextSourceMainId,
        userPhraseIds: remainingMemberIds,
      });

      const client = await createUserScopedExpressionClusterClient();
      const { error: updateSourceError } = await client
        .from("user_expression_clusters")
        .update({ main_user_phrase_id: nextSourceMainId } as never)
        .eq("id", sourceCluster.id)
        .eq("user_id", params.userId);
      if (updateSourceError) {
        throw new Error(`Failed to update source cluster after move: ${updateSourceError.message}`);
      }
    }
  }

  const nextTargetMemberIds = Array.from(new Set([...targetMemberIds, params.userPhraseId]));
  await writeClusterRoles({
    clusterId: targetCluster.id,
    mainUserPhraseId: targetMainUserPhraseId,
    userPhraseIds: nextTargetMemberIds,
  });

  const client = await createUserScopedExpressionClusterClient();
  const { error: updateTargetError } = await client
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: targetMainUserPhraseId } as never)
    .eq("id", targetCluster.id)
    .eq("user_id", params.userId);
  if (updateTargetError) {
    throw new Error(`Failed to update target cluster after move: ${updateTargetError.message}`);
  }

  return {
    clusterId: targetCluster.id,
    movedUserPhraseId: params.userPhraseId,
    sourceClusterId: sourceMembership?.clusterId ?? null,
    mainUserPhraseId: targetMainUserPhraseId,
    memberCount: nextTargetMemberIds.length,
    action: resolveMoveExpressionClusterAction({
      sourceClusterId: sourceMembership?.clusterId,
      sourceRole: sourceMembership?.role,
    }),
  };
}
