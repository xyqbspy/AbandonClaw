export type UserVoiceSpeed = "0.8x" | "1.0x" | "1.2x";

export const USER_SETTINGS_STORAGE_KEY = "app-settings-draft";

export const DEFAULT_USER_VOICE_SPEED: UserVoiceSpeed = "1.0x";

export const normalizeUserVoiceSpeed = (value: unknown): UserVoiceSpeed => {
  if (value === "0.8x" || value === "1.0x" || value === "1.2x") {
    return value;
  }
  return DEFAULT_USER_VOICE_SPEED;
};

export const getUserVoiceSpeedRate = (voiceSpeed: UserVoiceSpeed) => {
  if (voiceSpeed === "0.8x") return 0.8;
  if (voiceSpeed === "1.2x") return 1.2;
  return 1;
};

export const readUserVoiceSpeedPreference = (): UserVoiceSpeed => {
  if (typeof window === "undefined") {
    return DEFAULT_USER_VOICE_SPEED;
  }

  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_VOICE_SPEED;
    const parsed = JSON.parse(raw) as { voiceSpeed?: unknown };
    return normalizeUserVoiceSpeed(parsed.voiceSpeed);
  } catch {
    return DEFAULT_USER_VOICE_SPEED;
  }
};
