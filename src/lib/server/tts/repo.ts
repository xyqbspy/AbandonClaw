import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ttsStorageBucket = process.env.TTS_STORAGE_BUCKET?.trim() || "tts-audio";
const signedUrlTtlSeconds = 60 * 60;
let ensureBucketPromise: Promise<void> | null = null;

const ensureTtsStorageBucket = async () => {
  if (ensureBucketPromise) return ensureBucketPromise;

  ensureBucketPromise = (async () => {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage.listBuckets();
    if (error) {
      throw new Error(`Failed to list storage buckets: ${error.message}`);
    }

    const bucketExists = (data ?? []).some((bucket) => bucket.name === ttsStorageBucket);
    if (bucketExists) return;

    const { error: createError } = await admin.storage.createBucket(ttsStorageBucket, {
      public: false,
      fileSizeLimit: "20MB",
    });
    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  })().catch((error) => {
    ensureBucketPromise = null;
    throw error;
  });

  return ensureBucketPromise;
};

export async function createTtsStorageSignedUrl(storagePath: string) {
  await ensureTtsStorageBucket();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(ttsStorageBucket)
    .createSignedUrl(storagePath, signedUrlTtlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed audio url: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function getTtsStorageSignedUrlIfExists(storagePath: string) {
  try {
    return await createTtsStorageSignedUrl(storagePath);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (
      message.includes("not found") ||
      message.includes("object not found") ||
      message.includes("no such") ||
      message.includes("404")
    ) {
      return null;
    }
    throw error;
  }
}

export async function uploadTtsAudioToStorage(storagePath: string, buffer: Buffer, upsert = false) {
  await ensureTtsStorageBucket();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(ttsStorageBucket).upload(storagePath, buffer, {
    contentType: "audio/mpeg",
    upsert,
  });
  if (error && !(upsert === false && error.message.toLowerCase().includes("already exists"))) {
    throw new Error(`Failed to upload audio to storage: ${error.message}`);
  }
  return createTtsStorageSignedUrl(storagePath);
}

export async function listTtsStorageFiles(prefix: string) {
  await ensureTtsStorageBucket();
  const admin = createSupabaseAdminClient();
  const pageSize = 100;
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(ttsStorageBucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("not found") || message.includes("404")) {
        return files;
      }
      throw new Error(`Failed to list storage files: ${error.message}`);
    }

    const rows = data ?? [];
    for (const row of rows) {
      if (row.id) {
        files.push(`${prefix}/${row.name}`);
      }
    }

    if (rows.length < pageSize) {
      return files;
    }
    offset += rows.length;
  }
}

export async function removeTtsStorageFiles(filePaths: string[]) {
  if (filePaths.length === 0) return;

  await ensureTtsStorageBucket();
  const admin = createSupabaseAdminClient();
  const chunkSize = 100;

  for (let index = 0; index < filePaths.length; index += chunkSize) {
    const batch = filePaths.slice(index, index + chunkSize);
    const { error } = await admin.storage.from(ttsStorageBucket).remove(batch);
    if (error) {
      throw new Error(`Failed to delete scene audio from storage: ${error.message}`);
    }
  }
}
