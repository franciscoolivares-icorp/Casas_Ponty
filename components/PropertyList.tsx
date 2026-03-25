import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Propiedad } from '../types';
import * as XLSX from 'xlsx';
import { 
  Edit2, Trash2, Search, Filter, X, Settings, Check, 
  ChevronLeft, ChevronRight, Edit3, GripVertical, AlertCircle, Layers, Upload, Clock, User
} from 'lucide-react';

interface PropertyListProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
  onEdit: (property: Propiedad) => void;
  onDelete: (id: string) => void;
  onBulkImport: (data: any[]) => void;
  onBulkUpdate: (ids: string[], field: keyof Propiedad, value: any) => void;
  isAdmin: boolean;
  currentUser?: any; 
}

interface ColumnConfig { id: string; label: string; visible: boolean; }

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'desarrollo', label: 'Desarrollo', visible: true },
  { id: 'modelo', label: 'Modelo', visible: true },
  { id: 'nivel', label: 'Nivel', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
  { id: 'dtuAvaluo', label: 'DTU Avalúo', visible: true },
  { id: 'nombreComprador', label: 'Comprador', visible: true },
  { id: 'asesor', label: 'Asesor', visible: true },
  { id: 'calle', label: 'Calle', visible: true },
  { id: 'condomino', label: 'Condominio', visible: true },
  { id: 'edificio', label: 'Edificio', visible: true },
  { id: 'numeroInterior', label: 'Num Int', visible: true },
  { id: 'precioFinal', label: 'Precio Final', visible: true },
  { id: 'precioOperacion', label: 'Precio Operación', visible: true },
  { id: 'idPropiedad', label: 'ID Propiedad', visible: false },
];

const BULK_EDITABLE_FIELDS = [
    { key: 'precioLista', label: 'Precio de Lista', type: 'currency' },
    { key: 'dtu', label: 'DTU', type: 'boolean' },
    { key: 'diasAutorizadosApartado', label: 'Días Aut. Apartado', type: 'number' },
];

const STATUS_PRIORITY: Record<string, number> = { 'APARTADO': 1, 'DISPONIBLE': 2, 'VENDIDO': 3, 'ESCRITURADO': 4 };
const normalizeText = (text: string) => (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const PropertyList: React.FC<PropertyListProps> = ({ 
  properties, catalogs, onEdit, onDelete, onBulkImport, onBulkUpdate, isAdmin, currentUser 
}) => {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const dragColumnItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarEscriturados, setMostrarEscriturados] = useState(false); 
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showFilterConfig, setShowFilterConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // --- NUEVO ESTADO: FILTROS RÁPIDOS ---
  const [fDesarrollo, setFDesarrollo] = useState('');
  const [fModelo, setFModelo] = useState('');
  const [fNivel, setFNivel] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fDtu, setFDtu] = useState('');
  
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>(BULK_EDITABLE_FIELDS[0].key);
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const [historyModalId, setHistoryModalId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const STORAGE_KEY_COLS = 'propertyMaster_columnConfig_v2';

  const esCoordinador = currentUser?.tipo_usuario === 'COORDINADOR';
  const desarrollosAsignados = currentUser?.desarrollos_asignados || [];
  const canEdit = isAdmin || esCoordinador;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) {
        setShowColumnConfig(false);
        setShowFilterConfig(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === DEFAULT_COLUMNS.length) return parsed;
      }
    } catch (e) { console.error("Error reading columns", e); }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(columns)); }, [columns]);

  // --- NUEVA LÓGICA: OPCIONES DINÁMICAS PARA EL MOTOR DE FILTROS ---
  const uniqueDesarrollos = useMemo(() => Array.from(new Set(properties.map(p => p.desarrollo).filter(Boolean))).sort(), [properties]);
  const uniqueModelos = useMemo(() => Array.from(new Set(properties.filter(p => !fDesarrollo || p.desarrollo === fDesarrollo).map(p => p.modelo).filter(Boolean))).sort(), [properties, fDesarrollo]);
  const uniqueNiveles = useMemo(() => Array.from(new Set(properties.filter(p => (!fDesarrollo || p.desarrollo === fDesarrollo) && (!fModelo || p.modelo === fModelo)).map(p => p.nivel).filter(Boolean))).sort(), [properties, fDesarrollo, fModelo]);
  const uniqueEstados = useMemo(() => Array.from(new Set(properties.map(p => p.estado).filter(Boolean))).sort(), [properties]);
  const uniqueDtu = useMemo(() => Array.from(new Set(properties.map(p => p.dtuAvaluo).filter(Boolean))).sort(), [properties]);

  const activeFilterCount = [fDesarrollo, fModelo, fNivel, fEstado, fDtu].filter(Boolean).length;

  const clearFilters = () => {
    setFDesarrollo(''); setFModelo(''); setFNivel(''); setFEstado(''); setFDtu(''); setSearchTerm('');
  };
  // ------------------------------------------------------------------

  const handleOpenHistory = async (idPropiedad: string) => {
    setHistoryModalId(idPropiedad);
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('bitacora_movimientos')
        .select('*')
        .eq('idPropiedad', idPropiedad)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistoryData(data || []);
    } catch (err: any) {
      alert("Error al cargar historial: " + err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const term = normalizeText(searchTerm);
    return properties.filter(prop => {
      
      if (esCoordinador && !desarrollosAsignados.includes(prop.desarrollo)) return false;

      const matchesSearch = term === '' || Object.values(prop).some(v => normalizeText(String(v)).includes(term));
      if (!matchesSearch) return false;

      const esEscriturado = prop.estado === 'ESCRITURADO' || prop.estado === 'ESCRITURADO-P';
      if (esEscriturado && !mostrarEscriturados) return false;

      // NUEVA EVALUACIÓN DE FILTROS RÁPIDOS
      if (fDesarrollo && prop.desarrollo !== fDesarrollo) return false;
      if (fModelo && prop.modelo !== fModelo) return false;
      if (fNivel && prop.nivel !== fNivel) return false;
      if (fEstado && prop.estado !== fEstado) return false;
      if (fDtu && prop.dtuAvaluo !== fDtu) return false;

      return true;
    }).sort((a, b) => (STATUS_PRIORITY[a.estado] || 99) - (STATUS_PRIORITY[b.estado] || 99));
  }, [properties, searchTerm, mostrarEscriturados, esCoordinador, desarrollosAsignados, fDesarrollo, fModelo, fNivel, fEstado, fDtu]); 

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = filteredProperties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredProperties.map(p => p.idPropiedad)) : new Set());
  };

  const handleExecuteBulkUpdate = () => {
    onBulkUpdate(Array.from(selectedIds), bulkEditField as keyof Propiedad, bulkEditValue);
    setIsBulkEditOpen(false);
    setSelectedIds(new Set());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const formattedData = jsonData.map((row: any) => ({
          idPropiedad: row.idPropiedad || `pnty-${Math.floor(100000 + Math.random() * 900000)}`,
          desarrollo: row.desarrollo || null,
          nivel: row.nivel || null,
          modelo: row.modelo || null,
          modeloAgrupador: row.modeloAgrupador || null,
          estado: row.estado || 'DISPONIBLE',
          estadoAgrupador: row.estadoAgrupador || null,
          precioLista: Number(row.precioLista) || 0,
          descuento: Number(row.descuento) || 0,
          precioFinal: Number(row.precioFinal) || 0,
          precioOperacion: Number(row.precioOperacion) || 0,
          m2TerrExc: Number(row.m2TerrExc) || 0,
          precioXM2Exc: Number(row.precioXM2Exc) || 0,
          precioTerrExc: Number(row.precioTerrExc) || 0,
          precioObrasAdicionales: Number(row.precioObrasAdicionales) || 0,
          dtu: String(row.dtu).toLowerCase() === 'true' || row.dtu === 1,
          dtuAvaluo: row.dtuAvaluo || 'SIN DTU',
          valorAvaluo: Number(row.valorAvaluo) || 0,
          metodoCompra: row.metodoCompra || null,
          metodoCompraAgrupador: row.metodoCompraAgrupador || null,
          tipoUsuario: row.tipoUsuario || null,
          asesorExterno: String(row.asesorExterno).toLowerCase() === 'true' || row.asesorExterno === 1,
          calle: row.calle || null,
          manzana: row.manzana || null,
          lote: row.lote || null,
          condomino: row.condomino || null,
          edificio: row.edificio || null,
          numeroExterior: row.numeroExterior || null,
          numeroInterior: row.numeroInterior || null,
          diasAutorizadosApartado: Number(row.diasAutorizadosApartado) || 7,
          nombreComprador: row.nombreComprador || null,
          ek: row.ek || null,
          asesor: row.asesor || null,
          banco: row.banco || null,
          fechaApartado: row.fechaApartado ? new Date(row.fechaApartado).toISOString() : null,
          fechaVenta: row.fechaVenta ? new Date(row.fechaVenta).toISOString() : null,
          fechaEscritura: row.fechaEscritura ? new Date(row.fechaEscritura).toISOString() : null,
          fechaDesde: row.fechaDesde ? new Date(row.fechaDesde).toISOString() : null,
        }));

        const existingMap = new Map(properties.map(p => [p.idPropiedad, p]));
        let nuevos = 0; let actualizados = 0; let ignorados = 0;

        const recordsToUpdate = formattedData.filter(newRow => {
            const existing = existingMap.get(newRow.idPropiedad);
            if (!existing) { nuevos++; return true; }

            let hasChanges = false;
            for (const key of Object.keys(newRow)) {
                const newVal = String(newRow[key] === null || newRow[key] === undefined ? '' : newRow[key]);
                const oldVal = String(existing[key as keyof Propiedad] === null || existing[key as keyof Propiedad] === undefined ? '' : existing[key as keyof Propiedad]);
                if (newVal !== oldVal) { hasChanges = true; break; }
            }

            if (hasChanges) { actualizados++; return true; } else { ignorados++; return false; }
        });

        if (recordsToUpdate.length === 0) {
            alert(`Análisis completado:\n\nSe revisaron ${formattedData.length} registros del Excel, pero TODOS son idénticos a la base de datos.\n\nNo hay cambios por aplicar.`);
        } else {
            const confirmar = window.confirm(`Análisis completado:\n\n✨ Nuevos: ${nuevos}\n📝 A actualizar: ${actualizados}\n⏭️ Ignorados (Sin cambios): ${ignorados}\n\n¿Deseas proceder?`);
            if (confirmar) onBulkImport(recordsToUpdate); 
        }

      } catch (error) {
        console.error(error);
        alert('Error al procesar Excel. Verifique que las columnas coincidan con el formato.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const formatCell = (val: any, colId: string) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-400 dark:text-slate-500">-</span>;
    if (['precioFinal', 'precioOperacion'].includes(colId)) {
        return <span className="font-medium text-slate-900 dark:text-slate-200">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(val))}</span>;
    }
    if (colId === 'estado') {
        let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (val === 'DISPONIBLE') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
        if (val === 'APARTADO') colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
        if (val === 'VENDIDO') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
        if (val === 'ESCRITURADO' || val === 'ESCRITURADO-P') colorClass = 'bg-slate-800 text-white dark:bg-slate-700 dark:text-slate-200';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>{String(val)}</span>;
    }
    return String(val);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between shadow-sm transition-colors">
        <div className="relative flex items-center group flex-1 min-w-[300px] max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 dark:text-slate-500" /></div>
          <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all text-sm font-medium" placeholder="Buscar por comprador, ID, desarrollo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 relative" ref={configPanelRef}>
          <label className="flex items-center cursor-pointer px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mr-1">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={mostrarEscriturados} 
                onChange={() => setMostrarEscriturados(!mostrarEscriturados)} 
              />
              <div className={`block w-9 h-5 rounded-full transition-colors ${mostrarEscriturados ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
              <div className={`dot absolute top-1 bg-white w-3 h-3 rounded-full transition-transform ${mostrarEscriturados ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <div className="ml-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Escriturados
            </div>
          </label>

          {isAdmin && (
            <>
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
              <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all disabled:opacity-70"><Upload className="w-4 h-4" /> {isUploading ? 'Procesando...' : 'Importar Excel'}</button>
            </>
          )}

          {/* BOTÓN DE FILTROS RÁPIDOS */}
          <button onClick={() => { setShowFilterConfig(!showFilterConfig); setShowColumnConfig(false); }} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${activeFilterCount > 0 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Filter className="w-4 h-4" /> Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          
          <button onClick={() => { setShowColumnConfig(!showColumnConfig); setShowFilterConfig(false); }} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${showColumnConfig ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-white border-indigo-200 dark:border-slate-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`} title="Configurar Columnas"><Settings className="w-4 h-4" /> Columnas</button>

          {/* NUEVO PANEL DE FILTROS INTELIGENTES */}
          {showFilterConfig && (
            <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-5 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-500" /> Filtros Rápidos
                </p>
                <div className="flex gap-3">
                  <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 transition-colors">Limpiar Todos</button>
                  <button onClick={() => setShowFilterConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5"/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desarrollo</label>
                    <select className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={fDesarrollo} onChange={(e) => {setFDesarrollo(e.target.value); setFModelo(''); setFNivel('');}}>
                        <option value="">Todos</option>
                        {uniqueDesarrollos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modelo</label>
                    <select disabled={!fDesarrollo && uniqueModelos.length === 0} className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" value={fModelo} onChange={(e) => {setFModelo(e.target.value); setFNivel('');}}>
                        <option value="">Todos</option>
                        {uniqueModelos.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nivel</label>
                    <select className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={fNivel} onChange={(e) => setFNivel(e.target.value)}>
                        <option value="">Todos</option>
                        {uniqueNiveles.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                    <select className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                        <option value="">Todos</option>
                        {uniqueEstados.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DTU / Avalúo</label>
                    <select className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={fDtu} onChange={(e) => setFDtu(e.target.value)}>
                        <option value="">Todos</option>
                        {uniqueDtu.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
              </div>
            </div>
          )}

          {showColumnConfig && (
            <div className="absolute right-0 top-14 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700"><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Columnas Visibles</p><button onClick={() => setShowColumnConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-4 h-4"/></button></div>
              <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
                {columns.map((col, idx) => (
                    <div key={col.id} draggable onDragStart={() => (dragColumnItem.current = idx)} onDragEnter={(e) => { e.preventDefault(); const dragIndex = dragColumnItem.current; if (dragIndex === null || dragIndex === idx) return; const newList = [...columns]; const item = newList.splice(dragIndex, 1)[0]; newList.splice(idx, 0, item); dragColumnItem.current = idx; setColumns(newList); }} onDragOver={(e) => e.preventDefault()} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-grab active:cursor-grabbing transition-colors group">
                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400" /><input type="checkbox" checked={col.visible} onChange={() => setColumns(columns.map(c => c.id === col.id ? {...c, visible: !c.visible} : c))} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{filteredProperties.length} propiedades encontradas</span>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
              <tr>
                {isAdmin && (
                  <th className="p-4 w-12 border-b border-slate-200 dark:border-slate-700"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === filteredProperties.length && filteredProperties.length > 0} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"/></th>
                )}
                {columns.filter(c => c.visible).map(col => (
                  <th key={col.id} className="p-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap border-b border-slate-200 dark:border-slate-700">{col.label}</th>
                ))}
                {canEdit && (
                  <th className="p-4 text-center font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700 sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.3)]">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {paginatedProperties.length === 0 ? (
                  <tr><td colSpan={columns.filter(c => c.visible).length + (isAdmin ? 2 : 0)} className="p-12 text-center text-slate-500 dark:text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" /><p className="text-lg font-medium">No se encontraron resultados</p></td></tr>
              ) : (
                paginatedProperties.map(prop => (
                    <tr key={prop.idPropiedad} className={`transition-colors ${selectedIds.has(prop.idPropiedad) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                    {isAdmin && (
                      <td className="p-4"><input type="checkbox" checked={selectedIds.has(prop.idPropiedad)} onChange={(e) => { const next = new Set(selectedIds); e.target.checked ? next.add(prop.idPropiedad) : next.delete(prop.idPropiedad); setSelectedIds(next); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" /></td>
                    )}
                    {columns.filter(c => c.visible).map(col => (
                        <td key={col.id} className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatCell(prop[col.id as keyof Propiedad], col.id)}</td>
                    ))}
                    {canEdit && (
                      <td className="p-4 text-center space-x-1 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.02)] transition-colors">
                          <button onClick={() => handleOpenHistory(prop.idPropiedad)} className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Ver Historial"><Clock className="w-4 h-4" /></button>
                          <button onClick={() => onEdit(prop)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(prop.idPropiedad)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* PIE DE TABLA Y PAGINACIÓN */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Mostrando <span className="font-bold text-slate-900 dark:text-white">{filteredProperties.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> a <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredProperties.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{filteredProperties.length}</span></p>
            <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-600 pl-4"><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Ver:</span><select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md py-1 px-2 text-sm focus:ring-indigo-500 outline-none"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></div>
          </div>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-sm"><ChevronLeft className="w-4 h-4"/> Anterior</button>
            <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-sm">Siguiente <ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE BITÁCORA DE MOVIMIENTOS --- */}
      {historyModalId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="bg-slate-50 dark:bg-slate-900/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500"/> Historial de Movimientos</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">ID: {historyModalId}</p>
              </div>
              <button onClick={() => setHistoryModalId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center py-10 text-slate-500"><AlertCircle className="w-6 h-6 animate-pulse"/></div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400"><Clock className="w-10 h-10 mx-auto mb-3 opacity-20"/> <p className="text-sm font-medium">No hay registros para esta propiedad.</p></div>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-6 pb-4">
                  {historyData.map((log) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-amber-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-white dark:ring-slate-800"></div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{log.accion}</span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">{log.detalles}</span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                          <User className="w-3 h-3" /> {log.usuario} • {new Date(log.created_at).toLocaleString('es-MX')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- MODALES MASIVOS --- */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex flex-col"><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Acción Masiva</span><span className="text-sm font-bold">{selectedIds.size} registros seleccionados</span></div>
          <div className="h-8 w-px bg-slate-700 dark:bg-slate-200 mx-2"></div>
          <button onClick={() => setIsBulkEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-indigo-900/20"><Edit3 className="w-4 h-4"/> Editar Seleccionados</button>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
        </div>
      )}

      {isAdmin && isBulkEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Actualización Masiva</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Se modificarán {selectedIds.size} registros.</p></div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><Layers className="w-6 h-6" /></div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Campo a editar</label><select className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={bulkEditField} onChange={(e) => setBulkEditField(e.target.value)}>{BULK_EDITABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nuevo Valor</label><input className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Escribe el nuevo valor..." value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value.toUpperCase())}/></div>
              <div className="flex gap-3 justify-end pt-4"><button onClick={() => setIsBulkEditOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><button onClick={handleExecuteBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2"/> Aplicar Cambios</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};