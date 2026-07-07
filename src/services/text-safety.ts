const unsafeTextPatterns = [
  /<[^>]+>/,
  /\bon[a-z]+\s*=/i,
  /\bjavascript\s*:/i,
  /;\s*--/,
  /--\s*$/,
  /\/\*|\*\//,
  /\b(drop|alter|truncate|create)\s+(table|database|schema|index)\b/i,
  /\b(delete)\s+from\b/i,
  /\b(insert)\s+into\b/i,
  /\b(update)\s+[\w".]+\s+set\b/i
];

export function containsUnsafeText(value: unknown) {
  const text = String(value ?? "");
  return unsafeTextPatterns.some((pattern) => pattern.test(text));
}

export function safeTextMessage(field: string) {
  return `${field} contains potentially unsafe markup, script, or SQL control content`;
}
