import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clapperboard,
  Edit3,
  Film,
  Home,
  LogOut,
  Menu,
  Mic2,
  MonitorPlay,
  Plus,
  Radio,
  Shield,
  Tv,
  X,
} from 'lucide-react';
import { getProducerWhatsAppUrl } from '../data/tvTemplates';
import {
  PRODUCER_ROLES,
  ProducerProgram,
  SiteContentConfig,
  StaffUserPublic,
} from '../types/producer';
import { ProducerAdminPanel } from './ProducerAdminPanel';
import { ProducerAuthModal } from './ProducerAuthModal';
import { ProducerSiteEditor } from './ProducerSiteEditor';

interface ProductionHouseSiteProps {
  onOpenStudio: () => void;
  onOpenLive: () => void;
}

type SiteViewState =
  | { kind: 'home' }
  | {
      kind: 'apartado';
      section:
        | 'manifiesto'
        | 'programas'
        | 'servicios'
        | 'alianzas'
        | 'contacto'
        | 'pedir-programa';
    }
  | { kind: 'program-detail'; programId: string }
  | { kind: 'admin-panel' }
  | { kind: 'site-editor' };

type ProgramFilter = 'all' | 'airing' | 'development';

const FALLBACK_CONTENT: SiteContentConfig = {
  brandName: 'JUGEND FÜR EINE GRÜNE ZUKUNFT',
  foundingDateText: '20 de noviembre de 2026',
  locationText: 'Puerto Esperanza, Misiones',
  mottoText: 'Licht, Kamera, Action!',
  logoUrl: '/assets/aistudio/6b6ea9d5-89b9-46b8-b909-d08cfd9a986f_1965e536.png',
  heroImageUrl: '/src/assets/images/hero_production_set_1795376282591.jpg',
  heroHeadline:
    'Productora audiovisual de programas con identidad propia y dirección en vivo',
  heroDescription:
    'JUGEND FÜR EINE GRÜNE ZUKUNFT nace el 20 de noviembre de 2026 para concebir, dirigir y emitir formatos propios de televisión, radio visual y documentales con estética cinematográfica y tecnología de transmisión directa en alta definición.',
  heroPrimaryCta: 'Explorar Programas',
  heroSecondaryCta: 'Ir a la señal de #SinFiltro',
  emblemTagline: 'Juventud por un Futuro Verde',
  emblemCategory: 'CASA PRODUCTORA',
  dossierMetrics: [
    { label: 'Fecha de nacimiento', value: '20/11/2026' },
    { label: 'Programa inaugural', value: '#SinFiltro TV & Radio' },
    { label: 'Ingeniería de emisión', value: '1280×720 HD · 30 FPS' },
    { label: 'Frecuencia aliada', value: 'Radioactiva 88.5 FM', accent: true },
  ],
  manifestoEyebrow: '01. MANIFIESTO FUNDACIONAL · 20 DE NOVIEMBRE DE 2026',
  manifestoTitle:
    'Una productora creada para que los programas jóvenes tengan altura televisiva',
  manifestoBody:
    'El 20 de noviembre de 2026 formalizamos un proyecto que venía latiendo en el estudio: reunir dirección audiovisual, tecnología propia de transmisión en vivo y una agenda comprometida con el ambiente y la comunidad bajo una sola casa productora.',
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
    'Además de #SinFiltro junto a Jóvenes de Huella Verde, nuestra casa productora impulsa nuevos ciclos y recibe propuestas para crear programas originales.',
  servicesEyebrow: '03. CAPACIDADES DE PRODUCCIÓN E INGENIERÍA PROPIA',
  servicesTitle: 'Del guion al aire en un ecosistema integrado',
  controlRoomImageUrl: '/src/assets/images/service_control_room_1795376283734.jpg',
  controlRoomEyebrow: 'ESTUDIO INTEGRADO MESACONTROL TV',
  controlRoomTitle: 'Operación en vivo con OBS y WebRTC HD',
  controlRoomBody:
    'Nuestra productora cuenta con consola propia para manejar cámaras USB/IP, micrófonos en tiempo real, escaletas automáticas, cortinas sonoras de TV y placas gráficas sin retraso.',
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
        'Presencia visual en los Banners 1, 2 y 3 debajo de la transmisión oficial de #SinFiltro, mención en mesa y acceso directo al WhatsApp comercial de tu comercio.',
      actionLabel: 'Solicitar pauta comercial',
      topic: 'Auspicio comercial en #SinFiltro',
    },
    {
      index: '02',
      name: 'Producción de Programa Propio',
      detail:
        'Ponemos estudio, cámaras, micrófonos, gráfica televisiva y plataforma de streaming para que tu organización, medio o equipo lance su propio ciclo semanal.',
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
    'Escribinos para pautar en nuestros ciclos vigentes, producir un formato audiovisual nuevo o coordinar una reunión en estudio.',
  whatsappDisplay: '+54 9 3757 65-4327',
  whatsappNumber: '5493757654327',
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
  onOpenStudio,
  onOpenLive,
}) => {
  const [siteContent, setSiteContent] =
    useState<SiteContentConfig>(FALLBACK_CONTENT);
  const [programs, setPrograms] = useState<ProducerProgram[]>([]);
  const [filter, setFilter] = useState<ProgramFilter>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{
    isLive: boolean;
    audienceCount: number;
  }>({ isLive: false, audienceCount: 36 });

  // View Stack for "Volver atrás" and "Volver al inicio" in EVERY apartado
  const [viewHistory, setViewHistory] = useState<SiteViewState[]>([
    { kind: 'home' },
  ]);
  const currentView = viewHistory[viewHistory.length - 1];

  // Auth Session kept purely in React memory (never persisted to localStorage)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffUserPublic | null>(null);

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

    fetch('/api/broadcast/state')
      .then((res) => res.json())
      .then((data) => {
        if (data?.state) {
          setLiveStatus({
            isLive: Boolean(data.state.isLive),
            audienceCount:
              typeof data.audienceCount === 'number' ? data.audienceCount : 36,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSiteData();
  }, [loadSiteData]);

  const pushView = useCallback((next: SiteViewState) => {
    setMobileMenuOpen(false);
    setViewHistory((prev) => [...prev, next]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    setViewHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ kind: 'home' }]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setMobileMenuOpen(false);
    setViewHistory([{ kind: 'home' }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setViewHistory([{ kind: 'home' }]);
  };

  const handleSelectPartnershipTopic = (topic: string) => {
    setProjectType(topic);
    setSubmittedTicket(null);
    pushView({ kind: 'apartado', section: 'contacto' });
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
    if (currentView.kind === 'program-detail') {
      const p = programs.find((x) => x.id === currentView.programId);
      return p ? `Programa · ${p.title}` : 'Ficha de Programa';
    }
    if (currentView.kind === 'apartado') {
      const map: Record<typeof currentView.section, string> = {
        manifiesto: 'Manifiesto Fundacional',
        programas: 'Cartelera de Programas',
        servicios: 'Servicios y Estudio',
        alianzas: 'Alianzas y Auspicios',
        contacto: 'Mesa de Producción y Contacto',
        'pedir-programa': 'Solicitar Crear un Programa',
      };
      return map[currentView.section];
    }
    return '';
  };

  // Shared Renderers for Sections (both on Home overview and focused Apartados)
  const renderManifestoSection = (standalone = false) => (
    <section
      id="manifiesto"
      className={`max-w-[1280px] mx-auto px-4 sm:px-8 ${
        standalone ? 'py-12 lg:py-16' : 'py-20 lg:py-24 border-b border-white/10'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <div className="lg:col-span-5">
          <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-white/10 bg-[#0A0E10]">
            <ResilientImage
              src={siteContent.manifestoImageUrl}
              alt="Cámara cinematográfica en rodaje de Jugend für eine grüne Zukunft"
              fallbackTitle="Equipamiento Cinematográfico"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-mono text-emerald-400 tracking-wider">
                {siteContent.manifestoEyebrow}
              </p>
              {!standalone && (
                <button
                  type="button"
                  onClick={() =>
                    pushView({ kind: 'apartado', section: 'manifiesto' })
                  }
                  className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Abrir apartado
                </button>
              )}
            </div>
            <h2
              className="font-cinema text-2xl sm:text-4xl font-semibold text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {siteContent.manifestoTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {siteContent.manifestoBody}
            </p>
          </div>

          <div className="divide-y divide-white/10 border-t border-b border-white/10">
            {siteContent.manifestoPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4"
              >
                <div className="sm:col-span-4 text-sm font-semibold text-white">
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

  const renderProgramsSection = (standalone = false) => (
    <section
      id="programas"
      className={`max-w-[1280px] mx-auto px-4 sm:px-8 ${
        standalone ? 'py-12 lg:py-16' : 'py-20 lg:py-24 border-b border-white/10'
      }`}
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
            onClick={() =>
              pushView({ kind: 'apartado', section: 'pedir-programa' })
            }
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
        {filteredPrograms.map((program) =>
          program.featured ? (
            <article
              key={program.id}
              className="lg:col-span-12 bg-[#090D0F] border border-white/12 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
            >
              <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[360px] bg-black">
                <ResilientImage
                  src={program.imageUrl || ''}
                  alt={program.title}
                  fallbackTitle={program.title}
                  icon="mic"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
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
                    {liveStatus.isLive && program.id === 'sin-filtro'
                      ? `AL AIRE · ${liveStatus.audienceCount.toLocaleString('es-AR')} espectadores`
                      : program.channelOrSignal || 'EMISIÓN HD'}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="text-emerald-400 font-semibold">
                      {program.statusLabel}
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

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {program.statusKey === 'airing' && (
                    <button
                      type="button"
                      onClick={onOpenLive}
                      className="min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Ver Transmisión</span>
                    </button>
                  )}

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
                    Ver Apartado del Programa
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <article
              key={program.id}
              className="lg:col-span-4 bg-[#090D0F] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between hover:border-white/25 transition-colors"
            >
              {program.imageUrl && (
                <div className="aspect-[16/9] bg-black overflow-hidden border-b border-white/10">
                  <ResilientImage
                    src={program.imageUrl}
                    alt={program.title}
                    fallbackTitle={program.title}
                    icon="tv"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="text-emerald-400 font-medium">
                      {program.statusLabel}
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

                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      pushView({
                        kind: 'program-detail',
                        programId: program.id,
                      })
                    }
                    className="min-h-[40px] text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>Entrar al programa</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  {program.statusKey === 'airing' && (
                    <button
                      type="button"
                      onClick={onOpenLive}
                      className="text-xs text-slate-300 hover:text-white underline underline-offset-4 cursor-pointer"
                    >
                      Señal en vivo
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );

  const renderServicesSection = (standalone = false) => (
    <section
      id="servicios"
      className={`max-w-[1280px] mx-auto px-4 sm:px-8 ${
        standalone ? 'py-12 lg:py-16' : 'py-20 lg:py-24 border-b border-white/10'
      }`}
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
        {!standalone && (
          <button
            type="button"
            onClick={() => pushView({ kind: 'apartado', section: 'servicios' })}
            className="text-xs font-medium text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Abrir apartado
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 bg-[#090D0F] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="aspect-[4/3] bg-black overflow-hidden">
            <ResilientImage
              src={siteContent.controlRoomImageUrl}
              alt="Sala de control maestro MesaControl TV"
              fallbackTitle="Control Maestro TV"
              icon="tv"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
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

            <button
              type="button"
              onClick={onOpenStudio}
              className="min-h-[42px] px-5 py-2.5 bg-white text-black hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors self-start whitespace-nowrap"
            >
              <MonitorPlay className="w-4 h-4" />
              <span>Abrir Consola del Estudio</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {siteContent.capabilities.map((cap) => (
            <div
              key={cap.index}
              className="bg-[#090D0F] border border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-5"
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
          ))}
        </div>
      </div>
    </section>
  );

  const renderAlliancesSection = (standalone = false) => (
    <section
      id="alianzas"
      className={`max-w-[1280px] mx-auto px-4 sm:px-8 ${
        standalone ? 'py-12 lg:py-16' : 'py-20 lg:py-24 border-b border-white/10'
      }`}
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
        <div className="lg:col-span-5 text-sm text-slate-400 leading-relaxed space-y-2">
          <p>{siteContent.alliancesSubtitle}</p>
          {!standalone && (
            <button
              type="button"
              onClick={() => pushView({ kind: 'apartado', section: 'alianzas' })}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
            >
              Ver apartado completo
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {siteContent.partnershipModels.map((item) => (
          <div
            key={item.index}
            className="bg-[#090D0F] border border-white/10 rounded-xl p-6 sm:p-7 flex flex-col justify-between space-y-6"
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

  const renderContactSection = (standalone = false) => (
    <section
      id="contacto"
      className={`max-w-[1280px] mx-auto px-4 sm:px-8 ${
        standalone ? 'py-12 lg:py-16' : 'py-20 lg:py-24'
      }`}
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
                href={getProducerWhatsAppUrl(projectType)}
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
                  <option value="Auspicio comercial en #SinFiltro">
                    Auspicio comercial en #SinFiltro
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
                href={getProducerWhatsAppUrl(projectType)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 whitespace-nowrap"
              >
                Escribir directo por WhatsApp
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  const renderRequestProgramApartado = () => (
    <section className="max-w-[960px] mx-auto px-4 sm:px-8 py-12 lg:py-16 space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-mono text-emerald-400 tracking-wider">
          CONVOCATORIA ABIERTA DE FORMATOS ORIGINALES
        </p>
        <h1 className="font-cinema text-2xl sm:text-4xl font-semibold text-white">
          Solicitar Crear un Programa en la Productora
        </h1>
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

          <button
            type="button"
            onClick={goBack}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Cancelar y volver atrás
          </button>
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

    return (
      <section className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12 lg:py-16 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 rounded-xl overflow-hidden border border-white/12 bg-black min-h-[280px]">
            <ResilientImage
              src={program.imageUrl || ''}
              alt={program.title}
              fallbackTitle={program.title}
              icon="tv"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                <span className="text-emerald-400 font-semibold">
                  {program.statusLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{program.format}</span>
                <span aria-hidden="true">·</span>
                <span>{program.duration}</span>
              </div>

              <h1 className="font-cinema text-3xl sm:text-4xl font-semibold text-white">
                {program.title}
              </h1>

              <p className="text-xs font-mono text-slate-300">
                {program.schedule}
                {program.hostTeam ? ` · ${program.hostTeam}` : ''}
              </p>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {program.fullSynopsis}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {program.statusKey === 'airing' && (
                <button
                  type="button"
                  onClick={onOpenLive}
                  className="min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Ver Transmisión en Vivo</span>
                </button>
              )}
              {userPerms?.canOperateStudio && (
                <button
                  type="button"
                  onClick={onOpenStudio}
                  className="min-h-[42px] px-4 py-2 border border-white/15 hover:border-white/30 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <MonitorPlay className="w-4 h-4" />
                  <span>Abrir Estudio TV</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  handleSelectPartnershipTopic(`Auspicio en ${program.title}`)
                }
                className="min-h-[42px] px-4 py-2 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 text-sm font-medium rounded-lg cursor-pointer"
              >
                Auspicios y Pauta
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#090D0F] border border-white/10 rounded-xl p-6 sm:p-8 space-y-4">
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
      </section>
    );
  };

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

          {/* Zone 2: 5 concise single-line nav links (enter focused Apartados cleanly) */}
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
                onClick={() =>
                  pushView({ kind: 'apartado', section: navItem.id })
                }
                className={`py-1 hover:text-white underline-offset-8 decoration-emerald-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView.kind === 'apartado' &&
                  currentView.section === navItem.id
                    ? 'text-white underline'
                    : 'hover:underline'
                }`}
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
                onClick={() => setAuthModalOpen(true)}
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
                { id: 'servicios', label: 'Servicios' },
                { id: 'alianzas', label: 'Alianzas' },
                { id: 'contacto', label: 'Contacto' },
                { id: 'pedir-programa', label: 'Pedir Programa' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pushView({ kind: 'apartado', section: item.id })}
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
                  onClick={onOpenStudio}
                  className="min-h-[34px] px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Estudio en Vivo</span>
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
                  alt="Set audiovisual de Jugend für eine grüne Zukunft"
                  fallbackTitle="Estudio Principal"
                  className="w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050708]/85 via-[#050708]/75 to-[#050708]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050708] via-[#050708]/70 to-transparent" />
              </div>

              <div className="relative max-w-[1280px] mx-auto px-4 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                    <p className="text-xs sm:text-sm text-slate-300 tracking-wide">
                      <span>Fundada el {siteContent.foundingDateText}</span>
                      <span aria-hidden="true" className="mx-2 text-emerald-500">
                        ·
                      </span>
                      <span>{siteContent.locationText}</span>
                      <span aria-hidden="true" className="mx-2 text-emerald-500">
                        ·
                      </span>
                      <span className="font-cinema text-slate-200">
                        {siteContent.mottoText}
                      </span>
                    </p>

                    <h1
                      className="font-cinema font-semibold text-white leading-[1.1] tracking-tight"
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
                        onClick={() =>
                          pushView({ kind: 'apartado', section: 'programas' })
                        }
                        className="min-h-[44px] px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>{siteContent.heroPrimaryCta}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          pushView({
                            kind: 'apartado',
                            section: 'pedir-programa',
                          })
                        }
                        className="min-h-[44px] px-5 py-2.5 border border-white/20 hover:border-emerald-500/60 text-slate-100 hover:text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Pedir Crear un Programa</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenLive}
                        className="min-h-[44px] px-3 py-2 text-sm font-medium text-slate-200 hover:text-white underline underline-offset-8 decoration-white/30 hover:decoration-emerald-500 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Radio className="w-4 h-4 text-emerald-400" />
                        <span>{siteContent.heroSecondaryCta}</span>
                      </button>
                    </div>
                  </div>

                  {/* Official JZ Logo Stage */}
                  <div className="lg:col-span-5 flex items-center justify-center">
                    <div className="w-full h-full min-h-[280px] sm:min-h-[340px] bg-black border border-white/10 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-between gap-5">
                      <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>IDENTIDAD OFICIAL</span>
                        <span className="tabular-nums">EST. 20 / 11 / 2026</span>
                      </div>

                      <div className="w-full flex-1 flex items-center justify-center py-2">
                        <img
                          src={siteContent.logoUrl}
                          alt={`Logotipo oficial ${siteContent.brandName}`}
                          referrerPolicy="no-referrer"
                          className="w-full max-w-[420px] h-auto object-contain select-none"
                        />
                      </div>

                      <div className="w-full pt-4 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-400">
                        <span>{siteContent.emblemTagline}</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {siteContent.emblemCategory}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Column Founding Dossier Strip */}
              <div className="relative border-t border-white/10 bg-[#080B0D]/90">
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

            {renderManifestoSection(false)}
            {renderProgramsSection(false)}
            {renderServicesSection(false)}
            {renderAlliancesSection(false)}
            {renderContactSection(false)}
          </>
        )}

        {currentView.kind === 'apartado' &&
          currentView.section === 'manifiesto' &&
          renderManifestoSection(true)}

        {currentView.kind === 'apartado' &&
          currentView.section === 'programas' &&
          renderProgramsSection(true)}

        {currentView.kind === 'apartado' &&
          currentView.section === 'servicios' &&
          renderServicesSection(true)}

        {currentView.kind === 'apartado' &&
          currentView.section === 'alianzas' &&
          renderAlliancesSection(true)}

        {currentView.kind === 'apartado' &&
          currentView.section === 'contacto' &&
          renderContactSection(true)}

        {currentView.kind === 'apartado' &&
          currentView.section === 'pedir-programa' &&
          renderRequestProgramApartado()}

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
              onClick={() =>
                pushView({ kind: 'apartado', section: 'pedir-programa' })
              }
              className="hover:text-white transition-colors cursor-pointer"
            >
              Pedir Programa
            </button>
            <button
              type="button"
              onClick={onOpenLive}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Señal #SinFiltro
            </button>
            <button
              type="button"
              onClick={onOpenStudio}
              className="hover:text-emerald-400 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Consola MesaControl TV
            </button>
          </div>
        </div>
      </footer>

      <ProducerAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(token, user) => {
          setAuthToken(token);
          setCurrentUser(user);
          pushView({ kind: 'admin-panel' });
        }}
      />
    </div>
  );
};
