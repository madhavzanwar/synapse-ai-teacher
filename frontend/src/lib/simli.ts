/**
 * Simli WebRTC Video Avatar Client using the official `simli-client` SDK.
 * Uses dynamic import() to avoid webpack compilation failure — the simli-client
 * package has a broken dist/index.js that references a missing './Client' module.
 */
import { createSimliSession } from '@/lib/api';

export interface SimliSessionConfig {
  apiKey?: string;
  faceId?: string;
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SimliSDKClient = any;

export class SimliClientManager {
  private videoElement: HTMLVideoElement;
  private audioElement: HTMLAudioElement;
  public client: SimliSDKClient | null = null;
  public isStarted: boolean = false;

  constructor(config: SimliSessionConfig) {
    this.videoElement = config.videoElement;
    this.audioElement = config.audioElement;
  }

  async start(): Promise<boolean> {
    try {
      // Dynamically import simli-client at runtime only (client-side)
      const simliModule = await import('simli-client').catch(() => null);
      if (!simliModule) {
        console.warn('simli-client module could not be loaded. Using canvas fallback.');
        return false;
      }
      const { SimliClient: SimliSDKClientClass, LogLevel } = simliModule;

      console.log('Requesting backend-minted Simli session.');
      const tokenResponse = await createSimliSession();

      if (!tokenResponse?.session_token) {
        console.warn('Failed to get a backend Simli session token.');
        return false;
      }

      const iceServers = tokenResponse.ice_servers?.length
        ? tokenResponse.ice_servers
        : [{ urls: ['stun:stun.l.google.com:19302'] }];

      console.log('Starting official Simli SDK Client...');
      this.client = new SimliSDKClientClass(
        tokenResponse.session_token,
        this.videoElement,
        this.audioElement,
        iceServers,
        LogLevel.INFO
      );

      this.client.on('start', () => {
        console.log('Simli avatar stream started successfully!');
        this.isStarted = true;
        // ONLY attach audio element listener AFTER connection is open and start has fired
        if (this.audioElement && this.client) {
          try {
            this.client.listenToAudioElement(this.audioElement);
          } catch (e) {
            console.warn('Audio listener deferred:', e);
          }
        }
      });

      this.client.on('error', (err: string) => {
        console.warn('Simli avatar notice:', err);
      });

      this.client.on('startup_error', (msg: string) => {
        console.warn('Simli avatar startup notice:', msg);
      });

      await this.client.start();
      return true;
    } catch (err) {
      console.warn('Simli SDK start notice (interactive 2D canvas active):', err);
      return false;
    }
  }

  stop() {
    if (this.client) {
      try {
        this.client.stop();
      } catch (e) {
        console.warn('Simli stop notice:', e);
      }
      this.client = null;
      this.isStarted = false;
    }
  }
}
