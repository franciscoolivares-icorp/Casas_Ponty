import logoPonty from './Recursos/casas_ponty.png'; // <-- Ajusta la ruta si la cambiaste
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  List, Settings, FlaskConical, PieChart, 
  LogOut, Home as HomeIcon, PlusCircle, Users, Sun, Moon, Database
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

  // --- 1. LÓGICA PARA RECORDAR SESIÓN ---
  useEffect(() => {
    // Al cargar la app, revisamos si hay un usuario guardado
    const savedUser = localStorage.getItem('ponty_session');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  // --- 2. LÓGICA PARA EL BOTÓN "ATRÁS" DEL NAVEGADOR ---
  // A. Leer la URL al entrar
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as any;
    const validTabs = ['home', 'schema', 'list', 'form', 'config', 'test', 'reporter', 'usuarios'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // B. Actualizar la URL cuando cambiamos de pestaña manualmente
  useEffect(() => {
    if (isAuthenticated) {
      window.location.hash = activeTab;
    }
  }, [activeTab, isAuthenticated]);

  // C. Escuchar cuando el usuario presiona el botón "Atrás" o "Adelante"
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as any;
      const validTabs = ['home', 'schema', 'list', 'form', 'config', 'test', 'reporter', 'usuarios'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  // --------------------------------------------------------

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [properties, setProperties] = useState<Propiedad[]>([]);
  const [editingProperty, setEditingProperty] = useState<Propiedad | undefined>(undefined);
  
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchCatalogs();
      fetchProperties();
    }
  }, [isAuthenticated]);

  const logMovimiento = async (idPropiedad: string, accion: string, detalles: string) => {
    if (!idPropiedad) return;
    await supabase.from('bitacora_movimientos').insert([{
      idPropiedad,
      usuario: currentUser?.nombre || 'SISTEMA',
      accion,
      detalles
    }]);
  };

  const handleAddProperty = async (newProperty: Partial<Propiedad>) => {
    const { data, error } = await supabase.from('propiedades').insert([newProperty]).select();
    if (error) alert('Error al guardar: ' + error.message);
    else { 
      if (data && data[0]) {
        await logMovimiento(data[0].idPropiedad, 'ALTA DE PROPIEDAD', `Propiedad agregada con estatus ${data[0].estado}`);
      }
      fetchProperties(); 
      setActiveTab('list'); 
    }
  };

  const handleUpdateProperty = async (updatedProperty: Partial<Propiedad>) => {
    const { idPropiedad, ...restOfData } = updatedProperty;
    const oldProp = properties.find(p => p.idPropiedad === idPropiedad);

    const { error } = await supabase.from('propiedades').update(restOfData).eq('idPropiedad', idPropiedad);
    if (error) alert('Error al actualizar: ' + error.message);
    else { 
      if (oldProp) {
        if (oldProp.estado !== updatedProperty.estado && updatedProperty.estado) {
          await logMovimiento(idPropiedad as string, 'CAMBIO DE ESTATUS', `Pasó de ${oldProp.estado || 'N/A'} a ${updatedProperty.estado}`);
        }
        if (oldProp.precioFinal !== updatedProperty.precioFinal && updatedProperty.precioFinal !== undefined) {
          await logMovimiento(idPropiedad as string, 'CAMBIO DE PRECIO', `Pasó de $${oldProp.precioFinal || 0} a $${updatedProperty.precioFinal}`);
        }
      }
      fetchProperties(); 
      if (activeTab === 'form') setActiveTab('list'); 
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (window.confirm('¿Eliminar permanentemente este registro?')) {
      const { error } = await supabase.from('propiedades').delete().eq('idPropiedad', id);
      if (error) alert('Error al eliminar: ' + error.message);
      else {
        await logMovimiento(id, 'ELIMINACIÓN', 'Propiedad borrada del sistema');
        fetchProperties();
      }
    }
  };

  const handleBulkUpdateProperties = async (ids: string[], field: keyof Propiedad, value: any) => {
    const { error } = await supabase.from('propiedades').update({ [field]: value }).in('idPropiedad', ids);
    if (error) alert('Error en actualización masiva: ' + error.message);
    else {
      for (const id of ids) {
        await logMovimiento(id, 'EDICIÓN MASIVA', `Campo '${field}' actualizado a: ${value}`);
      }
      fetchProperties();
    }
  };
  
  const handleBulkImport = async (importedData: any[]) => {
    try {
      const { error } = await supabase.from('propiedades').upsert(importedData, { onConflict: 'idPropiedad' });
      if (error) throw error;
      alert(`¡Se importaron/actualizaron ${importedData.length} propiedades con éxito!`);
      fetchProperties();
    } catch (error: any) {
      alert('Error en la importación a la base de datos: ' + error.message);
    }
  };

  const startEditing = (prop: Propiedad) => { setEditingProperty(prop); setActiveTab('form'); };

  // --- CERRAR SESIÓN ---
  const handleLogout = () => {
    localStorage.removeItem('ponty_session'); // Borramos la memoria
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('home');
    window.location.hash = ''; // Limpiamos la URL
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={(user) => { 
      setCurrentUser(user); 
      setIsAuthenticated(true); 
      // Al hacer login exitoso, lo guardamos en la memoria local
      localStorage.setItem('ponty_session', JSON.stringify(user));
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              
              <button onClick={() => setActiveTab('home')} className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity focus:outline-none mr-8">
                <img 
                  src={logoPonty} 
                  alt="Casas Ponty Logo" 
                  className="h-10 w-auto object-contain" 
                />
              </button>
              
              <div className="flex space-x-6 min-w-max">
                <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                  <HomeIcon className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inicio</span>
                </button>
                <button onClick={() => setActiveTab('list')} className={`${activeTab === 'list' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                  <List className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inventario</span>
                </button>
                <button onClick={() => setActiveTab('test')} className={`${activeTab === 'test' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                  <FlaskConical className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Apartar</span>
                </button>
                
                {currentUser?.es_admin && (
                  <>
                    <button onClick={() => setActiveTab('reporter')} className={`${activeTab === 'reporter' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                      <PieChart className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Reportes</span>
                    </button>
                    <button onClick={() => { setEditingProperty(undefined); setActiveTab('form'); }} className={`${activeTab === 'form' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                      <PlusCircle className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Nuevo</span>
                    </button>
                    <button onClick={() => setActiveTab('usuarios')} className={`${activeTab === 'usuarios' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                      <Users className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Usuarios</span>
                    </button>
                    <button onClick={() => setActiveTab('schema')} className={`${activeTab === 'schema' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                      <Database className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Esquema</span>
                    </button>
                    <button onClick={() => setActiveTab('config')} className={`${activeTab === 'config' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}>
                      <Settings className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Ajustes</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center ml-4 border-l border-slate-200 dark:border-slate-700 pl-4 space-x-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block mr-2">
                {currentUser?.nombre}
              </span>
              <button onClick={handleLogout} className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <LogOut className="w-5 h-5" />
              </button>
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
                onEdit={startEditing} 
                onDelete={handleDeleteProperty} 
                onBulkImport={handleBulkImport} 
                onBulkUpdate={handleBulkUpdateProperties} 
                isAdmin={currentUser?.es_admin}
                currentUser={currentUser}
              />
            )}
            
            {activeTab === 'form' && <PropertyForm initialData={editingProperty} catalogs={catalogs} modelAssignments={modelAssignments} statusAssignments={statusAssignments} metodoCompraAssignments={metodoCompraAssignments} onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty} onCancel={() => setActiveTab('list')} isEditing={!!editingProperty} />}
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