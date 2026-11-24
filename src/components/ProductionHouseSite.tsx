import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clapperboard,
  Clock,
  Edit3,
  Eye,
  Film,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Mic2,
  MonitorPlay,
  Plus,
  Radio,
  Shield,
  Tv,
  X,
} from 'lucide-react';
import {
  WHATSAPP_DISPLAY,
  getProducerWhatsAppUrl,
  getSponsorWhatsAppUrl,
} from '../data/tvTemplates';
import {
  PRODUCER_ROLES,
  ProducerProgram,
  SiteContentConfig,
  StaffUserPublic,
} from '../types/producer';
import { ProducerAdminPanel } from './ProducerAdminPanel';
import { ProducerSiteEditor } from './ProducerSiteEditor';
import { ProgramQuickEditModal } from './ProgramQuickEditModal';
import { ProgramVideosArchive } from './ProgramVideosArchive';

interface ProductionHouseSiteProps {
  authToken: string | null;
  currentUser: StaffUserPublic | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenStudio: (programId?: string) => void;
  onOpenLive: (programId?: string) => void;
}

type SiteViewState =
  | { kind: 'home' }
  | { kind: 'live-hub' }
  | { kind: 'program-detail'; programId: string }
  | { kind: 'admin-panel' }
  | { kind: 'site-editor' };

type ProgramFilter = 'all' | 'airing' | 'development';

const FALLBACK_CONTENT: SiteContentConfig = {
  brandName: 'JUGEND FÜR EINE GRÜNE ZUKUNFT',
  ownerName: 'ALMADA EDUARDO THOMAS',
  foundingDateText: '20 de noviembre de 2026',
  locationText: 'Puerto Esperanza, Misiones',
  mottoText: 'Licht, Kamera, Action!',
  logoUrl: '/assets/aistudio/jz-logo-transparent.png',
  heroImageUrl: '/src/assets/images/hero_production_set_1795376282591.jpg',
  heroHeadline:
    'Productora audiovisual de programas con identidad propia y dirección en vivo',
  heroDescription:
    'JUGEND FÜR EINE GRÜNE ZUKUNFT nace el 20 de noviembre de 2026 para concebir, dirigir y emitir formatos propios de televisión, radio visual y documentales con estética cinematográfica y tecnología de transmisión directa en alta definición.',
  heroPrimaryCta: 'Explorar Programas',
  heroSecondaryCta: 'Ver Emisiones en Vivo',
  emblemTagline: 'Juventud por un Futuro Verde',
  emblemCategory: 'CASA PRODUCTORA',
  dossierMetrics: [
    { label: 'Fecha de nacimiento', value: '20/11/2026' },
    { label: 'Formación audiovisual', value: 'TV, Radio Visual y Cine' },
    { label: 'Ingeniería de emisión', value: '1280×720 HD · 30 FPS' },
    { label: 'Frecuencia aliada', value: 'Radioactiva 88.5 FM', accent: true },
  ],
  manifestoEyebrow: '01. MANIFIESTO FUNDACIONAL · 20 DE NOVIEMBRE DE 2026',
  manifestoTitle:
    'Una productora creada para que los programas jóvenes tengan altura televisiva',
  manifestoBody:
    'El 20 de noviembre de 2026 formalizamos un proyecto que venía tomando forma: reunir dirección audiovisual, tecnología propia de transmisión en vivo y una agenda comprometida con el ambiente y la comunidad bajo una sola casa productora.',
  manifestoImageUrl: '/src/assets/images/service_cinema_rig_1795376283166.jpg',
  manifestoPillars: [
    {
      title: '01. Estética y rigor',
      description:
        'Cada emisión se piensa como una pieza de pantalla grande: encuadres cuidados, micrófonos dedicados, iluminación escénica y gráfica televisiva limpia.',
    },
    {
      title: '02. Tecnología propia',
      description:
        'No dependemos de terceros para salir al aire: desarrollamos nuestra mesa de control integrada con OBS Studio, WebRTC HD y participación interactiva.',
    },
    {
      title: '03. Futuro verde con voz',
      description:
        'Jugend für eine grüne Zukunft significa Juventud por un Futuro Verde: producimos contenidos que abren debate, dan lugar al talento local y multiplican causas reales.',
    },
  ],
  programsEyebrow: '02. CARTELERA Y FORMATOS ORIGINALES',
  programsTitle: 'Programas en el aire y nuevos ciclos de la productora',
  programsSubtitle:
    'Nuestra casa productora produce ciclos propios de televisión, radio visual y documentales, y recibe propuestas para crear nuevos programas originales.',
  servicesEyebrow: '03. CAPACIDADES DE PRODUCCIÓN E INGENIERÍA PROPIA',
  servicesTitle: 'Del guion al aire en un ecosistema integrado',
  controlRoomImageUrl: '/src/assets/images/service_control_room_1795376283734.jpg',
  controlRoomEyebrow: 'CONSOLA DIGITAL MESACONTROL TV',
  controlRoomTitle: 'Operación en vivo',
  controlRoomBody:
    'Nuestra productora opera con consola digital propia para manejar cámaras USB/IP, micrófonos en tiempo real, escaletas automáticas, cortinas sonoras de TV y placas gráficas sin retraso.',
  capabilities: [
    {
      index: '01',
      title: 'Creación y Dirección de Programas',
      description:
        'Diseñamos la estructura editorial, escaleta minuto a minuto, puesta de luces y dirección artística de programas semanales de TV, radio visual y streaming.',
      deliverable: 'Biblia de formato, escaleta y operación completa',
    },
    {
      index: '02',
      title: 'Realización Multicámara y Sincronización OBS',
      description:
        'Operamos con consola propia MesaControl TV sincronizada con OBS Studio: conmutación automática, escenas PIP, deck táctil e integración directa de cámaras y audio.',
      deliverable: 'Señal 1280×720 HD a 30 FPS con latencia mínima',
    },
    {
      index: '03',
      title: 'Gráfica Televisiva y Comercial en Tiempo Real',
      description:
        'Zócalos dinámicos, titulares de último momento, placas de bienvenida para invitados, sorteos interactivos en vivo y banners de auspiciantes listos para pautar.',
      deliverable: 'Paquete gráfico dinámico y gestión de pauta comercial',
    },
    {
      index: '04',
      title: 'Cobertura de Eventos y Cápsulas Documentales',
      description:
        'Registro audiovisual en exteriores para instituciones, festivales, proyectos educativos y marcas que buscan comunicar con lenguaje cinematográfico real.',
      deliverable: 'Pieza master 16:9 + adaptaciones verticales',
    },
  ],
  alliancesEyebrow: '04. ALIANZAS COMERCIALES Y COPRODUCCIONES',
  alliancesTitle: 'Espacio real para marcas, comercios e instituciones',
  alliancesSubtitle:
    'Cada programa emitido por JUGEND FÜR EINE GRÜNE ZUKUNFT conecta anunciantes locales directamente con la audiencia mediante banners en pantalla, menciones en vivo y botones inmediatos de WhatsApp.',
  partnershipModels: [
    {
      index: '01',
      name: 'Auspicio en Programación Viva',
      detail:
        'Presencia visual en los banners debajo de nuestras transmisiones oficiales, mención en vivo y acceso directo al WhatsApp comercial de tu comercio.',
      actionLabel: 'Solicitar pauta comercial',
      topic: 'Auspicio Comercial',
    },
    {
      index: '02',
      name: 'Producción de Programa Propio',
      detail:
        'Ponemos cámaras, micrófonos, gráfica televisiva, dirección técnica y plataforma de streaming para que tu organización, medio o equipo lance su propio ciclo semanal.',
      actionLabel: 'Cotizar programa propio',
      topic: 'Producción de programa propio',
    },
    {
      index: '03',
      name: 'Coproducción Cultural y Ambiental',
      detail:
        'Alianzas con escuelas, colectivos juveniles e instituciones para documentar iniciativas ambientales, festivales y campañas educativas.',
      actionLabel: 'Proponer alianza',
      topic: 'Coproducción cultural o ambiental',
    },
  ],
  contactEyebrow: '05. MESA DE PRODUCCIÓN Y CONTACTO',
  contactTitle: 'Pongamos tu próximo programa en marcha',
  contactBody:
    'Escribinos para pautar en nuestros ciclos vigentes, producir un formato audiovisual nuevo o coordinar una reunión de producción.',
  whatsappDisplay: '+54 9 3757 30-0369',
  whatsappNumber: '5493757300369',
  contactEmail: 'produccion@jugendgruenezukunft.com',
  footerSubline:
    'Licht, Kamera, Action! · Fundada el 20/11/2026 · Puerto Esperanza, Misiones',
};

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
  icon?: 'film' | 'tv' | 'mic';
}

const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  icon = 'film',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#0B120E] via-[#090D0E] to-[#050708] border border-white/10 text-slate-400 p-6 text-center ${className}`}
      >
        {icon === 'tv' ? (
          <Tv className="w-8 h-8 text-emerald-500/80" />
        ) : icon === 'mic' ? (
          <Mic2 className="w-8 h-8 text-emerald-500/80" />
        ) : (
          <Film className="w-8 h-8 text-emerald-500/80" />
        )}
        <span className="text-xs font-medium text-slate-300">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const ProductionHouseSite: React.FC<ProductionHouseSiteProps> = ({
  authToken,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenStudio,
  onOpenLive,
}) => {
  const [siteContent, setSiteContent] =
    useState<SiteContentConfig>(FALLBACK_CONTENT);
  const [programs, setPrograms] = useState<ProducerProgram[]>([]);
  const [filter, setFilter] = useState<ProgramFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveRooms, setLiveRooms] = useState<
    Record<
      string,
      {
        isLive: boolean;
        audienceCount: number;
        viewerCount?: number;
        audienceMode?: 'real' | 'inflated';
        previewFrame?: string | null;
      }
    >
  >({});
  const [editingProgram, setEditingProgram] = useState<ProducerProgram | null>(
    null
  );

  const parseViewFromUrl = useCallback((): SiteViewState => {
    if (typeof window === 'undefined') return { kind: 'home' };
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('live') === '1' ||
      params.get('ver') === '1' ||
      params.get('studio') === '1' ||
      params.get('consola') === '1' ||
      params.get('overlay') === '1'
    ) {
      return { kind: 'home' };
    }
    if (params.get('emisiones') === '1') {
      return { kind: 'live-hub' };
    }
    const prog = (params.get('programa') || '').trim();
    if (prog) {
      return { kind: 'program-detail', programId: prog };
    }
    return { kind: 'home' };
  }, []);

  // View Stack for "Volver atrás" and "Volver al inicio" synced cleanly with URL params
  const [viewHistory, setViewHistory] = useState<SiteViewState[]>(() => [
    parseViewFromUrl(),
  ]);
  const currentView = viewHistory[viewHistory.length - 1];

  const syncBrowserUrl = useCallback((view: SiteViewState) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('programa');
    url.searchParams.delete('apartado');
    url.searchParams.delete('emisiones');
    if (view.kind === 'program-detail') {
      url.searchParams.set('programa', view.programId);
    } else if (view.kind === 'live-hub') {
      url.searchParams.set('emisiones', '1');
    }
    const nextUrl = `${url.pathname}${url.search}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseViewFromUrl();
      setViewHistory((prev) => [...prev.slice(-8), parsed]);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [parseViewFromUrl]);

  // Contact Inquiry Form State
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [contact, setContact] = useState('');
  const [projectType, setProjectType] = useState('Producción de Programa');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  // Program Creation Request Form State ("Pedir para crear programas")
  const [reqName, setReqName] = useState('');
  const [reqOrg, setReqOrg] = useState('');
  const [reqContact, setReqContact] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqFormat, setReqFormat] = useState('TV en Vivo + Radio Visual');
  const [reqSchedule, setReqSchedule] = useState('');
  const [reqTeam, setReqTeam] = useState('');
  const [reqEquipment, setReqEquipment] = useState('');
  const [reqSynopsis, setReqSynopsis] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqReceipt, setReqReceipt] = useState<string | null>(null);

  const refreshRooms = useCallback(() => {
    fetch('/api/broadcast/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.rooms)) {
          const map: Record<
            string,
            {
              isLive: boolean;
              audienceCount: number;
              viewerCount?: number;
              audienceMode?: 'real' | 'inflated';
              previewFrame?: string | null;
            }
          > = {};
          data.rooms.forEach(
            (rm: {
              programId: string;
              isLive: boolean;
              audienceCount: number;
              viewerCount?: number;
              audienceMode?: 'real' | 'inflated';
              previewFrame?: string | null;
            }) => {
              map[rm.programId] = {
                isLive: Boolean(rm.isLive),
                audienceCount:
                  typeof rm.audienceCount === 'number' ? rm.audienceCount : 0,
                viewerCount:
                  typeof rm.viewerCount === 'number' ? rm.viewerCount : 0,
                audienceMode: rm.audienceMode,
                previewFrame: rm.previewFrame || null,
              };
            }
          );
          setLiveRooms(map);
        }
      })
      .catch(() => {});
  }, []);

  const loadSiteData = useCallback(() => {
    fetch('/api/producer/site')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.siteContent) setSiteContent(d.siteContent);
      })
      .catch(() => {});

    fetch('/api/producer/programs')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.programs)) setPrograms(d.programs);
      })
      .catch(() => {});

    refreshRooms();
  }, [refreshRooms]);

  useEffect(() => {
    loadSiteData();
  }, [loadSiteData]);

  useEffect(() => {
    if (currentView.kind !== 'live-hub') return;
    refreshRooms();
    const id = window.setInterval(refreshRooms, 2500);
    return () => window.clearInterval(id);
  }, [currentView.kind, refreshRooms]);

  const pushView = useCallback(
    (next: SiteViewState) => {
      setMobileMenuOpen(false);
      setViewHistory((prev) => [...prev, next]);
      syncBrowserUrl(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [syncBrowserUrl]
  );

  const goBack = useCallback(() => {
    setViewHistory((prev) => {
      const nextStack = prev.length > 1 ? prev.slice(0, -1) : [{ kind: 'home' } as SiteViewState];
      syncBrowserUrl(nextStack[nextStack.length - 1]);
      return nextStack;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [syncBrowserUrl]);

  const goHome = useCallback(() => {
    setMobileMenuOpen(false);
    const homeView: SiteViewState = { kind: 'home' };
    setViewHistory([homeView]);
    syncBrowserUrl(homeView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [syncBrowserUrl]);

  const navigateToHomeSection = useCallback(
    (sectionId: string) => {
      setMobileMenuOpen(false);
      if (currentView.kind !== 'home') {
        const homeView: SiteViewState = { kind: 'home' };
        setViewHistory([homeView]);
        syncBrowserUrl(homeView);
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            document
              .getElementById(sectionId)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        });
      } else {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [currentView.kind, syncBrowserUrl]
  );

  const handleLogout = () => {
    onLogout();
    setViewHistory([{ kind: 'home' }]);
  };

  const handleSelectPartnershipTopic = (topic: string) => {
    setProjectType(topic);
    setSubmittedTicket(null);
    navigateToHomeSection('contacto');
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !contact.trim() || !message.trim()) {
      setFormError(
        'Por favor completá tu nombre, un email o WhatsApp y una breve descripción.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/producer/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          organization: organization.trim(),
          contact: contact.trim(),
          projectType,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormError(data.error || 'No se pudo registrar la consulta.');
        return;
      }
      setSubmittedTicket(data.inquiry?.id || 'JGFZ-OK');
      setName('');
      setOrganization('');
      setContact('');
      setMessage('');
    } catch {
      setFormError('Error de conexión al enviar la consulta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProgramRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);
    setReqReceipt(null);
    if (
      !reqName.trim() ||
      !reqContact.trim() ||
      !reqTitle.trim() ||
      !reqSynopsis.trim()
    ) {
      setReqError(
        'Completá tu nombre, contacto, título tentativo del programa y sinopsis.'
      );
      return;
    }
    setReqSubmitting(true);
    try {
      const res = await fetch('/api/producer/program-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: reqName.trim(),
          organization: reqOrg.trim(),
          contact: reqContact.trim(),
          proposedTitle: reqTitle.trim(),
          format: reqFormat,
          targetSchedule: reqSchedule.trim(),
          teamInfo: reqTeam.trim(),
          equipmentNeeds: reqEquipment.trim(),
          synopsis: reqSynopsis.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setReqError(data.error || 'No se pudo enviar tu solicitud.');
        return;
      }
      setReqReceipt(data.request?.id || 'REQ-OK');
      setReqName('');
      setReqOrg('');
      setReqContact('');
      setReqTitle('');
      setReqSchedule('');
      setReqTeam('');
      setReqEquipment('');
      setReqSynopsis('');
    } catch {
      setReqError('Error de conexión al enviar el proyecto.');
    } finally {
      setReqSubmitting(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'airing') return p.statusKey === 'airing';
    return p.statusKey !== 'airing';
  });

  const userPerms = currentUser ? PRODUCER_ROLES[currentUser.role] : null;
  const canEditPrograms = Boolean(
    userPerms &&
      (userPerms.canCreatePrograms ||
        userPerms.canOperateStudio ||
        userPerms.canEditSite)
  );

  // Dedicated Full-Page Views: Admin Panel or Full Site Editor
  if (currentView.kind === 'admin-panel' && authToken && currentUser) {
    return (
      <ProducerAdminPanel
        token={authToken}
        currentUser={currentUser}
        programs={programs}
        onProgramsUpdated={setPrograms}
        onOpenSiteEditor={() => pushView({ kind: 'site-editor' })}
        onOpenStudio={onOpenStudio}
        onOpenLive={onOpenLive}
        onOpenProgramApartado={(programId) =>
          pushView({ kind: 'program-detail', programId })
        }
        onBack={goBack}
        onHome={goHome}
      />
    );
  }

  if (
    currentView.kind === 'site-editor' &&
    authToken &&
    currentUser &&
    userPerms?.canEditSite
  ) {
    return (
      <ProducerSiteEditor
        token={authToken}
        currentUser={currentUser}
        siteContent={siteContent}
        onSiteContentUpdated={setSiteContent}
        onBack={goBack}
        onHome={goHome}
      />
    );
  }

  // Dedicated Apartado Return Bar Title
  const getApartadoTitle = (): string => {
    if (currentView.kind === 'live-hub') {
      return 'Emisiones en Vivo · Cartelera y Señales';
    }
    if (currentView.kind === 'program-detail') {
      const p = programs.find((x) => x.id === currentView.programId);
      return p ? `Programa · ${p.title}` : 'Ficha de Programa';
    }
    return '';
  };

  // Shared Renderers for Home Sections
  const renderManifestoSection = () => (
    <section
      id="manifiesto"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-28 border-b border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <div className="lg:col-span-5">
          <div className="group relative h-full min-h-[340px] rounded-2xl overflow-hidden border border-white/12 bg-[#0A0E10] shadow-2xl">
            <ResilientImage
              src={siteContent.manifestoImageUrl}
              alt="Cámara cinematográfica en rodaje de Jugend für eine grüne Zukunft"
              fallbackTitle="Equipamiento Cinematográfico"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050708] via-[#050708]/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-xs">
              <span className="font-mono text-emerald-400 tracking-wider">
                UNIDAD DE RODAJE · 4K / HD
              </span>
              <span className="text-slate-300 font-medium">
                {siteContent.locationText || 'Puerto Esperanza, Misiones'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-mono text-emerald-400 tracking-wider">
              {siteContent.manifestoEyebrow}
            </p>
            <h2
              className="font-cinema text-2xl sm:text-4xl font-semibold text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {siteContent.manifestoTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {siteContent.manifestoBody}
            </p>
            <p className="text-xs font-mono text-emerald-300 tracking-wider">
              Dueño y Creador: {siteContent.ownerName || 'ALMADA EDUARDO THOMAS'}
            </p>
          </div>

          <div className="divide-y divide-white/10 border-t border-b border-white/10">
            {siteContent.manifestoPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 group hover:bg-white/[0.02] px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="sm:col-span-4 text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {pillar.title}
                </div>
                <p className="sm:col-span-8 text-sm text-slate-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderProgramsSection = () => (
    <section
      id="programas"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-28 border-b border-white/10"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-mono text-emerald-400 tracking-wider">
            {siteContent.programsEyebrow}
          </p>
          <h2
            className="font-cinema text-2xl sm:text-4xl font-semibold text-white"
            style={{ textWrap: 'balance' }}
          >
            {siteContent.programsTitle}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {siteContent.programsSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <div
            role="group"
            aria-label="Filtrar programas por estado"
            className="inline-flex items-center gap-1 p-1 bg-[#0C1013] border border-white/10 rounded-lg"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'airing', label: 'En Emisión' },
                { id: 'development', label: 'En Desarrollo' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigateToHomeSection('pedir-programa')}
            className="min-h-[42px] px-4 py-2 border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-600 text-emerald-200 hover:text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Pedir Crear Programa</span>
          </button>

          {userPerms?.canCreatePrograms && (
            <button
              type="button"
              onClick={() => pushView({ kind: 'admin-panel' })}
              className="min-h-[42px] px-4 py-2 bg-white text-black hover:bg-slate-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <Clapperboard className="w-4 h-4" />
              <span>Crear / Gestionar</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {filteredPrograms.map((program) => {
          const room = liveRooms[program.id];
          return program.featured ? (
            <article
              key={program.id}
              className="group lg:col-span-12 bg-gradient-to-br from-[#0B120F] via-[#080C0E] to-[#06090B] border border-white/12 hover:border-emerald-500/35 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-xl transition-colors"
            >
              <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[360px] bg-black overflow-hidden">
                <ResilientImage
                  src={program.imageUrl || ''}
                  alt={program.title}
                  fallbackTitle={program.title}
                  icon="mic"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  {program.logoUrl ? (
                    <img
                      src={program.logoUrl}
                      alt={`Logo ${program.title}`}
                      referrerPolicy="no-referrer"
                      className="h-14 sm:h-16 w-auto object-contain drop-shadow"
                    />
                  ) : (
                    <span className="font-cinema text-xl font-semibold text-white">
                      {program.title}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-200 tabular-nums">
                    {room?.isLive
                      ? `AL AIRE · ${room.audienceCount.toLocaleString('es-AR')} espectadores`
                      : program.channelOrSignal || 'EMISIÓN HD'}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="text-emerald-400 font-semibold">
                      {room?.isLive ? 'En vivo ahora' : program.statusLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{program.format}</span>
                    <span aria-hidden="true">·</span>
                    <span>{program.duration}</span>
                  </div>

                  <h3 className="font-cinema text-2xl sm:text-3xl font-semibold text-white">
                    {program.title}
                  </h3>

                  <p className="text-xs font-mono text-slate-300">
                    {program.schedule}
                  </p>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {program.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenLive(program.id)}
                    className="min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Ver Emisión y Archivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushView({
                        kind: 'program-detail',
                        programId: program.id,
                      })
                    }
                    className="min-h-[42px] px-4 py-2 border border-white/15 hover:border-white/30 text-slate-200 hover:text-white text-xs sm:text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Apartado y Videos
                  </button>

                  {userPerms?.canOperateStudio && (
                    <button
                      type="button"
                      onClick={() => onOpenStudio(program.id)}
                      className="min-h-[42px] px-3.5 py-2 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      <span>Emitir</span>
                    </button>
                  )}

                  {canEditPrograms && (
                    <button
                      type="button"
                      onClick={() => setEditingProgram(program)}
                      className="min-h-[42px] px-3.5 py-2 border border-white/15 hover:border-white/35 text-slate-300 hover:text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ) : (
            <article
              key={program.id}
              className="group lg:col-span-4 bg-[#090D0F] border border-white/10 hover:border-emerald-500/35 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-lg"
            >
              <div className="relative aspect-[16/9] bg-black overflow-hidden border-b border-white/10">
                <ResilientImage
                  src={program.imageUrl || siteContent.heroImageUrl}
                  alt={program.title}
                  fallbackTitle={program.title}
                  icon="tv"
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-slate-200 truncate">
                    {program.channelOrSignal || 'Streaming JZ'}
                  </span>
                  {room?.isLive && (
                    <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded shrink-0">
                      AL AIRE · {room.audienceCount.toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="text-emerald-400 font-medium">
                      {room?.isLive ? 'En vivo ahora' : program.statusLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{program.duration}</span>
                  </div>

                  <h3 className="font-cinema text-xl font-semibold text-white">
                    {program.title}
                  </h3>

                  <p className="text-xs font-mono text-slate-400">
                    {program.format} · {program.schedule}
                  </p>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {program.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      pushView({
                        kind: 'program-detail',
                        programId: program.id,
                      })
                    }
                    className="min-h-[38px] text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Apartado y Videos</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenLive(program.id)}
                      className="text-xs font-medium text-slate-200 hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Emisión
                    </button>
                    {userPerms?.canOperateStudio && (
                      <button
                        type="button"
                        onClick={() => onOpenStudio(program.id)}
                        className="text-xs font-medium text-emerald-300 hover:text-emerald-200 underline underline-offset-4 cursor-pointer"
                      >
                        Emitir
                      </button>
                    )}
                    {canEditPrograms && (
                      <button
                        type="button"
                        onClick={() => setEditingProgram(program)}
                        className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderServicesSection = () => (
    <section
      id="servicios"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-28 border-b border-white/10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-mono text-emerald-400 tracking-wider">
            {siteContent.servicesEyebrow}
          </p>
          <h2
            className="font-cinema text-2xl sm:text-4xl font-semibold text-white"
            style={{ textWrap: 'balance' }}
          >
            {siteContent.servicesTitle}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0C1210] to-[#080B0D] border border-white/12 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="relative aspect-[4/3] bg-black overflow-hidden">
            <ResilientImage
              src={siteContent.controlRoomImageUrl}
              alt="Consola digital MesaControl TV"
              fallbackTitle="Consola MesaControl TV"
              icon="tv"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1210] via-transparent to-transparent" />
          </div>
          <div className="p-6 sm:p-8 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-mono text-emerald-400">
                {siteContent.controlRoomEyebrow}
              </div>
              <h3 className="font-cinema text-xl sm:text-2xl font-semibold text-white">
                {siteContent.controlRoomTitle}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {siteContent.controlRoomBody}
              </p>
            </div>

            {userPerms?.canOperateStudio ? (
              <button
                type="button"
                onClick={() => onOpenStudio()}
                className="min-h-[42px] px-5 py-2.5 bg-white text-black hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors self-start whitespace-nowrap"
              >
                <MonitorPlay className="w-4 h-4" />
                <span>Abrir MesaControl TV</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToHomeSection('pedir-programa')}
                className="min-h-[42px] px-5 py-2.5 border border-emerald-500/45 bg-emerald-950/40 hover:bg-emerald-600 text-emerald-200 hover:text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors self-start whitespace-nowrap"
              >
                <Clapperboard className="w-4 h-4" />
                <span>Pedir Crear un Programa</span>
              </button>
            )}
          </div>
        </div>

        {/* Asymmetric Editorial Bento Grid for Production Capabilities */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-5">
          {siteContent.capabilities.map((cap, idx) => {
            const spanClass =
              idx === 0 || idx === 3 ? 'sm:col-span-7' : 'sm:col-span-5';
            const surfaceClass =
              idx === 0
                ? 'bg-gradient-to-br from-[#0B1510] to-[#080B0D] border-emerald-500/25'
                : 'bg-[#090D0F] border-white/10 hover:border-white/25';
            return (
              <div
                key={cap.index}
                className={`${spanClass} ${surfaceClass} border rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-colors`}
              >
                <div className="space-y-3">
                  <span className="font-mono text-xs text-emerald-400 tabular-nums">
                    {cap.index}.
                  </span>
                  <h3 className="text-lg font-semibold text-white leading-snug">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-white/10 text-xs text-slate-300">
                  {cap.deliverable}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderAlliancesSection = () => (
    <section
      id="alianzas"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-28 border-b border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12 items-end">
        <div className="lg:col-span-7 space-y-3">
          <p className="text-xs font-mono text-emerald-400 tracking-wider">
            {siteContent.alliancesEyebrow}
          </p>
          <h2
            className="font-cinema text-2xl sm:text-4xl font-semibold text-white"
            style={{ textWrap: 'balance' }}
          >
            {siteContent.alliancesTitle}
          </h2>
        </div>
        <div className="lg:col-span-5 text-sm text-slate-400 leading-relaxed">
          <p>{siteContent.alliancesSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {siteContent.partnershipModels.map((item) => (
          <div
            key={item.index}
            className="bg-[#090D0F] border border-white/10 hover:border-emerald-500/35 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-colors"
          >
            <div className="space-y-3">
              <div className="text-xs font-mono text-emerald-400 tabular-nums">
                {item.index}. MODALIDAD
              </div>
              <h3 className="font-cinema text-xl font-semibold text-white">
                {item.name}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.detail}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPartnershipTopic(item.topic)}
              className="min-h-[42px] px-4 py-2 border border-emerald-600/50 hover:bg-emerald-600 hover:border-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold rounded-lg inline-flex items-center justify-between gap-2 cursor-pointer transition-colors whitespace-nowrap"
            >
              <span>{item.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderContactSection = () => (
    <section
      id="contacto"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-28"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-mono text-emerald-400 tracking-wider">
              {siteContent.contactEyebrow}
            </p>
            <h2
              className="font-cinema text-2xl sm:text-4xl font-semibold text-white"
              style={{ textWrap: 'balance' }}
            >
              {siteContent.contactTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {siteContent.contactBody}
            </p>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">Casa productora</div>
              <div className="text-white font-medium">
                {siteContent.brandName}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Dueño y Creador</div>
              <div className="text-emerald-300 font-semibold">
                {siteContent.ownerName || 'ALMADA EDUARDO THOMAS'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Fundación oficial</div>
              <div className="font-mono text-white tabular-nums">
                {siteContent.foundingDateText}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">
                Atención directa por WhatsApp
              </div>
              <a
                href={getProducerWhatsAppUrl(
                  projectType,
                  siteContent.whatsappNumber
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium mt-0.5"
              >
                <span className="font-mono tabular-nums">
                  {siteContent.whatsappDisplay}
                </span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmitInquiry}
            className="bg-[#090D0F] border border-white/12 rounded-xl p-6 sm:p-8 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="producer-name"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Nombre completo
                </label>
                <input
                  id="producer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="producer-org"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Marca, medio o institución
                </label>
                <input
                  id="producer-org"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Opcional"
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="producer-contact"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Email o WhatsApp de contacto
                </label>
                <input
                  id="producer-contact"
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="correo@ejemplo.com o +54 9..."
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="producer-type"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Tipo de proyecto
                </label>
                <select
                  id="producer-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Producción de Programa">
                    Producción de Programa
                  </option>
                  <option value="Auspicio Comercial">
                    Auspicio Comercial
                  </option>
                  <option value="Producción de programa propio">
                    Producción de programa propio
                  </option>
                  <option value="Coproducción cultural o ambiental">
                    Coproducción cultural o ambiental
                  </option>
                  <option value="Cobertura audiovisual de evento">
                    Cobertura audiovisual de evento
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="producer-message"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Contanos tu idea o consulta
              </label>
              <textarea
                id="producer-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Formato, cantidad de emisiones, fechas estimadas o consulta comercial..."
                className="w-full px-3.5 py-2.5 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-emerald-500"
              />
            </div>

            {formError && (
              <p className="text-xs font-medium text-red-400">{formError}</p>
            )}

            {submittedTicket && (
              <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    Propuesta registrada ({submittedTicket}).
                  </span>{' '}
                  El equipo de {siteContent.brandName} te responderá a la brevedad.
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Clapperboard className="w-4 h-4" />
                <span>
                  {submitting ? 'Enviando propuesta...' : 'Enviar Propuesta'}
                </span>
              </button>

              <a
                href={getProducerWhatsAppUrl(
                  projectType,
                  siteContent.whatsappNumber
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white whitespace-nowrap transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  const renderRequestProgramSection = () => (
    <section
      id="pedir-programa"
      className="max-w-[1280px] mx-auto px-4 sm:px-8 py-20 lg:py-24 border-b border-white/10 space-y-8"
    >
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-mono text-emerald-400 tracking-wider">
          CONVOCATORIA ABIERTA DE FORMATOS ORIGINALES
        </p>
        <h2 className="font-cinema text-2xl sm:text-4xl font-semibold text-white">
          Solicitar Crear un Programa en la Productora
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          ¿Tenés una idea de programa de TV, radio visual, streaming, podcast o ciclo documental? Presentanos tu propuesta. El equipo de dirección de <strong>{siteContent.brandName}</strong> revisará el proyecto para sumarlo a la programación oficial.
        </p>
      </div>

      <form
        onSubmit={handleSubmitProgramRequest}
        className="bg-[#090D0F] border border-white/12 rounded-xl p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nombre completo del responsable
            </label>
            <input
              type="text"
              required
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder="Ej: Valentina Méndez"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Colectivo, grupo o institución (opcional)
            </label>
            <input
              type="text"
              value={reqOrg}
              onChange={(e) => setReqOrg(e.target.value)}
              placeholder="Ej: Red Joven / Centro Cultural"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              WhatsApp o Correo de contacto
            </label>
            <input
              type="text"
              required
              value={reqContact}
              onChange={(e) => setReqContact(e.target.value)}
              placeholder="+54 9... o correo@..."
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Título tentativo del programa
            </label>
            <input
              type="text"
              required
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              placeholder="Ej: Zona Nocturna / Raíces en Vivo"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Formato audiovisual deseado
            </label>
            <select
              value={reqFormat}
              onChange={(e) => setReqFormat(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            >
              <option value="TV en Vivo + Radio Visual">
                TV en Vivo + Radio Visual
              </option>
              <option value="Magazine / Debate en Mesa">
                Magazine / Debate en Mesa
              </option>
              <option value="Ciclo Musical / Acústicos">
                Ciclo Musical / Acústicos
              </option>
              <option value="Serie Documental">Serie Documental</option>
              <option value="Podcast Audiovisual">Podcast Audiovisual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Frecuencia y horario pretendido
            </label>
            <input
              type="text"
              value={reqSchedule}
              onChange={(e) => setReqSchedule(e.target.value)}
              placeholder="Ej: Viernes 20:00 a 21:30 hs"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Equipo de conducción / integrantes
            </label>
            <input
              type="text"
              value={reqTeam}
              onChange={(e) => setReqTeam(e.target.value)}
              placeholder="Ej: 2 conductores + 1 columnista"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Necesidades técnicas (cámaras, mics, etc.)
            </label>
            <input
              type="text"
              value={reqEquipment}
              onChange={(e) => setReqEquipment(e.target.value)}
              placeholder="Ej: 2 cámaras + 3 micrófonos + gráficas"
              className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Sinopsis y propuesta del programa
          </label>
          <textarea
            rows={4}
            required
            value={reqSynopsis}
            onChange={(e) => setReqSynopsis(e.target.value)}
            placeholder="De qué trata el ciclo, a qué público apunta y qué secciones tendría..."
            className="w-full px-3.5 py-2.5 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
          />
        </div>

        {reqError && (
          <p className="text-xs font-medium text-red-400">{reqError}</p>
        )}

        {reqReceipt && (
          <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-500/40 flex items-start gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                Pedido registrado con código {reqReceipt}.
              </span>{' '}
              La administración y dirección de la productora revisará tu proyecto y podrá aprobarlo directamente a cartelera.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={reqSubmitting}
            className="min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Clapperboard className="w-4 h-4" />
            <span>
              {reqSubmitting ? 'Enviando pedido...' : 'Enviar Pedido de Programa'}
            </span>
          </button>

          <a
            href={getProducerWhatsAppUrl(
              'Propuesta de Nuevo Programa',
              siteContent.whatsappNumber
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 border border-emerald-500/40 bg-emerald-950/35 hover:bg-emerald-900/50 text-emerald-200 text-xs font-semibold rounded-lg inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </form>
    </section>
  );

  const renderProgramDetail = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) {
      return (
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
          <h2 className="font-cinema text-2xl text-white">
            Programa no encontrado
          </h2>
          <button
            type="button"
            onClick={goHome}
            className="min-h-[42px] px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      );
    }

    const room = liveRooms[program.id];
    const waNumber = siteContent.whatsappNumber || '5493757300369';
    const waDisplay = siteContent.whatsappDisplay || WHATSAPP_DISPLAY;

    return (
      <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 lg:py-14 space-y-8">
        {/* Program Hero Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-white/12 bg-black min-h-[300px] relative shadow-2xl">
            <ResilientImage
              src={program.imageUrl || siteContent.heroImageUrl}
              alt={program.title}
              fallbackTitle={program.title}
              icon="tv"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
              <span
                className={`px-3 py-1 text-xs font-mono font-bold rounded-md ${
                  room?.isLive
                    ? 'bg-red-600 text-white'
                    : 'bg-black/75 border border-white/15 text-emerald-300'
                }`}
              >
                {room?.isLive
                  ? `EN VIVO · ${room.audienceCount.toLocaleString('es-AR')} espectadores`
                  : program.statusLabel}
              </span>
              {program.channelOrSignal && (
                <span className="px-2.5 py-1 bg-black/75 border border-white/12 rounded-md text-[11px] font-mono text-slate-200">
                  {program.channelOrSignal}
                </span>
              )}
            </div>

            {program.logoUrl && (
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <img
                  src={program.logoUrl}
                  alt={`Logo ${program.title}`}
                  referrerPolicy="no-referrer"
                  className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs font-mono text-emerald-400 tracking-wider">
                APARTADO OFICIAL · {program.format.toUpperCase()}
              </div>

              <h1 className="font-cinema text-3xl sm:text-4xl font-semibold text-white">
                {program.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {program.fullSynopsis}
              </p>

              {/* Editorial Info Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 bg-[#090D0F] border border-white/10 rounded-xl">
                  <div className="text-slate-400">Emisión y horario</div>
                  <div className="mt-1 font-medium text-white">
                    {program.schedule}
                  </div>
                </div>
                <div className="p-3 bg-[#090D0F] border border-white/10 rounded-xl">
                  <div className="text-slate-400">Duración</div>
                  <div className="mt-1 font-medium text-white">
                    {program.duration}
                  </div>
                </div>
                <div className="p-3 bg-[#090D0F] border border-white/10 rounded-xl">
                  <div className="text-slate-400">Equipo responsable</div>
                  <div className="mt-1 font-medium text-white">
                    {program.hostTeam || 'Equipo de Producción JZ'}
                  </div>
                </div>
                <div className="p-3 bg-[#090D0F] border border-white/10 rounded-xl">
                  <div className="text-slate-400">Señal oficial</div>
                  <div className="mt-1 font-medium text-emerald-300">
                    {program.channelOrSignal || 'Streaming HD JZ'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenLive(program.id)}
                className="min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                <span>Ver Emisión en Vivo</span>
              </button>

              {userPerms?.canOperateStudio && (
                <button
                  type="button"
                  onClick={() => onOpenStudio(program.id)}
                  className="min-h-[42px] px-4 py-2 border border-white/15 hover:border-white/30 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <MonitorPlay className="w-4 h-4" />
                  <span>Emitir este Programa</span>
                </button>
              )}

              {canEditPrograms && (
                <button
                  type="button"
                  onClick={() => setEditingProgram(program)}
                  className="min-h-[42px] px-4 py-2 border border-white/15 hover:border-white/30 text-slate-200 text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Editar Programa</span>
                </button>
              )}

              <a
                href={getProducerWhatsAppUrl(
                  `Auspicio o contacto en ${program.title}`,
                  waNumber
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 border border-emerald-500/45 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 text-sm font-medium rounded-lg inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Dedicated Sponsorship Block for This Program */}
        <div className="bg-gradient-to-br from-[#0A130F] to-[#080B0D] border border-emerald-500/25 rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Megaphone className="w-4 h-4" />
                <span>ESPACIO COMERCIAL DEL PROGRAMA</span>
              </div>
              <h2 className="font-cinema text-xl sm:text-2xl font-semibold text-white">
                Auspiciá en {program.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Solicitá tu banner en pantalla o mención en vivo comunicándote directo por WhatsApp al {waDisplay}.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleSelectPartnershipTopic(`Auspicio en ${program.title}`)
              }
              className="min-h-[40px] px-4 py-2 border border-white/15 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 hover:text-white rounded-lg cursor-pointer shrink-0 self-start md:self-auto"
            >
              Enviar consulta por formulario
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((slotNum) => (
              <a
                key={slotNum}
                href={getSponsorWhatsAppUrl(slotNum, waNumber, program.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-[#06090B] hover:bg-[#0B1410] border border-white/10 hover:border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    BANNER {slotNum} · {program.title}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Pedir espacio por WhatsApp
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Technical Specs */}
        <div className="bg-[#090D0F] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="text-xs font-mono text-emerald-400">
            ESPECIFICACIONES TÉCNICAS DE REALIZACIÓN
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(program.technicalSpecs || []).map((spec) => (
              <div
                key={spec}
                className="p-3.5 bg-[#050708] border border-white/10 rounded-lg text-sm text-slate-200 flex items-start gap-2.5"
              >
                <span className="text-emerald-400 font-mono">—</span>
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Past Episodes Video Archive for this Program */}
        <ProgramVideosArchive
          programId={program.id}
          programTitle={program.title}
          authToken={authToken}
          currentUser={currentUser}
          onRequestAuth={onOpenAuth}
        />
      </section>
    );
  };

  const renderLiveHub = () => (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 lg:py-14 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 tracking-wider">
            <Radio className="w-4 h-4" />
            <span>EMISIONES EN VIVO · {siteContent.brandName}</span>
          </div>
          <h1 className="font-cinema text-2xl sm:text-4xl font-semibold text-white">
            Señales en Directo y Horarios de Transmisión
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Si un programa está transmitiendo en este momento vas a ver su emisión en vivo; cuando esté fuera del aire te mostramos su logo oficial y sus días y horarios de transmisión.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshRooms}
          className="min-h-[40px] px-4 py-2 border border-white/15 hover:border-emerald-500/45 bg-white/5 hover:bg-emerald-950/35 text-xs font-semibold text-slate-200 hover:text-white rounded-lg cursor-pointer self-start md:self-auto"
        >
          Actualizar Señales
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {programs.map((program) => {
          const room = liveRooms[program.id];
          const isLive = Boolean(room?.isLive);

          return (
            <article
              key={program.id}
              className={`rounded-2xl overflow-hidden border flex flex-col justify-between transition-colors shadow-xl ${
                isLive
                  ? 'bg-[#09120D] border-emerald-500/60'
                  : 'bg-[#090D0F] border-white/12 hover:border-white/25'
              }`}
            >
              {/* Top Stage: Live Broadcast Feed if transmitting, Program Logo + Schedule if offline */}
              <div
                className="relative aspect-video w-full overflow-hidden border-b border-white/10 flex flex-col items-center justify-center p-6 text-center"
                style={{
                  background: isLive
                    ? '#000000'
                    : 'radial-gradient(circle at 50% 40%, rgba(16,185,129,0.16) 0%, #050807 76%)',
                }}
              >
                {isLive ? (
                  <>
                    {room?.previewFrame ? (
                      <img
                        src={room.previewFrame}
                        alt={`Transmisión en vivo de ${program.title}`}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <ResilientImage
                        src={program.imageUrl || siteContent.heroImageUrl}
                        alt={program.title}
                        fallbackTitle={program.title}
                        icon="tv"
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 pointer-events-none" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-[11px] font-mono font-bold rounded shadow">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span>EN VIVO</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/80 border border-white/15 text-emerald-300 text-[11px] font-mono font-semibold rounded tabular-nums">
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {(room?.audienceCount ?? 0).toLocaleString('es-AR')} viendo
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-white/8 border border-white/15 text-slate-300 text-[11px] font-mono font-semibold rounded">
                        FUERA DEL AIRE
                      </span>
                      <span className="px-2.5 py-1 bg-black/60 border border-white/10 text-emerald-300 text-[11px] font-mono rounded">
                        {program.channelOrSignal || 'Señal HD'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mt-4">
                      {program.logoUrl ? (
                        <img
                          src={program.logoUrl}
                          alt={`Logo ${program.title}`}
                          referrerPolicy="no-referrer"
                          className="h-24 sm:h-28 w-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <Tv className="w-8 h-8" />
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{program.schedule}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card Details & Actions */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono text-emerald-400 font-semibold">
                      {program.format}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{program.duration}</span>
                    </span>
                  </div>

                  <h2 className="font-cinema text-2xl font-semibold text-white">
                    {program.title}
                  </h2>

                  <p className="text-xs font-mono text-emerald-300">
                    Horario de transmisión: {program.schedule}
                  </p>

                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                    {program.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenLive(program.id)}
                    className={`min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer transition-colors ${
                      isLive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>
                      {isLive ? 'Ver Transmisión en Vivo' : 'Entrar a la Señal'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushView({ kind: 'program-detail', programId: program.id })
                    }
                    className="min-h-[42px] px-4 py-2 border border-white/15 hover:border-white/30 text-slate-200 hover:text-white text-xs sm:text-sm font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Ver Apartado y Videos
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#050708] text-slate-100 flex flex-col">
      {/* TOP BAR CONTRACT: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#050708]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={goHome}
            className="font-cinema text-xs sm:text-sm md:text-base font-semibold tracking-wider text-white whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            {siteContent.brandName}
          </button>

          {/* Zone 2: Smooth navigation links on Home */}
          <nav
            aria-label="Navegación principal"
            className="hidden lg:flex items-center gap-7 text-sm text-slate-300"
          >
            {(
              [
                { id: 'manifiesto', label: 'Manifiesto' },
                { id: 'programas', label: 'Programas' },
                { id: 'servicios', label: 'Servicios' },
                { id: 'alianzas', label: 'Alianzas' },
                { id: 'contacto', label: 'Contacto' },
              ] as const
            ).map((navItem) => (
              <button
                key={navItem.id}
                type="button"
                onClick={() => navigateToHomeSection(navItem.id)}
                className="py-1 hover:text-white underline-offset-8 decoration-emerald-500 hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {navItem.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => pushView({ kind: 'admin-panel' })}
                className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Panel ({currentUser.username})
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Iniciar Sesión
              </button>
            )}

            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/5 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Navegación móvil"
            className="lg:hidden border-t border-white/10 bg-[#080B0D] px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"
          >
            <button
              type="button"
              onClick={goHome}
              className="py-1.5 hover:text-white whitespace-nowrap cursor-pointer"
            >
              Inicio
            </button>
            {(
              [
                { id: 'manifiesto', label: 'Manifiesto' },
                { id: 'programas', label: 'Programas' },
                { id: 'pedir-programa', label: 'Pedir Programa' },
                { id: 'servicios', label: 'Servicios' },
                { id: 'alianzas', label: 'Alianzas' },
                { id: 'contacto', label: 'Contacto' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToHomeSection(item.id)}
                className="py-1.5 hover:text-white whitespace-nowrap cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* SIGNED-IN ROLE WORKSPACE BAR */}
      {currentUser && userPerms && (
        <div className="bg-[#09110D] border-b border-emerald-500/25">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">
                {currentUser.fullName}
              </span>
              <span className="font-mono text-emerald-400">
                @{currentUser.username}
              </span>
              <span aria-hidden="true">·</span>
              <span>{userPerms.label}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushView({ kind: 'admin-panel' })}
                className="min-h-[34px] px-3 py-1 bg-white/10 hover:bg-white/15 text-white font-medium rounded-md cursor-pointer whitespace-nowrap"
              >
                {userPerms.canManageUsers
                  ? 'Usuarios, Roles y Programas'
                  : 'Panel de Productora'}
              </button>
              {userPerms.canEditSite && (
                <button
                  type="button"
                  onClick={() => pushView({ kind: 'site-editor' })}
                  className="min-h-[34px] px-3 py-1 border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-200 font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Sitio Completo</span>
                </button>
              )}
              {userPerms.canOperateStudio && (
                <button
                  type="button"
                  onClick={() => onOpenStudio()}
                  className="min-h-[34px] px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>MesaControl TV</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[34px] px-3 py-1 border border-white/15 hover:border-red-400/50 text-slate-300 hover:text-red-300 rounded-md inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN / BREADCRUMB BAR WHEN INSIDE ANY APARTADO */}
      {currentView.kind !== 'home' && (
        <div className="bg-[#080B0D] border-b border-white/10">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={goBack}
                className="min-h-[38px] px-3.5 py-1.5 border border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver atrás</span>
              </button>
              <button
                type="button"
                onClick={goHome}
                className="min-h-[38px] px-3.5 py-1.5 border border-white/15 hover:border-white/35 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Home className="w-4 h-4" />
                <span>Volver al inicio</span>
              </button>
            </div>

            <div className="text-xs font-mono text-emerald-400">
              {getApartadoTitle()}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {currentView.kind === 'home' && (
          <>
            {/* HERO SECTION */}
            <section
              id="inicio"
              className="relative overflow-hidden border-b border-white/10"
            >
              <div className="absolute inset-0 pointer-events-none">
                <ResilientImage
                  src={siteContent.heroImageUrl}
                  alt="Producción audiovisual de Jugend für eine grüne Zukunft"
                  fallbackTitle="JUGEND FÜR EINE GRÜNE ZUKUNFT"
                  className="w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050708]/88 via-[#050708]/72 to-[#050708]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050708] via-[#050708]/75 to-transparent" />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 68% 58% at 76% 42%, rgba(16, 185, 129, 0.14), transparent 72%)',
                  }}
                />
              </div>

              <div className="relative max-w-[1280px] mx-auto px-4 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="h-px w-8 bg-emerald-500/80" />
                      <p className="text-xs sm:text-sm text-slate-300 tracking-wide">
                        <span>Fundada el {siteContent.foundingDateText}</span>
                        <span aria-hidden="true" className="mx-2 text-emerald-500">
                          ·
                        </span>
                        <span>{siteContent.locationText}</span>
                        <span aria-hidden="true" className="mx-2 text-emerald-500">
                          ·
                        </span>
                        <span className="font-cinema text-slate-100">
                          {siteContent.mottoText}
                        </span>
                      </p>
                    </div>

                    <h1
                      className="font-cinema font-semibold text-white leading-[1.08] tracking-tight"
                      style={{
                        fontSize: 'clamp(2.25rem, 4.1vw, 3.75rem)',
                        textWrap: 'balance',
                      }}
                    >
                      {siteContent.heroHeadline}
                    </h1>

                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                      {siteContent.heroDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => navigateToHomeSection('programas')}
                        className="min-h-[46px] px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-950/60 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>{siteContent.heroPrimaryCta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateToHomeSection('pedir-programa')}
                        className="min-h-[46px] px-5 py-2.5 border border-white/20 hover:border-emerald-500/60 bg-white/[0.03] text-slate-100 hover:text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Pedir Crear un Programa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => pushView({ kind: 'live-hub' })}
                        className="min-h-[46px] px-3 py-2 text-sm font-medium text-slate-200 hover:text-white underline underline-offset-8 decoration-white/30 hover:decoration-emerald-500 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Radio className="w-4 h-4 text-emerald-400" />
                        <span>{siteContent.heroSecondaryCta}</span>
                      </button>
                    </div>
                  </div>

                  {/* Official JZ Logo Stage — Dark Obsidian Cinema Emblem without White Box */}
                  <div className="lg:col-span-5 flex items-center justify-center">
                    <div
                      className="relative w-full h-full min-h-[320px] sm:min-h-[380px] border border-emerald-500/25 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between gap-5 shadow-[0_24px_70px_-20px_rgba(16,185,129,0.22)] overflow-hidden"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 44%, rgba(16, 185, 129, 0.16) 0%, rgba(10, 15, 13, 0.96) 58%, #050807 100%)',
                      }}
                    >
                      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 font-mono tracking-wider">
                        <span>IDENTIDAD OFICIAL</span>
                        <span className="tabular-nums text-emerald-400">
                          EST. 20 / 11 / 2026
                        </span>
                      </div>

                      <div className="w-full flex-1 flex items-center justify-center py-2">
                        <img
                          src={siteContent.logoUrl}
                          alt={`Logotipo oficial ${siteContent.brandName}`}
                          referrerPolicy="no-referrer"
                          className="w-full max-w-[420px] h-auto max-h-[250px] object-contain select-none drop-shadow-[0_14px_34px_rgba(0,0,0,0.85)]"
                        />
                      </div>

                      <div className="w-full pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                        <span>{siteContent.emblemTagline}</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {siteContent.ownerName || 'ALMADA EDUARDO THOMAS'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Column Founding Dossier Strip */}
              <div className="relative border-t border-white/10 bg-[#080B0D]/95">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-8 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                  {siteContent.dossierMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="py-5 px-0 sm:px-4 lg:px-6 first:pl-0 last:pr-0"
                    >
                      <div className="text-xs text-slate-400">{m.label}</div>
                      <div
                        className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums ${
                          m.accent ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {renderManifestoSection()}
            {renderProgramsSection()}
            {renderRequestProgramSection()}
            {renderServicesSection()}
            {renderAlliancesSection()}
            {renderContactSection()}
          </>
        )}

        {currentView.kind === 'live-hub' && renderLiveHub()}

        {currentView.kind === 'program-detail' &&
          renderProgramDetail(currentView.programId)}
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-white/10 bg-[#050708]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="font-cinema text-sm font-semibold tracking-wider text-white">
              {siteContent.brandName}
            </div>
            <p className="text-xs text-slate-400">{siteContent.footerSubline}</p>
            <p className="text-xs font-mono text-emerald-400">
              Dueño y Creador: {siteContent.ownerName || 'ALMADA EDUARDO THOMAS'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <button
              type="button"
              onClick={goHome}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => navigateToHomeSection('pedir-programa')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Pedir Programa
            </button>
            <button
              type="button"
              onClick={() => pushView({ kind: 'live-hub' })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Emisiones en Vivo
            </button>
            {userPerms?.canOperateStudio && (
              <button
                type="button"
                onClick={() => onOpenStudio()}
                className="hover:text-emerald-400 text-emerald-300 font-medium transition-colors cursor-pointer"
              >
                MesaControl TV
              </button>
            )}
          </div>
        </div>
      </footer>

      <ProgramQuickEditModal
        open={Boolean(editingProgram)}
        program={editingProgram}
        authToken={authToken}
        onClose={() => setEditingProgram(null)}
        onRequestAuth={onOpenAuth}
        onSaved={(_updated, allPrograms) => {
          setPrograms(allPrograms);
        }}
      />
    </div>
  );
};
