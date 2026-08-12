// Ephemeral in-process key store.
// Persists within a single serverless function lifetime only.
// Replace with @vercel/kv or the Aurora platform /api/auth/keys endpoint
// once the JWT exchange flow is wired up.
export const keyStore = new Map<
  string,
  {
    id: string;
    name: string;
    key_preview: string;
    key_full: string;
    scope: string;
    created_at: string;
    last_used: string;
    expires_at: string | null;
    revoked: boolean;
  }
>();
