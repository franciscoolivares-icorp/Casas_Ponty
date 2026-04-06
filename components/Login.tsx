import logoPonty from '../Recursos/casas_ponty.png';
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import emailjs from '@emailjs/browser'; // <-- IMPORTAMOS EMAILJS
import { 
  Building2, Lock, Mail, Eye, EyeOff, 
  ChevronRight, Loader2, ShieldCheck, AlertCircle, KeyRound, ArrowLeft
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  // Estados de vista y carga
  const [step, setStep] = useState<'login' | 'change-password' | 'forgot-password'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState(''); // Para recuperar contraseña
  const [tempUser, setTempUser] = useState<any>(null);

  // 1. Lógica de Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Buscar usuario por correo
      const { data: user, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', email.toLowerCase())
        .single();

      if (fetchError || !user) {
        throw new Error('Credenciales incorrectas o usuario no encontrado.');
      }

      if (!user.activo) {
        throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
      }

      // Verificar contraseña encriptada
      const isPasswordCorrect = bcrypt.compareSync(password, user.password_hash);
      
      if (!isPasswordCorrect) {
        throw new Error('Contraseña incorrecta.');
      }

      // REGLA NUEVA: Si es nuevo, forzar cambio de contraseña
      if (user.es_nuevo) {
        setTempUser(user);
        setStep('change-password');
      } else {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lógica de Cambio de Contraseña (Primer inicio / Recuperación)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Encriptar la nueva contraseña
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);

      // Actualizar en Supabase
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          password_hash: hashedPassword, 
          es_nuevo: false 
        })
        .eq('id', tempUser.id);

      if (updateError) throw updateError;

      alert('¡Contraseña actualizada con éxito!');
      onLoginSuccess({ ...tempUser, es_nuevo: false });
    } catch (err: any) {
      setError('Error al actualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Lógica para Olvidé mi Contraseña
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Verificar que el correo exista
      const { data: user, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo', resetEmail.toLowerCase())
        .single();

      if (fetchError || !user) {
        throw new Error('No existe una cuenta registrada con este correo.');
      }

      if (!user.activo) {
        throw new Error('La cuenta está desactivada. No se puede recuperar.');
      }

      // 2. Generar contraseña temporal aleatoria (ej: Temp849201)
      const tempPassword = "Temp" + Math.floor(100000 + Math.random() * 900000);
      
      // 3. Encriptarla
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(tempPassword, salt);

      // 4. Actualizar usuario en BD y forzar que la cambie al entrar (es_nuevo = true)
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ 
          password_hash: hashedPassword, 
          es_nuevo: true 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Enviar correo usando EmailJS y las llaves que ya configuramos
      const templateParams = {
        to_email: user.correo,
        to_name: user.nombre,
        rol: user.tipo_usuario,
        password: tempPassword,
      };

      await emailjs.send(
        'service_q6nzdzh',     // Tu Service ID
        'template_3gs81yt',    // Tu Template ID (Mismo de bienvenida)
        templateParams,
        'Wk9H8F1qHcLw1V9H3'    // Tu Public Key
      );

      alert(`Se ha enviado una contraseña temporal a ${user.correo}`);
      setStep('login');
      setResetEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        
        {/* LOGO Y TÍTULO */}
        <div className="text-center mb-12">
          <img 
            src={logoPonty} 
            alt="Logo Casas Ponty" 
            className="w-64 mx-auto mb-6" 
          />
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            SGII - Sistema de Gestión de Inventario Inmobiliario
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center text-red-700 dark:text-red-400 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* VISTA 1: LOGIN NORMAL */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Correo Electrónico</label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="email" 
                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium lowercase"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contraseña</label>
                  <button 
                    type="button" 
                    onClick={() => {setStep('forgot-password'); setError(null);}} 
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    className="block w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium tracking-wide"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-500 transition-colors outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                disabled={loading}
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] disabled:opacity-70 mt-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                {loading ? 'Verificando...' : 'Entrar al Sistema'}
                {!loading && <ChevronRight className="w-5 h-5 ml-1" />}
              </button>
            </form>
          )}

          {/* VISTA 2: CAMBIO DE CONTRASEÑA */}
          {step === 'change-password' && (
            <form onSubmit={handleChangePassword} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 mb-6 text-center">
                <ShieldCheck className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Cambio de Contraseña Requerido</h4>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">Por seguridad, debes crear una contraseña personal para continuar.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Nueva Contraseña</label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="password"
                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium tracking-wide"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Confirmar Contraseña</label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="password"
                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium tracking-wide"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center mt-2"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                {loading ? 'Actualizando...' : 'Guardar y Entrar'}
              </button>
            </form>
          )}

          {/* VISTA 3: RECUPERAR CONTRASEÑA */}
          {step === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-800">
                  <KeyRound className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">Recuperar Contraseña</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 px-4">
                  Ingresa el correo asociado a tu cuenta y te enviaremos una contraseña temporal.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider">Correo Electrónico</label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    required 
                    type="email" 
                    className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium lowercase"
                    placeholder="tu@correo.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
                  {loading ? 'Enviando...' : 'Enviar Contraseña'}
                </button>

                <button 
                  type="button"
                  onClick={() => {setStep('login'); setError(null);}}
                  className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-xl transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Volver al Inicio
                </button>
              </div>
            </form>
          )}

        </div>

        <p className="text-center mt-8 text-xs text-slate-400 dark:text-slate-600 uppercase font-bold tracking-widest">
          © 2026 Desarrollado por icorp 
        </p>
      </div>
    </div>
  );
}