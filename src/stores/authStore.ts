import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Keycloak OIDC configuration
const KEYCLOAK_URL = 'https://keycloak.unveiledsoftwaresolutions.com';
const KEYCLOAK_REALM = 'ateliercode';
const KEYCLOAK_CLIENT_ID = 'ateliercode-app';
const KEYCLOAK_BASE = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect`;

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  roles?: string[];
  avatarUrl?: string;
}

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number; // Unix timestamp in ms
}

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  token: string | null; // Access token (for backward compat with serverConnection)
  tokens: TokenSet | null;

  // PKCE state
  codeVerifier: string | null;

  // UI state
  showAuthDialog: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setShowAuthDialog: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth actions
  login: () => void;
  logout: () => void;
  handleCallback: (code: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = '';
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

function getRedirectUri(): string {
  return `${window.location.origin}/`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      tokens: null,
      codeVerifier: null,
      showAuthDialog: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setShowAuthDialog: (showAuthDialog) => set({ showAuthDialog }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      login: async () => {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Store code_verifier for the callback
        set({ codeVerifier });

        const params = new URLSearchParams({
          client_id: KEYCLOAK_CLIENT_ID,
          response_type: 'code',
          scope: 'openid email profile',
          redirect_uri: getRedirectUri(),
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        // Redirect to Keycloak login page
        window.location.href = `${KEYCLOAK_BASE}/auth?${params.toString()}`;
      },

      handleCallback: async (code: string) => {
        const { codeVerifier } = get();
        if (!codeVerifier) {
          set({ error: 'Missing PKCE code verifier' });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${KEYCLOAK_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: KEYCLOAK_CLIENT_ID,
              code,
              redirect_uri: getRedirectUri(),
              code_verifier: codeVerifier,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error_description || 'Token exchange failed');
          }

          const data = await response.json();

          // Parse user info from ID token
          const claims = parseJwt(data.access_token);
          const user: User = {
            id: claims.sub as string,
            email: (claims.email as string) || '',
            name: (claims.name as string) || (claims.preferred_username as string) || '',
            username: claims.preferred_username as string,
            roles: (claims.realm_access as { roles?: string[] })?.roles || [],
          };

          const tokens: TokenSet = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token,
            expiresAt: Date.now() + data.expires_in * 1000,
          };

          set({
            isAuthenticated: true,
            user,
            token: data.access_token,
            tokens,
            codeVerifier: null,
            showAuthDialog: false,
            isLoading: false,
          });

          // Schedule token refresh
          scheduleRefresh(data.expires_in);

          return true;
        } catch (error) {
          set({
            isLoading: false,
            codeVerifier: null,
            error: error instanceof Error ? error.message : 'Authentication failed',
          });
          return false;
        }
      },

      logout: () => {
        const { tokens } = get();
        const idTokenHint = tokens?.idToken;

        set({
          isAuthenticated: false,
          user: null,
          token: null,
          tokens: null,
          codeVerifier: null,
          error: null,
        });

        // Redirect to Keycloak logout
        if (idTokenHint) {
          const params = new URLSearchParams({
            id_token_hint: idTokenHint,
            post_logout_redirect_uri: getRedirectUri(),
            client_id: KEYCLOAK_CLIENT_ID,
          });
          window.location.href = `${KEYCLOAK_BASE}/logout?${params.toString()}`;
        }
      },

      checkAuth: async () => {
        const { tokens } = get();
        if (!tokens) {
          set({ isAuthenticated: false, user: null, token: null });
          return false;
        }

        // Check if token is expired or about to expire (within 30s)
        if (tokens.expiresAt < Date.now() + 30000) {
          // Try to refresh
          const refreshed = await get().refreshAccessToken();
          if (!refreshed) {
            set({ isAuthenticated: false, user: null, token: null, tokens: null });
            return false;
          }
        }

        // Token is valid, schedule refresh
        const timeUntilExpiry = Math.max(0, (tokens.expiresAt - Date.now()) / 1000);
        scheduleRefresh(timeUntilExpiry);
        return true;
      },

      refreshAccessToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          return false;
        }

        try {
          const response = await fetch(`${KEYCLOAK_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: KEYCLOAK_CLIENT_ID,
              refresh_token: tokens.refreshToken,
            }),
          });

          if (!response.ok) {
            return false;
          }

          const data = await response.json();

          const claims = parseJwt(data.access_token);
          const user: User = {
            id: claims.sub as string,
            email: (claims.email as string) || '',
            name: (claims.name as string) || (claims.preferred_username as string) || '',
            username: claims.preferred_username as string,
            roles: (claims.realm_access as { roles?: string[] })?.roles || [],
          };

          const newTokens: TokenSet = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token,
            expiresAt: Date.now() + data.expires_in * 1000,
          };

          set({
            isAuthenticated: true,
            user,
            token: data.access_token,
            tokens: newTokens,
          });

          scheduleRefresh(data.expires_in);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'ateliercode-auth',
      partialize: (state) => ({
        token: state.token,
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        codeVerifier: state.codeVerifier,
      }),
    }
  )
);

// Token refresh scheduler
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(expiresInSeconds: number) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  // Refresh 60 seconds before expiry
  const refreshIn = Math.max(0, (expiresInSeconds - 60)) * 1000;
  refreshTimer = setTimeout(() => {
    useAuthStore.getState().refreshAccessToken();
  }, refreshIn);
}
