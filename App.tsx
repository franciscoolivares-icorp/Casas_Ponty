import logoPonty from './Recursos/casas_ponty.png';
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';
import { 
  List, Settings, FlaskConical, PieChart, 
  LogOut, Home as HomeIcon, PlusCircle, Users, Database,
  Bell, Mail, AlertTriangle
} from 'lucide-react';
import { SchemaTable } from './components/SchemaTable';
import { PropertyForm } from './components/PropertyForm';
import { PropertyList } from './components/PropertyList';
import { CatalogManager } from './components/CatalogManager';
import { Apartados } from './components/Apartados'; 
import { ReporterView } from './components/ReporterView';
import Login from './components/Login';
import { Home } from './components/Home';
import { Usuarios } from './components/Usuarios'; 
import { Propiedad } from './types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'schema' | 'list' | 'form' | 'config' | 'test' | 'reporter' | 'usuarios'>('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [isViewing, setIsViewing] = useState(false);
  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [editingProperty, setEditingProperty] = useState<Propiedad | undefined>(undefined);
  
  // --- ESTADOS PARA NOTIFICACIONES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [usuariosDB, setUsuariosDB] = useState<any[]>([]); // Para obtener los correos de los asesores
  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ponty_session');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as any;
    const validTabs = ['home', 'schema', 'list', 'form', 'config', 'test', 'reporter', 'usuarios'];
    if (validTabs.includes(hash)) setActiveTab(hash);
  }, []);

  useEffect(() => {
    if (isAuthenticated) window.location.hash = activeTab;
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const [catalogs, setCatalogs] = useState<{ [key: string]: string[] }>({
      elementosHabilitarBanco: ['BANCARIO', 'BANCARIO - APOYO INFO', 'COFINAVIT', 'INFO + BANCO', 'FOVISSSTE PARA TODOS', 'IVEQ']
  });
  const [modelAssignments, setModelAssignments] = useState<{ [group: string]: string[] }>({});
  const [statusAssignments, setStatusAssignments] = useState<{ [group: string]: string[] }>({});
  const [metodoCompraAssignments, setMetodoCompraAssignments] = useState<{ [group: string]: string[] }>({});

  const fetchCatalogs = async () => {
    try {
      const [catRes, assignRes] = await Promise.all([
        supabase.from('catalogos_maestro').select('*').order('orden', { ascending: true }),
        supabase.from('asignaciones_catalogos').select('*')
      ]);

      if (catRes.error) throw catRes.error;
      if (assignRes.error) throw assignRes.error;

      const newCatalogs: { [key: string]: string[] } = {
        elementosHabilitarBanco: ['BANCARIO', 'BANCARIO - APOYO INFO', 'COFINAVIT', 'INFO + BANCO', 'FOVISSSTE PARA TODOS', 'IVEQ']
      };
      
      catRes.data.forEach((item: any) => {
        if (!newCatalogs[item.tipo_catalogo]) newCatalogs[item.tipo_catalogo] = [];
        newCatalogs[item.tipo_catalogo].push(item.valor);
      });
      setCatalogs(newCatalogs);

      const newModelAssig: { [key: string]: string[] } = {};
      const newStatusAssig: { [key: string]: string[] } = {};
      const newMetodoAssig: { [key: string]: string[] } = {};

      assignRes.data.forEach((item: any) => {
        if (item.tipo_relacion === 'modelo_a_agrupador') {
          if (!newModelAssig[item.padre]) newModelAssig[item.padre] = [];
          newModelAssig[item.padre].push(item.hijo);
        } else if (item.tipo_relacion === 'estado_a_agrupador') {
          if (!newStatusAssig[item.padre]) newStatusAssig[item.padre] = [];
          newStatusAssig[item.padre].push(item.hijo);
        } else if (item.tipo_relacion === 'metodo_a_agrupador') {
          if (!newMetodoAssig[item.padre]) newMetodoAssig[item.padre] = [];
          newMetodoAssig[item.padre].push(item.hijo);
        }
      });

      setModelAssignments(newModelAssig);
      setStatusAssignments(newStatusAssig);
      setMetodoCompraAssignments(newMetodoAssig);
    } catch (error: any) {
      console.error('Error al cargar catálogos:', error.message);
    }
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase.from('propiedades').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error al cargar propiedades:', error.message);
    else setProperties((data as Propiedad[]) || []);
  };

  // Extraemos usuarios para poder mapear los correos al enviar alertas
  const fetchUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('nombre, correo');
    if (data) setUsuariosDB(data);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCatalogs();
      fetchProperties();
      fetchUsuarios();
    }
  }, [isAuthenticated]);

  // --- LÓGICA DE ALERTAS / NOTIFICACIONES ---
  const notificaciones = useMemo(() => {
    if (!currentUser) return [];
    const today = new Date();
    const isManager = currentUser.es_admin || currentUser.tipo_usuario === 'COORDINADOR';
    
    const alertas = [];

    properties.forEach(p => {
      if (p.estado === 'APARTADO' && p.fechaApartado) {
        const d = new Date(p.fechaApartado + 'T12:00:00');
        const diasTranscurridos = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
        const diasAut = p.diasAutorizadosApartado || 7;
        const diasRezago = diasTranscurridos - diasAut;

        if (diasRezago > 0) {
          // Si es el asesor dueño de la venta, o si es un coordinador/admin
          if (p.asesor === currentUser.nombre) {
            alertas.push({ id: p.idPropiedad, tipo: 'rezago_propio', texto: `¡Atención! Tu apartado ${p.idPropiedad} tiene ${diasRezago} días de rezago.`, prop: p, diasRezago });
          } else if (isManager) {
            // Si es coordinador, checar si el desarrollo le pertenece (o si es admin ve todo)
            const desarrollosManager = currentUser.desarrollos_asignados || [];
            if (currentUser.es_admin || desarrollosManager.includes(p.desarrollo)) {
              alertas.push({ id: p.idPropiedad, tipo: 'rezago_equipo', texto: `Rezago de ${diasRezago} días en ${p.idPropiedad} (${p.asesor || 'Sin Asesor'}).`, prop: p, diasRezago });
            }
          }
        }
      }
    });

    return alertas.sort((a, b) => b.diasRezago - a.diasRezago); // Los más rezagados primero
  }, [properties, currentUser]);


  const handleSendAlertEmail = async (alerta: any) => {
    const prop = alerta.prop;
    const asesor = usuariosDB.find(u => u.nombre === prop.asesor);
    
    if (!asesor || !asesor.correo) {
      alert(`No se encontró el correo registrado para el asesor: ${prop.asesor}`);
      return;
    }

    // AQUI PONES TU TEMPLATE ID DE ALERTAS DE EMAILJS QUE ACABAS DE CREAR
    const TEMPLATE_ID_ALERTAS = 'template_n4fo0xb'; 

    setIsSendingAlert(alerta.id);
    try {
      await emailjs.send(
        'service_q6nzdzh', 
        TEMPLATE_ID_ALERTAS, 
        {
          to_email: asesor.correo,
          asesor: prop.asesor,
          id_propiedad: prop.idPropiedad,
          desarrollo: prop.desarrollo,
          modelo: prop.modelo,
          dias_rezago: alerta.diasRezago
        },
        'Wk9H8F1qHcLw1V9H3'
      );
      alert(`Aviso enviado exitosamente a ${asesor.correo}`);
    } catch (err) {
      console.error('Error enviando alerta:', err);
      alert('Hubo un error enviando la alerta. Revisa la consola.');
    } finally {
      setIsSendingAlert(null);
    }
  };


  const logMovimiento = async (idPropiedad: string, accion: string, detalles: string) => {
    if (!idPropiedad) return;
    await supabase.from('bitacora_movimientos').insert([{ idPropiedad, usuario: currentUser?.nombre || 'SISTEMA', accion, detalles }]);
  };

  const handleAddProperty = async (newProperty: Partial<Propiedad>) => {
    const { data, error } = await supabase.from('propiedades').insert([newProperty]).select();
    if (error) alert('Error al guardar: ' + error.message);
    else { 
      if (data && data[0]) await logMovimiento(data[0].idPropiedad, 'ALTA DE PROPIEDAD', `Propiedad agregada con estatus ${data[0].estado}`);
      fetchProperties(); setActiveTab('list'); 
    }
  };

  const handleUpdateProperty = async (updatedProperty: Partial<Propiedad>) => {
    const { idPropiedad, ...restOfData } = updatedProperty;
    const oldProp = properties.find(p => p.idPropiedad === idPropiedad);
    const { error } = await supabase.from('propiedades').update(restOfData).eq('idPropiedad', idPropiedad);
    if (error) alert('Error al actualizar: ' + error.message);
    else { 
      if (oldProp) {
        if (oldProp.estado !== updatedProperty.estado && updatedProperty.estado) await logMovimiento(idPropiedad as string, 'CAMBIO DE ESTATUS', `Pasó de ${oldProp.estado || 'N/A'} a ${updatedProperty.estado}`);
        if (oldProp.precioFinal !== updatedProperty.precioFinal && updatedProperty.precioFinal !== undefined) await logMovimiento(idPropiedad as string, 'CAMBIO DE PRECIO', `Pasó de $${oldProp.precioFinal || 0} a $${updatedProperty.precioFinal}`);
      }
      fetchProperties(); if (activeTab === 'form') setActiveTab('list'); 
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (window.confirm('¿Eliminar permanentemente este registro?')) {
      const { error } = await supabase.from('propiedades').delete().eq('idPropiedad', id);
      if (error) alert('Error al eliminar: ' + error.message);
      else { await logMovimiento(id, 'ELIMINACIÓN', 'Propiedad borrada del sistema'); fetchProperties(); }
    }
  };

  const handleBulkUpdateProperties = async (ids: string[], field: keyof Propiedad, value: any) => {
    const { error } = await supabase.from('propiedades').update({ [field]: value }).in('idPropiedad', ids);
    if (error) alert('Error en actualización masiva: ' + error.message);
    else {
      for (const id of ids) await logMovimiento(id, 'EDICIÓN MASIVA', `Campo '${field}' actualizado a: ${value}`);
      fetchProperties();
    }
  };
  
  const handleBulkImport = async (importedData: any[]) => {
    try {
      const { error } = await supabase.from('propiedades').upsert(importedData, { onConflict: 'idPropiedad' });
      if (error) throw error;
      alert(`¡Se importaron/actualizaron ${importedData.length} propiedades con éxito!`);
      fetchProperties();
    } catch (error: any) { alert('Error en la importación a la base de datos: ' + error.message); }
  };

  const startEditing = (prop: Propiedad) => { setEditingProperty(prop); setIsViewing(false); setActiveTab('form'); };
  const startViewing = (prop: Propiedad) => { setEditingProperty(prop); setIsViewing(true); setActiveTab('form'); };

  const handleLogout = () => {
    localStorage.removeItem('ponty_session'); 
    setIsAuthenticated(false); setCurrentUser(null); setActiveTab('home'); window.location.hash = ''; 
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={(user) => { setCurrentUser(user); setIsAuthenticated(true); localStorage.setItem('ponty_session', JSON.stringify(user)); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-[60] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              
              <button onClick={() => setActiveTab('home')} className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity focus:outline-none mr-8">
                <img src={logoPonty} alt="Casas Ponty Logo" className="h-6 w-auto object-contain" />
              </button>
              
              <div className="flex space-x-6 min-w-max">
                <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                  <HomeIcon className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inicio</span>
                </button>
                <button onClick={() => setActiveTab('list')} className={`${activeTab === 'list' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                  <List className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inventario</span>
                </button>
                <button onClick={() => setActiveTab('test')} className={`${activeTab === 'test' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                  <FlaskConical className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Apartar</span>
                </button>
                
                {currentUser?.es_admin && (
                  <>
                    <button onClick={() => setActiveTab('reporter')} className={`${activeTab === 'reporter' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                      <PieChart className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Reportes</span>
                    </button>
                    <button onClick={() => { setEditingProperty(undefined); setIsViewing(false); setActiveTab('form'); }} className={`${activeTab === 'form' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                      <PlusCircle className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Nuevo</span>
                    </button>
                    <button onClick={() => setActiveTab('usuarios')} className={`${activeTab === 'usuarios' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                      <Users className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Usuarios</span>
                    </button>
                    <button onClick={() => setActiveTab('schema')} className={`${activeTab === 'schema' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                      <Database className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Esquema</span>
                    </button>
                    <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                      <Settings className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Ajustes</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center ml-4 border-l border-slate-200 dark:border-slate-700 pl-4 space-x-3">
              
              {/* CAMPANITA DE NOTIFICACIONES */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
                >
                  <Bell className="w-5 h-5" />
                  {notificaciones.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in slide-in-from-top-2">
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Notificaciones</h3>
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{notificaciones.length}</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {notificaciones.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs font-bold">Todo al día. No hay alertas. 🎉</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {notificaciones.map((n, i) => (
                            <div key={i} className={`p-4 transition-colors ${n.tipo === 'rezago_propio' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                              <div className="flex gap-3">
                                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${n.tipo === 'rezago_propio' ? 'text-red-500' : 'text-amber-500'}`} />
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{n.texto}</p>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{n.prop.desarrollo} - {n.prop.modelo}</p>
                                  
                                  {/* Botón de enviar correo (Solo Jefes) */}
                                  {n.tipo === 'rezago_equipo' && (
                                    <button 
                                      onClick={() => handleSendAlertEmail(n)}
                                      disabled={isSendingAlert === n.id}
                                      className="mt-2 inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                      {isSendingAlert === n.id ? 'Enviando...' : <><Mail className="w-3 h-3 mr-1"/> Avisar a Asesor</>}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-xs font-bold text-slate-500 hidden sm:block mr-2 border-l border-slate-200 dark:border-slate-700 pl-4">{currentUser?.nombre}</span>
              <button onClick={handleLogout} className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-6 flex-1 overflow-auto">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            {activeTab === 'home' && <Home properties={properties} />}
            {activeTab === 'usuarios' && <Usuarios />}
            
            {activeTab === 'list' && (
              <PropertyList 
                properties={properties} 
                catalogs={catalogs}
                onView={startViewing}
                onEdit={startEditing} 
                onDelete={handleDeleteProperty} 
                onBulkImport={handleBulkImport} 
                onBulkUpdate={handleBulkUpdateProperties} 
                isAdmin={currentUser?.es_admin}
                currentUser={currentUser}
              />
            )}
            
            {activeTab === 'form' && (
              <PropertyForm 
                initialData={editingProperty} 
                catalogs={catalogs} 
                modelAssignments={modelAssignments} 
                statusAssignments={statusAssignments} 
                metodoCompraAssignments={metodoCompraAssignments} 
                onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty} 
                onCancel={() => { setActiveTab('list'); setIsViewing(false); }} 
                isEditing={!!editingProperty} 
                isViewing={isViewing}
              />
            )}

            {activeTab === 'config' && <CatalogManager onCatalogChanged={fetchCatalogs} />}
            {activeTab === 'schema' && <SchemaTable />}
            {activeTab === 'test' && <Apartados properties={properties} catalogs={catalogs} onUpdateProperty={handleUpdateProperty} currentUser={currentUser} />}
            {activeTab === 'reporter' && <ReporterView properties={properties} catalogs={catalogs} />}
        </main>
      </div>
    </div>
  );
}

export default App;