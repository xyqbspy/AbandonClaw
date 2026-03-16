export const getAdminEmailsFromEnv = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const isAdminEmail = (email: string | null | undefined) => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return getAdminEmailsFromEnv().includes(normalized);
};

