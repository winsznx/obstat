export function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  // During Next.js static build phase, return empty string for relative paths
  if (process.env.NEXT_PHASE) {
    return '';
  }
  // In production runtime, require explicit backend configuration
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      "[FATAL CONFIGURATION ERROR] Missing NEXT_PUBLIC_API_BASE in production build. " +
      "Silent fallback to localhost is prohibited in production mode. " +
      "Configure NEXT_PUBLIC_API_BASE to a verified Cloud Run / backend host or set to '' for same-origin proxy."
    );
  }
  // Local development default
  return 'http://localhost:8000';
}



