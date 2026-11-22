import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, UserCheck, X } from 'lucide-react';
import { StaffUserPublic } from '../types/producer';

interface ProducerAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, user: StaffUserPublic) => void;
}

export const ProducerAuthModal: React.FC<ProducerAuthModalProps> = ({
  open,
  onClose,
  onAuthenticated,
}) => {
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('Administrador Total');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setCheckingStatus(true);
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setNeedsAdminSetup(Boolean(d.needsAdminSetup));
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Ingresá tu usuario y contraseña.');
      return;
    }

    if (needsAdminSetup) {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/claim-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            fullName: fullName.trim() || 'Administrador Total',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || 'No se pudo activar la cuenta de administrador.');
          return;
        }
        onAuthenticated(data.token, data.user);
        onClose();
      } catch {
        setError('Error de conexión con el servidor.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.needsAdminSetup) {
          setNeedsAdminSetup(true);
        }
        setError(data.error || 'Usuario o contraseña incorrectos.');
        return;
      }
      onAuthenticated(data.token, data.user);
      onClose();
    } catch {
      setError('Error de conexión al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-[#090D0F] border border-white/15 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <KeyRound className="w-4 h-4" />
            <span>
              {needsAdminSetup
                ? 'ACTIVACIÓN ÚNICA · ADMIN TOTAL'
                : 'ACCESO PRODUCTORA · ROLES'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <h2
              id="auth-modal-title"
              className="font-cinema text-xl font-semibold text-white"
            >
              {needsAdminSetup
                ? 'Configurar Administrador Total'
                : 'Iniciar Sesión en la Productora'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {needsAdminSetup
                ? 'Primer ingreso detectado. Definí tu usuario y contraseña de Administrador Total y Único para habilitar la gestión de roles, edición total del sitio y creación de programas.'
                : 'Ingresá con tu usuario y contraseña asignados por la administración de JUGEND FÜR EINE GRÜNE ZUKUNFT.'}
            </p>
          </div>

          {checkingStatus ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Verificando estado de acceso...
            </div>
          ) : (
            <>
              {needsAdminSetup && (
                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Nombre del Administrador
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Usuario
                </label>
                <input
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      needsAdminSetup ? 'new-password' : 'current-password'
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full min-h-[42px] pl-3.5 pr-11 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Ver contraseña'
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {needsAdminSetup && (
                <div>
                  <label
                    htmlFor="auth-password-confirm"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Confirmar Contraseña
                  </label>
                  <input
                    id="auth-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full min-h-[42px] px-3.5 py-2 bg-[#050708] border border-white/15 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs font-medium text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {needsAdminSetup ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {loading
                        ? 'Activando cuenta...'
                        : 'Activar Administrador Total'}
                    </span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>{loading ? 'Verificando...' : 'Entrar al Sistema'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
