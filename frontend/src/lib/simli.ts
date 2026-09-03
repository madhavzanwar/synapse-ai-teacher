/**
 * Simli WebRTC Video Avatar Client Helper.
 * Establishes WebRTC video stream with Simli's API and attaches video track.
 */

export interface SimliSessionConfig {
  apiKey?: string;
  faceId?: string;
  videoElement: HTMLVideoElement;
  audioElement?: HTMLAudioElement;
}

export class SimliClient {
  private apiKey: string;
  private faceId: string;
  private videoElement: HTMLVideoElement;
  private pc: RTCPeerConnection | null = null;

  constructor(config: SimliSessionConfig) {
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_SIMLI_API_KEY || '';
    this.faceId = config.faceId || process.env.NEXT_PUBLIC_SIMLI_FACE_ID || 'cace3ef7-a4c4-425d-a8cf-a5358eb0c427';
    this.videoElement = config.videoElement;
  }

  async start(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Simli API Key is not set in environment.');
      return false;
    }

    try {
      console.log('Initializing Simli WebRTC session for face:', this.faceId);
      const response = await fetch('https://api.simli.ai/startAudioToVideoSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          faceId: this.faceId,
          handleSilence: true,
          maxSessionLength: 600,
          maxIdleTime: 120,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simli session start failed:', response.status, errorText);
        return false;
      }

      const data = await response.json();
      const { session_token } = data;

      if (!session_token) {
        console.error('No session token returned from Simli API');
        return false;
      }

      // Initialize RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      this.pc.ontrack = (event) => {
        if (event.track.kind === 'video' && this.videoElement) {
          console.log('Simli video track received!');
          this.videoElement.srcObject = event.streams[0];
          this.videoElement.play().catch((e) => console.log('Video autoplay:', e));
        }
      };

      // Create WebRTC Offer
      this.pc.addTransceiver('video', { direction: 'recvonly' });
      this.pc.addTransceiver('audio', { direction: 'recvonly' });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Exchange SDP with Simli WebRTC gateway
      const sdpResponse = await fetch(`https://api.simli.ai/sdp/${session_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
      });

      if (!sdpResponse.ok) {
        console.error('Simli SDP exchange failed');
        return false;
      }

      const answer = await sdpResponse.json();
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));

      console.log('Simli WebRTC Avatar session connected successfully!');
      return true;
    } catch (err) {
      console.error('Simli WebRTC error:', err);
      return false;
    }
  }

  stop() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}
