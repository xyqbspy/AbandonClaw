import {
  PracticeSet,
  PracticeSetSessionState,
  SceneGeneratedState,
  VariantItemStatus,
  VariantSet,
} from "@/lib/types/learning-flow";

const STORAGE_KEY = "scene-learning-flow-v2";

type StoreShape = {
  practiceByScene: Record<string, PracticeSet[]>;
  variantByScene: Record<string, VariantSet[]>;
};

const EMPTY_STORE: StoreShape = {
  practiceByScene: {},
  variantByScene: {},
};

let cachedRaw: string | null = null;
let cachedStore: StoreShape = EMPTY_STORE;

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const parseStore = (raw: string): StoreShape => {
  try {
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      practiceByScene: parsed.practiceByScene ?? {},
      variantByScene: parsed.variantByScene ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
};

const getStore = (): StoreShape => {
  if (!canUseStorage()) return EMPTY_STORE;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(EMPTY_STORE);
  if (raw === cachedRaw) return cachedStore;
  cachedRaw = raw;
  cachedStore = parseStore(raw);
  return cachedStore;
};

const setStore = (store: StoreShape) => {
  if (!canUseStorage()) return;
  const raw = JSON.stringify(store);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedStore = store;
};

const getLatest = <T,>(items: T[] | undefined): T | null =>
  items && items.length > 0 ? items[0] : null;

export const getLatestPracticeSet = (sceneId: string): PracticeSet | null =>
  getLatest(getStore().practiceByScene[sceneId]);

export const getLatestVariantSet = (sceneId: string): VariantSet | null =>
  getLatest(getStore().variantByScene[sceneId]);

export const getSceneGeneratedState = (sceneId: string): SceneGeneratedState => {
  const latestPracticeSet = getLatestPracticeSet(sceneId);
  const latestVariantSet = getLatestVariantSet(sceneId);
  return {
    latestPracticeSet,
    latestVariantSet,
    practiceStatus: latestPracticeSet?.status ?? "idle",
    variantStatus: latestVariantSet?.status ?? "idle",
  };
};

export const savePracticeSet = (practiceSet: PracticeSet) => {
  const store = getStore();
  const items = store.practiceByScene[practiceSet.sourceSceneId] ?? [];
  const nextItems = [practiceSet, ...items.filter((item) => item.id !== practiceSet.id)];
  setStore({
    ...store,
    practiceByScene: {
      ...store.practiceByScene,
      [practiceSet.sourceSceneId]: nextItems,
    },
  });
};

export const updatePracticeSetSession = (
  sceneId: string,
  practiceSetId: string,
  sessionState: PracticeSetSessionState,
) => {
  const store = getStore();
  const items = store.practiceByScene[sceneId] ?? [];
  const nextItems = items.map((item) =>
    item.id === practiceSetId
      ? {
          ...item,
          sessionState,
        }
      : item,
  );
  setStore({
    ...store,
    practiceByScene: {
      ...store.practiceByScene,
      [sceneId]: nextItems,
    },
  });
};

export const saveVariantSet = (variantSet: VariantSet) => {
  const store = getStore();
  const items = store.variantByScene[variantSet.sourceSceneId] ?? [];
  const nextItems = [variantSet, ...items.filter((item) => item.id !== variantSet.id)];
  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [variantSet.sourceSceneId]: nextItems,
    },
  });
};

export const markPracticeSetCompleted = (sceneId: string, practiceSetId: string) => {
  const store = getStore();
  const items = store.practiceByScene[sceneId] ?? [];
  const now = new Date().toISOString();
  const nextItems = items.map((item) =>
    item.id === practiceSetId
      ? {
          ...item,
          status: "completed" as const,
          completedAt: now,
          sessionState: undefined,
        }
      : item,
  );
  setStore({
    ...store,
    practiceByScene: {
      ...store.practiceByScene,
      [sceneId]: nextItems,
    },
  });
};

export const deletePracticeSet = (sceneId: string, practiceSetId: string) => {
  const store = getStore();
  const items = store.practiceByScene[sceneId] ?? [];
  const nextItems = items.filter((item) => item.id !== practiceSetId);
  setStore({
    ...store,
    practiceByScene: {
      ...store.practiceByScene,
      [sceneId]: nextItems,
    },
  });
};

export const markVariantSetCompleted = (sceneId: string, variantSetId: string) => {
  const store = getStore();
  const items = store.variantByScene[sceneId] ?? [];
  const now = new Date().toISOString();
  const nextItems = items.map((item) =>
    item.id === variantSetId
      ? {
          ...item,
          status: "completed" as const,
          completedAt: now,
        }
      : item,
  );
  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [sceneId]: nextItems,
    },
  });
};

export const deleteVariantSet = (sceneId: string, variantSetId: string) => {
  const store = getStore();
  const items = store.variantByScene[sceneId] ?? [];
  const nextItems = items.filter((item) => item.id !== variantSetId);
  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [sceneId]: nextItems,
    },
  });
};

export const deleteAllVariantSets = (sceneId: string) => {
  const store = getStore();
  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [sceneId]: [],
    },
  });
};

export const markVariantItemStatus = (
  sceneId: string,
  variantSetId: string,
  variantId: string,
  status: VariantItemStatus,
) => {
  const store = getStore();
  const items = store.variantByScene[sceneId] ?? [];
  const nextItems = items.map((variantSet) => {
    if (variantSet.id !== variantSetId) return variantSet;
    return {
      ...variantSet,
      variants: variantSet.variants.map((variant) =>
        variant.id === variantId ? { ...variant, status } : variant,
      ),
    };
  });

  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [sceneId]: nextItems,
    },
  });
};

export const deleteVariantItem = (
  sceneId: string,
  variantSetId: string,
  variantId: string,
) => {
  const store = getStore();
  const items = store.variantByScene[sceneId] ?? [];
  const nextItems = items
    .map((variantSet) => {
      if (variantSet.id !== variantSetId) return variantSet;
      return {
        ...variantSet,
        variants: variantSet.variants.filter((variant) => variant.id !== variantId),
      };
    })
    .filter((variantSet) => variantSet.variants.length > 0);

  setStore({
    ...store,
    variantByScene: {
      ...store.variantByScene,
      [sceneId]: nextItems,
    },
  });
};
