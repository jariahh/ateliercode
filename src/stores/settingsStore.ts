import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Whisper transcription provider options
 */
export type WhisperProvider = 'none' | 'local' | 'openai';

/**
 * Local Whisper model sizes
 * Smaller = faster but less accurate, Larger = slower but more accurate
 */
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

interface WhisperSettings {
  provider: WhisperProvider;
  openaiApiKey: string;
  localModel: WhisperModel;
  localInstalled: boolean;
  localModelDownloaded: boolean;
}

interface ServerSettings {
  enabled: boolean;
  url: string;
  token: string;
  machineName: string;
}

interface SettingsState {
  whisper: WhisperSettings;
  server: ServerSettings;

  // Whisper Actions
  setWhisperProvider: (provider: WhisperProvider) => void;
  setOpenAIApiKey: (key: string) => void;
  setLocalModel: (model: WhisperModel) => void;
  setLocalInstalled: (installed: boolean) => void;
  setLocalModelDownloaded: (downloaded: boolean) => void;

  // Server Actions
  setServerEnabled: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
  setServerToken: (token: string) => void;
  setMachineName: (name: string) => void;

  // Computed
  isWhisperConfigured: () => boolean;
  isServerConfigured: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      whisper: {
        provider: 'none',
        openaiApiKey: '',
        localModel: 'base',
        localInstalled: false,
        localModelDownloaded: false,
      },

      server: {
        enabled: true,
        url: 'wss://api.ateliercode.dev',
        token: '',
        machineName: '',
      },

      setWhisperProvider: (provider) =>
        set((state) => ({
          whisper: { ...state.whisper, provider },
        })),

      setOpenAIApiKey: (key) =>
        set((state) => ({
          whisper: { ...state.whisper, openaiApiKey: key },
        })),

      setLocalModel: (model) =>
        set((state) => ({
          whisper: { ...state.whisper, localModel: model },
        })),

      setLocalInstalled: (installed) =>
        set((state) => ({
          whisper: { ...state.whisper, localInstalled: installed },
        })),

      setLocalModelDownloaded: (downloaded) =>
        set((state) => ({
          whisper: { ...state.whisper, localModelDownloaded: downloaded },
        })),

      setServerEnabled: (enabled) =>
        set((state) => ({
          server: { ...state.server, enabled },
        })),

      setServerUrl: (url) =>
        set((state) => ({
          server: { ...state.server, url },
        })),

      setServerToken: (token) =>
        set((state) => ({
          server: { ...state.server, token },
        })),

      setMachineName: (name) =>
        set((state) => ({
          server: { ...state.server, machineName: name },
        })),

      isWhisperConfigured: () => {
        const { whisper } = get();
        if (whisper.provider === 'openai') {
          return whisper.openaiApiKey.length > 0;
        }
        if (whisper.provider === 'local') {
          return whisper.localInstalled && whisper.localModelDownloaded;
        }
        return false;
      },

      isServerConfigured: () => {
        const { server } = get();
        return server.enabled && server.url.length > 0 && server.token.length > 0;
      },
    }),
    {
      name: 'ateliercode-settings',
    }
  )
);
