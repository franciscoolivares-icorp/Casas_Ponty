import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import { 
  UserPlus, Mail, Phone, Lock, Check, X, 
  Trash2, UserCheck, UserX, Loader2, Shield 
} from 'lucide-react';

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  es_admin: boolean;
  activo: boolean;
  created_at: string;
}

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '', correo: '', telefono: '', password: '', es_admin: false
  });

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        // Encriptamos la contraseña maestra que definiste
        const salt = bcrypt.genSaltSync(10);
        const passwordMaestra = "CasasPontyInventarioApp26";
        const hashedPassword = bcrypt.hashSync(passwordMaestra, salt);

        const { error } = await supabase.from('usuarios').insert([{ 
        nombre: formData.nombre, 
        correo: formData.correo, 
        telefono: formData.telefono,
        es_admin: formData.es_admin,
        password_hash: hashedPassword, // Guardamos la maestra encriptada
        es_nuevo: true,                // Marcamos como nuevo
        activo: true
        }]);

        if (error) throw error;
        
        alert(`Usuario creado. Contraseña temporal: ${passwordMaestra}`);
        setIsModalOpen(false);
        setFormData({ nombre: '', correo: '', telefono: '', password: '', es_admin: false });
        fetchUsuarios();
    } catch (error: any) {
        alert('Error al guardar: ' + error.message);
    } finally {
        setIsSubmitting(false);
    }
    };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('usuarios').update({ activo: !currentStatus }).eq('id', id);
    fetchUsuarios();
  };

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Eliminar permanentemente a este usuario?')) {
      await supabase.from('usuarios').delete().eq('id', id);
      fetchUsuarios();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Usuarios del Sistema</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administra quién tiene acceso al inventario.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Nuevo Usuario
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Rol</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{u.nombre}</td>
                  <td className="p-4">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> {u.correo}</div>
                    <div className="flex items-center text-xs text-slate-400 mt-1"><Phone className="w-3.5 h-3.5 mr-2" /> {u.telefono || 'Sin registro'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${u.es_admin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                      {u.es_admin ? <Shield className="w-3 h-3 mr-1" /> : null}
                      {u.es_admin ? 'Admin' : 'Asesor'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleStatus(u.id, u.activo)} 
                      className={`p-2 rounded-full transition-colors ${u.activo ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                      title={u.activo ? "Desactivar" : "Activar"}
                    >
                      {u.activo ? <UserCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP (MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Usuario</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nombre Completo</label>
                <input required type="text" placeholder="Ej. Jose Juan" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Correo Electrónico</label>
                <input required type="email" placeholder="usuario@ponty.mx" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
              </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Teléfono</label>
                  <input type="tel" placeholder="10 dígitos" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Privilegios de Admin</span>
                </div>
                <input type="checkbox" className="w-6 h-6 rounded-lg border-indigo-300 text-indigo-600 focus:ring-indigo-500" checked={formData.es_admin} onChange={e => setFormData({...formData, es_admin: e.target.checked})} />
              </div>

              <button 
                disabled={isSubmitting} 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : <Check className="mr-2 w-5 h-5" />}
                {isSubmitting ? 'Registrando...' : 'Guardar Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}