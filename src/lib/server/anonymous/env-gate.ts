export const isAnonymousTrialEnabled = () => {
  const raw = process.env.ALLOW_ANONYMOUS_TRIAL?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
};
