/**
 * Peer Connection Service
 * Handles WebRTC peer-to-peer connections between AtelierCode machines.
 * Uses the signaling server for offer/answer exchange and COTURN for NAT traversal.
 */

import { serverConnection } from './serverConnection';
import { useSettingsStore } from '../stores/settingsStore';

interface ICEServer {
  urls: string;
  username?: string;
  credential?: string;
}

interface PeerMessage {
  type: 'request' | 'response' | 'event';
  id?: string;
  command?: string;
  params?: Record<string, unknown>;
  success?: boolean;
  data?: unknown;
  error?: string;
  event?: string;
  payload?: unknown;
}

type PeerEventHandler = (event: string, payload: unknown) => void;

class PeerConnection {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private connectionId: string | null = null;
  private targetMachineId: string | null = null;
  private iceServers: ICEServer[] = [];
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private eventHandlers: PeerEventHandler[] = [];
  private isInitiator = false;

  /**
   * Fetch ICE server configuration from the signaling server
   */
  async fetchIceServers(): Promise<ICEServer[]> {
    const settings = useSettingsStore.getState();
    if (!settings.server.url) {
      console.warn('[PeerConnection] No server URL configured');
      return this.getDefaultIceServers();
    }

    try {
      // Convert WebSocket URL to HTTP URL for the ICE servers endpoint
      const httpUrl = settings.server.url
        .replace('wss://', 'https://')
        .replace('ws://', 'http://');

      const response = await fetch(`${httpUrl}/ice-servers`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICE servers: ${response.status}`);
      }

      const data = await response.json();
      this.iceServers = data.iceServers || [];
      console.log('[PeerConnection] Fetched ICE servers:', this.iceServers.length);
      return this.iceServers;
    } catch (error) {
      console.warn('[PeerConnection] Failed to fetch ICE servers, using defaults:', error);
      return this.getDefaultIceServers();
    }
  }

  /**
   * Default ICE servers (STUN only - for development/fallback)
   */
  private getDefaultIceServers(): ICEServer[] {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }

  /**
   * Initialize a connection to a remote machine (as initiator)
   */
  async connect(targetMachineId: string): Promise<boolean> {
    if (this.pc) {
      console.warn('[PeerConnection] Already connected or connecting');
      return false;
    }

    this.targetMachineId = targetMachineId;
    this.isInitiator = true;

    // Fetch ICE servers
    const iceServers = await this.fetchIceServers();

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: iceServers.map((s) => ({
        urls: s.urls,
        username: s.username,
        credential: s.credential,
      })),
    });

    this.setupPeerConnectionHandlers();

    // Create data channel (initiator creates it)
    this.dataChannel = this.pc.createDataChannel('ateliercode', {
      ordered: true,
    });
    this.setupDataChannelHandlers();

    // Listen for signaling messages
    const unsubscribe = serverConnection.onMessage((message) => {
      this.handleSignalingMessage(message);
    });

    // Request connection via signaling server
    const connected = await serverConnection.connectToMachine(targetMachineId);
    if (!connected) {
      this.cleanup();
      unsubscribe();
      return false;
    }

    // Wait for connection to establish (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.dataChannel?.readyState !== 'open') {
          console.log('[PeerConnection] Connection timeout');
          this.cleanup();
          unsubscribe();
          resolve(false);
        }
      }, 30000);

      const checkConnection = () => {
        if (this.dataChannel?.readyState === 'open') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      };

      // Check periodically
      const interval = setInterval(() => {
        if (this.dataChannel?.readyState === 'open') {
          clearInterval(interval);
          checkConnection();
        } else if (!this.pc) {
          clearInterval(interval);
          clearTimeout(timeout);
          unsubscribe();
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * Accept an incoming connection (as responder)
   */
  async acceptConnection(connectionId: string, fromMachineId: string): Promise<void> {
    this.connectionId = connectionId;
    this.targetMachineId = fromMachineId;
    this.isInitiator = false;

    // Fetch ICE servers
    const iceServers = await this.fetchIceServers();

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: iceServers.map((s) => ({
        urls: s.urls,
        username: s.username,
        credential: s.credential,
      })),
    });

    this.setupPeerConnectionHandlers();

    // Listen for data channel (responder receives it)
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers();
    };
  }

  /**
   * Send a command to the remote machine and wait for response
   */
  async sendCommand<T>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Not connected to remote machine');
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });

      const message: PeerMessage = {
        type: 'request',
        id,
        command,
        params,
      };

      this.dataChannel!.send(JSON.stringify(message));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Subscribe to events from the remote machine
   */
  onEvent(handler: PeerEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Disconnect from the remote machine
   */
  disconnect(): void {
    this.cleanup();
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.targetMachineId && this.connectionId) {
        // Send ICE candidate to remote peer via signaling server
        serverConnection.send({
          type: 'rtc_ice_candidate',
          payload: {
            connectionId: this.connectionId,
            targetMachineId: this.targetMachineId,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[PeerConnection] ICE connection state:', this.pc?.iceConnectionState);
      if (this.pc?.iceConnectionState === 'failed' || this.pc?.iceConnectionState === 'disconnected') {
        this.cleanup();
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[PeerConnection] Connection state:', this.pc?.connectionState);
    };
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[PeerConnection] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[PeerConnection] Data channel closed');
      this.cleanup();
    };

    this.dataChannel.onerror = (error) => {
      console.error('[PeerConnection] Data channel error:', error);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as PeerMessage;
        this.handlePeerMessage(message);
      } catch (error) {
        console.error('[PeerConnection] Failed to parse message:', error);
      }
    };
  }

  private handlePeerMessage(message: PeerMessage): void {
    switch (message.type) {
      case 'response':
        // Handle response to pending request
        if (message.id && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id)!;
          this.pendingRequests.delete(message.id);
          if (message.success) {
            resolve(message.data);
          } else {
            reject(new Error(message.error || 'Unknown error'));
          }
        }
        break;

      case 'event':
        // Notify event handlers
        if (message.event) {
          for (const handler of this.eventHandlers) {
            handler(message.event, message.payload);
          }
        }
        break;

      case 'request':
        // Handle incoming request (for when this machine is the remote)
        // This would be implemented when we add the host-side logic
        console.log('[PeerConnection] Received request:', message.command);
        break;
    }
  }

  private async handleSignalingMessage(message: { type: string; payload: unknown }): Promise<void> {
    switch (message.type) {
      case 'connection_accepted': {
        const { connectionId } = message.payload as { connectionId: string };
        this.connectionId = connectionId;

        // Create and send offer
        if (this.pc && this.isInitiator) {
          const offer = await this.pc.createOffer();
          await this.pc.setLocalDescription(offer);

          serverConnection.send({
            type: 'rtc_offer',
            payload: {
              connectionId,
              targetMachineId: this.targetMachineId,
              sdp: offer.sdp,
            },
          });
        }
        break;
      }

      case 'rtc_offer': {
        const { connectionId, sdp } = message.payload as { connectionId: string; targetMachineId: string; sdp: string };
        if (this.pc && !this.isInitiator) {
          await this.pc.setRemoteDescription({ type: 'offer', sdp });
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);

          serverConnection.send({
            type: 'rtc_answer',
            payload: {
              connectionId,
              targetMachineId: this.targetMachineId,
              sdp: answer.sdp,
            },
          });
        }
        break;
      }

      case 'rtc_answer': {
        const { sdp } = message.payload as { sdp: string };
        if (this.pc && this.isInitiator) {
          await this.pc.setRemoteDescription({ type: 'answer', sdp });
        }
        break;
      }

      case 'rtc_ice_candidate': {
        const { candidate, sdpMid, sdpMLineIndex } = message.payload as {
          candidate: string;
          sdpMid?: string;
          sdpMLineIndex?: number;
        };
        if (this.pc) {
          await this.pc.addIceCandidate(
            new RTCIceCandidate({
              candidate,
              sdpMid: sdpMid || undefined,
              sdpMLineIndex: sdpMLineIndex ?? undefined,
            })
          );
        }
        break;
      }

      case 'connection_rejected': {
        console.log('[PeerConnection] Connection rejected');
        this.cleanup();
        break;
      }
    }
  }

  private cleanup(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.connectionId = null;
    this.targetMachineId = null;
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const peerConnection = new PeerConnection();
