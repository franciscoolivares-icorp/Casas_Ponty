import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import { 
  UserPlus, Mail, Phone, Lock, Check, X, 
  Trash2, UserCheck, UserX, Loader2, Shield, Building2 
} from 'lucide-react';

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  es_admin: boolean;
  activo: boolean;
  tipo_usuario: string;
  desarrollos_asignados?: string[];
  created_at: string;
}

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [desarrollos, setDesarrollos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '', correo: '', telefono: '', password: '', es_admin: false, tipo_usuario: 'ASESOR', desarrollos_asignados: [] as string[]
  });

  const ROLES = ['ADMINISTRADOR', 'COORDINADOR', 'AUDITOR', 'ASESOR'];

  // Cargar usuarios y el catálogo de desarrollos
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: desData, error: desError } = await supabase
        .from('catalogos_maestro')
        .select('valor')
        .eq('tipo_catalogo', 'desarrollo')
        .order('orden', { ascending: true });

      if (usersError) throw usersError;
      if (desError) throw desError;

      setUsuarios(usersData || []);
      setDesarrollos(desData ? desData.map(d => d.valor) : []);
    } catch (error: any) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckboxChange = (desarrollo: string) => {
    setFormData(prev => {
      const isSelected = prev.desarrollos_asignados.includes(desarrollo);
      return {
        ...prev,
        desarrollos_asignados: isSelected
          ? prev.desarrollos_asignados.filter(d => d !== desarrollo)
          : [...prev.desarrollos_asignados, desarrollo]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const salt = bcrypt.genSaltSync(10);
        const passwordMaestra = "CasasPontyInventarioApp26";
        const hashedPassword = bcrypt.hashSync(passwordMaestra, salt);

        const isAdminFinal = formData.tipo_usuario === 'ADMINISTRADOR' ? true : formData.es_admin;
        const desarrollosFinales = formData.tipo_usuario === 'COORDINADOR' ? formData.desarrollos_asignados : null;

        const { error } = await supabase.from('usuarios').insert([{ 
            nombre: formData.nombre.toUpperCase(), 
            correo: formData.correo, 
            telefono: formData.telefono,
            es_admin: isAdminFinal,
            tipo_usuario: formData.tipo_usuario,
            desarrollos_asignados: desarrollosFinales,
            password_hash: hashedPassword, // Solo guardamos el Hash (Correcto y seguro)
            es_nuevo: true,                
            activo: true
        }]);

        if (error) throw error;
        
        alert(`Usuario creado.\n\nContraseña temporal y de firma: ${passwordMaestra}\nRol: ${formData.tipo_usuario}`);
        setIsModalOpen(false);
        setFormData({ nombre: '', correo: '', telefono: '', password: '', es_admin: false, tipo_usuario: 'ASESOR', desarrollos_asignados: [] });
        fetchData();
    } catch (error: any) {
        alert('Error al guardar: ' + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('usuarios').update({ activo: !currentStatus }).eq('id', id);
    fetchData();
  };

  const deleteUser = async (id: string) => {
    if (window.confirm('¿Eliminar permanentemente a este usuario?')) {
      await supabase.from('usuarios').delete().eq('id', id);
      fetchData();
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
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Rol Sistema</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 dark:text-white block">{u.nombre}</span>
                    {u.tipo_usuario === 'COORDINADOR' && u.desarrollos_asignados && u.desarrollos_asignados.length > 0 && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-bold">
                        D: {u.desarrollos_asignados.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> {u.correo}</div>
                    <div className="flex items-center text-xs text-slate-400 mt-1"><Phone className="w-3.5 h-3.5 mr-2" /> {u.telefono || 'Sin registro'}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.tipo_usuario === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                      u.tipo_usuario === 'COORDINADOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      u.tipo_usuario === 'AUDITOR' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {u.es_admin && u.tipo_usuario !== 'ADMINISTRADOR' ? <Shield className="w-3 h-3 mr-1" /> : null}
                      {u.tipo_usuario || 'ASESOR'}
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Usuario</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nombre Completo</label>
                <input required type="text" placeholder="Ej. Jose Juan" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase()})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Rol del Sistema</label>
                <select 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  value={formData.tipo_usuario}
                  onChange={e => setFormData({...formData, tipo_usuario: e.target.value, desarrollos_asignados: []})}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {formData.tipo_usuario === 'COORDINADOR' && (
                <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 animate-in slide-in-from-top-2">
                  <label className="flex items-center text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2">
                    <Building2 className="w-3.5 h-3.5 mr-1.5" /> Desarrollos a cargo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {desarrollos.map(des => (
                      <label key={des} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={formData.desarrollos_asignados.includes(des)}
                          onChange={() => handleCheckboxChange(des)}
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{des}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Correo Electrónico</label>
                <input required type="email" placeholder="usuario@ponty.mx" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Teléfono</label>
                <input type="tel" placeholder="10 dígitos" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
              </div>

              {formData.tipo_usuario !== 'ADMINISTRADOR' && (
                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Privilegios Extras (Admin)</span>
                  </div>
                  <input type="checkbox" className="w-6 h-6 rounded-lg border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={formData.es_admin} onChange={e => setFormData({...formData, es_admin: e.target.checked})} />
                </div>
              )}

              <button 
                disabled={isSubmitting || (formData.tipo_usuario === 'COORDINADOR' && formData.desarrollos_asignados.length === 0)} 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] mt-4"
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