export type ProducerRole =
  | 'admin_total'
  | 'director_general'
  | 'productor_ejecutivo'
  | 'operador_estudio'
  | 'editor_contenido'
  | 'conductor'
  | 'comercial';

export interface RoleDefinition {
  id: ProducerRole;
  label: string;
  description: string;
  canManageUsers: boolean;
  canEditSite: boolean;
  canCreatePrograms: boolean;
  canReviewRequests: boolean;
  canOperateStudio: boolean;
  canManageCommercial: boolean;
}

export const PRODUCER_ROLES: Record<ProducerRole, RoleDefinition> = {
  admin_total: {
    id: 'admin_total',
    label: 'Administrador Total',
    description:
      'Control absoluto de la productora: usuarios, roles, edición completa del sitio, programas y MesaControl TV.',
    canManageUsers: true,
    canEditSite: true,
    canCreatePrograms: true,
    canReviewRequests: true,
    canOperateStudio: true,
    canManageCommercial: true,
  },
  director_general: {
    id: 'director_general',
    label: 'Dirección General',
    description:
      'Aprueba solicitudes de nuevos programas, crea formatos en cartelera y dirige las emisiones en vivo.',
    canManageUsers: false,
    canEditSite: true,
    canCreatePrograms: true,
    canReviewRequests: true,
    canOperateStudio: true,
    canManageCommercial: true,
  },
  productor_ejecutivo: {
    id: 'productor_ejecutivo',
    label: 'Productor/a Ejecutivo/a',
    description:
      'Crea y edita programas en cartelera, revisa propuestas y coordina producción.',
    canManageUsers: false,
    canEditSite: false,
    canCreatePrograms: true,
    canReviewRequests: true,
    canOperateStudio: true,
    canManageCommercial: false,
  },
  operador_estudio: {
    id: 'operador_estudio',
    label: 'Operador/a de MesaControl y OBS',
    description:
      'Opera la consola MesaControl TV, cámaras en vivo, audio, escenas y transmisión HD.',
    canManageUsers: false,
    canEditSite: false,
    canCreatePrograms: false,
    canReviewRequests: false,
    canOperateStudio: true,
    canManageCommercial: false,
  },
  editor_contenido: {
    id: 'editor_contenido',
    label: 'Editor/a del Sitio y Gráfica',
    description:
      'Edita textos, secciones, imágenes, manifiesto y detalles completos del sitio web.',
    canManageUsers: false,
    canEditSite: true,
    canCreatePrograms: false,
    canReviewRequests: false,
    canOperateStudio: false,
    canManageCommercial: false,
  },
  conductor: {
    id: 'conductor',
    label: 'Conducción / Talento',
    description:
      'Consulta cartelera, escaletas en vivo, participación de invitados y consola de emisión.',
    canManageUsers: false,
    canEditSite: false,
    canCreatePrograms: false,
    canReviewRequests: false,
    canOperateStudio: true,
    canManageCommercial: false,
  },
  comercial: {
    id: 'comercial',
    label: 'Comercial y Auspicios',
    description:
      'Gestiona consultas comerciales, alianzas y pauta publicitaria de programas.',
    canManageUsers: false,
    canEditSite: false,
    canCreatePrograms: false,
    canReviewRequests: false,
    canOperateStudio: false,
    canManageCommercial: true,
  },
};

export interface StaffUserPublic {
  id: string;
  username: string;
  fullName: string;
  role: ProducerRole;
  active: boolean;
  createdAt: number;
}

export interface SitePillar {
  title: string;
  description: string;
}

export interface SiteDossierMetric {
  label: string;
  value: string;
  accent?: boolean;
}

export interface SiteCapability {
  index: string;
  title: string;
  description: string;
  deliverable: string;
}

export interface SitePartnershipModel {
  index: string;
  name: string;
  detail: string;
  actionLabel: string;
  topic: string;
}

export interface SiteContentConfig {
  brandName: string;
  ownerName?: string;
  foundingDateText: string;
  locationText: string;
  mottoText: string;
  logoUrl: string;
  heroImageUrl: string;
  heroHeadline: string;
  heroDescription: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  emblemTagline: string;
  emblemCategory: string;
  dossierMetrics: SiteDossierMetric[];
  manifestoEyebrow: string;
  manifestoTitle: string;
  manifestoBody: string;
  manifestoImageUrl: string;
  manifestoPillars: SitePillar[];
  programsEyebrow: string;
  programsTitle: string;
  programsSubtitle: string;
  servicesEyebrow: string;
  servicesTitle: string;
  controlRoomImageUrl: string;
  controlRoomEyebrow: string;
  controlRoomTitle: string;
  controlRoomBody: string;
  capabilities: SiteCapability[];
  alliancesEyebrow: string;
  alliancesTitle: string;
  alliancesSubtitle: string;
  partnershipModels: SitePartnershipModel[];
  contactEyebrow: string;
  contactTitle: string;
  contactBody: string;
  whatsappDisplay: string;
  whatsappNumber: string;
  contactEmail: string;
  footerSubline: string;
}

export type ProgramStatusKey = 'airing' | 'preproduction' | 'development';

export interface ProducerProgram {
  id: string;
  title: string;
  statusKey: ProgramStatusKey;
  statusLabel: string;
  format: string;
  schedule: string;
  duration: string;
  summary: string;
  fullSynopsis: string;
  technicalSpecs: string[];
  imageUrl?: string;
  logoUrl?: string;
  featured?: boolean;
  hostTeam?: string;
  channelOrSignal?: string;
  createdAt: number;
}

export type ProgramRequestStatus =
  | 'pendiente'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado';

export interface ProgramCreationRequest {
  id: string;
  requesterName: string;
  organization: string;
  contact: string;
  proposedTitle: string;
  format: string;
  targetSchedule: string;
  teamInfo: string;
  equipmentNeeds: string;
  synopsis: string;
  status: ProgramRequestStatus;
  reviewNote?: string;
  createdProgramId?: string;
  createdAt: number;
}

export interface ProducerInquiry {
  id: string;
  name: string;
  organization: string;
  contact: string;
  projectType: string;
  message: string;
  createdAt: number;
}

export interface ProgramArchiveVideo {
  id: string;
  programId: string;
  title: string;
  episodeLabel: string;
  description: string;
  durationLabel: string;
  videoUrl: string;
  isUploadedFile: boolean;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  uploadedBy: string;
  createdAt: number;
}

