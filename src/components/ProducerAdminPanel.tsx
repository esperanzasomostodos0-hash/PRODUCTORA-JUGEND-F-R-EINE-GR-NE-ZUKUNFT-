import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
  Edit3,
  Home,
  MessageSquare,
  MonitorPlay,
  Plus,
  Shield,
  Trash2,
  Tv,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  PRODUCER_ROLES,
  ProducerInquiry,
  ProducerProgram,
  ProducerRole,
  ProgramCreationRequest,
  ProgramRequestStatus,
  ProgramStatusKey,
  StaffUserPublic,
} from '../types/producer';

interface ProducerAdminPanelProps {
  token: string;
  currentUser: StaffUserPublic;
  programs: ProducerProgram[];
  onProgramsUpdated: (programs: ProducerProgram[]) => void;
  onOpenSiteEditor: () => void;
  onOpenStudio: (programId?: string) => void;
  onOpenLive?: (programId?: string) => void;
  onOpenProgramApartado?: (programId: string) => void;
  onBack: () => void;
  onHome: () => void;
}

type AdminTab = 'programs' | 'requests' | 'users' | 'inquiries';

const ASSIGNABLE_ROLES: ProducerRole[] = [
  'director_general',
  'productor_ejecutivo',
  'operador_estudio',
  'editor_contenido',
  'conductor',
  'comercial',
];

export const ProducerAdminPanel: React.FC<ProducerAdminPanelProps> = ({
  token,
  currentUser,
  programs,
  onProgramsUpdated,
  onOpenSiteEditor,
  onOpenStudio,
  onOpenLive,
  onOpenProgramApartado,
  onBack,
  onHome,
}) => {
  const perms = PRODUCER_ROLES[currentUser.role];

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (perms.canManageUsers) return 'users';
    if (perms.canCreatePrograms) return 'programs';
    if (perms.canReviewRequests) return 'requests';
    return 'inquiries';
  });

  const [users, setUsers] = useState<StaffUserPublic[]>([]);
  const [requests, setRequests] = useState<ProgramCreationRequest[]>([]);
  const [inquiries, setInquiries] = useState<ProducerInquiry[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create User Form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<ProducerRole>('productor_ejecutivo');
  const [savingUser, setSavingUser] = useState(false);
  const [resetPwdTargetId, setResetPwdTargetId] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  // Create / Edit Program Form
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [progTitle, setProgTitle] = useState('');
  const [progStatusKey, setProgStatusKey] = useState<ProgramStatusKey>('airing');
  const [progStatusLabel, setProgStatusLabel] = useState('En emisión');
  const [progFormat, setProgFormat] = useState('TV en Vivo + Radio Visual');
  const [progSchedule, setProgSchedule] = useState('');
  const [progDuration, setProgDuration] = useState('60 min · Semanal');
  const [progHostTeam, setProgHostTeam] = useState('');
  const [progSignal, setProgSignal] = useState('Señal HD JUGEND');
  const [progSummary, setProgSummary] = useState('');
  const [progSynopsis, setProgSynopsis] = useState('');
  const [progSpecsText, setProgSpecsText] = useState(
    'Realización multicámara HD\nGráfica televisiva en tiempo real\nOperación en MesaControl TV'
  );
  const [progImageUrl, setProgImageUrl] = useState(
    '/src/assets/images/hero_production_set_1795376282591.jpg'
  );
  const [progLogoUrl, setProgLogoUrl] = useState('');
  const [progFeatured, setProgFeatured] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadPanelData = useCallback(async () => {
    try {
      if (perms.canManageUsers) {
        const res = await fetch('/api/producer/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.users)) setUsers(d.users);
        }
      }
      const reqRes = await fetch('/api/producer/program-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reqRes.ok) {
        const d = await reqRes.json();
        if (Array.isArray(d.requests)) setRequests(d.requests);
      }
      const inqRes = await fetch('/api/producer/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (inqRes.ok) {
        const d = await inqRes.json();
        if (Array.isArray(d.inquiries)) setInquiries(d.inquiries);
      }
    } catch {
      // ignore transient network errors
    }
  }, [perms.canManageUsers, token]);

  useEffect(() => {
    loadPanelData();
  }, [loadPanelData]);

  const showSuccess = (msg: string) => {
    setErrorMsg(null);
    setFeedback(msg);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSavingUser(true);
    try {
      const res = await fetch('/api/producer/users', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          fullName: newFullName.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo crear el usuario.');
        return;
      }
      setUsers(data.users);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      showSuccess(
        `Usuario "${data.user.username}" creado con rol ${PRODUCER_ROLES[newRole].label}.`
      );
    } catch {
      setErrorMsg('Error al crear usuario.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleUpdateUser = async (
    id: string,
    patch: { role?: ProducerRole; active?: boolean; password?: string }
  ) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/producer/users/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo actualizar el usuario.');
        return;
      }
      setUsers(data.users);
      setResetPwdTargetId(null);
      setResetPwdValue('');
      showSuccess('Usuario actualizado correctamente.');
    } catch {
      setErrorMsg('Error de red al actualizar usuario.');
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/producer/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo eliminar.');
        return;
      }
      setUsers(data.users);
      showSuccess(`Usuario "${username}" eliminado.`);
    } catch {
      setErrorMsg('Error al eliminar usuario.');
    }
  };

  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgTitle('');
    setProgStatusKey('airing');
    setProgStatusLabel('En emisión');
    setProgFormat('TV en Vivo + Radio Visual');
    setProgSchedule('');
    setProgDuration('60 min · Semanal');
    setProgHostTeam('');
    setProgSignal('Señal HD JUGEND');
    setProgSummary('');
    setProgSynopsis('');
    setProgSpecsText(
      'Realización multicámara HD\nGráfica televisiva en tiempo real\nOperación en MesaControl TV'
    );
    setProgImageUrl('/src/assets/images/hero_production_set_1795376282591.jpg');
    setProgLogoUrl('');
    setProgFeatured(false);
  };

  const startEditProgram = (prog: ProducerProgram) => {
    setEditingProgramId(prog.id);
    setProgTitle(prog.title);
    setProgStatusKey(prog.statusKey);
    setProgStatusLabel(prog.statusLabel);
    setProgFormat(prog.format);
    setProgSchedule(prog.schedule);
    setProgDuration(prog.duration);
    setProgHostTeam(prog.hostTeam || '');
    setProgSignal(prog.channelOrSignal || '');
    setProgSummary(prog.summary);
    setProgSynopsis(prog.fullSynopsis);
    setProgSpecsText((prog.technicalSpecs || []).join('\n'));
    setProgImageUrl(
      prog.imageUrl || '/src/assets/images/hero_production_set_1795376282591.jpg'
    );
    setProgLogoUrl(prog.logoUrl || '');
    setProgFeatured(Boolean(prog.featured));
    setActiveTab('programs');
  };

  const handleProgramImageUpload = (
    file?: File,
    target: 'cover' | 'logo' = 'cover'
  ) => {
    if (!file) return;
    if (file.size > 1_400_000) {
      setErrorMsg('La imagen del programa supera 1.4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'cover') setProgImageUrl(reader.result);
        else setProgLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    setSavingProgram(true);

    const payload = {
      title: progTitle.trim(),
      statusKey: progStatusKey,
      statusLabel: progStatusLabel.trim(),
      format: progFormat.trim(),
      schedule: progSchedule.trim(),
      duration: progDuration.trim(),
      hostTeam: progHostTeam.trim(),
      channelOrSignal: progSignal.trim(),
      summary: progSummary.trim(),
      fullSynopsis: progSynopsis.trim() || progSummary.trim(),
      technicalSpecs: progSpecsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      imageUrl: progImageUrl.trim(),
      logoUrl: progLogoUrl.trim(),
      featured: progFeatured,
    };

    try {
      const url = editingProgramId
        ? `/api/producer/programs/${editingProgramId}`
        : '/api/producer/programs';
      const method = editingProgramId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo guardar el programa.');
        return;
      }
      onProgramsUpdated(data.programs);
      showSuccess(
        editingProgramId
          ? `Programa "${data.program.title}" actualizado.`
          : `Nuevo programa "${data.program.title}" publicado en la cartelera.`
      );
      resetProgramForm();
    } catch {
      setErrorMsg('Error de conexión al guardar programa.');
    } finally {
      setSavingProgram(false);
    }
  };

  const handleDeleteProgram = async (id: string, title: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/producer/programs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo eliminar el programa.');
        return;
      }
      onProgramsUpdated(data.programs);
      if (editingProgramId === id) resetProgramForm();
      showSuccess(`Programa "${title}" quitado de la cartelera.`);
    } catch {
      setErrorMsg('Error al eliminar programa.');
    }
  };

  const handleReviewRequest = async (
    id: string,
    status: ProgramRequestStatus,
    createProgramInCatalog = false
  ) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/producer/program-requests/${id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status, createProgramInCatalog }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'No se pudo actualizar la solicitud.');
        return;
      }
      setRequests(data.requests);
      if (Array.isArray(data.programs)) {
        onProgramsUpdated(data.programs);
      }
      showSuccess(
        createProgramInCatalog
          ? 'Solicitud aprobada y programa publicado en cartelera.'
          : `Solicitud marcada como ${status}.`
      );
    } catch {
      setErrorMsg('Error al procesar solicitud.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050708] text-slate-100 flex flex-col">
      {/* Persistent Return Bar */}
      <div className="sticky top-0 z-40 bg-[#080B0D]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[40px] px-3.5 py-2 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver atrás</span>
            </button>
            <button
              type="button"
              onClick={onHome}
              className="min-h-[40px] px-3.5 py-2 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span>Volver al inicio</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {perms.canEditSite && (
              <button
                type="button"
                onClick={onOpenSiteEditor}
                className="min-h-[40px] px-4 py-2 border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Sitio Completo</span>
              </button>
            )}
            {perms.canOperateStudio && (
              <button
                type="button"
                onClick={() => onOpenStudio()}
                className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>MesaControl TV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-emerald-400">
              SESIÓN ACTIVA · {currentUser.username} · {perms.label.toUpperCase()}
            </div>
            <h1 className="font-cinema text-2xl sm:text-3xl font-semibold text-white">
              Panel de Productora y Roles
            </h1>
            <p className="text-sm text-slate-400">{perms.description}</p>
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Role-gated Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#0A0E10] border border-white/10 rounded-xl">
          {perms.canManageUsers && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Usuarios y Roles ({users.length})</span>
            </button>
          )}
          {perms.canCreatePrograms && (
            <button
              type="button"
              onClick={() => setActiveTab('programs')}
              className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'programs'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Programas ({programs.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            <span>Pedidos de Programas ({requests.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inquiries')}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'inquiries'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Consultas ({inquiries.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS & ROLES (ADMIN TOTAL ONLY) */}
        {activeTab === 'users' && perms.canManageUsers && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleCreateUser}
              className="lg:col-span-5 bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Crear Nuevo Usuario y Asignar Rol</span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej: Lucas Fernández"
                  className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Usuario de ingreso
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ej: lucas.op"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mín. 4 caracteres"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Rol en la productora
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as ProducerRole)}
                  className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                >
                  {ASSIGNABLE_ROLES.map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {PRODUCER_ROLES[rKey].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-400">
                  {PRODUCER_ROLES[newRole].description}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingUser}
                className="w-full min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
              >
                {savingUser ? 'Creando usuario...' : 'Crear Usuario con Rol'}
              </button>
            </form>

            <div className="lg:col-span-7 bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Equipo de JUGEND FÜR EINE GRÜNE ZUKUNFT</span>
                </h2>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {users.length} cuentas
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {users.map((u) => {
                  const isRoot = u.role === 'admin_total';
                  return (
                    <div
                      key={u.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {u.fullName}
                          </span>
                          <span className="text-xs font-mono text-emerald-400">
                            @{u.username}
                          </span>
                          {!u.active && (
                            <span className="text-xs text-red-400 font-medium">
                              (Suspendido)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {PRODUCER_ROLES[u.role].label} ·{' '}
                          {PRODUCER_ROLES[u.role].description}
                        </p>
                      </div>

                      {!isRoot ? (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            aria-label={`Cambiar rol de ${u.username}`}
                            value={u.role}
                            onChange={(e) =>
                              handleUpdateUser(u.id, {
                                role: e.target.value as ProducerRole,
                              })
                            }
                            className="min-h-[34px] px-2.5 py-1 bg-[#050708] border border-white/15 rounded-md text-xs text-white"
                          >
                            {ASSIGNABLE_ROLES.map((rKey) => (
                              <option key={rKey} value={rKey}>
                                {PRODUCER_ROLES[rKey].label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateUser(u.id, { active: !u.active })
                            }
                            className="min-h-[34px] px-2.5 py-1 border border-white/15 rounded-md text-xs text-slate-300 hover:text-white cursor-pointer"
                          >
                            {u.active ? 'Pausar' : 'Activar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetPwdTargetId(
                                resetPwdTargetId === u.id ? null : u.id
                              );
                              setResetPwdValue('');
                            }}
                            className="min-h-[34px] px-2.5 py-1 border border-white/15 rounded-md text-xs text-slate-300 hover:text-white cursor-pointer"
                          >
                            Clave
                          </button>

                          <button
                            type="button"
                            aria-label={`Eliminar usuario ${u.username}`}
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="min-h-[34px] px-2.5 py-1 border border-red-500/30 text-red-400 hover:bg-red-950/50 rounded-md text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400 shrink-0">
                          ADMIN ÚNICO
                        </span>
                      )}

                      {resetPwdTargetId === u.id && !isRoot && (
                        <div className="w-full sm:w-auto flex items-center gap-2 pt-2 sm:pt-0">
                          <input
                            type="password"
                            value={resetPwdValue}
                            onChange={(e) => setResetPwdValue(e.target.value)}
                            placeholder="Nueva clave (mín. 4)"
                            className="min-h-[34px] px-2.5 py-1 bg-[#050708] border border-white/20 rounded-md text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateUser(u.id, { password: resetPwdValue })
                            }
                            className="min-h-[34px] px-3 py-1 bg-emerald-600 text-white text-xs rounded-md cursor-pointer"
                          >
                            Guardar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE / EDIT PROGRAMS */}
        {activeTab === 'programs' && perms.canCreatePrograms && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveProgram}
              className="lg:col-span-5 bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>
                    {editingProgramId
                      ? 'Editar Programa de Cartelera'
                      : 'Crear Nuevo Programa'}
                  </span>
                </div>
                {editingProgramId && (
                  <button
                    type="button"
                    onClick={resetProgramForm}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nombre del Programa
                </label>
                <input
                  type="text"
                  required
                  value={progTitle}
                  onChange={(e) => setProgTitle(e.target.value)}
                  placeholder="Ej: Noche de Debate / EcoDebate"
                  className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={progStatusKey}
                    onChange={(e) => {
                      const val = e.target.value as ProgramStatusKey;
                      setProgStatusKey(val);
                      setProgStatusLabel(
                        val === 'airing'
                          ? 'En emisión'
                          : val === 'preproduction'
                          ? 'En preproducción'
                          : 'En desarrollo'
                      );
                    }}
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  >
                    <option value="airing">En emisión</option>
                    <option value="preproduction">En preproducción</option>
                    <option value="development">En desarrollo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Etiqueta visible de estado
                  </label>
                  <input
                    type="text"
                    value={progStatusLabel}
                    onChange={(e) => setProgStatusLabel(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Formato
                  </label>
                  <input
                    type="text"
                    value={progFormat}
                    onChange={(e) => setProgFormat(e.target.value)}
                    placeholder="TV en Vivo + Radio"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Duración
                  </label>
                  <input
                    type="text"
                    value={progDuration}
                    onChange={(e) => setProgDuration(e.target.value)}
                    placeholder="60 min · Semanal"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Días y Horario
                  </label>
                  <input
                    type="text"
                    value={progSchedule}
                    onChange={(e) => setProgSchedule(e.target.value)}
                    placeholder="Viernes 20:00 a 22:00"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Equipo / Organización
                  </label>
                  <input
                    type="text"
                    value={progHostTeam}
                    onChange={(e) => setProgHostTeam(e.target.value)}
                    placeholder="Equipo propio o invitado"
                    className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Resumen para Cartelera
                </label>
                <textarea
                  rows={2}
                  required
                  value={progSummary}
                  onChange={(e) => setProgSummary(e.target.value)}
                  placeholder="Descripción breve que aparece en la tarjeta del programa..."
                  className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Sinopsis Completa (Ficha Técnica)
                </label>
                <textarea
                  rows={3}
                  value={progSynopsis}
                  onChange={(e) => setProgSynopsis(e.target.value)}
                  placeholder="Detalle editorial del ciclo..."
                  className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Especificaciones técnicas (una por línea)
                </label>
                <textarea
                  rows={3}
                  value={progSpecsText}
                  onChange={(e) => setProgSpecsText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Canal o Señal
                </label>
                <input
                  type="text"
                  value={progSignal}
                  onChange={(e) => setProgSignal(e.target.value)}
                  placeholder="Radioactiva 88.5 FM + Web HD"
                  className="w-full min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Imagen de Portada (URL o Subir Foto)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={progImageUrl}
                    onChange={(e) => setProgImageUrl(e.target.value)}
                    className="flex-1 min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                  />
                  <label className="min-h-[40px] px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleProgramImageUpload(e.target.files?.[0], 'cover')
                      }
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Logo del Programa (URL o Subir, opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={progLogoUrl}
                    onChange={(e) => setProgLogoUrl(e.target.value)}
                    placeholder="Opcional"
                    className="flex-1 min-h-[40px] px-3 py-2 bg-[#050708] border border-white/15 rounded-lg text-xs text-white font-mono"
                  />
                  <label className="min-h-[40px] px-3 py-2 border border-white/15 rounded-lg text-xs text-slate-200 hover:bg-white/5 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleProgramImageUpload(e.target.files?.[0], 'logo')
                      }
                    />
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={progFeatured}
                  onChange={(e) => setProgFeatured(e.target.checked)}
                  className="rounded border-white/20 bg-[#050708]"
                />
                <span>Mostrar destacado a ancho completo en cartelera</span>
              </label>

              <button
                type="submit"
                disabled={savingProgram}
                className="w-full min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
              >
                {savingProgram
                  ? 'Guardando...'
                  : editingProgramId
                  ? 'Guardar Cambios del Programa'
                  : 'Crear y Publicar Programa'}
              </button>
            </form>

            <div className="lg:col-span-7 bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Cartelera Actual ({programs.length} programas)
                </h2>
              </div>

              <div className="divide-y divide-white/10">
                {programs.map((prog) => (
                  <div
                    key={prog.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-cinema text-base font-semibold text-white">
                          {prog.title}
                        </span>
                        <span className="text-xs text-emerald-400">
                          {prog.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {prog.format} · {prog.schedule}
                      </p>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {prog.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {perms.canOperateStudio && (
                        <button
                          type="button"
                          onClick={() => onOpenStudio(prog.id)}
                          className="min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MonitorPlay className="w-3.5 h-3.5" />
                          <span>Emitir</span>
                        </button>
                      )}
                      {onOpenProgramApartado && (
                        <button
                          type="button"
                          onClick={() => onOpenProgramApartado(prog.id)}
                          className="min-h-[36px] px-3 py-1.5 border border-white/15 hover:border-emerald-500/40 text-xs text-slate-200 hover:text-emerald-300 rounded-lg cursor-pointer"
                        >
                          Apartado
                        </button>
                      )}
                      {onOpenLive && (
                        <button
                          type="button"
                          onClick={() => onOpenLive(prog.id)}
                          className="min-h-[36px] px-3 py-1.5 border border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-950/50 rounded-lg cursor-pointer"
                        >
                          Emisión
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditProgram(prog)}
                        className="min-h-[36px] px-3 py-1.5 border border-white/15 hover:border-white/30 text-xs text-slate-200 rounded-lg cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${prog.title}`}
                        onClick={() => handleDeleteProgram(prog.id, prog.title)}
                        className="min-h-[36px] px-2.5 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-950/50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROGRAM CREATION REQUESTS */}
        {activeTab === 'requests' && (
          <div className="bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Solicitudes Enviadas para Crear Nuevos Programas
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {requests.length} recibidas
              </span>
            </div>

            {requests.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Aún no hay pedidos enviados desde el formulario "Solicitar Crear un Programa".
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {requests.map((reqItem) => (
                  <div key={reqItem.id} className="py-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-emerald-400">
                            {reqItem.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300 font-semibold uppercase">
                            {reqItem.status.replace('_', ' ')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">
                            {new Date(reqItem.createdAt).toLocaleDateString(
                              'es-AR'
                            )}
                          </span>
                        </div>
                        <h3 className="font-cinema text-lg font-semibold text-white">
                          {reqItem.proposedTitle}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Solicita: <strong className="text-slate-200">{reqItem.requesterName}</strong>
                          {reqItem.organization ? ` (${reqItem.organization})` : ''} · Contacto:{' '}
                          <span className="text-emerald-300">{reqItem.contact}</span>
                        </p>
                      </div>

                      {perms.canReviewRequests && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleReviewRequest(reqItem.id, 'en_revision')
                            }
                            className="min-h-[34px] px-3 py-1 border border-white/15 text-xs text-slate-300 hover:text-white rounded-md cursor-pointer"
                          >
                            En Revisión
                          </button>
                          {!reqItem.createdProgramId && (
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewRequest(reqItem.id, 'aprobado', true)
                              }
                              className="min-h-[34px] px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-md cursor-pointer"
                            >
                              Aprobar y Crear Programa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleReviewRequest(reqItem.id, 'rechazado')
                            }
                            className="min-h-[34px] px-3 py-1 border border-red-500/30 text-xs text-red-400 hover:bg-red-950/40 rounded-md cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      Formato: <span className="text-slate-200">{reqItem.format}</span> · Horario buscado:{' '}
                      <span className="text-slate-200">{reqItem.targetSchedule}</span>
                      {reqItem.teamInfo ? ` · Equipo: ${reqItem.teamInfo}` : ''}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      {reqItem.synopsis}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="bg-[#090D0F] border border-white/12 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              Consultas Comerciales y de Contacto ({inquiries.length})
            </h2>
            {inquiries.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No hay consultas registradas todavía.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="py-4 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-white">
                        {inq.name}
                        {inq.organization ? ` · ${inq.organization}` : ''}
                      </span>
                      <span className="font-mono text-emerald-400">
                        {inq.projectType} · {inq.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Contacto: {inq.contact}</p>
                    <p className="text-sm text-slate-300">{inq.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
