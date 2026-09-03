/**
 * Simli WebRTC Video Avatar Client using the official `simli-client` SDK.
 */
import { SimliClient as SimliSDKClient, generateSimliSessionToken, generateIceServers, LogLevel } from 'simli-client';

export interface SimliSessionConfig {
  apiKey?: string;
  faceId?: string;
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
}

export class SimliClientManager {
  private apiKey: string;
  private faceId: string;
  private videoElement: HTMLVideoElement;
  private audioElement: HTMLAudioElement;
  private client: SimliSDKClient | null = null;

  constructor(config: SimliSessionConfig) {
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_SIMLI_API_KEY || '';
    this.faceId = config.faceId || process.env.NEXT_PUBLIC_SIMLI_FACE_ID || 'cace3ef7-a4c4-425d-a8cf-a5358eb0c427';
    this.videoElement = config.videoElement;
    this.audioElement = config.audioElement;
  }

  async start(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Simli API Key is not configured in environment.');
      return false;
    }

    try {
      console.log('Generating Simli session token for face:', this.faceId);
      const tokenResponse = await generateSimliSessionToken({
        apiKey: this.apiKey,
        config: {
          faceId: this.faceId,
          handleSilence: true,
          maxSessionLength: 600,
          maxIdleTime: 120,
        },
      });

      if (!tokenResponse?.session_token) {
        console.error('Failed to get session token from Simli.');
        return false;
      }

      console.log('Simli session token received. Generating ICE servers...');
      const iceServers = await generateIceServers(this.apiKey).catch(() => null);

      console.log('Starting official Simli SDK Client...');
      this.client = new SimliSDKClient(
        tokenResponse.session_token,
        this.videoElement,
        this.audioElement,
        iceServers,
        LogLevel.INFO
      );

      this.client.on('start', () => {
        console.log('Simli avatar stream started successfully!');
      });

      this.client.on('error', (err: string) => {
        console.error('Simli avatar error:', err);
      });

      this.client.on('startup_error', (msg: string) => {
        console.error('Simli avatar startup error:', msg);
      });

      await this.client.start();
      return true;
    } catch (err) {
      console.error('Simli SDK start error:', err);
      return false;
    }
  }

  stop() {
    if (this.client) {
      try {
        this.client.stop();
      } catch (e) {
        console.warn('Simli stop error:', e);
      }
      this.client = null;
    }
  }
}
