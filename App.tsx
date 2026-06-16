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
import { Propiedad, PopupConfig } from './types';

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
  const [usuariosDB, setUsuariosDB] = useState<any[]>([]);
  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null);

  // --- ESTADO GLOBAL DE POPUPS ---
  const [popupConfig, setPopupConfig] = useState<PopupConfig | null>(null);

  const showPopup = (config: PopupConfig) => setPopupConfig(config);
  const closePopup = () => setPopupConfig(null);

  // --- ROLES DERIVADOS ---
  const isSuperAdmin = currentUser?.tipo_usuario === 'ADMINISTRADOR' || currentUser?.es_admin;
  const isCoordinador = currentUser?.tipo_usuario === 'COORDINADOR';
  const isAuditor = currentUser?.tipo_usuario === 'AUDITOR';
  const isAsesor = currentUser?.tipo_usuario === 'ASESOR';
  const isDataLoader = currentUser?.tipo_usuario === 'DATA LOADER';

  useEffect(() => {
    const savedUser = localStorage.getItem('ponty_session');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);

      const hash = window.location.hash.replace('#', '');
      const validTabs = ['home', 'schema', 'list', 'form', 'config', 'test', 'reporter', 'usuarios'];

      // REDIRECCIÓN INTELIGENTE DE PESTAÑA INICIAL POR ROL
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash as any);
        if (hash === 'form') {
           const savedProp = localStorage.getItem('ponty_editing_property');
           if (savedProp) {
             try {
               setEditingProperty(JSON.parse(savedProp));
               setIsViewing(localStorage.getItem('ponty_is_viewing') === 'true');
             } catch(e) {}
           }
        }
      } else {
        if (user.tipo_usuario === 'ASESOR') {
          setActiveTab('test');
        } else if (user.tipo_usuario === 'CARGA') {
          setActiveTab('list');
        } else {
          setActiveTab('home');
        }
      }
    }
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
    try {
      let allData: Propiedad[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('propiedades')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as Propiedad[])];
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const sanitizedData = allData.map(p => {
        const valor = Number(p.valorAvaluo) || 0;
        if (valor > 0) {
          p.dtuAvaluo = 'AVALUO CERRADO';
        } else if (p.dtuAvaluo === 'AVALUO CERRADO') {
          p.dtuAvaluo = 'SIN DTU';
        }
        return p;
      });
      setProperties(sanitizedData);
    } catch (error: any) {
      console.error('Error al cargar propiedades:', error.message);
    }
  };

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

    const alertas: any[] = [];

    properties.forEach(p => {
      if (p.estado === 'APARTADO' && p.fechaApartado) {
        const d = new Date(p.fechaApartado + 'T12:00:00');
        const diasTranscurridos = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
        const diasAut = p.diasAutorizadosApartado || 7;
        const diasRezago = diasTranscurridos - diasAut;

        if (diasRezago > 0) {
          if (p.asesor === currentUser.nombre) {
            alertas.push({ id: p.idPropiedad, tipo: 'rezago_propio', texto: `¡Atención! Tu apartado ${p.idPropiedad} tiene ${diasRezago} días de rezago.`, prop: p, diasRezago });
          } else if (isManager) {
            const desarrollosManager = currentUser.desarrollos_asignados || [];
            if (currentUser.es_admin || desarrollosManager.includes(p.desarrollo)) {
              alertas.push({ id: p.idPropiedad, tipo: 'rezago_equipo', texto: `Rezago de ${diasRezago} días en ${p.idPropiedad} (${p.asesor || 'Sin Asesor'}).`, prop: p, diasRezago });
            }
          }
        }
      }
    });

    return alertas.sort((a, b) => b.diasRezago - a.diasRezago);
  }, [properties, currentUser]);


  const notifyStatusUpdate = async (prop: Propiedad, oldEstatus: string, newEstatus: string, oldProp?: Propiedad, notasExtra?: string) => {
    if (oldEstatus === newEstatus) return;
    
    // Helper para formatear
    const formatMiles = (num: number | undefined) => num ? '$' + num.toLocaleString('en-US') : '$0';
    
    // 1. Notificación al Asesor
    const targetAsesor = (newEstatus === 'DISPONIBLE' && oldProp) ? oldProp.asesor : prop.asesor;
    const targetComprador = (newEstatus === 'DISPONIBLE' && oldProp) ? oldProp.nombreComprador : prop.nombreComprador;

    const asesor = usuariosDB.find(u => u.nombre === targetAsesor);
    if (asesor && asesor.correo) {
      const asuntoAsesor = `Actualización de Estatus: ${targetComprador || 'S/N'} ${prop.desarrollo || ''}`;
      let mensajeAsesor = `Hola ${targetAsesor},

Te notificamos que ha habido un cambio en el estatus de una de tus propiedades en proceso:

Cliente: ${targetComprador || 'S/N'}
Desarrollo: ${prop.desarrollo || ''}
Modelo: ${prop.modelo || ''} ${prop.nivel || ''}
Condominio: ${prop.condomino || ''}
Edificio: ${prop.edificio || ''}
Interior: ${prop.numeroInterior || ''}
Precio: ${formatMiles(prop.precioFinal)}

ID Propiedad: ${prop.idPropiedad}
Estatus Anterior: ${oldEstatus}
NUEVO ESTATUS: ${newEstatus}`;

      if (notasExtra) {
          mensajeAsesor += `\n\nMotivo / Notas: ${notasExtra}`;
      }

      mensajeAsesor += `\n\nPor favor, revisa el sistema para más detalles.\n\nSaludos,`;
      
      try {
        await emailjs.send('service_q6nzdzh', 'template_n4fo0xb', {
          to_email: asesor.correo,
          asunto: asuntoAsesor,
          mensaje: mensajeAsesor
        }, 'Wk9H8F1qHcLw1V9H3');
        console.log("🛠️ Correo de estatus enviado al asesor:", asesor.correo);
      } catch (err) { console.error("🚨 Error enviando correo al asesor", err); }
    }

    // 2. Notificación a Admin Ventas
    if (newEstatus === 'VENDIDO' && prop.asesorExterno) {
      try {
        const { data: catalogData } = await supabase
          .from('catalogos_maestro')
          .select('valor')
          .eq('tipo_catalogo', 'correos_admin_ventas');
        
        const correos = (catalogData || []).map(c => c.valor).filter(Boolean);
        
        if (correos.length > 0) {
          const asuntoAdmin = `Venta con asesor externo: ${prop.nombreComprador || 'S/N'} ${prop.desarrollo || ''}`;
          const mensajeAdmin = `Hola,

Detallo la siguiente VENTA con asesor externo:

Cliente: ${prop.nombreComprador || 'S/N'}
EK: ${prop.ek || ''}
Asesor: ${prop.asesor || ''}
Desarrollo: ${prop.desarrollo || ''}
Modelo: ${prop.modelo || ''} ${prop.nivel || ''}
Condominio: ${prop.condomino || ''}
Edificio: ${prop.edificio || ''}
Interior: ${prop.numeroInterior || ''}

Saludos,`;
          
          // Send to each email
          for (const correo of correos) {
            await emailjs.send('service_q6nzdzh', 'template_n4fo0xb', {
              to_email: correo,
              asunto: asuntoAdmin,
              mensaje: mensajeAdmin
            }, 'Wk9H8F1qHcLw1V9H3');
            console.log("🛠️ Correo de admin ventas enviado a:", correo);
          }
        }
      } catch (err) { console.error("🚨 Error procesando correos de admin ventas", err); }
    }
  };

  const handleSendAlertEmail = async (alerta: any) => {
    const prop = alerta.prop;
    const asesor = usuariosDB.find(u => u.nombre === prop.asesor);

    if (!asesor || !asesor.correo) {
      showPopup({ type: 'alert', variant: 'warning', title: 'Aviso', message: `No se encontró el correo registrado para el asesor: ${prop.asesor}` });
      return;
    }

    setIsSendingAlert(alerta.id);
    try {
      const asuntoGenerado = `Alerta de Rezago: ${prop.idPropiedad} - ${prop.desarrollo}`;
      const mensajeGenerado = `Hola ${prop.asesor},\n\nTe notificamos que tu apartado ${prop.idPropiedad} en el desarrollo ${prop.desarrollo} (Modelo: ${prop.modelo}) presenta un rezago de ${alerta.diasRezago} días.\n\nPor favor, revisa el sistema lo antes posible.\n\nSaludos,\nEquipo Casas Ponty.`;

      await emailjs.send(
        'service_q6nzdzh',
        'template_n4fo0xb',
        {
          to_email: asesor.correo,
          asunto: asuntoGenerado,
          mensaje: mensajeGenerado
        },
        'Wk9H8F1qHcLw1V9H3'
      );
      showPopup({ type: 'alert', variant: 'success', title: 'Éxito', message: `Aviso enviado exitosamente a ${asesor.correo}` });
    } catch (error) {
      console.error(error);
      showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Hubo un error enviando la alerta. Revisa la consola.' });
    } finally {
      setIsSendingAlert(null);
    }
  };

  const logMovimiento = async (idPropiedad: string, accion: string, detalles: string) => {
    if (!idPropiedad) return;
    await supabase.from('bitacora_movimientos').insert([{ idPropiedad, usuario: currentUser?.nombre || 'SISTEMA', accion, detalles }]);
  };

  const handleAddProperty = async (newProperty: Partial<Propiedad>) => {
    const cleanProperty = { ...newProperty };
    const dateFields: (keyof Propiedad)[] = ['fechaApartado', 'fechaVenta', 'fechaEscritura', 'fechaDesde', 'fechaResolucion'];
    dateFields.forEach(field => {
      if (cleanProperty[field] === '') (cleanProperty as any)[field] = null;
    });
    const { data, error } = await supabase.from('propiedades').insert([cleanProperty]).select();
    if (error) showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al guardar: ' + error.message });
    else {
      if (data && data[0]) await logMovimiento(data[0].idPropiedad, 'ALTA DE PROPIEDAD', `Propiedad agregada con estatus ${data[0].estado}`);
      fetchProperties(); setActiveTab('list');
    }
  };


  const handleUpdatePropertyInline = async (updatedProperty: Partial<Propiedad>) => {
    console.log("🛠️ App.tsx: handleUpdatePropertyInline INICIADO", updatedProperty);
    try {
      const notasCancelacion = (updatedProperty as any)._notasCancelacion;
      const { idPropiedad, _notasCancelacion, ...restOfData } = updatedProperty as any;
      const oldProp = properties.find(p => p.idPropiedad === idPropiedad);
      
      const dateFields: (keyof Propiedad)[] = ['fechaApartado', 'fechaVenta', 'fechaEscritura', 'fechaDesde', 'fechaResolucion'];
      dateFields.forEach(field => {
        if (restOfData[field] === '') (restOfData as any)[field] = null;
      });

      console.log("🛠️ App.tsx: Preparando envío INLINE a Supabase. ID:", idPropiedad, "Data:", restOfData);
      
      const { error, status, statusText } = await supabase.from('propiedades').update(restOfData).eq('idPropiedad', idPropiedad);
      console.log("🛠️ App.tsx: Respuesta Supabase INLINE. Error:", error, "Status:", status, statusText);
      
      if (error) {
      showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al actualizar campo: ' + error.message });
    } else {
      const updatedProp = { ...oldProp, ...restOfData } as Propiedad;
      setProperties(prev => prev.map(p => p.idPropiedad === idPropiedad ? updatedProp : p));

      if (oldProp) {
        if (restOfData.estado && oldProp.estado !== restOfData.estado) {
           notifyStatusUpdate({ ...oldProp, ...restOfData } as Propiedad, oldProp.estado || '', restOfData.estado, oldProp, notasCancelacion);
        }

        // Log changes
        const camposAuditar = [
          { key: 'titulacion', label: 'Titulación' },
          { key: 'fechaDesde', label: 'Fecha Desde' },
          { key: 'metodoCompra', label: 'Método de Compra' },
          { key: 'dtuAvaluo', label: 'DTU/Avalúo' },
          { key: 'nombreComprador', label: 'Titular' },
          { key: 'fechaResolucion', label: 'Fecha de Resolución' },
          { key: 'estado', label: 'Estado' }
        ];

        for (const campo of camposAuditar) {
          if (campo.key in updatedProperty) {
            const oldVal = String(oldProp[campo.key as keyof Propiedad] || '');
            const newVal = String(updatedProperty[campo.key as keyof Propiedad] || '');

            if (oldVal !== newVal && !(oldVal === '' && newVal === 'null') && newVal !== 'undefined') {
              await logMovimiento(
                idPropiedad as string,
                `CAMBIO DE ${campo.label.toUpperCase()}`,
                `Pasó de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`
              );
            }
          }
        }
      }
      fetchProperties();
      // Notice: NO setActiveTab('list') here!
    }
    } catch (err: any) {
      console.error("🚨 ERROR JS en handleUpdatePropertyInline:", err);
      showPopup({ type: 'alert', variant: 'danger', title: 'Error Crítico', message: 'Falla interna: ' + err.message });
    }
  };

  const handleUpdateProperty = async (updatedProperty: Partial<Propiedad>) => {
    console.log("🛠️ App.tsx: handleUpdateProperty INICIADO", updatedProperty);
    try {
      const notasCancelacion = (updatedProperty as any)._notasCancelacion;
      const { idPropiedad, _notasCancelacion, ...restOfData } = updatedProperty as any;
      const oldProp = properties.find(p => p.idPropiedad === idPropiedad);

      const dateFields: (keyof Propiedad)[] = ['fechaApartado', 'fechaVenta', 'fechaEscritura', 'fechaDesde', 'fechaResolucion'];
      dateFields.forEach(field => {
        if (restOfData[field] === '') (restOfData as any)[field] = null;
      });

      console.log("🛠️ App.tsx: Preparando envío a Supabase. ID:", idPropiedad, "Data:", restOfData);

      const { error } = await supabase.from('propiedades').update(restOfData).eq('idPropiedad', idPropiedad);
      console.log("🛠️ App.tsx: Respuesta Supabase. Error:", error);
      
      if (error) {
        showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al actualizar: ' + error.message });
      } else {
      const updatedProp = { ...oldProp, ...restOfData } as Propiedad;
      setProperties(prev => prev.map(p => p.idPropiedad === idPropiedad ? updatedProp : p));

      if (oldProp) {
        if (restOfData.estado && oldProp.estado !== restOfData.estado) {
           notifyStatusUpdate({ ...oldProp, ...restOfData } as Propiedad, oldProp.estado || '', restOfData.estado, oldProp, notasCancelacion);
        }

        const camposAuditar = [
          { key: 'titulacion', label: 'Titulación' },
          { key: 'fechaDesde', label: 'Fecha Desde' },
          { key: 'metodoCompra', label: 'Método de Compra' },
          { key: 'dtuAvaluo', label: 'DTU/Avalúo' },
          { key: 'nombreComprador', label: 'Titular' },
          { key: 'fechaResolucion', label: 'Fecha de Resolución' }
        ];

        for (const campo of camposAuditar) {
          if (campo.key in updatedProperty) {
            const oldVal = String(oldProp[campo.key as keyof Propiedad] || '');
            const newVal = String(updatedProperty[campo.key as keyof Propiedad] || '');

            if (oldVal !== newVal && !(oldVal === '' && newVal === 'null')) {
              await logMovimiento(
                idPropiedad as string,
                `CAMBIO DE ${campo.label.toUpperCase()}`,
                `Pasó de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`
              );
            }
          }
        }

        if (oldProp.estado !== restOfData.estado && restOfData.estado) {
          let detalles = `Pasó de ${oldProp.estado || 'N/A'} a ${restOfData.estado}`;
          if (notasCancelacion) detalles += ` | Motivo/Notas: ${notasCancelacion}`;
          await logMovimiento(idPropiedad as string, 'CAMBIO DE ESTATUS', detalles);
        }
      }
      fetchProperties();
      setEditingProperty(updatedProp);
      localStorage.setItem('ponty_editing_property', JSON.stringify(updatedProp));
      showPopup({ type: 'alert', variant: 'success', title: 'Éxito', message: '¡Propiedad actualizada correctamente!' });
    }
    } catch (err: any) {
      console.error("🚨 ERROR JS en handleUpdateProperty:", err);
      showPopup({ type: 'alert', variant: 'danger', title: 'Error Crítico', message: 'Falla interna: ' + err.message });
    }
  };

  const handleDeleteProperty = async (idPropiedad: string) => {
    showPopup({
      type: 'confirm',
      variant: 'danger',
      title: 'Confirmar Eliminación',
      message: '¿Eliminar permanentemente este registro?',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        const { error } = await supabase.from('propiedades').delete().eq('idPropiedad', idPropiedad);
        if (error) showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al eliminar: ' + error.message });
        else { await logMovimiento(idPropiedad, 'ELIMINACIÓN', 'Propiedad borrada del sistema'); fetchProperties(); }
      }
    });
  };

  const handleBulkUpdateProperties = async (ids: string[], field: keyof Propiedad, value: any) => {
    let cleanValue = value;
    const dateFields = ['fechaApartado', 'fechaVenta', 'fechaEscritura', 'fechaDesde', 'fechaResolucion'];
    if (dateFields.includes(field as string) && cleanValue === '') {
      cleanValue = null;
    }
    const { error } = await supabase.from('propiedades').update({ [field]: cleanValue }).in('idPropiedad', ids);
    if (error) showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error en actualización masiva: ' + error.message });
    else {
      for (const id of ids) await logMovimiento(id, 'EDICIÓN MASIVA', `Campo '${field}' actualizado a: ${value || 'VACÍO'}`);
      fetchProperties();
    }
  };

  const handleBulkImport = async (importedData: any[]) => {
    try {
      const { error } = await supabase.from('propiedades').upsert(importedData, { onConflict: 'idPropiedad' });
      if (error) throw error;
      showPopup({ type: 'alert', variant: 'success', title: 'Éxito', message: `¡Se importaron/actualizaron ${importedData.length} propiedades con éxito!` });
      fetchProperties();
    } catch (error: any) { showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error en la importación a la base de datos: ' + error.message }); }
  };

  const startEditing = (prop: Propiedad) => { 
    setEditingProperty(prop); setIsViewing(false); setActiveTab('form'); 
    localStorage.setItem('ponty_editing_property', JSON.stringify(prop));
    localStorage.setItem('ponty_is_viewing', 'false');
  };
  const startViewing = (prop: Propiedad) => { 
    setEditingProperty(prop); setIsViewing(true); setActiveTab('form'); 
    localStorage.setItem('ponty_editing_property', JSON.stringify(prop));
    localStorage.setItem('ponty_is_viewing', 'true');
  };

  const handleLogout = () => {
    localStorage.removeItem('ponty_session');
    setIsAuthenticated(false); setCurrentUser(null); setActiveTab('home'); window.location.hash = '';
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={(user) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('ponty_session', JSON.stringify(user));

      if (user.tipo_usuario === 'ASESOR') {
        setActiveTab('test');
        window.location.hash = 'test';
      } else if (user.tipo_usuario === 'DATA LOADER') {
        setActiveTab('list');
        window.location.hash = 'list';
      } else {
        setActiveTab('home');
        window.location.hash = 'home';
      }
    }} showPopup={showPopup} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
      
      {/* --- GLOBAL POPUP SYSTEM --- */}
      {popupConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm" onClick={() => popupConfig.type === 'alert' && closePopup()}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
            <div className={`px-6 py-4 flex justify-between items-center ${
              popupConfig.variant === 'danger' ? 'bg-red-600' : 
              popupConfig.variant === 'warning' ? 'bg-amber-500' : 
              popupConfig.variant === 'success' ? 'bg-emerald-600' : 'bg-indigo-600'
            }`}>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                {popupConfig.variant === 'danger' || popupConfig.variant === 'warning' ? <AlertTriangle className="w-5 h-5" /> : null}
                {popupConfig.title}
              </h3>
              {popupConfig.type === 'alert' && (
                <button onClick={closePopup} className="text-white/70 hover:text-white transition-colors"><List className="w-5 h-5 opacity-0" /></button>
              )}
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{popupConfig.message}</p>
              <div className="mt-8 flex justify-end gap-3">
                {popupConfig.type === 'confirm' && (
                  <button onClick={() => { if (popupConfig.onCancel) popupConfig.onCancel(); closePopup(); }} className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase tracking-wider">
                    {popupConfig.cancelText || 'Cancelar'}
                  </button>
                )}
                <button 
                  onClick={() => { if (popupConfig.onConfirm) popupConfig.onConfirm(); closePopup(); }} 
                  className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 uppercase tracking-wider ${
                    popupConfig.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                    popupConfig.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 
                    popupConfig.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {popupConfig.confirmText || 'Aceptar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-[60] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center overflow-x-auto no-scrollbar">

              <button onClick={() => setActiveTab('home')} className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity focus:outline-none mr-8">
                <img src={logoPonty} alt="Casas Ponty Logo" className="h-6 w-auto object-contain" />
              </button>

              <div className="flex space-x-6 min-w-max">

                {/* REGLA DE VISIBILIDAD DE MENÚS POR ROL */}
                {!isDataLoader && !isAsesor && (
                  <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                    <HomeIcon className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inicio</span>
                  </button>
                )}

                {!isAsesor && (
                  <button onClick={() => setActiveTab('list')} className={`${activeTab === 'list' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                    <List className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Inventario</span>
                  </button>
                )}

                {!isDataLoader && (
                  <button onClick={() => setActiveTab('test')} className={`${activeTab === 'test' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                    <FlaskConical className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Apartar</span>
                  </button>
                )}

                {(isSuperAdmin || isCoordinador || isAuditor) && (
                  <button onClick={() => setActiveTab('reporter')} className={`${activeTab === 'reporter' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
                    <PieChart className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Reportes</span>
                  </button>
                )}

                {isSuperAdmin && (
                  <>
                    <button onClick={() => { setEditingProperty(undefined); setIsViewing(false); setActiveTab('form'); localStorage.removeItem('ponty_editing_property'); localStorage.removeItem('ponty_is_viewing'); }} className={`${activeTab === 'form' ? 'border-indigo-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold transition-colors`}>
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

                                  {n.tipo === 'rezago_equipo' && (
                                    <button
                                      onClick={() => handleSendAlertEmail(n)}
                                      disabled={isSendingAlert === n.id}
                                      className="mt-2 inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                      {isSendingAlert === n.id ? 'Enviando...' : <><Mail className="w-3 h-3 mr-1" /> Avisar a Asesor</>}
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
          {activeTab === 'home' && <Home properties={properties} onNavigateToApartados={() => setActiveTab('test')} />}
          {activeTab === 'usuarios' && <Usuarios showPopup={showPopup} />}

          {activeTab === 'list' && (
            <PropertyList
              properties={properties}
              catalogs={catalogs}
              onView={startViewing}
              onEdit={startEditing}
              onDelete={handleDeleteProperty}
              onBulkImport={handleBulkImport}
              onBulkUpdate={handleBulkUpdateProperties}
              isAdmin={isSuperAdmin}
              currentUser={currentUser}
              showPopup={showPopup}
              onRefresh={fetchProperties}
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
              onInlineUpdate={handleUpdatePropertyInline}
              onCancel={() => { setActiveTab('list'); setIsViewing(false); }}
              isEditing={!!editingProperty}
              isViewing={isViewing}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'config' && <CatalogManager onCatalogChanged={fetchCatalogs} />}
          {activeTab === 'schema' && <SchemaTable />}
          {activeTab === 'test' && <Apartados properties={properties} catalogs={catalogs} onUpdateProperty={handleUpdateProperty} currentUser={currentUser} onRefresh={fetchProperties} showPopup={showPopup} />}
          {activeTab === 'reporter' && <ReporterView properties={properties} catalogs={catalogs} showPopup={showPopup} />}
        </main>
      </div>
    </div>
  );
}

export default App;