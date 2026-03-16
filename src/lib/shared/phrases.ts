export const normalizePhraseText = (text: string) =>
  text.trim().toLowerCase().replace(/\s+/g, " ");
