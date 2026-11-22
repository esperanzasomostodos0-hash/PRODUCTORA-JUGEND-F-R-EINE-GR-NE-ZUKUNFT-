import React, { useState } from 'react';
import { EyeOff, Plus, Sparkles, Trash2, UserCheck, Users } from 'lucide-react';
import { GuestBadgeItem } from '../types/broadcast';

interface GuestBadgesPanelProps {
  guests: GuestBadgeItem[];
  activeBadge: GuestBadgeItem | null | undefined;
  onUpdateGuests: (next: GuestBadgeItem[]) => void;
  onShowBadge: (badge: GuestBadgeItem) => void;
  onClearBadge: () => void;
}

const GREETING_OPTIONS = [
  'BIENVENIDO',
  'BIENVENIDA',
  'BIENVENIDOS',
  'INVITADO ESPECIAL',
  'INVITADA ESPECIAL',
  'EN MESA',
];

export const GuestBadgesPanel: React.FC<GuestBadgesPanelProps> = ({
  guests,
  activeBadge,
  onUpdateGuests,
  onShowBadge,
  onClearBadge,
}) => {
  const [greeting, setGreeting] = useState('BIENVENIDO');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleQuickShowAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const badge: GuestBadgeItem = {
      id: `guest-${Date.now()}`,
      greeting: greeting.trim() || 'BIENVENIDO',
      name: name.trim(),
      role: role.trim(),
    };
    onUpdateGuests([badge, ...guests]);
    onShowBadge(badge);
    setName('');
    setRole('');
  };

  const handleDelete = (id: string) => {
    onUpdateGuests(guests.filter((g) => g.id !== id));
    if (activeBadge?.id === id) {
      onClearBadge();
    }
  };

  return (
    <section className="bg-[#121720] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display text-sm sm:text-base font-semibold text-white">
              Cartelitos de Bienvenida para Invitados
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Creá y sacá al aire tarjetas de &ldquo;Bienvenido [Nombre]&rdquo; en la esquina superior sin tapar cámaras ni zócalos
          </p>
        </div>

        {activeBadge && (
          <button
            type="button"
            onClick={onClearBadge}
            className="min-h-[36px] px-3 py-1.5 bg-red-600/20 hover:bg-red-600/35 border border-red-500/45 text-red-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Quitar Cartelito ({activeBadge.name})</span>
          </button>
        )}
      </div>

      {/* Quick Create & Show Form */}
      <form
        onSubmit={handleQuickShowAndSave}
        className="p-3.5 bg-[#0A0D12] border border-emerald-500/30 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3">
          <label className="block text-[11px] text-slate-400 mb-1">
            Saludo / Etiqueta
          </label>
          <select
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-white"
          >
            {GREETING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] text-slate-400 mb-1">
            Nombre del Invitado/a
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Lucas Méndez"
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs font-semibold text-white"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[11px] text-slate-400 mb-1">
            Rol / Agrupación (opcional)
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ej: Referente Local"
            className="w-full px-3 py-2 bg-[#121720] border border-white/12 rounded-lg text-xs text-slate-200"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full min-h-[38px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mostrar</span>
          </button>
        </div>
      </form>

      {/* Saved Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {guests.map((g) => {
          const isOnAir =
            activeBadge?.id === g.id ||
            (activeBadge?.name === g.name && activeBadge?.greeting === g.greeting);
          return (
            <div
              key={g.id}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-colors ${
                isOnAir
                  ? 'bg-[#0E1E16] border-emerald-500 text-white'
                  : 'bg-[#0A0D12] border-white/10 text-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono font-bold rounded">
                    {g.greeting}
                  </span>
                  {isOnAir && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      AL AIRE
                    </span>
                  )}
                </div>
                <p className="font-display text-sm font-bold text-white truncate">
                  {g.name}
                </p>
                {g.role && (
                  <p className="text-[11px] text-slate-400 truncate">{g.role}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => (isOnAir ? onClearBadge() : onShowBadge(g))}
                  className={`flex-1 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    isOnAir
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600/25 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40'
                  }`}
                >
                  {isOnAir ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sacar Cartelito</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(g.id)}
                  title="Eliminar invitado"
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-950/60 text-slate-400 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {guests.length === 0 && (
          <div className="md:col-span-3 p-4 bg-[#0A0D12] border border-white/8 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Agregá invitados arriba para tener sus cartelitos listos en 1 clic.</span>
          </div>
        )}
      </div>
    </section>
  );
};
