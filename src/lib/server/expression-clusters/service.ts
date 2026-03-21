import { ValidationError } from "@/lib/server/errors";
import {
  UserExpressionClusterMemberRole,
  UserExpressionClusterMemberRow,
  UserExpressionClusterRow,
} from "@/lib/server/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getClusterById(userId: string, clusterId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
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
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_expression_cluster_members")
    .select("*")
    .eq("cluster_id", clusterId);

  if (error) {
    throw new Error(`Failed to read expression cluster members: ${error.message}`);
  }
  return (data ?? []) as UserExpressionClusterMemberRow[];
}

async function createSingletonCluster(params: {
  userId: string;
  userPhraseId: string;
  title?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data: clusterRow, error: clusterError } = await admin
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

  const { error: memberError } = await admin
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

async function writeClusterRoles(params: {
  clusterId: string;
  mainUserPhraseId: string;
  userPhraseIds: string[];
}) {
  const admin = createSupabaseAdminClient();
  const membershipPayload = params.userPhraseIds.map((userPhraseId) => ({
    cluster_id: params.clusterId,
    user_phrase_id: userPhraseId,
    role: (userPhraseId === params.mainUserPhraseId ? "main" : "variant") satisfies UserExpressionClusterMemberRole,
  }));

  const { error: membershipError } = await admin
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

  const admin = createSupabaseAdminClient();
  const { error } = await admin
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

  const requestedMainId = params.mainUserPhraseId?.trim() || "";
  const nextMainId =
    (requestedMainId && mergedMemberIds.includes(requestedMainId) ? requestedMainId : "") ||
    targetCluster.main_user_phrase_id ||
    sourceCluster.main_user_phrase_id ||
    mergedMemberIds[0];

  await writeClusterRoles({
    clusterId: targetCluster.id,
    mainUserPhraseId: nextMainId,
    userPhraseIds: mergedMemberIds,
  });

  const admin = createSupabaseAdminClient();
  const { error: updateTargetError } = await admin
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: nextMainId } as never)
    .eq("id", targetCluster.id)
    .eq("user_id", params.userId);
  if (updateTargetError) {
    throw new Error(`Failed to update merged target cluster: ${updateTargetError.message}`);
  }

  const { error: deleteSourceError } = await admin
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
  const requestedNextMainId = params.nextMainUserPhraseId?.trim() || "";
  const nextMainId =
    (requestedNextMainId && remainingMemberIds.includes(requestedNextMainId) ? requestedNextMainId : "") ||
    remainingMemberIds[0];

  await writeClusterRoles({
    clusterId: cluster.id,
    mainUserPhraseId: nextMainId,
    userPhraseIds: remainingMemberIds,
  });

  const admin = createSupabaseAdminClient();
  const { error: updateClusterError } = await admin
    .from("user_expression_clusters")
    .update({ main_user_phrase_id: nextMainId } as never)
    .eq("id", cluster.id)
    .eq("user_id", params.userId);
  if (updateClusterError) {
    throw new Error(`Failed to update cluster after detach: ${updateClusterError.message}`);
  }

  const { error: deleteMemberError } = await admin
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
