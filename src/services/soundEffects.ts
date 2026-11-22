// Broadcast Audio Engine: Multi-Microphone Live Mixer + Professional TV Soundboard
// Routes all active microphones and TV sound effects into a single broadcast MediaStream
// for WebRTC (?live=1), local .webm recordings, and real-time PCM relay fallback.

export interface TvSoundEffectMeta {
  id: string;
  label: string;
  sublabel: string;
  category: 'cortina' | 'trivia' | 'ambiente' | 'transicion';
}

export const TV_SOUND_EFFECTS: TvSoundEffectMeta[] = [
  {
    id: 'cortina_apertura',
    label: 'Apertura #SinFiltro',
    sublabel: 'CORTINA TV',
    category: 'cortina',
  },
  {
    id: 'alerta_ultima_hora',
    label: 'Flash Última Hora',
    sublabel: 'NOTICIAS',
    category: 'cortina',
  },
  {
    id: 'trivia_correcto',
    label: 'Trivia Correcta',
    sublabel: 'PREMIO',
    category: 'trivia',
  },
  {
    id: 'trivia_incorrecto',
    label: 'Trivia Incorrecta',
    sublabel: 'ERROR',
    category: 'trivia',
  },
  {
    id: 'redoble_suspenso',
    label: 'Suspenso / Sorteo',
    sublabel: 'REDOBLE',
    category: 'trivia',
  },
  {
    id: 'aplausos_estudio',
    label: 'Aplausos Estudio',
    sublabel: 'PÚBLICO',
    category: 'ambiente',
  },
  {
    id: 'risa_remate',
    label: 'Remate Batería',
    sublabel: 'BA-DUM-TSS',
    category: 'ambiente',
  },
  {
    id: 'transicion_whoosh',
    label: 'Swoosh Cambio',
    sublabel: 'TRANSICIÓN',
    category: 'transicion',
  },
];

interface ChannelAudioNodes {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  highpass: BiquadFilterNode;
  gain: GainNode;
  monitorGain: GainNode;
  analyser: AnalyserNode;
  dataArray: Uint8Array<ArrayBuffer>;
  volumeDb: number;
  muted: boolean;
  monitoring: boolean;
}

class BroadcastAudioEngine {
  private ctx: AudioContext | null = null;
  private masterBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private masterDataArray: Uint8Array<ArrayBuffer> | null = null;
  private broadcastDest: MediaStreamAudioDestinationNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private channels = new Map<string, ChannelAudioNodes>();

  // PCM relay state for non-WebRTC live fallback
  private relayProcessor: ScriptProcessorNode | null = null;
  private relayMuteSink: GainNode | null = null;
  private relayCallback: ((pcm16Base64: string, sampleRate: number) => void) | null = null;
  private relayBuffer: number[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });

      this.masterBus = this.ctx.createGain();
      this.masterBus.gain.value = 1.0;

      // Broadcast Dynamics Limiter / Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.18;

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 256;
      this.masterDataArray = new Uint8Array(
        new ArrayBuffer(this.masterAnalyser.frequencyBinCount)
      );

      this.broadcastDest = this.ctx.createMediaStreamDestination();

      this.masterBus.connect(this.compressor);
      this.compressor.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.broadcastDest);

      // Subtle Studio Reverb Impulse (wired once cleanly)
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createStudioImpulse(this.ctx, 1.35, 2.8);
      this.reverbNode.connect(this.ctx.destination);
      this.reverbNode.connect(this.masterBus);

      // Silent keep-alive carrier so WebRTC & MediaRecorder always receive live audio frames
      this.keepAliveOsc = this.ctx.createOscillator();
      const keepAliveGain = this.ctx.createGain();
      keepAliveGain.gain.value = 0.00001; // -100 dBFS silent floor
      this.keepAliveOsc.frequency.value = 120;
      this.keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(this.masterBus);
      this.keepAliveOsc.start();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
  }

  private createStudioImpulse(
    ctx: AudioContext,
    durationSec: number,
    decay: number
  ): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  private dbToLinear(db: number): number {
    if (db <= -59) return 0;
    return Math.pow(10, db / 20);
  }

  getBroadcastAudioStream(): MediaStream {
    this.ensureContext();
    return this.broadcastDest!.stream;
  }

  getMasterLevelDb(): number {
    if (!this.masterAnalyser || !this.masterDataArray) return -60;
    this.masterAnalyser.getByteTimeDomainData(this.masterDataArray);
    let sumSquares = 0;
    for (let i = 0; i < this.masterDataArray.length; i++) {
      const n = (this.masterDataArray[i] - 128) / 128;
      sumSquares += n * n;
    }
    const rms = Math.sqrt(sumSquares / this.masterDataArray.length);
    if (rms <= 0.00015) return -60;
    const db = 20 * Math.log10(rms);
    return Math.max(-60, Math.min(0, Math.round(db)));
  }

  startPcmRelay(onChunk: (pcm16Base64: string, sampleRate: number) => void) {
    const ctx = this.ensureContext();
    this.relayCallback = onChunk;
    if (this.relayProcessor) return;

    const targetRate = 24000;
    const processor = ctx.createScriptProcessor(1024, 1, 1);
    const muteSink = ctx.createGain();
    muteSink.gain.value = 0;

    this.compressor!.connect(processor);
    processor.connect(muteSink);
    muteSink.connect(ctx.destination);

    processor.onaudioprocess = (ev) => {
      if (!this.relayCallback) return;
      const input = ev.inputBuffer.getChannelData(0);
      const step = ctx.sampleRate / targetRate;
      for (let i = 0; i < input.length; i += step) {
        const idx = Math.floor(i);
        if (idx < input.length) {
          this.relayBuffer.push(input[idx]);
        }
      }

      // Keep buffer bounded to prevent drift
      if (this.relayBuffer.length > 2048) {
        this.relayBuffer.splice(0, this.relayBuffer.length - 1024);
      }

      // Send ultra-low-latency ~42ms chunks (1024 samples at 24kHz)
      if (this.relayBuffer.length >= 1024) {
        const slice = this.relayBuffer.splice(0, 1024);
        const pcm16 = new Int16Array(slice.length);
        let maxAbs = 0;
        const fadeLen = 32; // 1.3ms soft edge to eliminate clicks
        for (let i = 0; i < slice.length; i++) {
          let s = Math.max(-1, Math.min(1, slice[i]));
          if (i < fadeLen) s *= i / fadeLen;
          else if (i > slice.length - fadeLen) s *= (slice.length - i) / fadeLen;
          const abs = Math.abs(s);
          if (abs > maxAbs) maxAbs = abs;
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        if (maxAbs > 0.0005) {
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          this.relayCallback(btoa(binary), targetRate);
        }
      }
    };

    this.relayProcessor = processor;
    this.relayMuteSink = muteSink;
  }

  stopPcmRelay() {
    this.relayCallback = null;
    this.relayBuffer = [];
    if (this.relayProcessor) {
      try {
        this.compressor?.disconnect(this.relayProcessor);
        this.relayProcessor.disconnect();
        this.relayMuteSink?.disconnect();
      } catch {
        // ignore
      }
      this.relayProcessor = null;
      this.relayMuteSink = null;
    }
  }

  async connectMicrophone(
    channelId: string,
    deviceId?: string,
    initialVolumeDb = -3,
    initialMuted = false
  ): Promise<void> {
    this.disconnectMicrophone(channelId);
    const ctx = this.ensureContext();
    await this.resume();

    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const source = ctx.createMediaStreamSource(stream);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 85; // Clean broadcast voice filter removing hum/rumble

    const gain = ctx.createGain();
    const monitorGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const linear = initialMuted ? 0 : this.dbToLinear(initialVolumeDb);
    gain.gain.setValueAtTime(linear, ctx.currentTime);
    monitorGain.gain.setValueAtTime(0, ctx.currentTime);

    source.connect(highpass);
    highpass.connect(gain);
    gain.connect(analyser);
    gain.connect(this.masterBus!);
    gain.connect(monitorGain);
    monitorGain.connect(ctx.destination);

    this.channels.set(channelId, {
      stream,
      source,
      highpass,
      gain,
      monitorGain,
      analyser,
      dataArray: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
      volumeDb: initialVolumeDb,
      muted: initialMuted,
      monitoring: false,
    });
  }

  disconnectMicrophone(channelId: string) {
    const ch = this.channels.get(channelId);
    if (!ch) return;
    ch.stream.getTracks().forEach((t) => t.stop());
    try {
      ch.source.disconnect();
      ch.highpass.disconnect();
      ch.gain.disconnect();
      ch.monitorGain.disconnect();
    } catch {
      // ignore
    }
    this.channels.delete(channelId);
  }

  hasMicrophone(channelId: string): boolean {
    return this.channels.has(channelId);
  }

  setChannelGainDb(channelId: string, volumeDb: number) {
    const ch = this.channels.get(channelId);
    if (!ch || !this.ctx) return;
    ch.volumeDb = volumeDb;
    const linear = ch.muted ? 0 : this.dbToLinear(volumeDb);
    ch.gain.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.02);
  }

  setChannelMuted(channelId: string, muted: boolean) {
    const ch = this.channels.get(channelId);
    if (!ch || !this.ctx) return;
    ch.muted = muted;
    const linear = muted ? 0 : this.dbToLinear(ch.volumeDb);
    ch.gain.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.02);
  }

  setChannelMonitor(channelId: string, enabled: boolean) {
    const ch = this.channels.get(channelId);
    if (!ch || !this.ctx) return;
    ch.monitoring = enabled;
    ch.monitorGain.gain.setTargetAtTime(
      enabled ? 0.85 : 0,
      this.ctx.currentTime,
      0.02
    );
  }

  getChannelLevelDb(channelId: string): number | null {
    const ch = this.channels.get(channelId);
    if (!ch) return null;
    if (ch.muted) return -60;
    ch.analyser.getByteTimeDomainData(ch.dataArray);
    let sumSquares = 0;
    for (let i = 0; i < ch.dataArray.length; i++) {
      const n = (ch.dataArray[i] - 128) / 128;
      sumSquares += n * n;
    }
    const rms = Math.sqrt(sumSquares / ch.dataArray.length);
    if (rms <= 0.0001) return -60;
    const db = 20 * Math.log10(rms);
    return Math.max(-60, Math.min(0, Math.round(db)));
  }

  private routeSfxNode(node: AudioNode, sendReverb = 0.14) {
    if (!this.ctx || !this.masterBus) return;
    node.connect(this.ctx.destination);
    node.connect(this.masterBus);

    if (sendReverb > 0 && this.reverbNode) {
      const wet = this.ctx.createGain();
      wet.gain.value = Math.min(0.16, sendReverb * 0.45);
      node.connect(wet);
      wet.connect(this.reverbNode);
    }
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  playTvEffect(effectId: string) {
    try {
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      if (
        effectId === 'cortina_apertura' ||
        effectId === 'cortina_noticias' ||
        effectId === 'inicio_bloque'
      ) {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(115, now);
        sub.frequency.exponentialRampToValueAtTime(42, now + 0.45);
        subGain.gain.setValueAtTime(0.45, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        sub.connect(subGain);
        this.routeSfxNode(subGain, 0.1);
        sub.start(now);
        sub.stop(now + 0.7);

        const padNotes = [293.66, 369.99, 440.0, 554.37, 659.25];
        padNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = idx < 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + 0.03);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now + 0.03);
          filter.frequency.exponentialRampToValueAtTime(3400, now + 0.25);
          filter.frequency.exponentialRampToValueAtTime(1400, now + 1.6);

          gain.gain.setValueAtTime(0.001, now + 0.03);
          gain.gain.linearRampToValueAtTime(0.085, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

          osc.connect(filter);
          filter.connect(gain);
          this.routeSfxNode(gain, 0.35);
          osc.start(now + 0.03);
          osc.stop(now + 1.95);
        });

        const motif = [587.33, 739.99, 880.0, 1174.66];
        motif.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + 0.06 + i * 0.11;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
          osc.connect(gain);
          this.routeSfxNode(gain, 0.4);
          osc.start(start);
          osc.stop(start + 0.95);
        });
      } else if (
        effectId === 'alerta_ultima_hora' ||
        effectId === 'alerta_ultimo_momento'
      ) {
        [0, 0.22, 0.44].forEach((offset) => {
          const hit = ctx.createOscillator();
          const hitGain = ctx.createGain();
          hit.type = 'triangle';
          hit.frequency.setValueAtTime(140, now + offset);
          hit.frequency.exponentialRampToValueAtTime(55, now + offset + 0.14);
          hitGain.gain.setValueAtTime(0.35, now + offset);
          hitGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
          hit.connect(hitGain);
          this.routeSfxNode(hitGain, 0.15);
          hit.start(now + offset);
          hit.stop(now + offset + 0.2);

          [880, 1318.5].forEach((f) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now + offset);
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 2600;
            g.gain.setValueAtTime(0.001, now + offset);
            g.gain.linearRampToValueAtTime(0.09, now + offset + 0.015);
            g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
            osc.connect(lp);
            lp.connect(g);
            this.routeSfxNode(g, 0.3);
            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
          });
        });
      } else if (effectId === 'trivia_correcto') {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        notes.forEach((f, i) => {
          const t = now + i * 0.075;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.18, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
          osc.connect(g);
          this.routeSfxNode(g, 0.38);
          osc.start(t);
          osc.stop(t + 0.7);
        });
      } else if (effectId === 'trivia_incorrecto') {
        [0, 0.22].forEach((offset, idx) => {
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(idx === 0 ? 196 : 146.83, now + offset);
          lp.type = 'lowpass';
          lp.frequency.value = 950;
          g.gain.setValueAtTime(0.001, now + offset);
          g.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
          osc.connect(lp);
          lp.connect(g);
          this.routeSfxNode(g, 0.15);
          osc.start(now + offset);
          osc.stop(now + offset + 0.3);
        });
      } else if (effectId === 'redoble_suspenso') {
        const noiseBuf = this.createNoiseBuffer(ctx, 2.2);
        for (let i = 0; i < 16; i++) {
          const t = now + i * 0.1;
          const src = ctx.createBufferSource();
          src.buffer = noiseBuf;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1200 + i * 90;
          bp.Q.value = 1.5;
          const g = ctx.createGain();
          const amp = 0.04 + (i / 16) * 0.14;
          g.gain.setValueAtTime(amp, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
          src.connect(bp);
          bp.connect(g);
          this.routeSfxNode(g, 0.25);
          src.start(t);
          src.stop(t + 0.09);
        }
        const crash = ctx.createBufferSource();
        crash.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3500;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.22, now + 1.6);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
        crash.connect(hp);
        hp.connect(cg);
        this.routeSfxNode(cg, 0.45);
        crash.start(now + 1.6);
        crash.stop(now + 2.65);
      } else if (effectId === 'aplausos_estudio') {
        const noiseBuf = this.createNoiseBuffer(ctx, 2.8);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1450, now);
        bp.Q.value = 0.7;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.22, now + 0.25);
        g.gain.setValueAtTime(0.2, now + 1.4);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.75);

        src.connect(bp);
        bp.connect(g);
        this.routeSfxNode(g, 0.45);
        src.start(now);
        src.stop(now + 2.8);

        for (let i = 0; i < 18; i++) {
          const t = now + 0.05 + Math.random() * 1.9;
          const clap = ctx.createBufferSource();
          clap.buffer = noiseBuf;
          const cbp = ctx.createBiquadFilter();
          cbp.type = 'bandpass';
          cbp.frequency.value = 1700 + Math.random() * 900;
          cbp.Q.value = 1.8;
          const cg = ctx.createGain();
          cg.gain.setValueAtTime(0.11, t);
          cg.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
          clap.connect(cbp);
          cbp.connect(cg);
          this.routeSfxNode(cg, 0.35);
          clap.start(t);
          clap.stop(t + 0.05);
        }
      } else if (effectId === 'risa_remate') {
        const noiseBuf = this.createNoiseBuffer(ctx, 0.9);
        const kick = (time: number, startF: number, endF: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(startF, time);
          o.frequency.exponentialRampToValueAtTime(endF, time + 0.12);
          g.gain.setValueAtTime(0.32, time);
          g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          o.connect(g);
          this.routeSfxNode(g, 0.18);
          o.start(time);
          o.stop(time + 0.16);
        };
        kick(now, 160, 65);
        kick(now + 0.16, 130, 55);

        const cym = ctx.createBufferSource();
        cym.buffer = noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4800;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.24, now + 0.34);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
        cym.connect(hp);
        hp.connect(cg);
        this.routeSfxNode(cg, 0.35);
        cym.start(now + 0.34);
        cym.stop(now + 1.2);
      } else if (effectId === 'transicion_whoosh') {
        const noiseBuf = this.createNoiseBuffer(ctx, 0.65);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.6;
        bp.frequency.setValueAtTime(250, now);
        bp.frequency.exponentialRampToValueAtTime(3200, now + 0.25);
        bp.frequency.exponentialRampToValueAtTime(350, now + 0.55);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.25, now + 0.22);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
        src.connect(bp);
        bp.connect(g);
        this.routeSfxNode(g, 0.3);
        src.start(now);
        src.stop(now + 0.6);
      } else if (effectId === 'pitazo_deportes') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2800, now);
        osc.frequency.setValueAtTime(2920, now + 0.08);
        osc.frequency.setValueAtTime(2760, now + 0.16);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.16, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(g);
        this.routeSfxNode(g, 0.35);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // ignore audio context block
    }
  }
}

export const broadcastAudio = new BroadcastAudioEngine();

export function playBroadcastStinger(stingerId: string) {
  broadcastAudio.playTvEffect(stingerId);
}

export interface MicAnalyzerHandle {
  stop: () => void;
  getLevelDb: () => number;
}

export async function startMicLevelMonitor(): Promise<MicAnalyzerHandle> {
  const id = '__afv_monitor__';
  await broadcastAudio.connectMicrophone(id, undefined, -3, false);
  return {
    getLevelDb: () => broadcastAudio.getChannelLevelDb(id) ?? -60,
    stop: () => broadcastAudio.disconnectMicrophone(id),
  };
}
