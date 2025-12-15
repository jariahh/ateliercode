/**
 * Server Connection Service
 * Handles WebSocket connection to the AtelierCode central server for multi-machine support.
 * This is completely optional - the app works fully offline without it.
 */

import { useMachineStore } from '../stores/machineStore';
import { useSettingsStore } from '../stores/settingsStore';

// Message types matching the server
type WSMessageType =
  | 'auth'
  | 'auth_response'
  | 'register_user'
  | 'register_user_response'
  | 'register_machine'
  | 'machine_registered'
  | 'heartbeat'
  | 'heartbeat_ack'
  | 'list_machines'
  | 'machines_list'
  | 'connect_to_machine'
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'rtc_offer'
  | 'rtc_answer'
  | 'rtc_ice_candidate'
  | 'machine_online'
  | 'machine_offline'
  | 'error';

interface WSMessage<T = unknown> {
  type: WSMessageType;
  id?: string;
  payload: T;
}

interface AuthPayload {
  token?: string;
  email?: string;
  password?: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
  error?: string;
}

interface RegisterUserPayload {
  email: string;
  username: string;
  password: string;
}

interface MachineCapabilities {
  hasGit: boolean;
  hasNode: boolean;
  hasRust: boolean;
  hasPython: boolean;
}

interface RegisterMachinePayload {
  name: string;
  platform: 'windows' | 'macos' | 'linux';
  capabilities: MachineCapabilities;
}

export interface MachineInfo {
  id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux';
  isOnline: boolean;
  lastSeen: Date;
  isOwn: boolean;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated';

type MessageHandler = (message: WSMessage) => void;

class ServerConnection {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private messageHandlers: MessageHandler[] = [];
  private machineId: string | null = null;
  private intentionalDisconnect = false;

  get connectionState(): ConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === 'connected' || this.state === 'authenticated';
  }

  get isAuthenticated(): boolean {
    return this.state === 'authenticated';
  }

  /**
   * Connect to the server. Safe to call even if server is unavailable.
   */
  async connect(serverUrl: string): Promise<boolean> {
    if (this.ws && this.state !== 'disconnected') {
      console.log('[ServerConnection] Already connected or connecting');
      return this.isConnected;
    }

    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.state = 'connecting';
    this.updateStore();

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          console.log('[ServerConnection] Connected to server');
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.updateStore();
          resolve(true);
        };

        this.ws.onclose = () => {
          console.log('[ServerConnection] Disconnected from server');
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.warn('[ServerConnection] WebSocket error (server may be unavailable):', error);
          // Don't throw - just resolve false to indicate connection failed
          if (this.state === 'connecting') {
            this.state = 'disconnected';
            this.updateStore();
            resolve(false);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WSMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('[ServerConnection] Failed to parse message:', error);
          }
        };

        // Timeout for connection attempt
        setTimeout(() => {
          if (this.state === 'connecting') {
            console.log('[ServerConnection] Connection timeout');
            this.ws?.close();
            this.state = 'disconnected';
            this.updateStore();
            resolve(false);
          }
        }, 5000);
      } catch (error) {
        console.warn('[ServerConnection] Failed to create WebSocket:', error);
        this.state = 'disconnected';
        this.updateStore();
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = 'disconnected';
    this.machineId = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    this.updateStore();
  }

  /**
   * Authenticate with email/password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.sendRequest<AuthPayload, AuthResponse>('auth', { email, password });
    if (response.success && response.token) {
      this.state = 'authenticated';
      // Store token for future use
      useSettingsStore.getState().setServerToken(response.token);
      this.updateStore();
    }
    return response;
  }

  /**
   * Authenticate with existing token
   */
  async loginWithToken(token: string): Promise<AuthResponse> {
    const response = await this.sendRequest<AuthPayload, AuthResponse>('auth', { token });
    if (response.success) {
      this.state = 'authenticated';
      this.updateStore();
    } else {
      // Token invalid, clear it
      useSettingsStore.getState().setServerToken('');
    }
    return response;
  }

  /**
   * Register a new user account
   */
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const response = await this.sendRequest<RegisterUserPayload, AuthResponse>('register_user', {
      email,
      username,
      password,
    });
    if (response.success && response.token) {
      this.state = 'authenticated';
      useSettingsStore.getState().setServerToken(response.token);
      this.updateStore();
    }
    return response;
  }

  /**
   * Register this machine with the server
   */
  async registerMachine(name: string): Promise<{ machineId: string; name: string } | null> {
    if (!this.isAuthenticated) {
      console.warn('[ServerConnection] Must be authenticated to register machine');
      return null;
    }

    const platform = this.detectPlatform();
    const capabilities = await this.detectCapabilities();

    const response = await this.sendRequest<RegisterMachinePayload, { machineId: string; name: string }>(
      'register_machine',
      { name, platform, capabilities }
    );

    if (response.machineId) {
      this.machineId = response.machineId;
      useMachineStore.getState().setLocalMachineId(response.machineId);
    }

    return response;
  }

  /**
   * Get list of user's machines
   */
  async listMachines(): Promise<MachineInfo[]> {
    if (!this.isAuthenticated) {
      return [];
    }

    const response = await this.sendRequest<Record<string, never>, { machines: MachineInfo[] }>('list_machines', {});
    return response.machines || [];
  }

  /**
   * Request connection to a remote machine
   */
  async connectToMachine(targetMachineId: string): Promise<boolean> {
    if (!this.isAuthenticated) {
      console.warn('[ServerConnection] Must be authenticated to connect to machine');
      return false;
    }

    // Note: machineId may be null for web clients that haven't registered as a machine
    // They can still initiate connections to desktop machines
    console.log('[ServerConnection] Requesting connection to machine:', targetMachineId);
    this.send({ type: 'connect_to_machine', payload: { targetMachineId } });
    // Connection flow continues via message handlers
    return true;
  }

  /**
   * Add a message handler for incoming messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index >= 0) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  private handleMessage(message: WSMessage): void {
    // Handle response to pending request
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      resolve(message.payload);
      return;
    }

    // Handle specific message types
    switch (message.type) {
      case 'machine_online':
      case 'machine_offline':
        this.handleMachineStatusChange(message);
        break;
      case 'connection_request':
        this.handleConnectionRequest(message);
        break;
      case 'error':
        console.error('[ServerConnection] Server error:', message.payload);
        break;
    }

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private handleMachineStatusChange(message: WSMessage): void {
    const { machineId, name } = message.payload as { machineId: string; name: string };
    const isOnline = message.type === 'machine_online';
    useMachineStore.getState().updateMachineStatus(machineId, isOnline);
    console.log(`[ServerConnection] Machine ${name} is now ${isOnline ? 'online' : 'offline'}`);
  }

  private handleConnectionRequest(message: WSMessage): void {
    const { fromMachineId, fromMachineName, connectionId } = message.payload as {
      fromMachineId: string;
      fromMachineName: string;
      connectionId: string;
    };

    // For now, auto-accept connections from user's own machines
    // In the future, could show a confirmation dialog
    console.log(`[ServerConnection] Connection request from ${fromMachineName} (${fromMachineId})`);
    this.send({
      type: 'connection_accepted',
      payload: { connectionId },
    });
  }

  private async sendRequest<TPayload, TResponse>(type: WSMessageType, payload: TPayload): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);

      this.send({ type, id, payload });
    });
  }

  /**
   * Send a message to the server (used internally and by peerConnection for signaling)
   */
  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', payload: {} });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.ws = null;
    this.state = 'disconnected';
    this.machineId = null;
    this.updateStore();

    // Only attempt reconnect if this wasn't intentional
    if (!this.intentionalDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[ServerConnection] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.tryReconnect(), delay);
    }
  }

  private async tryReconnect(): Promise<void> {
    const settings = useSettingsStore.getState();
    if (!settings.server.url || !settings.server.enabled) {
      return;
    }

    const connected = await this.connect(settings.server.url);
    if (connected && settings.server.token) {
      await this.loginWithToken(settings.server.token);
    }
  }

  private updateStore(): void {
    useMachineStore.getState().setConnectionState(this.state);
  }

  private detectPlatform(): 'windows' | 'macos' | 'linux' {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'macos';
    return 'linux';
  }

  private async detectCapabilities(): Promise<MachineCapabilities> {
    // In a real implementation, we'd check for these via Tauri commands
    // For now, return reasonable defaults
    return {
      hasGit: true,
      hasNode: true,
      hasRust: true,
      hasPython: false,
    };
  }
}

// Singleton instance
export const serverConnection = new ServerConnection();

/**
 * Initialize server connection if enabled in settings.
 * Safe to call - won't break anything if server is unavailable.
 */
export async function initServerConnection(): Promise<void> {
  const settings = useSettingsStore.getState();

  // In web mode, use hardcoded server URL and authStore token
  const isWebMode = typeof window !== 'undefined' && !('__TAURI__' in window);
  const serverUrl = isWebMode ? 'wss://api.ateliercode.dev' : settings.server.url;
  const serverEnabled = isWebMode ? true : settings.server.enabled;

  if (!serverEnabled || !serverUrl) {
    console.log('[ServerConnection] Server connection disabled or not configured');
    return;
  }

  console.log('[ServerConnection] Attempting to connect to server...', serverUrl);
  const connected = await serverConnection.connect(serverUrl);

  if (!connected) {
    console.log('[ServerConnection] Server unavailable - continuing in offline mode');
    return;
  }

  // Get token - from authStore in web mode, settings in Tauri mode
  let token: string | null = null;
  if (isWebMode) {
    // Dynamic import to avoid circular dependency issues
    const { useAuthStore } = await import('../stores/authStore');
    token = useAuthStore.getState().token;
  } else {
    token = settings.server.token;
  }

  // If we have a token, try to authenticate
  if (token) {
    const result = await serverConnection.loginWithToken(token);
    if (result.success) {
      console.log('[ServerConnection] Authenticated with token');

      // Register this machine if we have a name (Tauri mode only)
      if (!isWebMode && settings.server.machineName) {
        await serverConnection.registerMachine(settings.server.machineName);
      }

      // Fetch machine list
      const machines = await serverConnection.listMachines();
      useMachineStore.getState().setMachines(machines);
    }
  }
}
