import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Propiedad, Estado, PopupConfig } from '../types';
import bcrypt from 'bcryptjs';
import {
  Settings, GripVertical, X, Check, ArrowRight, ArrowLeft,
  User, CreditCard, FileText, AlertTriangle, List,
  Search, Unlock, AlertCircle, Save, Building2, UploadCloud,
  CheckCircle2, FolderOpen, Calendar, Clock, RefreshCcw
} from 'lucide-react';

interface TestViewProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
  onUpdateProperty: (updatedProperty: Partial<Propiedad>) => void;
  currentUser: any;
  onRefresh?: () => void;
  showPopup: (config: PopupConfig) => void;
}

interface ColumnConfig {
  id: keyof Propiedad;
  label: string;
  visible: boolean;
}

const ORDER_DTU: { [key: string]: number } = { 'AVALUO CERRADO': 1, 'CON DTU': 2, 'SIN DTU': 3 };
const ORDER_MODELO: { [key: string]: number } = { 'COLONIAL': 1, 'CAPILLA': 2, 'OLIVO LT': 3, 'OLIVO': 4, 'NOGAL': 5, 'CEDRO': 6, 'MAGNOLIA': 7, 'CAOBA': 8, 'SANTANDER 1': 9, 'SANTANDER 2': 10, 'NOGAL 1': 11, 'NOGAL 2': 12 };
const ORDER_NIVEL: { [key: string]: number } = { 'PBP': 1, 'PBF': 2, 'N1': 3, 'N2': 4, 'N3': 5, 'PBP EXC': 6, 'PBF EXC': 7, 'CASA': 8, 'CASA EXC': 9 };

const INITIAL_COLUMNS: ColumnConfig[] = [
  { id: 'modelo', label: 'Modelo', visible: true },
  { id: 'nivel', label: 'Nivel', visible: true },
  { id: 'dtuAvaluo', label: 'DTU-Avalúo', visible: true },
  { id: 'valorAvaluo', label: 'Valor Avalúo', visible: false },
  { id: 'calle', label: 'Calle', visible: true },
  { id: 'numeroExterior', label: 'Num Ext', visible: true },
  { id: 'condomino', label: 'Condómino', visible: true },
  { id: 'edificio', label: 'Edificio', visible: true },
  { id: 'numeroInterior', label: 'Num Int', visible: true },
  { id: 'manzana', label: 'Manzana', visible: true },
  { id: 'lote', label: 'Lote', visible: true },
  { id: 'm2TerrExc', label: 'M2 Terr Exc', visible: true },
  { id: 'precioTerrExc', label: '$ Terr Exc', visible: true },
  { id: 'precioObrasAdicionales', label: '$ Obras Adic.', visible: true },
  { id: 'precioLista', label: 'Precio Lista', visible: true },
  { id: 'descuento', label: 'Descuento', visible: true },
  { id: 'precioFinal', label: 'Precio Final', visible: true },
  { id: 'fechaApartado', label: 'Fecha Apartado', visible: false },
  { id: 'fechaVenta', label: 'Fecha Venta', visible: false },
  { id: 'fechaEscritura', label: 'Fecha Escritura', visible: false },
  { id: 'fechaDesde', label: 'Fecha Desde', visible: false },
  { id: 'fechaResolucion', label: 'Fecha Resolución', visible: false },
];

const STORAGE_KEY_COLS_APARTADOS = 'propertyMaster_apartados_cols_v2';

export const Apartados: React.FC<TestViewProps> = ({ properties, catalogs, onUpdateProperty, currentUser, onRefresh, showPopup }) => {
  const [viewMode, setViewMode] = useState<'catalog' | 'reservations'>('catalog');

  const isAdmin = currentUser?.tipo_usuario === 'ADMINISTRADOR' || currentUser?.es_admin;
  const isAuditor = currentUser?.tipo_usuario === 'AUDITOR' || currentUser?.tipo_usuario === 'COORDINADOR';
  const isAsesor = currentUser?.tipo_usuario === 'ASESOR';
  const isCoordinador = currentUser?.tipo_usuario === 'COORDINADOR';
  const desarrollosAsignados = currentUser?.desarrollos_asignados || [];

  const propertiesWithAccess = useMemo(() => {
    if (isCoordinador) {
      return properties.filter(p => desarrollosAsignados.includes(p.desarrollo || ''));
    }
    return properties;
  }, [properties, isCoordinador, desarrollosAsignados]);


  const getDiffDays = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((t.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };
  const getDiasDesdeRevisar = (p: Propiedad) => p.fechaDesde ? (getDiffDays(p.fechaDesde) || 0) + 1 : 0;

  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string>('');

  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const [selectedNiveles, setSelectedNiveles] = useState<string[]>([]);
  const [showColConfig, setShowColConfig] = useState(false);
  const dragItem = useRef<number | null>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLS_APARTADOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === INITIAL_COLUMNS.length) return parsed;
      }
    } catch (e) { }
    return INITIAL_COLUMNS;
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY_COLS_APARTADOS, JSON.stringify(columns)); }, [columns]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) setShowColConfig(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);
  const [unavailablePopupProp, setUnavailablePopupProp] = useState<Propiedad | null>(null);
  const [reservationForm, setReservationForm] = useState({
    nombreComprador: '', metodoCompra: '', ek: '', banco: '', nombreBroker: '', telefonoBroker: '', correoBroker: '', asesorExterno: false,
    url_comprobante_apartado: [] as string[],
    url_autorizacion_bancaria: [] as string[],
    url_mail_fovissste: [] as string[],
    url_solicitud_reubicacion: [] as string[],
    documentos: null as string | null
  });

  const [reservationSearch, setReservationSearch] = useState('');
  const [showOnlyIncidents, setShowOnlyIncidents] = useState(false);
  const [showOnlyReubicaciones, setShowOnlyReubicaciones] = useState(false); // ESTADO AGREGADO

  const [actionMenuProp, setActionMenuProp] = useState<Propiedad | null>(null);
  const [propertyToRelease, setPropertyToRelease] = useState<Propiedad | null>(null);

  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [releasePassword, setReleasePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [incidentProperty, setIncidentProperty] = useState<Propiedad | null>(null);
  const [incidentRetro, setIncidentRetro] = useState('');
  const [incidentFechaResolucion, setIncidentFechaResolucion] = useState('');

  // --- ESTADO PARA DATA LOADER ---
  const [isClearingData, setIsClearingData] = useState(false);

  const toggleModeloSelection = (modelo: string) => setSelectedModelos(prev => prev.includes(modelo) ? prev.filter(m => m !== modelo) : [...prev, modelo]);
  const toggleNivelSelection = (nivel: string) => setSelectedNiveles(prev => prev.includes(nivel) ? prev.filter(n => n !== nivel) : [...prev, nivel]);
  const handleDragStart = (e: React.DragEvent, position: number) => dragItem.current = position;
  const handleDragEnter = (e: React.DragEvent, position: number) => {
    if (dragItem.current === null || dragItem.current === position) return;
    const newCols = [...columns];
    const draggedCol = newCols[dragItem.current];
    newCols.splice(dragItem.current, 1);
    newCols.splice(position, 0, draggedCol);
    dragItem.current = position;
    setColumns(newCols);
  };

  const availableProperties = useMemo(() => propertiesWithAccess.filter(p => (p.estado || '').toUpperCase() === 'DISPONIBLE'), [propertiesWithAccess]);
  const availableDesarrollos = useMemo(() => Array.from(new Set(availableProperties.map(p => p.desarrollo))).sort(), [availableProperties]);

  const dynamicModelos = useMemo(() => {
    if (!selectedDesarrollo) return [];
    return Array.from(new Set(availableProperties.filter(p => p.desarrollo === selectedDesarrollo).map(p => p.modelo))).sort((a, b) => (ORDER_MODELO[String(a || '')] || 99) - (ORDER_MODELO[String(b || '')] || 99));
  }, [availableProperties, selectedDesarrollo]);

  const dynamicNiveles = useMemo(() => {
    if (!selectedDesarrollo) return [];
    let filtered = availableProperties.filter(p => p.desarrollo === selectedDesarrollo);
    if (selectedModelos.length > 0) filtered = filtered.filter(p => selectedModelos.includes(p.modelo || ''));
    return Array.from(new Set(filtered.map(p => p.nivel))).sort((a, b) => (ORDER_NIVEL[String(a || '')] || 99) - (ORDER_NIVEL[String(b || '')] || 99));
  }, [availableProperties, selectedDesarrollo, selectedModelos]);

  const displayProperties = useMemo(() => {
    let filtered = availableProperties;
    if (selectedDesarrollo) filtered = filtered.filter(p => p.desarrollo === selectedDesarrollo);
    if (selectedModelos.length > 0) filtered = filtered.filter(p => selectedModelos.includes(p.modelo || ''));
    if (selectedNiveles.length > 0) filtered = filtered.filter(p => selectedNiveles.includes(p.nivel || ''));

    return filtered.sort((a, b) => {
      const dtuA = ORDER_DTU[a.dtuAvaluo || ''] || 99; const dtuB = ORDER_DTU[b.dtuAvaluo || ''] || 99;
      if (dtuA !== dtuB) return dtuA - dtuB;
      const modA = ORDER_MODELO[a.modelo || ''] || 99; const modB = ORDER_MODELO[b.modelo || ''] || 99;
      if (modA !== modB) return modA - modB;
      const nivA = ORDER_NIVEL[a.nivel || ''] || 99; const nivB = ORDER_NIVEL[b.nivel || ''] || 99;
      if (nivA !== nivB) return nivA - nivB;
      const edifA = String(a.edificio || ''); const edifB = String(b.edificio || '');
      if (edifA !== edifB) return edifA.localeCompare(edifB);
      return String(a.numeroInterior || '').localeCompare(String(b.numeroInterior || ''), undefined, { numeric: true });
    });
  }, [availableProperties, selectedDesarrollo, selectedModelos, selectedNiveles]);

  const reservedProperties = useMemo(() => {
    let props = propertiesWithAccess.filter(p => {
      const status = (p.estado || '').toUpperCase();
      const needsReview = getDiasDesdeRevisar(p) > 0;
      return status === 'APARTADO' || status === 'VENDIDO' || status === 'VENDIDO-P' || status === 'PREVENTA' || needsReview;
    });

    if (isAsesor && currentUser?.nombre) {
      props = props.filter(p => p.asesor === currentUser.nombre);
    }
    return props.sort((a, b) => getDiasDesdeRevisar(b) - getDiasDesdeRevisar(a));
  }, [propertiesWithAccess, isAsesor, currentUser]);

  const revisarCount = useMemo(() => reservedProperties.filter(p => getDiasDesdeRevisar(p) > 0).length, [reservedProperties]);
  const reubicacionesCount = useMemo(() => reservedProperties.filter(p => (p.metodoCompra || '').toUpperCase().includes('REUBICA')).length, [reservedProperties]); // CONTADOR AGREGADO

  const filteredReservedProperties = useMemo(() => {
    let props = reservedProperties;

    // FILTROS AGREGADOS (Incidencias vs Reubicaciones)
    if (showOnlyIncidents) {
      props = props.filter(p => getDiasDesdeRevisar(p) > 0);
    } else if (showOnlyReubicaciones) {
      props = props.filter(p => (p.metodoCompra || '').toUpperCase().includes('REUBICA'));
    }

    if (!reservationSearch) return props;
    const lowerSearch = reservationSearch.toLowerCase();
    return props.filter(p => Object.values(p).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)));
  }, [reservedProperties, reservationSearch, showOnlyIncidents, showOnlyReubicaciones]);

  useEffect(() => { setSelectedModelos([]); setSelectedNiveles([]); }, [selectedDesarrollo]);
  useEffect(() => { setSelectedNiveles(prev => prev.filter(n => dynamicNiveles.includes(n))); }, [selectedModelos, dynamicNiveles]);

  const formatCurrency = (amount: number | undefined) => amount === undefined || amount === null ? '-' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  const toggleColumnVisibility = (id: string) => setColumns(prev => prev.map(col => col.id === id ? { ...col, visible: !col.visible } : col));

  const handleSelectProperty = async (prop: Propiedad, subiendoDocs = false) => {
    if (!subiendoDocs) {
      try {
        const { data, error } = await supabase
          .from('propiedades')
          .select('estado')
          .eq('idPropiedad', prop.idPropiedad)
          .single();

        if (error) {
          console.error("Error al validar disponibilidad", error);
        } else if (data?.estado !== Estado.DISPONIBLE) {
          setUnavailablePopupProp(prop);
          if (onRefresh) onRefresh();
          return;
        }
      } catch (err) {
        console.error("Error validando disponibilidad", err);
      }
    }

    setSelectedProperty(prop);
    if (!subiendoDocs) {
      setReservationForm({
        nombreComprador: '', metodoCompra: '', ek: '', banco: '', nombreBroker: '', telefonoBroker: '', correoBroker: '', asesorExterno: false,
        url_comprobante_apartado: [], url_autorizacion_bancaria: [], url_mail_fovissste: [], url_solicitud_reubicacion: [], documentos: null
      });
    } else {
      setReservationForm({
        nombreComprador: prop.nombreComprador || '', metodoCompra: prop.metodoCompra || '', ek: prop.ek || '', banco: prop.banco || '', nombreBroker: prop.nombreBrokerBanco || '', telefonoBroker: prop.telefonoBrokerBanco || '', correoBroker: prop.correoBrokerBanco || '', asesorExterno: prop.asesorExterno || false, documentos: prop.documentos || null,
        url_comprobante_apartado: Array.isArray(prop.url_comprobante_apartado) ? prop.url_comprobante_apartado : (prop.url_comprobante_apartado ? [prop.url_comprobante_apartado as unknown as string] : []),
        url_autorizacion_bancaria: Array.isArray(prop.url_autorizacion_bancaria) ? prop.url_autorizacion_bancaria : (prop.url_autorizacion_bancaria ? [prop.url_autorizacion_bancaria as unknown as string] : []),
        url_mail_fovissste: Array.isArray(prop.url_mail_fovissste) ? prop.url_mail_fovissste : (prop.url_mail_fovissste ? [prop.url_mail_fovissste as unknown as string] : []),
        url_solicitud_reubicacion: Array.isArray(prop.url_solicitud_reubicacion) ? prop.url_solicitud_reubicacion : (prop.url_solicitud_reubicacion ? [prop.url_solicitud_reubicacion as unknown as string] : [])
      });
    }
    setFormError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProperty) return;

    setIsUploading(prev => ({ ...prev, [field]: true }));
    setFormError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedProperty.idPropiedad}_${field}_${Date.now()}_${i}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('expedientes_ponty').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('expedientes_ponty').getPublicUrl(fileName);
        uploadedUrls.push(publicUrlData.publicUrl);
      }
      setReservationForm(prev => {
        const currentArr = Array.isArray((prev as any)[field]) ? (prev as any)[field] : [];
        return { ...prev, [field]: [...currentArr, ...uploadedUrls] };
      });
    } catch (error: any) {
      setFormError('Error al subir archivo: ' + error.message);
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedProperty) return;
    if (!reservationForm.nombreComprador || !reservationForm.metodoCompra) { return setFormError("Faltan datos obligatorios."); }

    const isBanking = (catalogs.elementosHabilitarBanco || []).includes(reservationForm.metodoCompra);
    onUpdateProperty({
      idPropiedad: selectedProperty.idPropiedad, estado: Estado.APARTADO, nombreComprador: reservationForm.nombreComprador.toUpperCase(),
      metodoCompra: reservationForm.metodoCompra, ek: reservationForm.ek, asesorExterno: reservationForm.asesorExterno,
      asesor: isAsesor ? currentUser.nombre : selectedProperty.asesor,
      documentos: reservationForm.documentos,
      fechaApartado: reservationForm.fechaApartado || selectedProperty.fechaApartado || new Date().toISOString().split('T')[0],
      fechaVenta: reservationForm.fechaVenta || null,
      fechaEscritura: reservationForm.fechaEscritura || null,
      fechaDesde: reservationForm.fechaDesde || null,
      fechaResolucion: reservationForm.fechaResolucion || null,
      precioOperacion: selectedProperty.precioFinal,
      banco: isBanking ? reservationForm.banco : null, nombreBrokerBanco: isBanking ? reservationForm.nombreBroker.toUpperCase() : null,
      telefonoBrokerBanco: isBanking ? reservationForm.telefonoBroker : null, correoBrokerBanco: isBanking ? reservationForm.correoBroker : null,
      url_comprobante_apartado: reservationForm.url_comprobante_apartado.length > 0 ? reservationForm.url_comprobante_apartado : null,
      url_autorizacion_bancaria: reservationForm.url_autorizacion_bancaria.length > 0 ? reservationForm.url_autorizacion_bancaria : null,
      url_mail_fovissste: reservationForm.url_mail_fovissste.length > 0 ? reservationForm.url_mail_fovissste : null,
      url_solicitud_reubicacion: reservationForm.url_solicitud_reubicacion.length > 0 ? reservationForm.url_solicitud_reubicacion : null
    } as Partial<Propiedad>);
    setSelectedProperty(null);
  };

  const handleReleaseConfirm = async () => {
    if (!propertyToRelease) return;
    setIsProcessing(true);
    setPasswordError('');

    try {
      const { data: userData, error: userError } = await supabase.from('usuarios').select('id, password_hash').eq('nombre', currentUser.nombre).single();
      if (userError || !userData) { setPasswordError('Usuario no encontrado.'); setIsProcessing(false); return; }

      if (!bcrypt.compareSync(releasePassword, userData.password_hash)) { setPasswordError('Contraseña incorrecta. Intente de nuevo.'); setIsProcessing(false); return; }

      await supabase.from('historial_cancelaciones').insert([{
        idPropiedad: propertyToRelease.idPropiedad, desarrollo: propertyToRelease.desarrollo,
        modelo: propertyToRelease.modelo, nombreComprador: propertyToRelease.nombreComprador,
        precioFinal: propertyToRelease.precioFinal, motivo: 'CANCELACIÓN', notas: actionNotes.toUpperCase()
      }]);

      onUpdateProperty({
        idPropiedad: propertyToRelease.idPropiedad, estado: Estado.DISPONIBLE, fechaApartado: null, precioOperacion: 0,
        nombreComprador: null, banco: null, nombreBrokerBanco: null, telefonoBrokerBanco: null, correoBrokerBanco: null,
        ek: null, metodoCompra: null, metodoCompraAgrupador: null, titulacion: null, fechaDesde: null, asesorExterno: false,
        asesor: null, url_comprobante_apartado: null, url_autorizacion_bancaria: null, url_mail_fovissste: null, url_solicitud_reubicacion: null,
        retroAsesor: null, fechaResolucion: null,
        _notasCancelacion: actionNotes.toUpperCase()
      } as Partial<Propiedad>);

      setPropertyToRelease(null); setActionNotes(''); setReleasePassword('');
    } catch (error: any) {
      showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al cancelar: ' + error.message });
    } finally { setIsProcessing(false); }
  };

  const handleSaveIncident = async () => {
    if (!incidentProperty) return;
    setIsProcessing(true);
    try {
      const updateData = {
        retroAsesor: incidentRetro.toUpperCase(),
        fechaResolucion: incidentFechaResolucion || null
      };
      await supabase.from('propiedades').update(updateData).eq('idPropiedad', incidentProperty.idPropiedad);
      onUpdateProperty({ idPropiedad: incidentProperty.idPropiedad, ...updateData });

      setIncidentProperty(null);
      showPopup({ type: 'alert', variant: 'success', title: 'Éxito', message: 'Información guardada con éxito.' });
    } catch (err: any) {
      showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al guardar: ' + err.message });
    } finally { setIsProcessing(false); }
  };

  // --- FUNCIÓN DEL DATA LOADER ---
  const handleLimpiezaMasivaTitulacion = async () => {
    showPopup({
      type: 'confirm',
      variant: 'danger',
      title: 'Limpiar Registros de Titulación',
      message: '⚠️ ¿Estás seguro de limpiar los campos de Titulación y Fecha Desde de todo el inventario? Esta acción es irreversible y preparará la base para la nueva carga.',
      onConfirm: async () => {
        setIsClearingData(true);
        try {
          const { error } = await supabase
            .from('propiedades')
            .update({
              titulacion: null,
              fechaDesde: null
            })
            .not('titulacion', 'is', null);

          if (error) throw error;

          showPopup({ type: 'alert', variant: 'success', title: 'Éxito', message: 'Limpieza masiva ejecutada con éxito. Listo para cargar la nueva base de Titulación.' });
          if (onRefresh) onRefresh();
        } catch (error: any) {
          showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al limpiar la base de datos: ' + error.message });
        } finally {
          setIsClearingData(false);
        }
      }
    });
  };

  const visibleColumns = columns.filter(c => c.visible);

  const renderFileUpload = (field: string, label: string) => {
    const isUploadingThis = isUploading[field];
    const filesArray = (reservationForm as any)[field] as string[] || [];
    const hasFiles = filesArray.length > 0;

    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </label>

        {hasFiles && (
          <div className="mb-3 space-y-2">
            {filesArray.map((url, index) => (
              <div key={index} className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold truncate">Archivo {index + 1}</span>
                </div>
                <div className="flex gap-3">
                  <a href={url} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">Ver</a>
                  {!isAuditor && (
                    <button type="button" onClick={() => {
                      setReservationForm(prev => {
                        const newArr = [...((prev as any)[field] as string[])];
                        newArr.splice(index, 1);
                        return { ...prev, [field]: newArr };
                      });
                    }} className="text-xs font-black text-red-600 hover:text-red-800 uppercase tracking-wider">X</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAuditor && (
          <div className="relative flex items-center justify-center w-full h-11 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800">
            {isUploadingThis ? (
              <span className="text-xs font-bold text-slate-500 animate-pulse">Subiendo...</span>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-indigo-500 mr-2" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Adjuntar PDF/Foto {hasFiles ? '(Otro)' : ''}</span>
                <input type="file" multiple accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, field)} disabled={isUploadingThis} />
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">

      {/* BARRA SUPERIOR DE APARTADOS */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">

          {viewMode === 'catalog' ? (
            <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-4/5">
              <div className="w-full lg:w-64 flex-shrink-0">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">1. Desarrollo</label>
                <select value={selectedDesarrollo} onChange={(e) => setSelectedDesarrollo(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-sm font-medium">
                  <option value="">Seleccione...</option>
                  {availableDesarrollos.map(d => <option key={d} value={String(d)}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">2. Modelo {selectedDesarrollo && '(Múltiple)'}</label>
                {!selectedDesarrollo ? (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">Seleccione un desarrollo primero...</div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 transition-colors">
                    {dynamicModelos.length === 0 ? <span className="text-xs text-slate-500 p-1">Sin modelos disponibles</span> : dynamicModelos.map((modelo) => (
                      <label key={modelo} className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all select-none border ${selectedModelos.includes(modelo || '') ? 'bg-indigo-600 text-white border-indigo-700 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                        <input type="checkbox" className="hidden" checked={selectedModelos.includes(modelo || '')} onChange={() => toggleModeloSelection(modelo || '')} /> {modelo}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">3. Nivel {selectedDesarrollo && '(Múltiple)'}</label>
                {!selectedDesarrollo ? (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">Seleccione un desarrollo primero...</div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 transition-colors">
                    {dynamicNiveles.length === 0 ? <span className="text-xs text-slate-500 p-1">Sin niveles para los filtros actuales</span> : dynamicNiveles.map((nivel) => (
                      <label key={nivel} className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all select-none border ${selectedNiveles.includes(nivel || '') ? 'bg-indigo-600 text-white border-indigo-700 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                        <input type="checkbox" className="hidden" checked={selectedNiveles.includes(nivel || '')} onChange={() => toggleNivelSelection(nivel || '')} /> {nivel}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full lg:max-w-md flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Búsqueda en Mis Clientes / Apartados
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input type="text" placeholder="Buscar por cliente, ID..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-sm font-medium" value={reservationSearch} onChange={(e) => setReservationSearch(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 lg:mt-6">

            {/* BOTÓN DATA LOADER (SOLO ADMINS EN VISTA RESERVAS) */}
            {isAdmin && viewMode === 'reservations' && (
              <button
                onClick={handleLimpiezaMasivaTitulacion}
                disabled={isClearingData}
                className="flex items-center px-4 py-2.5 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {isClearingData ? 'Limpiando...' : 'Data Loader'}
              </button>
            )}

            {/* BOTÓN REUBICACIONES AGREGADO */}
            {reubicacionesCount > 0 && (
              <button onClick={() => { setViewMode('reservations'); setShowOnlyIncidents(false); setShowOnlyReubicaciones(!showOnlyReubicaciones); }} className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all shadow-sm ${showOnlyReubicaciones ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'}`}>
                <RefreshCcw className="w-4 h-4 mr-2" /> REUBICACIONES {reubicacionesCount}
              </button>
            )}

            {onRefresh && (
              <button onClick={onRefresh} className="flex items-center px-4 py-2.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm" title="Actualizar datos">
                <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
              </button>
            )}

            {revisarCount > 0 && (
              <button onClick={() => { setViewMode('reservations'); setShowOnlyReubicaciones(false); setShowOnlyIncidents(!showOnlyIncidents); }} className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all shadow-sm ${showOnlyIncidents ? 'bg-red-700 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                <AlertTriangle className="w-4 h-4 mr-2" /> REVISAR {revisarCount}
              </button>
            )}

            {viewMode === 'catalog' && (
              <div className="relative" ref={configPanelRef}>
                <button onClick={() => setShowColConfig(!showColConfig)} className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Settings className="h-4 w-4 mr-2" /> Columnas
                </button>

                {showColConfig && (
                  <div className="absolute z-50 left-0 xl:left-auto xl:right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Configurar</h4>
                      <button onClick={() => setShowColConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {columns.map((col, idx) => (
                        <div key={col.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragEnter={(e) => handleDragEnter(e, idx)} onDragOver={(e) => e.preventDefault()} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 gap-3 group cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                          <input type="checkbox" checked={col.visible} onChange={() => toggleColumnVisibility(col.id as string)} className="h-4 w-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500" />
                          <span className={`text-sm flex-1 truncate select-none ${col.visible ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => { setViewMode(viewMode === 'catalog' ? 'reservations' : 'catalog'); setShowOnlyIncidents(false); setShowOnlyReubicaciones(false); }} className={`flex items-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-black uppercase tracking-wider transition-all active:scale-95 ${viewMode === 'reservations' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {viewMode === 'catalog' ? <><List className="h-4 w-4 mr-2" /> {isAsesor ? 'Mis Clientes' : 'Reservas'}</> : <><ArrowLeft className="h-4 w-4 mr-2" /> Catálogo</>}
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* ETIQUETA ACTUALIZADA PARA REUBICACIONES */}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viewMode === 'catalog' ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
              : (showOnlyIncidents ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                : (showOnlyReubicaciones ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'))
              }`}>
              {viewMode === 'catalog' ? 'Catálogo Disponible' : (showOnlyIncidents ? 'Incidencias Pendientes' : (showOnlyReubicaciones ? 'Trámites de Reubicación' : (isAsesor ? 'Mis Clientes' : 'Inventario Apartado')))}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
            {viewMode === 'catalog' ? displayProperties.length : filteredReservedProperties.length} registros
          </span>
        </div>

        <div className="overflow-auto max-h-[65vh]">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-30 shadow-sm">
              {viewMode === 'catalog' ? (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">#</th>
                  {visibleColumns.map(col => <th key={col.id} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{col.label}</th>)}
                  {(!isAuditor || viewMode === 'reservations') && <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] z-40 align-middle">Acción</th>}
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Desarrollo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Ubicación</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Docs</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Incidencias</th>
                  {(!isAuditor || viewMode === 'reservations') && <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] z-40 align-middle">Acción</th>}
                </tr>
              )}
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/30">
              {viewMode === 'catalog' ? (
                displayProperties.length > 0 ? displayProperties.map((prop, idx) => (
                  <tr key={prop.idPropiedad} className="hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-bold">{idx + 1}</td>
                    {visibleColumns.map(col => (
                      <td key={`${prop.idPropiedad}-${col.id}`} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {col.id === 'dtuAvaluo' ? (
                          <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${prop.dtuAvaluo === 'AVALUO CERRADO' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : prop.dtuAvaluo === 'CON DTU' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {String(prop[col.id] || '-')}
                          </span>
                        ) : col.id === 'fechaResolucion' && prop[col.id] ? (
                          (() => {
                            const valStr = String(prop[col.id]).split('T')[0];
                            const today = new Date();
                            const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                            let colorClass = 'font-medium text-slate-700 dark:text-slate-300';
                            if (valStr < todayStr) {
                              colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-bold';
                            } else if (valStr === todayStr) {
                              colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2.5 py-1 rounded-md text-xs font-bold';
                            }
                            return <span className={colorClass}>{valStr}</span>;
                          })()
                        ) : ['fechaApartado', 'fechaVenta', 'fechaEscritura', 'fechaDesde'].includes(col.id as string) && prop[col.id] ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">{String(prop[col.id]).split('T')[0]}</span>
                        ) : ['precioTerrExc', 'precioObrasAdicionales', 'precioLista', 'descuento', 'precioFinal', 'valorAvaluo'].includes(col.id as string)
                          ? <span className={`font-bold ${col.id === 'descuento' ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'}`}>{formatCurrency(prop[col.id] as number)}</span>
                          : String(prop[col.id] || '-')}
                      </td>
                    ))}
                    {!isAuditor && (
                      <td className="px-4 py-2 whitespace-nowrap text-right sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-slate-700/80 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.02)] transition-colors align-middle z-10">
                        <button onClick={() => handleSelectProperty(prop)} className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm uppercase tracking-wider transition-transform active:scale-95">Apartar</button>
                      </td>
                    )}
                  </tr>
                )) : <tr><td colSpan={visibleColumns.length + (isAuditor ? 1 : 2)} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"><Search className="w-8 h-8 mx-auto mb-3 opacity-20" /><p className="text-sm font-medium">{selectedDesarrollo ? "No hay inventario disponible con estos filtros." : "Seleccione un Desarrollo para ver el inventario disponible."}</p></td></tr>
              ) : (
                filteredReservedProperties.length > 0 ? filteredReservedProperties.map((prop) => {
                  return (
                    <tr key={prop.idPropiedad} className="transition-colors group hover:bg-amber-50/30 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{prop.nombreComprador || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{prop.desarrollo} <br /> <span className="font-bold">{prop.modelo}</span></td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                        {prop.nivel} <span className="text-slate-300 dark:text-slate-600">|</span> Cond: <span className="font-bold text-slate-800 dark:text-slate-200">{prop.condomino || '-'}</span> <span className="text-slate-300 dark:text-slate-600">|</span> Edif: <span className="font-bold text-slate-800 dark:text-slate-200">{prop.edificio || '-'}</span> <span className="text-slate-300 dark:text-slate-600">|</span> Int: <span className="font-bold text-slate-800 dark:text-slate-200">{prop.numeroInterior || '-'}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {(isAdmin || isAuditor) ? (
                          <select
                            value={prop.documentos || ''}
                            onChange={(e) => onUpdateProperty({ idPropiedad: prop.idPropiedad, documentos: (e.target.value as any) || null })}
                            className={`text-[10px] font-black uppercase tracking-wider rounded-lg border-slate-200 dark:border-slate-700 p-1.5 focus:ring-indigo-500 cursor-pointer shadow-sm ${prop.documentos === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : prop.documentos === 'PARCIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
                          >
                            <option value="">REVISIÓN</option>
                            <option value="PARCIAL">PARCIAL</option>
                            <option value="OK">OK</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${prop.documentos === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : prop.documentos === 'PARCIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {prop.documentos || 'REVISIÓN'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {['VENDIDO', 'VENDIDO-P'].includes((prop.estado || '').toUpperCase()) ? (
                          getDiasDesdeRevisar(prop) > 0 ? (
                            <button
                              onClick={() => { setIncidentProperty(prop); setIncidentRetro(prop.retroAsesor || ''); setIncidentFechaResolucion((prop as any).fechaResolucion || ''); }}
                              className="px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-colors shadow-sm"
                            >
                              REVISAR {getDiasDesdeRevisar(prop)}
                            </button>
                          ) : <span className="text-xs text-slate-400 font-bold">SIN INCIDENCIA</span>
                        ) : <span className="text-xs text-slate-300 font-medium">-</span>}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap text-right sticky right-0 bg-white dark:bg-slate-800 transition-colors shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.02)] align-middle z-10 group-hover:bg-amber-50 dark:group-hover:bg-slate-700/80">
                        {['APARTADO', 'PREVENTA'].includes((prop.estado || '').toUpperCase()) ? (
                          <button onClick={() => setActionMenuProp(prop)} className="inline-flex items-center px-4 py-1.5 border border-slate-200 dark:border-slate-600 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all uppercase tracking-wider shadow-sm">
                            MODIFICAR
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">En Proceso</span>
                        )}
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={visibleColumns.length + 2} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"><Building2 className="w-8 h-8 mx-auto mb-3 opacity-20" /><p className="text-sm font-medium">{isAsesor ? "No tienes clientes apartados en este momento." : "No hay propiedades en esta vista."}</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE ATENCIÓN DE INCIDENCIA --- */}
      {incidentProperty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100">

            <div className="bg-orange-600 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Atención de Incidencia
              </h3>
              <button onClick={() => setIncidentProperty(null)} className="text-white/70 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nombre Comprador</label>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                    {incidentProperty.nombreComprador}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Desarrollo</label>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                    {incidentProperty.desarrollo}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Titulación</label>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {incidentProperty.titulacion || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Días Revisar</label>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50 text-sm font-black text-indigo-700 dark:text-indigo-400">
                    {getDiasDesdeRevisar(incidentProperty)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">Retro Asesor (Editable)</label>
                <textarea
                  value={incidentRetro}
                  onChange={e => setIncidentRetro(e.target.value.toUpperCase())}
                  disabled={isAuditor}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase transition-all shadow-inner disabled:opacity-50"
                  rows={3}
                  placeholder="INGRESE RETROALIMENTACIÓN..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest ml-1">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Fecha de resolución
                </label>
                <input
                  type="date"
                  value={incidentFechaResolucion}
                  onChange={e => setIncidentFechaResolucion(e.target.value)}
                  disabled={isAuditor}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all shadow-inner disabled:opacity-50"
                />
              </div>

            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <button disabled={isProcessing} onClick={() => setIncidentProperty(null)} className="px-5 py-2.5 font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
              {!isAuditor && (
                <button disabled={isProcessing} onClick={handleSaveIncident} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95 disabled:opacity-50">
                  {isProcessing ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL INTERMEDIO DE ACCIÓN CANCELAR APARTADO --- */}
      {actionMenuProp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Acción Requerida</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">¿Qué desea hacer con el apartado de <span className="font-bold">{actionMenuProp.nombreComprador}</span>?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { handleSelectProperty(actionMenuProp, true); setActionMenuProp(null); }} className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold py-3.5 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800">
                Subir Documentos
              </button>
              {!isAuditor && (
                <button onClick={() => { setPropertyToRelease(actionMenuProp); setActionMenuProp(null); setPasswordError(''); setReleasePassword(''); }} className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-bold py-3.5 rounded-xl transition-colors border border-red-200 dark:border-red-800">
                  Cancelar Apartado
                </button>
              )}
              <button onClick={() => setActionMenuProp(null)} className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {unavailablePopupProp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setUnavailablePopupProp(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 text-center p-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Propiedad no disponible</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Lo sentimos, la propiedad <span className="font-bold">{unavailablePopupProp.idPropiedad}</span> ya no se encuentra disponible. La lista ha sido actualizada.
            </p>
            <button
              onClick={() => setUnavailablePopupProp(null)}
              className="w-full inline-flex justify-center rounded-xl border border-transparent bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL DE APARTADO / SUBIDA DE ARCHIVOS --- */}
      {selectedProperty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProperty(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">{reservationForm.nombreComprador ? 'Completar Expediente' : 'Confirmar Apartado'}</h3>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">Propiedad ID: {selectedProperty.idPropiedad} | DTU: {selectedProperty.dtuAvaluo}</p>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {formError && (
              <div className="bg-red-50 border-b border-red-200 p-4 shrink-0 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-red-800">{formError}</p>
              </div>
            )}

            <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleReservationSubmit} className="space-y-6">
                <div>
                  <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><User className="w-4 h-4 mr-2 text-slate-400" /> Nombre del Comprador *</label>
                  <input type="text" required disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 uppercase font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" placeholder="Escriba el nombre completo" value={reservationForm.nombreComprador} onChange={e => setReservationForm({ ...reservationForm, nombreComprador: e.target.value.toUpperCase() })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><CreditCard className="w-4 h-4 mr-2 text-slate-400" /> Método de Compra *</label><select required disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" value={reservationForm.metodoCompra} onChange={e => setReservationForm({ ...reservationForm, metodoCompra: e.target.value })}><option value="">Seleccione...</option>{catalogs.metodoCompra?.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div><label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><FileText className="w-4 h-4 mr-2 text-slate-400" /> EK (Opcional)</label><input type="text" disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" placeholder="5 a 6 dígitos" maxLength={6} value={reservationForm.ek} onChange={e => setReservationForm({ ...reservationForm, ek: e.target.value.replace(/[^0-9]/g, '') })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><Calendar className="w-4 h-4 mr-2 text-slate-400" /> Fecha Resolución *</label>
                    <input type="date" required disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" value={reservationForm.fechaResolucion || ''} onChange={e => setReservationForm({ ...reservationForm, fechaResolucion: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors mt-2">
                  <input type="checkbox" disabled={isAuditor} className="h-5 w-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500 disabled:opacity-50" checked={reservationForm.asesorExterno} onChange={e => setReservationForm({ ...reservationForm, asesorExterno: e.target.checked })} />
                  <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Marcar si el trámite es con asesor externo</span>
                </label>

                <div className="space-y-4">
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <CreditCard className="w-4 h-4" /> Información Bancaria / Broker <span className="text-[10px] text-slate-400 ml-1">(SI APLICA)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Banco *</label>
                        <select disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase disabled:opacity-50" value={reservationForm.banco || ''} onChange={e => setReservationForm({ ...reservationForm, banco: e.target.value })}>
                          <option value="">Seleccione Banco...</option>
                          {catalogs.banco?.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Nombre del Broker *</label>
                        <input type="text" disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 uppercase font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" placeholder="NOMBRE DEL BROKER" value={reservationForm.nombreBroker || ''} onChange={e => setReservationForm({ ...reservationForm, nombreBroker: e.target.value.toUpperCase() })} />
                      </div>
                      <div>
                        <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Teléfono Broker *</label>
                        <input type="text" disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 uppercase font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" placeholder="10 DÍGITOS" maxLength={10} value={reservationForm.telefonoBroker || ''} onChange={e => setReservationForm({ ...reservationForm, telefonoBroker: e.target.value.replace(/[^0-9]/g, '') })} />
                      </div>
                      <div>
                        <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">Correo Broker *</label>
                        <input type="email" disabled={isAuditor} className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" placeholder="email@ejemplo.com" value={reservationForm.correoBroker || ''} onChange={e => setReservationForm({ ...reservationForm, correoBroker: e.target.value.toLowerCase() })} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                      <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" /> Expediente Digital
                      </h4>
                      {(isAdmin || isAuditor) && (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revisión Docs:</span>
                          <select
                            value={reservationForm.documentos || ''}
                            onChange={e => setReservationForm({ ...reservationForm, documentos: (e.target.value as any) || null })}
                            className={`text-xs font-black uppercase tracking-wider rounded-md border-none p-1 focus:ring-0 cursor-pointer ${reservationForm.documentos === 'OK' ? 'text-green-700 dark:text-green-400 bg-transparent' : reservationForm.documentos === 'PARCIAL' ? 'text-amber-700 dark:text-amber-400 bg-transparent' : 'text-slate-600 dark:text-slate-300 bg-transparent'}`}
                          >
                            <option value="">EN REVISIÓN</option>
                            <option value="PARCIAL">PARCIAL</option>
                            <option value="OK">OK</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderFileUpload('url_comprobante_apartado', 'Comprobante de Apartado (Opcional)')}
                      {renderFileUpload('url_autorizacion_bancaria', 'Autorización Bancaria (Opcional)')}
                      {renderFileUpload('url_mail_fovissste', 'Mail FOVISSSTE (Opcional)')}
                      {renderFileUpload('url_solicitud_reubicacion', 'Solicitud de Reubicación (Opcional)')}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
                  <button type="button" className="px-6 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase tracking-wider" onClick={() => setSelectedProperty(null)}>Cancelar</button>
                  {!isAuditor && (
                    <button type="submit" disabled={Object.values(isUploading).some(v => v)} className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-wider flex items-center gap-2 disabled:opacity-50">Confirmar <ArrowRight className="w-4 h-4" /></button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CANCELAR / LIBERAR (CON FIRMA) --- */}
      {propertyToRelease && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"><Unlock className="h-7 w-7 text-red-600 dark:text-red-400" /></div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Cancelar Apartado</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">La propiedad volverá al catálogo y el cliente <span className="font-bold text-slate-900 dark:text-slate-200">{propertyToRelease.nombreComprador}</span> pasará a historial.</p>

              <div className="w-full text-left space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">Motivo / Notas (Opcional)</label>
                  <textarea
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none font-medium uppercase"
                    placeholder="Ej. Falta de crédito..." rows={2} value={actionNotes} onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                  <label className="flex items-center text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-2">
                    <Unlock className="w-3.5 h-3.5 mr-1.5" /> Confirma tu contraseña
                  </label>
                  <input
                    type="password"
                    className="w-full border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="******" value={releasePassword} onChange={(e) => setReleasePassword(e.target.value)}
                  />
                  {passwordError && <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-bold">{passwordError}</p>}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t border-slate-200 dark:border-slate-700">
              <button disabled={isProcessing} className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 uppercase tracking-wider transition-colors" onClick={() => { setPropertyToRelease(null); setActionNotes(''); setReleasePassword(''); setPasswordError(''); }}>Cancelar</button>
              <button disabled={isProcessing || !releasePassword} className="flex-1 rounded-xl bg-red-600 text-xs font-bold text-white py-3 hover:bg-red-700 uppercase tracking-wider shadow-lg shadow-red-200 dark:shadow-none transition-transform active:scale-95 disabled:opacity-50" onClick={handleReleaseConfirm}>{isProcessing ? 'Validando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};