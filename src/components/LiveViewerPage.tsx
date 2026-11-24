import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Gift,
  Handshake,
  Home,
  Maximize2,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Radio,
  Send,
  Store,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DEFAULT_SPONSOR_BANNERS,
  OFFICIAL_PRODUCER_LOGO,
  OFFICIAL_SINFILTRO_LOGO,
  WHATSAPP_DISPLAY,
  WHATSAPP_NUMBER,
  getSponsorWhatsAppUrl,
} from '../data/tvTemplates';
import {
  OverlayState,
  SponsorBanner,
  ViewerComment,
} from '../types/broadcast';
import { ProducerProgram, StaffUserPublic } from '../types/producer';
import { ProgramVideosArchive } from './ProgramVideosArchive';

interface ViewerState {
  programId?: string;
  isLive: boolean;
  startedAt: number | null;
  showName: string;
  accentHex: string;
  activeScene: {
    id: string;
    name: string;
    cameraLabel: string;
    cameraType: string;
    layoutMode: string;
    slateColor?: string;
    slateHeadline?: string;
    description?: string;
  };
  overlays: OverlayState;
  sponsors?: SponsorBanner[];
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

function boostVideoBitrateSdp(sdp: string): string {
  const lines = sdp.split('\r\n');
  const out: string[] = [];
  let inVideo = false;
  let addedBandwidth = false;
  for (const line of lines) {
    if (line.startsWith('m=video ')) {
      inVideo = true;
      addedBandwidth = false;
      out.push(line);
      continue;
    }
    if (line.startsWith('m=')) {
      inVideo = false;
    }
    if (inVideo && line.startsWith('c=IN ') && !addedBandwidth) {
      out.push(line);
      out.push('b=AS:4500');
      addedBandwidth = true;
      continue;
    }
    if (inVideo && line.startsWith('a=fmtp:')) {
      if (!line.includes('x-google-start-bitrate')) {
        out.push(
          `${line};x-google-min-bitrate=1200;x-google-start-bitrate=2500;x-google-max-bitrate=4500`
        );
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\r\n');
}

function getSlotIcon(idx: number) {
  if (idx % 3 === 0) return <Megaphone className="w-7 h-7 text-slate-400" />;
  if (idx % 3 === 1) return <Store className="w-7 h-7 text-slate-400" />;
  return <Handshake className="w-7 h-7 text-slate-400" />;
}

interface LiveViewerPageProps {
  programId?: string;
  authToken?: string | null;
  currentUser?: StaffUserPublic | null;
  onRequestAuth?: () => void;
  onOpenApartado?: (programId: string) => void;
  onBack?: () => void;
  onHome?: () => void;
}

export const LiveViewerPage: React.FC<LiveViewerPageProps> = ({
  programId = 'sin-filtro',
  authToken = null,
  currentUser = null,
  onRequestAuth,
  onOpenApartado,
  onBack,
  onHome,
}) => {
  const activeProgramId = programId || 'sin-filtro';
  const [programs, setPrograms] = useState<ProducerProgram[]>([]);
  const [siteWhatsappNumber, setSiteWhatsappNumber] = useState<string>(WHATSAPP_NUMBER);
  const [siteWhatsappDisplay, setSiteWhatsappDisplay] = useState<string>(WHATSAPP_DISPLAY);
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [hasFallbackFrame, setHasFallbackFrame] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [rtcConnected, setRtcConnected] = useState(false);
  const [rtcVideoReady, setRtcVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [relayAudioActive, setRelayAudioActive] = useState(false);

  // Live Comments State
  const [comments, setComments] = useState<ViewerComment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentLocation, setCommentLocation] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const latestFrameRef = useRef<string | null>(null);
  const frameDecodeTicketRef = useRef<number>(0);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const commentSectionRef = useRef<HTMLElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const rtcConnectedRef = useRef(rtcConnected);
  rtcConnectedRef.current = rtcConnected;
  const rtcVideoReadyRef = useRef(rtcVideoReady);
  rtcVideoReadyRef.current = rtcVideoReady;
  const hasFallbackFrameRef = useRef(hasFallbackFrame);
  hasFallbackFrameRef.current = hasFallbackFrame;
  const relayActiveRef = useRef(false);

  const clientIdRef = useRef<string>(
    `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );

  useEffect(() => {
    fetch('/api/producer/programs')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.programs)) setPrograms(d.programs);
      })
      .catch(() => {});

    fetch('/api/producer/site')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.siteContent) {
          if (d.siteContent.whatsappNumber) {
            setSiteWhatsappNumber(String(d.siteContent.whatsappNumber).replace(/\D/g, '') || WHATSAPP_NUMBER);
          }
          if (d.siteContent.whatsappDisplay) {
            setSiteWhatsappDisplay(String(d.siteContent.whatsappDisplay));
          }
        }
      })
      .catch(() => {});
  }, []);

  const ensureViewerAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new Ctor({ latencyHint: 'interactive' });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const handleEnableSound = () => {
    setMuted(false);
    mutedRef.current = false;
    ensureViewerAudioContext();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    if (muted) {
      handleEnableSound();
    } else {
      setMuted(true);
      mutedRef.current = true;
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  };

  useEffect(() => {
    // Reset viewer stream state cleanly when switching programs
    setViewerState(null);
    latestFrameRef.current = null;
    hasFallbackFrameRef.current = false;
    setHasFallbackFrame(false);
    setRtcConnected(false);
    setRtcVideoReady(false);
    setRelayAudioActive(false);
    relayActiveRef.current = false;
    pendingIceRef.current = [];
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const clientId = clientIdRef.current;
    const qp = encodeURIComponent(activeProgramId);

    fetch(`/api/broadcast/state?programId=${qp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.state) setViewerState(data.state);
        if (data.frame) {
          latestFrameRef.current = data.frame;
          if (frameImgRef.current) frameImgRef.current.src = data.frame;
          hasFallbackFrameRef.current = true;
          setHasFallbackFrame(true);
        }
        if (typeof data.audienceCount === 'number') {
          setAudienceCount(data.audienceCount);
        }
        if (Array.isArray(data.comments)) setComments(data.comments);
      })
      .catch(() => {});

    const es = new EventSource(
      `/api/broadcast/events?role=viewer&clientId=${encodeURIComponent(
        clientId
      )}&programId=${qp}`
    );

    const sendSignal = (type: string, payload: unknown) => {
      fetch(`/api/rtc/signal?programId=${qp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: activeProgramId,
          targetId: 'broadcaster',
          fromId: clientId,
          type,
          payload,
        }),
      }).catch(() => {});
    };

    const ensurePeer = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        try {
          pc.getReceivers().forEach((receiver) => {
            const r = receiver as RTCRtpReceiver & {
              playoutDelayHint?: number;
              jitterBufferTarget?: number;
            };
            if ('playoutDelayHint' in r) r.playoutDelayHint = 0.06;
            if ('jitterBufferTarget' in r) r.jitterBufferTarget = 60;
          });
        } catch {
          // ignore unsupported receiver hints
        }
        if (videoRef.current && ev.streams[0]) {
          if (videoRef.current.srcObject !== ev.streams[0]) {
            videoRef.current.srcObject = ev.streams[0];
          }
          videoRef.current.muted = mutedRef.current;
          videoRef.current.volume = 1;
          videoRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendSignal('ice', ev.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setRtcConnected(true);
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setRtcConnected(false);
          setRtcVideoReady(false);
        }
      };

      return pc;
    };

    es.addEventListener('init', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        if (data.state) setViewerState(data.state);
        if (data.frame) {
          latestFrameRef.current = data.frame;
          if (frameImgRef.current) frameImgRef.current.src = data.frame;
          hasFallbackFrameRef.current = true;
          setHasFallbackFrame(true);
        }
        if (typeof data.audienceCount === 'number') {
          setAudienceCount(data.audienceCount);
        }
        if (Array.isArray(data.comments)) setComments(data.comments);
      } catch {
        // ignore
      }
    });

    es.addEventListener('state', (ev) => {
      try {
        const next = JSON.parse((ev as MessageEvent).data) as ViewerState;
        setViewerState(next);
        if (!next.isLive) {
          latestFrameRef.current = null;
          hasFallbackFrameRef.current = false;
          setHasFallbackFrame(false);
          setRtcConnected(false);
          setRtcVideoReady(false);
          setRelayAudioActive(false);
          relayActiveRef.current = false;
          pendingIceRef.current = [];
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('frame', (ev) => {
      try {
        if (rtcVideoReadyRef.current) return;
        const data = JSON.parse((ev as MessageEvent).data) as { frame?: string };
        const nextFrame = data.frame;
        if (!nextFrame) return;

        latestFrameRef.current = nextFrame;
        if (!hasFallbackFrameRef.current) {
          hasFallbackFrameRef.current = true;
          setHasFallbackFrame(true);
        }

        const ticket = ++frameDecodeTicketRef.current;
        const preloader = new Image();
        preloader.src = nextFrame;
        const commitFrame = () => {
          if (
            ticket === frameDecodeTicketRef.current &&
            frameImgRef.current &&
            !rtcVideoReadyRef.current
          ) {
            frameImgRef.current.src = nextFrame;
          }
        };
        if (typeof preloader.decode === 'function') {
          preloader.decode().then(commitFrame).catch(commitFrame);
        } else {
          commitFrame();
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('comments', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          comments?: ViewerComment[];
        };
        if (Array.isArray(data.comments)) setComments(data.comments);
      } catch {
        // ignore
      }
    });

    es.addEventListener('audio', (ev) => {
      try {
        if (!relayActiveRef.current) {
          relayActiveRef.current = true;
          setRelayAudioActive(true);
        }
        if (rtcConnectedRef.current || mutedRef.current) return;
        const data = JSON.parse((ev as MessageEvent).data) as {
          pcm16?: string;
          sampleRate?: number;
        };
        if (!data.pcm16 || !data.sampleRate) return;

        const ctx = ensureViewerAudioContext();
        if (ctx.state === 'suspended') return;

        const bin = atob(data.pcm16);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        const int16 = new Int16Array(bytes.buffer);
        const audioBuffer = ctx.createBuffer(1, int16.length, data.sampleRate);
        const channel = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16.length; i++) {
          channel[i] = int16[i] / 32768;
        }

        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(ctx.destination);

        const now = ctx.currentTime;
        if (nextPlayTimeRef.current < now || nextPlayTimeRef.current > now + 0.075) {
          nextPlayTimeRef.current = now + 0.015;
        }
        src.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
      } catch {
        // ignore
      }
    });

    es.addEventListener('presence', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          audienceCount?: number;
        };
        if (typeof data.audienceCount === 'number') {
          setAudienceCount(data.audienceCount);
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('rtc-signal', async (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as {
          type: string;
          payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
        };
        if (msg.type === 'offer') {
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
            pendingIceRef.current = [];
            setRtcConnected(false);
            setRtcVideoReady(false);
          }
          const pc = ensurePeer();
          await pc.setRemoteDescription(
            new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit)
          );
          while (pendingIceRef.current.length > 0) {
            const c = pendingIceRef.current.shift()!;
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          const answer = await pc.createAnswer();
          const boostedAnswer: RTCSessionDescriptionInit = {
            type: answer.type,
            sdp: answer.sdp ? boostVideoBitrateSdp(answer.sdp) : answer.sdp,
          };
          await pc.setLocalDescription(boostedAnswer);
          sendSignal('answer', boostedAnswer);
        } else if (msg.type === 'ice') {
          const cand = msg.payload as RTCIceCandidateInit;
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
          } else {
            pendingIceRef.current.push(cand);
          }
        }
      } catch {
        // ignore signaling race
      }
    });

    return () => {
      es.close();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [activeProgramId]);

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const activeCatalogProgram = programs.find((p) => p.id === activeProgramId);
  const showName =
    viewerState?.showName || activeCatalogProgram?.title || '#SinFiltro';
  const accentHex = viewerState?.accentHex || '#16A34A';
  const logoUrl =
    viewerState?.overlays?.logoUrl ||
    activeCatalogProgram?.logoUrl ||
    (activeProgramId === 'sin-filtro'
      ? OFFICIAL_SINFILTRO_LOGO
      : OFFICIAL_PRODUCER_LOGO);
  const isLive = Boolean(viewerState?.isLive);
  const sponsors =
    viewerState?.sponsors && viewerState.sponsors.length > 0
      ? viewerState.sponsors
      : DEFAULT_SPONSOR_BANNERS;

  const cleanWaDigits =
    (siteWhatsappNumber || WHATSAPP_NUMBER).replace(/\D/g, '') || WHATSAPP_NUMBER;

  const whatsappContactUrl =
    activeProgramId === 'sin-filtro'
      ? `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
          'Hola #SinFiltro, quiero mandar un mensaje a la radio.'
        )}`
      : `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
          `Hola ${showName}, quiero mandar un mensaje al programa.`
        )}`;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentMessage.trim()) return;
    setSendingComment(true);
    setCommentFeedback(null);
    try {
      const res = await fetch(
        `/api/broadcast/comments?programId=${encodeURIComponent(activeProgramId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programId: activeProgramId,
            author: commentAuthor.trim(),
            location: commentLocation.trim(),
            message: commentMessage.trim(),
          }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        if (Array.isArray(data.comments)) setComments(data.comments);
        setCommentMessage('');
        setCommentFeedback(`¡Tu comentario fue enviado a la mesa de ${showName}!`);
        window.setTimeout(() => setCommentFeedback(null), 3500);
      }
    } catch {
      setCommentFeedback('No se pudo enviar tu comentario. Intentá nuevamente.');
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050806] text-slate-100 flex flex-col">
      {/* Clean Public Broadcast Header */}
      <header className="border-b border-white/10 bg-[#080E0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoUrl}
              alt={showName}
              className="h-11 w-auto object-contain shrink-0"
            />
            <span className="font-display text-lg font-bold tracking-tight text-white truncate">
              {showName}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span
              className={`px-2.5 py-1 font-mono font-semibold rounded ${
                isLive
                  ? 'bg-red-600 text-white'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {isLive ? 'EN VIVO' : 'EN ESPERA'}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300 font-mono font-semibold tabular-nums">
              <Users className="w-3.5 h-3.5" />
              <span>{audienceCount.toLocaleString('es-AR')}</span>
            </span>
            {onOpenApartado ? (
              <button
                type="button"
                onClick={() => onOpenApartado(activeProgramId)}
                className="min-h-[34px] px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 rounded-md inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Apartado</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href={`/?programa=${encodeURIComponent(activeProgramId)}`}
                className="min-h-[34px] px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 rounded-md inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Apartado</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="min-h-[34px] px-2.5 py-1 border border-white/15 hover:border-white/30 bg-white/5 text-slate-200 rounded-md inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver atrás</span>
              </button>
            )}
            {onHome ? (
              <button
                type="button"
                onClick={onHome}
                className="min-h-[34px] px-2.5 py-1 border border-white/15 hover:border-white/30 bg-white/5 text-slate-200 rounded-md inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </button>
            ) : (
              <a
                href="/"
                className="min-h-[34px] px-2.5 py-1 border border-white/15 hover:border-white/30 bg-white/5 text-slate-200 rounded-md inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Player Viewport + Programas Anteriores + Espacio Publicitario + Comentarios */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        <div className="space-y-4">
          {/* 16:9 Live Broadcast Player */}
          <div
            ref={playerContainerRef}
            className="relative aspect-video w-full bg-black border rounded-2xl overflow-hidden shadow-2xl"
            style={{ borderColor: isLive ? accentHex : 'rgba(255,255,255,0.12)' }}
          >
            {/* Live WebRTC Video + Audio */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
              onPlaying={() => setRtcVideoReady(true)}
              onCanPlay={() => setRtcVideoReady(true)}
              onLoadedData={() => setRtcVideoReady(true)}
              className={`absolute inset-0 w-full h-full object-contain bg-black z-10 ${
                rtcVideoReady && isLive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Real-Time Server-Relayed Frame Stream Fallback */}
            {isLive && !rtcVideoReady && hasFallbackFrame && (
              <img
                ref={frameImgRef}
                src={latestFrameRef.current || undefined}
                alt={`${showName} transmisión en vivo`}
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            )}

            {/* Standby / Waiting Screen */}
            {(!isLive || (!rtcVideoReady && !hasFallbackFrame)) && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${accentHex}33 0%, #060A07 75%)`,
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={showName}
                    className="h-28 sm:h-36 w-auto object-contain mb-3 drop-shadow-2xl"
                  />
                ) : (
                  <Radio
                    className="w-10 h-10 mb-3"
                    style={{ color: accentHex }}
                  />
                )}
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {showName}
                </h1>
                <p className="mt-2 text-sm text-slate-300 max-w-md">
                  {isLive
                    ? 'Conectando señal de video y audio en directo...'
                    : 'La transmisión comenzará en instantes. Quedate conectado o mirá los programas anteriores debajo.'}
                </p>
              </div>
            )}

            {/* Sound Activation Prompt when Live & Muted */}
            {isLive && muted && (
              <div className="absolute top-3 left-3 z-20">
                <button
                  type="button"
                  onClick={handleEnableSound}
                  className="min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xl border border-emerald-300/40 flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Activar Sonido en Vivo</span>
                </button>
              </div>
            )}

            {/* Player Controls Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={handleToggleSound}
                className="min-h-[38px] px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-medium rounded-lg border border-white/15 flex items-center gap-1.5 cursor-pointer"
              >
                {muted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-amber-400" />
                    <span>Activar Sonido</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Sonido Activo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-label="Pantalla completa"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center bg-black/80 hover:bg-black text-white rounded-lg border border-white/15 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Broadcast Info Strip + WhatsApp Contact Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-[#0A110D] border border-white/10 rounded-xl text-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <span className="font-semibold text-white">{showName}</span>
                {(() => {
                  const rawTitle = (
                    viewerState?.overlays?.lowerThirdTitle || ''
                  )
                    .replace(/Camila Rodr[ií]guez\s*·?\s*/gi, '')
                    .trim();
                  const isRedundant =
                    !rawTitle ||
                    rawTitle.toLowerCase() === showName.toLowerCase() ||
                    rawTitle.toLowerCase() === `${showName.toLowerCase()} en vivo`;
                  const subtitleLabel = isRedundant
                    ? 'Programa en Vivo'
                    : rawTitle;
                  return (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{subtitleLabel}</span>
                    </>
                  );
                })()}
                <span aria-hidden="true">·</span>
                <span className="font-mono text-emerald-400">
                  {rtcVideoReady
                    ? 'Audio + Video WebRTC HD'
                    : isLive
                    ? relayAudioActive
                      ? 'Audio + Video en Vivo'
                      : 'Señal en Vivo'
                    : 'En espera'}
                </span>
              </div>
              <p className="text-slate-400">
                {viewerState?.overlays?.lowerThirdSubtitle ||
                  activeCatalogProgram?.schedule ||
                  'Sábados de 17:00 a 19:00 · Radioactiva 88.5 Puerto Esperanza'}
              </p>
            </div>

            <a
              href={whatsappContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-lg shadow-emerald-950/50 flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {activeProgramId === 'sin-filtro'
                  ? 'Comunicate con #SIN FILTRO'
                  : `Comunicate con ${showName}`}
              </span>
            </a>
          </div>

          {/* Interactive Live Giveaway / Trivia Card */}
          {viewerState?.overlays?.giveaway &&
            viewerState.overlays.giveaway.stage !== 'hidden' && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  viewerState.overlays.giveaway.stage === 'winner'
                    ? 'bg-amber-950/35 border-amber-400/70'
                    : 'bg-[#09150E] border-emerald-500/45'
                }`}
              >
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold">
                    {viewerState.overlays.giveaway.stage === 'winner' ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300">¡GANADOR/A EN VIVO!</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-3.5 h-3.5" />
                        <span>{viewerState.overlays.giveaway.title}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {viewerState.overlays.giveaway.stage === 'winner'
                      ? `${viewerState.overlays.giveaway.winnerName} ganó: ${viewerState.overlays.giveaway.prize}`
                      : `Premio: ${viewerState.overlays.giveaway.prize}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    {viewerState.overlays.giveaway.stage === 'winner'
                      ? viewerState.overlays.giveaway.winnerNote ||
                        '¡Felicitaciones! Comunicate por WhatsApp.'
                      : viewerState.overlays.giveaway.promptText}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      commentSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }
                    className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Participar en Comentarios
                  </button>
                  <a
                    href={whatsappContactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
        </div>

        {/* PROGRAMAS ANTERIORES — Watch & Upload Past Episodes right on the emission page */}
        <ProgramVideosArchive
          programId={activeProgramId}
          programTitle={showName}
          authToken={authToken}
          currentUser={currentUser}
          onRequestAuth={onRequestAuth || (() => {})}
        />

        {/* ESPACIO PUBLICITARIO */}
        <section
          aria-labelledby="advertising-heading"
          className="pt-2 space-y-6"
        >
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="text-[11px] font-mono font-semibold tracking-[0.16em] text-emerald-400">
              PAUTA COMERCIAL · ESPACIO DISPONIBLE
            </div>

            <h2
              id="advertising-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
            >
              ESPACIO PUBLICITARIO
            </h2>

            <p className="text-xs sm:text-sm text-slate-400">
              Espacio disponible para comercios, marcas y emprendimientos que acompañan el programa {showName}. Consultas directas por WhatsApp al {siteWhatsappDisplay}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sponsors.map((sp, idx) => {
              const bannerWhatsAppUrl = getSponsorWhatsAppUrl(
                idx + 1,
                cleanWaDigits,
                showName
              );

              return (
                <article
                  key={sp.id}
                  className="bg-[#070B08] border border-emerald-600/35 hover:border-emerald-500/60 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="w-full aspect-[16/10] bg-[#020303] border border-white/8 rounded-xl flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                      {sp.isOccupied && sp.logoUrl ? (
                        <img
                          src={sp.logoUrl}
                          alt={sp.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : sp.isOccupied ? (
                        <div className="space-y-1.5">
                          <span className="px-2.5 py-0.5 bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold rounded">
                            {sp.badgeText || 'AUSPICIANTE OFICIAL'}
                          </span>
                          <p className="font-display text-lg font-bold text-white">
                            {sp.name}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 flex flex-col items-center">
                          {getSlotIcon(idx)}
                          <div>
                            <p className="font-display text-sm font-extrabold tracking-wide text-white">
                              {sp.slotLabel}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {sp.badgeText || 'Espacio publicitario disponible'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 px-0.5">
                      <h3 className="font-display text-base font-bold text-white leading-snug">
                        {sp.name}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {sp.message}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <a
                      href={bannerWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[42px] px-4 py-2 bg-[#0D1310] hover:bg-emerald-600/20 border border-white/12 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>{sp.ctaText || 'Pedir espacio por WhatsApp'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* COMUNIDAD — Comentarios del Público */}
        <section
          ref={commentSectionRef}
          aria-labelledby="community-heading"
          className="pt-4 border-t border-emerald-500/20 space-y-6 pb-8"
        >
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold tracking-[0.16em] text-emerald-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>COMUNIDAD {showName.toUpperCase()}</span>
            </div>

            <h2
              id="community-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
            >
              Tu Opinión Cuenta: Dejá tu Comentario
            </h2>

            <p className="text-xs sm:text-sm text-slate-400">
              Participá de los temas del programa, dejá tus saludos para la mesa o proponé nuevos debates para {showName}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form
              onSubmit={handleSubmitComment}
              className="lg:col-span-5 bg-[#080D0A] border border-emerald-500/25 rounded-2xl p-5 space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Tu Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    required
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Ej: Sofía G."
                    className="w-full px-3 py-2 bg-[#040705] border border-white/12 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Barrio / Localidad
                  </label>
                  <input
                    type="text"
                    value={commentLocation}
                    onChange={(e) => setCommentLocation(e.target.value)}
                    placeholder="Ej: Puerto Esperanza"
                    className="w-full px-3 py-2 bg-[#040705] border border-white/12 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Tu Comentario o Saludo para la Mesa
                </label>
                <textarea
                  rows={3}
                  required
                  value={commentMessage}
                  onChange={(e) => setCommentMessage(e.target.value)}
                  placeholder={`Escribí tu mensaje para ${showName}...`}
                  className="w-full px-3 py-2 bg-[#040705] border border-white/12 rounded-lg text-xs text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              {commentFeedback && (
                <p className="text-xs text-emerald-300 font-medium">
                  {commentFeedback}
                </p>
              )}

              <button
                type="submit"
                disabled={sendingComment}
                className="w-full min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>
                  {sendingComment ? 'Enviando...' : 'Enviar Comentario'}
                </span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              {comments.length === 0 ? (
                <div className="p-6 bg-[#080D0A] border border-white/10 rounded-2xl text-center text-xs text-slate-400">
                  Sé el primero en dejar tu comentario para la mesa de {showName}.
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 bg-[#080D0A] border border-white/10 rounded-xl space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {c.author}
                          </span>
                          {c.location && (
                            <span className="px-2 py-0.5 bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono rounded">
                              {c.location}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(c.createdAt).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {c.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050708] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Una producción original de{' '}
            <span className="text-slate-200 font-semibold">
              JUGEND FÜR EINE GRÜNE ZUKUNFT
            </span>{' '}
            · Fundada el 20/11/2026 ·{' '}
            <span className="text-emerald-300 font-medium">
              Dueño y Creador: ALMADA EDUARDO THOMAS
            </span>
          </div>
          <a
            href="/"
            className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4"
          >
            Conocer la productora
          </a>
        </div>
      </footer>
    </div>
  );
};
