const unsafeTextPatterns = [
  /<[^>]+>/,
  /\bon[a-z]+\s*=/i,
  /\bjavascript\s*:/i
];

export function containsUnsafeText(value: unknown) {
  const text = String(value ?? "");
  return unsafeTextPatterns.some((pattern) => pattern.test(text));
}

export function safeTextMessage(field: string) {
  return `${field} contains potentially unsafe markup or script content`;
}
