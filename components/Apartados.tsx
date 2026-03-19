import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Propiedad, Estado } from '../types';
import { Settings, GripVertical, X, Check, ArrowRight, ArrowLeft, User, CreditCard, FileText, Clock, AlertTriangle, List, Search, Unlock, AlertCircle, Save, Building2 } from 'lucide-react';

interface TestViewProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
  onUpdateProperty: (updatedProperty: Partial<Propiedad>) => void;
}

interface ColumnConfig {
  id: keyof Propiedad;
  label: string;
  visible: boolean;
}

// --- CONSTANTS ---
const ORDER_DTU: { [key: string]: number } = { 'AVALÚO CERRADO': 1, 'CON DTU': 2, 'SIN DTU': 3 };
const ORDER_MODELO: { [key: string]: number } = { 'COLONIAL': 1, 'CAPILLA': 2, 'OLIVO LT': 3, 'OLIVO': 4, 'NOGAL': 5, 'CEDRO': 6, 'MAGNOLIA': 7, 'CAOBA': 8, 'SANTANDER 1': 9, 'SANTANDER 2': 10, 'NOGAL 1': 11, 'NOGAL 2': 12 };
const ORDER_NIVEL: { [key: string]: number } = { 'PBP': 1, 'PBF': 2, 'N1': 3, 'N2': 4, 'N3': 5, 'PBP EXC': 6, 'PBF EXC': 7, 'CASA': 8, 'CASA EXC': 9 };

const INITIAL_COLUMNS: ColumnConfig[] = [
  { id: 'modelo', label: 'Modelo', visible: true },
  { id: 'nivel', label: 'Nivel', visible: true },
  { id: 'dtuAvaluo', label: 'DTU-Avalúo', visible: true }, 
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
];

const STORAGE_KEY_COLS_APARTADOS = 'propertyMaster_apartados_cols_v1';

export const Apartados: React.FC<TestViewProps> = ({ properties, catalogs, onUpdateProperty }) => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState<'catalog' | 'reservations'>('catalog');
  
  // Catalog View State
  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string>('');
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const [selectedNiveles, setSelectedNiveles] = useState<string[]>([]);
  const [showColConfig, setShowColConfig] = useState(false);
  const dragItem = useRef<number | null>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);

  // Column Persistence
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLS_APARTADOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === INITIAL_COLUMNS.length) return parsed;
      }
    } catch (e) { console.error("Error reading columns", e); }
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

  // Modal States
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);
  const [reservationForm, setReservationForm] = useState({
      nombreComprador: '', metodoCompra: '', ek: '', banco: '', nombreBroker: '', telefonoBroker: '', correoBroker: '', asesorExterno: false
  });
  const [incidentProperty, setIncidentProperty] = useState<Propiedad | null>(null);
  const [incidentRetro, setIncidentRetro] = useState('');
  const [reservationSearch, setReservationSearch] = useState('');
  const [propertyToRelease, setPropertyToRelease] = useState<Propiedad | null>(null);

  // --- DERIVED DATA ---
  const revisarCount = useMemo(() => properties.filter(p => (p.diasDesdeRevisar || 0) >= 1 && p.estado === 'APARTADO').length, [properties]);

  const availableProperties = useMemo(() => properties.filter(p => (p.estado || '').toUpperCase() === 'DISPONIBLE'), [properties]);
  const availableDesarrollos = useMemo(() => Array.from(new Set(availableProperties.map(p => p.desarrollo))).sort(), [availableProperties]);

  const dynamicModelos = useMemo(() => {
    if (!selectedDesarrollo) return [];
    const filteredByDesarrollo = availableProperties.filter(p => p.desarrollo === selectedDesarrollo);
    return Array.from(new Set(filteredByDesarrollo.map(p => p.modelo))).sort((a, b) => (ORDER_MODELO[a] || 99) - (ORDER_MODELO[b] || 99));
  }, [availableProperties, selectedDesarrollo]);

  const dynamicNiveles = useMemo(() => {
    if (!selectedDesarrollo) return [];
    let filtered = availableProperties.filter(p => p.desarrollo === selectedDesarrollo);
    if (selectedModelos.length > 0) filtered = filtered.filter(p => selectedModelos.includes(p.modelo));
    return Array.from(new Set(filtered.map(p => p.nivel))).sort((a, b) => (ORDER_NIVEL[a] || 99) - (ORDER_NIVEL[b] || 99));
  }, [availableProperties, selectedDesarrollo, selectedModelos]);

  const displayProperties = useMemo(() => {
    let filtered = availableProperties;
    if (selectedDesarrollo) filtered = filtered.filter(p => p.desarrollo === selectedDesarrollo);
    if (selectedModelos.length > 0) filtered = filtered.filter(p => selectedModelos.includes(p.modelo));
    if (selectedNiveles.length > 0) filtered = filtered.filter(p => selectedNiveles.includes(p.nivel));

    return filtered.sort((a, b) => {
        const dtuA = ORDER_DTU[a.dtuAvaluo] || 99; const dtuB = ORDER_DTU[b.dtuAvaluo] || 99;
        if (dtuA !== dtuB) return dtuA - dtuB;
        const modA = ORDER_MODELO[a.modelo] || 99; const modB = ORDER_MODELO[b.modelo] || 99;
        if (modA !== modB) return modA - modB;
        const nivA = ORDER_NIVEL[a.nivel] || 99; const nivB = ORDER_NIVEL[b.nivel] || 99;
        if (nivA !== nivB) return nivA - nivB;
        const edifA = String(a.edificio || ''); const edifB = String(b.edificio || '');
        if (edifA !== edifB) return edifA.localeCompare(edifB);
        return String(a.numeroInterior || '').localeCompare(String(b.numeroInterior || ''), undefined, { numeric: true });
    });
  }, [availableProperties, selectedDesarrollo, selectedModelos, selectedNiveles]);

  const reservedProperties = useMemo(() => properties.filter(p => (p.estado || '').toUpperCase() === 'APARTADO').sort((a, b) => (b.diasDesdeRevisar || 0) - (a.diasDesdeRevisar || 0)), [properties]);
  const filteredReservedProperties = useMemo(() => {
      if (!reservationSearch) return reservedProperties;
      const lowerSearch = reservationSearch.toLowerCase();
      return reservedProperties.filter(p => Object.values(p).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)));
  }, [reservedProperties, reservationSearch]);

  useEffect(() => { setSelectedModelos([]); setSelectedNiveles([]); }, [selectedDesarrollo]);
  useEffect(() => { setSelectedNiveles(prev => prev.filter(n => dynamicNiveles.includes(n))); }, [selectedModelos, dynamicNiveles]);

  // --- HANDLERS ---
  const formatCurrency = (amount: number) => amount === undefined || amount === null ? '-' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  const toggleColumnVisibility = (id: string) => setColumns(prev => prev.map(col => col.id === id ? { ...col, visible: !col.visible } : col));

  const handleSelectProperty = (prop: Propiedad) => {
      setSelectedProperty(prop);
      setReservationForm({ nombreComprador: '', metodoCompra: '', ek: '', banco: '', nombreBroker: '', telefonoBroker: '', correoBroker: '', asesorExterno: false });
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedProperty) return;
      if (!reservationForm.nombreComprador || !reservationForm.metodoCompra) { alert("El Nombre del Comprador y el Método de Compra son obligatorios."); return; }
      if (reservationForm.ek && !/^\d{5,6}$/.test(reservationForm.ek)) { alert("El campo EK debe contener entre 5 y 6 dígitos numéricos."); return; }

      const isBanking = (catalogs.elementosHabilitarBanco || []).includes(reservationForm.metodoCompra);
      if (isBanking) {
          if (!reservationForm.banco || !reservationForm.nombreBroker || !reservationForm.telefonoBroker || !reservationForm.correoBroker) { alert("Todos los campos bancarios son obligatorios."); return; }
          if (!/^\d{10}$/.test(reservationForm.telefonoBroker)) { alert("El teléfono debe tener 10 dígitos numéricos."); return; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationForm.correoBroker)) { alert("Correo electrónico inválido."); return; }
      }

      onUpdateProperty({
          idPropiedad: selectedProperty.idPropiedad, estado: Estado.APARTADO, nombreComprador: reservationForm.nombreComprador.toUpperCase(),
          metodoCompra: reservationForm.metodoCompra, ek: reservationForm.ek, asesorExterno: reservationForm.asesorExterno, 
          fechaApartado: new Date().toISOString().split('T')[0], precioOperacion: selectedProperty.precioFinal, 
          banco: isBanking ? reservationForm.banco : null, nombreBrokerBanco: isBanking ? reservationForm.nombreBroker.toUpperCase() : null,
          telefonoBrokerBanco: isBanking ? reservationForm.telefonoBroker : null, correoBrokerBanco: isBanking ? reservationForm.correoBroker : null
      } as Partial<Propiedad>);
      
      alert(`Propiedad ${selectedProperty.idPropiedad} APARTADA correctamente.`);
      setSelectedProperty(null); 
  };

  const handleReleaseConfirm = () => {
      if (!propertyToRelease) return;
      onUpdateProperty({
          idPropiedad: propertyToRelease.idPropiedad, estado: Estado.DISPONIBLE, fechaApartado: null, precioOperacion: 0,
          nombreComprador: null, banco: null, nombreBrokerBanco: null, telefonoBrokerBanco: null, correoBrokerBanco: null,
          ek: null, metodoCompra: null, metodoCompraAgrupador: null, titulacion: null, fechaDesde: null, asesorExterno: false
      } as Partial<Propiedad>);
      setPropertyToRelease(null);
  };

  const handleSaveIncident = (e: React.FormEvent) => {
      e.preventDefault();
      if (!incidentProperty) return;
      onUpdateProperty({ idPropiedad: incidentProperty.idPropiedad, retroAsesor: incidentRetro.toUpperCase() });
      setIncidentProperty(null);
  };

  const visibleColumns = columns.filter(c => c.visible);

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      
      {/* --- HEADER & FILTERS --- */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
          <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
              
              {viewMode === 'catalog' ? (
                <div className="flex flex-col lg:flex-row gap-4 w-full lg:w-4/5">
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">1. Desarrollo</label>
                        <select
                            value={selectedDesarrollo}
                            onChange={(e) => setSelectedDesarrollo(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-sm font-medium"
                        >
                            <option value="">Seleccione...</option>
                            {availableDesarrollos.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">2. Modelo {selectedDesarrollo && '(Múltiple)'}</label>
                        {!selectedDesarrollo ? (
                            <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">Seleccione un desarrollo primero...</div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 transition-colors">
                                {dynamicModelos.length === 0 ? (
                                    <span className="text-xs text-slate-500 p-1">Sin modelos disponibles</span>
                                ) : (
                                    dynamicModelos.map((modelo) => (
                                        <label key={modelo} className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all select-none border ${selectedModelos.includes(modelo) ? 'bg-indigo-600 text-white border-indigo-700 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                            <input type="checkbox" className="hidden" checked={selectedModelos.includes(modelo)} onChange={() => toggleModeloSelection(modelo)} />
                                            {modelo}
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">3. Nivel {selectedDesarrollo && '(Múltiple)'}</label>
                        {!selectedDesarrollo ? (
                            <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">Seleccione un desarrollo primero...</div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 transition-colors">
                                {dynamicNiveles.length === 0 ? (
                                    <span className="text-xs text-slate-500 p-1">Sin niveles para los filtros actuales</span>
                                ) : (
                                    dynamicNiveles.map((nivel) => (
                                        <label key={nivel} className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all select-none border ${selectedNiveles.includes(nivel) ? 'bg-indigo-600 text-white border-indigo-700 dark:border-indigo-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                            <input type="checkbox" className="hidden" checked={selectedNiveles.includes(nivel)} onChange={() => toggleNivelSelection(nivel)} />
                                            {nivel}
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
              ) : (
                <div className="w-full lg:max-w-md">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Búsqueda de Apartados</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-sm font-medium"
                            value={reservationSearch}
                            onChange={(e) => setReservationSearch(e.target.value)}
                        />
                    </div>
                </div>
              )}

              {/* CONTROLES DERECHOS */}
              <div className="flex flex-wrap items-center gap-3 lg:mt-6">
                 {revisarCount >= 1 && viewMode === 'reservations' && (
                     <div className="flex items-center px-3 py-2 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg shadow-sm animate-pulse">
                         <AlertTriangle className="w-4 h-4 mr-2" />
                         <span className="text-xs font-black uppercase tracking-widest">ATENDER {revisarCount}</span>
                     </div>
                 )}

                 {viewMode === 'catalog' && (
                  <div className="relative" ref={configPanelRef}>
                      <button onClick={() => setShowColConfig(!showColConfig)} className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <Settings className="h-4 w-4 mr-2" /> Columnas
                      </button>
                      
                      {showColConfig && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
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

                 <button
                    onClick={() => setViewMode(viewMode === 'catalog' ? 'reservations' : 'catalog')}
                    className={`flex items-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-bold transition-all active:scale-95 ${
                        viewMode === 'reservations' 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                 >
                     {viewMode === 'catalog' ? <><List className="h-4 w-4 mr-2" /> Ver Apartados</> : <><ArrowLeft className="h-4 w-4 mr-2" /> Volver al Catálogo</>}
                 </button>
              </div>
          </div>
      </div>

      {/* --- TABLA PRINCIPAL --- */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
        
        {/* Encabezado de la tabla */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viewMode === 'catalog' ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}>
                {viewMode === 'catalog' ? 'Catálogo Disponible' : 'Inventario Apartado'}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {viewMode === 'catalog' ? displayProperties.length : filteredReservedProperties.length} registros
          </span>
        </div>

        {/* Contenido de la Tabla */}
        <div className="overflow-auto max-h-[65vh]">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700/50">
                
                {/* HEADERS */}
                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    {viewMode === 'catalog' ? (
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">#</th>
                            {visibleColumns.map(col => <th key={col.id} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{col.label}</th>)}
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] z-20">Acción</th>
                        </tr>
                    ) : (
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Cliente</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Desarrollo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Modelo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Nivel / Ubicación</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">$ Final</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] z-20">Acción</th>
                        </tr>
                    )}
                </thead>

                {/* BODY */}
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/30">
                    {viewMode === 'catalog' ? (
                        displayProperties.length > 0 ? (
                            displayProperties.map((prop, idx) => (
                                <tr key={prop.idPropiedad} className="hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-bold">{idx + 1}</td>
                                    {visibleColumns.map(col => (
                                        <td key={`${prop.idPropiedad}-${col.id}`} className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                            {col.id === 'dtuAvaluo' ? (
                                                <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${prop.dtuAvaluo === 'AVALÚO CERRADO' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : prop.dtuAvaluo === 'CON DTU' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {String(prop[col.id] || '-')}
                                                </span>
                                            ) : ['precioTerrExc', 'precioObrasAdicionales', 'precioLista', 'descuento', 'precioFinal'].includes(col.id) 
                                                ? <span className={`font-bold ${col.id === 'descuento' ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'}`}>{formatCurrency(prop[col.id] as number)}</span>
                                                : String(prop[col.id] || '-')
                                            }
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 whitespace-nowrap text-right sticky right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 group-hover:bg-indigo-50/80 dark:group-hover:bg-slate-700/80 transition-colors">
                                        <button onClick={() => handleSelectProperty(prop)} className="inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm uppercase tracking-wider transition-transform active:scale-95">Apartar</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={visibleColumns.length + 2} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"><div className="flex flex-col items-center"><Search className="w-8 h-8 mb-3 opacity-20" /><p className="text-sm font-medium">{selectedDesarrollo ? "No hay inventario disponible con estos filtros." : "Seleccione un Desarrollo para ver el inventario disponible."}</p></div></td></tr>
                        )
                    ) : (
                        filteredReservedProperties.length > 0 ? (
                            filteredReservedProperties.map((prop) => (
                                <tr key={prop.idPropiedad} className="hover:bg-amber-50/30 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{prop.nombreComprador || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">{prop.desarrollo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 font-medium">{prop.modelo}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                                        {prop.nivel} <span className="text-slate-400 dark:text-slate-500">|</span> {prop.condomino || '-'} <span className="text-slate-400 dark:text-slate-500">|</span> Int: {prop.numeroInterior || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-black text-slate-800 dark:text-slate-200">{formatCurrency(prop.precioFinal)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {(prop.diasDesdeRevisar || 0) >= 1 ? (
                                            <button onClick={() => handleOpenIncident(prop)} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-xs font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                                Revisar ({prop.diasDesdeRevisar})
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Al día</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right sticky right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 group-hover:bg-amber-50/80 dark:group-hover:bg-slate-700/80 transition-colors">
                                        <button onClick={() => setPropertyToRelease(prop)} className="inline-flex items-center px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition-all uppercase tracking-wider shadow-sm">
                                            <Unlock className="w-3.5 h-3.5 mr-1.5" /> Liberar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"><div className="flex flex-col items-center"><Building2 className="w-8 h-8 mb-3 opacity-20" /><p className="text-sm font-medium">No hay propiedades apartadas en este momento.</p></div></td></tr>
                        )
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL DE APARTADO --- */}
      {selectedProperty && viewMode === 'catalog' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProperty(null)}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                
                {/* Modal Header */}
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">Confirmar Apartado</h3>
                        <p className="text-xs text-indigo-200 font-medium mt-0.5">Propiedad ID: {selectedProperty.idPropiedad}</p>
                    </div>
                    <button onClick={() => setSelectedProperty(null)} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                
                {/* Modal Body */}
                <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Summary Card */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
                            <div><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Desarrollo</p><p className="font-bold text-slate-900 dark:text-white text-sm">{selectedProperty.desarrollo}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Modelo</p><p className="font-bold text-slate-900 dark:text-white text-sm">{selectedProperty.modelo}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nivel</p><p className="font-bold text-slate-900 dark:text-white text-sm">{selectedProperty.nivel}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ubicación</p><p className="font-bold text-slate-900 dark:text-white text-sm truncate">{selectedProperty.condomino || selectedProperty.calle || '-'}</p></div>
                            <div className="col-span-full border-t border-slate-200 dark:border-slate-700 my-1"></div>
                            <div className="col-span-2"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Terreno Excedente</p><p className="font-bold text-slate-900 dark:text-white text-sm">{selectedProperty.m2TerrExc || 0} m²</p></div>
                            <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                                <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Precio Final</span>
                                <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(selectedProperty.precioFinal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleReservationSubmit} className="space-y-6">
                        <div>
                            <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><User className="w-4 h-4 mr-2 text-slate-400" /> Nombre del Comprador *</label>
                            <input type="text" required className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 uppercase font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Escriba el nombre completo" value={reservationForm.nombreComprador} onChange={e => setReservationForm({...reservationForm, nombreComprador: e.target.value.toUpperCase()})} />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><CreditCard className="w-4 h-4 mr-2 text-slate-400" /> Método de Compra *</label>
                                <select required className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={reservationForm.metodoCompra} onChange={e => setReservationForm({...reservationForm, metodoCompra: e.target.value})}>
                                    <option value="">Seleccione opción...</option>
                                    {catalogs.metodoCompra?.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2"><FileText className="w-4 h-4 mr-2 text-slate-400" /> EK (Opcional)</label>
                                <input type="text" className="w-full text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="5 a 6 dígitos" maxLength={6} value={reservationForm.ek} onChange={e => setReservationForm({...reservationForm, ek: e.target.value.replace(/[^0-9]/g, '')})} />
                            </div>
                        </div>

                        <label className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <input type="checkbox" className="h-5 w-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500" checked={reservationForm.asesorExterno} onChange={e => setReservationForm({...reservationForm, asesorExterno: e.target.checked})} />
                            <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Marcar si el trámite es con asesor externo</span>
                        </label>

                        {/* Banco Info (Condicional) */}
                        {(catalogs.elementosHabilitarBanco || []).includes(reservationForm.metodoCompra) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <h5 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest flex items-center border-b border-blue-100 dark:border-blue-800/50 pb-3"><Building2 className="w-4 h-4 mr-2" /> Datos del Broker / Banco</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1.5">Banco *</label><select required className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={reservationForm.banco} onChange={e => setReservationForm({...reservationForm, banco: e.target.value})}><option value="">Seleccione...</option>{catalogs.banco?.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                                    <div><label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1.5">Nombre Broker *</label><input required type="text" className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 uppercase outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre completo" value={reservationForm.nombreBroker} onChange={e => setReservationForm({...reservationForm, nombreBroker: e.target.value.toUpperCase()})} /></div>
                                    <div><label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1.5">Teléfono *</label><input required type="text" maxLength={10} className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="10 dígitos numéricos" value={reservationForm.telefonoBroker} onChange={e => setReservationForm({...reservationForm, telefonoBroker: e.target.value.replace(/[^0-9]/g, '')})} /></div>
                                    <div><label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1.5">Correo Electrónico *</label><input required type="email" className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="ejemplo@correo.com" value={reservationForm.correoBroker} onChange={e => setReservationForm({...reservationForm, correoBroker: e.target.value})} /></div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-700">
                            <button type="button" className="px-6 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase tracking-wider" onClick={() => setSelectedProperty(null)}>Cancelar</button>
                            <button type="submit" className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-wider flex items-center gap-2">Confirmar Apartado <ArrowRight className="w-4 h-4" /></button>
                        </div>
                    </form>
                </div>
            </div>
          </div>
      )}

      {/* --- MODALES PEQUEÑOS (LIBERAR / INCIDENCIA) --- */}
      
      {/* Liberar */}
      {propertyToRelease && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"><Unlock className="h-7 w-7 text-red-600 dark:text-red-400" /></div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Liberar Unidad</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">¿Confirmas que deseas cancelar el apartado de <span className="font-bold text-slate-900 dark:text-slate-200">{propertyToRelease.nombreComprador}</span> y regresar la propiedad al inventario?</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 uppercase tracking-wider transition-colors" onClick={() => setPropertyToRelease(null)}>Cancelar</button>
                    <button type="button" className="flex-1 rounded-xl bg-red-600 text-xs font-bold text-white py-3 hover:bg-red-700 uppercase tracking-wider shadow-lg shadow-red-200 dark:shadow-none transition-transform active:scale-95" onClick={handleReleaseConfirm}>Sí, Liberar</button>
                </div>
            </div>
          </div>
      )}

      {/* Incidencia */}
      {incidentProperty && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                  <div className="bg-red-600 dark:bg-red-700 px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-white" />
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Atención de Incidencia</h3>
                      </div>
                      <button onClick={() => setIncidentProperty(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <form onSubmit={handleSaveIncident} className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</label><div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{incidentProperty.nombreComprador}</div></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Desarrollo</label><div className="text-xs font-bold text-slate-800 dark:text-slate-200">{incidentProperty.desarrollo}</div></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Titulación</label><div className="text-xs font-bold text-slate-800 dark:text-slate-200">{incidentProperty.titulacion || 'Sin asignar'}</div></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Días de Atraso</label><div className="text-sm font-black text-red-600 dark:text-red-400">{incidentProperty.diasDesdeRevisar} días</div></div>
                      </div>

                      <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center"><Edit3 className="w-4 h-4 mr-2 text-slate-400" /> Retroalimentación del Asesor</label>
                          <textarea 
                              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none min-h-[120px] font-medium uppercase"
                              placeholder="Describe la situación actual de esta reserva..."
                              value={incidentRetro}
                              onChange={(e) => setIncidentRetro(e.target.value)}
                              autoFocus
                          />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={() => setIncidentProperty(null)} className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase tracking-wider">Cancelar</button>
                          <button type="submit" className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 flex items-center gap-2 transition-transform active:scale-95"><Save className="w-4 h-4" /> Guardar Nota</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};