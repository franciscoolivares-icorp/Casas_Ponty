import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Propiedad } from '../types';
import * as XLSX from 'xlsx';
import { 
  Edit2, Trash2, Search, Filter, X, Settings, Check, 
  ChevronLeft, ChevronRight, Edit3, GripVertical, AlertCircle, 
  Layers, Upload, Clock, User, Eye, Download, FileSpreadsheet, Plus,
  ArrowUp, ArrowDown
} from 'lucide-react';

interface PropertyListProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
  onEdit: (property: Propiedad) => void;
  onView: (property: Propiedad) => void; 
  onDelete: (id: string) => void;
  onBulkImport: (data: any[]) => void;
  onBulkUpdate: (ids: string[], field: keyof Propiedad, value: any) => void;
  isAdmin: boolean;
  currentUser?: any; 
}

interface ColumnConfig { id: string; label: string; visible: boolean; }

// --- COLUMNAS CON DÍAS DE REZAGO AÑADIDOS PARA FILTRADO ---
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
  { id: 'modeloAgrupador', label: 'Modelo Agrupador', visible: false },
  { id: 'estadoAgrupador', label: 'Estado Agrupador', visible: false },
  { id: 'numeroExterior', label: 'Num Ext', visible: false },
  { id: 'manzana', label: 'Manzana', visible: false },
  { id: 'lote', label: 'Lote', visible: false },
  { id: 'precioLista', label: 'Precio Lista', visible: false },
  { id: 'descuento', label: 'Descuento', visible: false },
  { id: 'm2TerrExc', label: 'M2 Terr. Exc.', visible: false },
  { id: 'precioXM2Exc', label: '$ x M2 Exc.', visible: false },
  { id: 'precioTerrExc', label: '$ Terr. Exc.', visible: false },
  { id: 'precioObrasAdicionales', label: '$ Obras Adic.', visible: false },
  { id: 'valorAvaluo', label: 'Valor Avalúo', visible: false },
  { id: 'metodoCompra', label: 'Método Compra', visible: false },
  { id: 'metodoCompraAgrupador', label: 'Método Agrupador', visible: false },
  { id: 'banco', label: 'Banco', visible: false },
  { id: 'asesorExterno', label: 'Asesor Ext.', visible: false },
  { id: 'ek', label: 'EK', visible: false },
  { id: 'diasAutorizadosApartado', label: 'Días Aut. Apartado', visible: false },
  { id: 'fechaApartado', label: 'Fecha Apartado', visible: false },
  { id: 'fechaVenta', label: 'Fecha Venta', visible: false },
  { id: 'fechaEscritura', label: 'Fecha Escritura', visible: false },
  { id: 'fechaDesde', label: 'Fecha Desde', visible: false },
  { id: 'titulacion', label: 'Titulación', visible: false },
  { id: 'retroAsesor', label: 'Retro Asesor', visible: false },
  { id: 'observaciones', label: 'Observaciones', visible: false },
  { id: 'nombreBrokerBanco', label: 'Nombre Broker', visible: false },
  { id: 'telefonoBrokerBanco', label: 'Tel. Broker', visible: false },
  { id: 'correoBrokerBanco', label: 'Correo Broker', visible: false },
  { id: 'diasRezago', label: 'Días de Rezago', visible: false },
  { id: 'diasDesdeRevisar', label: 'Días desde Revisar', visible: false }
];

const BULK_EDITABLE_FIELDS = [
    { key: 'precioLista', label: 'Precio de Lista', type: 'currency' },
    { key: 'descuento', label: 'Descuento (-)', type: 'currency' },
    { key: 'valorAvaluo', label: 'Valor Avalúo', type: 'currency' },
    { key: 'diasAutorizadosApartado', label: 'Días Aut. Apartado', type: 'number' },
    { key: 'titulacion', label: 'Titulación', type: 'text' },
    { key: 'fechaDesde', label: 'Fecha Desde', type: 'date' },
];

const STATUS_PRIORITY: Record<string, number> = { 'APARTADO': 1, 'DISPONIBLE': 2, 'VENDIDO': 3, 'ESCRITURADO': 4 };
const normalizeText = (text: string) => (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface FilterRule { id: string; field: string; operator: string; value: string; }

export const PropertyList: React.FC<PropertyListProps> = ({ 
  properties, catalogs, onEdit, onView, onDelete, onBulkImport, onBulkUpdate, isAdmin, currentUser 
}) => {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const dragColumnItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarEscriturados, setMostrarEscriturados] = useState(false); 
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [activeFilters, setActiveFilters] = useState<FilterRule[]>([]);
  const [newRuleField, setNewRuleField] = useState('desarrollo');
  const [newRuleOperator, setNewRuleOperator] = useState('equals');
  const [newRuleValue, setNewRuleValue] = useState('');

  // --- NUEVO: NOMBRES PARA LOS FILTROS ---
  const [filterSlot1Name, setFilterSlot1Name] = useState('Cargar 1');
  const [filterSlot2Name, setFilterSlot2Name] = useState('Cargar 2');

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>(BULK_EDITABLE_FIELDS[0].key);
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const [historyModalId, setHistoryModalId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const STORAGE_KEY_COLS = 'propertyMaster_columnConfig_v4';

  const esCoordinador = currentUser?.tipo_usuario === 'COORDINADOR';
  const desarrollosAsignados = currentUser?.desarrollos_asignados || [];
  const canEdit = isAdmin || esCoordinador;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) {
        setShowColumnConfig(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    loadFilterNames();
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length === DEFAULT_COLUMNS.length) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COLUMNS;
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(columns)); }, [columns]);

  const loadFilterNames = () => {
    const s1 = localStorage.getItem(`ponty_filter_set_v3_1`);
    if (s1) setFilterSlot1Name(JSON.parse(s1).name || 'Cargar 1');
    const s2 = localStorage.getItem(`ponty_filter_set_v3_2`);
    if (s2) setFilterSlot2Name(JSON.parse(s2).name || 'Cargar 2');
  };

  const downloadTemplate = () => {
    const templateData = [{
      idPropiedad: '', desarrollo: '', modelo: '', modeloAgrupador: '', nivel: '', estado: 'DISPONIBLE',
      estadoAgrupador: '', calle: '', numeroExterior: '', numeroInterior: '', manzana: '', lote: '',
      condomino: '', edificio: '', precioLista: 0, descuento: 0, precioFinal: 0, precioOperacion: 0,
      m2TerrExc: 0, precioXM2Exc: 0, precioTerrExc: 0, precioObrasAdicionales: 0, obrasAdicionales: '',
      dtuAvaluo: 'SIN DTU', valorAvaluo: 0, metodoCompra: '', metodoCompraAgrupador: '',
      banco: '', asesorExterno: false, asesor: '', nombreComprador: '', ek: '', tipoUsuario: '',
      diasAutorizadosApartado: 7, fechaApartado: '', fechaVenta: '', fechaEscritura: '', fechaDesde: '',
      retroAsesor: '', titulacion: '', nombreBrokerBanco: '', telefonoBrokerBanco: '', correoBrokerBanco: '', observaciones: ''
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Carga");
    XLSX.writeFile(wb, "Plantilla_Inventario_Ponty.xlsx");
  };

  const exportToExcel = () => {
    if (filteredProperties.length === 0) return alert('No hay datos para exportar.');
    const ws = XLSX.utils.json_to_sheet(filteredProperties);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_Exportado");
    XLSX.writeFile(wb, `Inventario_Ponty_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const parseExcelDate = (val: any) => {
          if (val === null || val === undefined) return null;
          const strVal = String(val).trim().replace(/^'/, '').trim(); 
          if (strVal === '') return null;
          if (!isNaN(Number(strVal))) {
            const date = new Date(Math.round((Number(strVal) - 25569) * 86400 * 1000));
            return date.toISOString();
          }
          const date = new Date(strVal);
          return isNaN(date.getTime()) ? null : date.toISOString();
        };

        const propertiesMap = new Map();

        jsonData.forEach((row: any) => {
            const currentId = row.idPropiedad ? String(row.idPropiedad).trim() : '';

            if (currentId) {
                const formattedRow = {
                  idPropiedad: currentId,
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
                  fechaApartado: parseExcelDate(row.fechaApartado),
                  fechaVenta: parseExcelDate(row.fechaVenta),
                  fechaEscritura: parseExcelDate(row.fechaEscritura),
                  fechaDesde: parseExcelDate(row.fechaDesde),
                  titulacion: row.titulacion || null,
                  retroAsesor: row.retroAsesor || null,
                  observaciones: row.observaciones || null,
                  nombreBrokerBanco: row.nombreBrokerBanco || null,
                  telefonoBrokerBanco: row.telefonoBrokerBanco || null,
                  correoBrokerBanco: row.correoBrokerBanco || null
                };
                propertiesMap.set(currentId, formattedRow);
            }
        });

        const finalDataToUpload = Array.from(propertiesMap.values());
        onBulkImport(finalDataToUpload);

      } catch (error) { 
        console.error("Error importando:", error);
        alert('Error al procesar Excel. Verifique que el formato sea correcto.'); 
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredProperties.map(p => p.idPropiedad)) : new Set());
  };

  const handleExecuteBulkUpdate = () => {
    onBulkUpdate(Array.from(selectedIds), bulkEditField as keyof Propiedad, bulkEditValue);
    setIsBulkEditOpen(false);
    setSelectedIds(new Set());
  };

  const handleOpenHistory = async (idPropiedad: string) => {
    setHistoryModalId(idPropiedad);
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.from('bitacora_movimientos').select('*').eq('idPropiedad', idPropiedad).order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryData(data || []);
    } catch (err: any) { alert("Error al cargar historial: " + err.message); } finally { setIsLoadingHistory(false); }
  };

  const getOptionsForField = (field: string) => {
    const options = new Set<string>();
    properties.forEach(p => {
        const val = String(p[field as keyof Propiedad] || '');
        if (val) options.add(val);
    });
    return Array.from(options).sort();
  };

  const handleAddRule = () => {
    if (newRuleOperator !== 'empty' && newRuleOperator !== 'not_empty' && !newRuleValue) return;
    
    const newRule: FilterRule = {
        id: Date.now().toString(),
        field: newRuleField,
        operator: newRuleOperator,
        value: newRuleValue
    };
    
    setActiveFilters([...activeFilters, newRule]);
    setNewRuleValue('');
    setCurrentPage(1);
  };

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
    setCurrentPage(1);
  };

  const clearFilters = () => { setActiveFilters([]); setSearchTerm(''); setCurrentPage(1); };

  // --- LÓGICA DE NOMBRES EN FILTROS ---
  const saveFilterSet = (slot: number) => {
    const defaultName = slot === 1 ? filterSlot1Name : filterSlot2Name;
    const name = prompt(`Ingrese un nombre para identificar este filtro:`, defaultName);
    if (!name) return; // Se canceló

    const filterData = { logic: filterLogic, filters: activeFilters, name: name };
    localStorage.setItem(`ponty_filter_set_v3_${slot}`, JSON.stringify(filterData));
    loadFilterNames();
    alert(`Filtros guardados como "${name}"`);
  };

  const loadFilterSet = (slot: number) => {
    const saved = localStorage.getItem(`ponty_filter_set_v3_${slot}`);
    if (saved) {
        const parsed = JSON.parse(saved);
        setFilterLogic(parsed.logic || 'AND');
        setActiveFilters(parsed.filters || []);
        setCurrentPage(1);
    } else {
        alert(`El slot ${slot} está vacío.`);
    }
  };

  const today = new Date();
  const getDiffDays = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr + 'T12:00:00');
      return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };

  const evaluateRule = (prop: any, rule: FilterRule) => {
    let propVal = prop[rule.field as keyof Propiedad];
    
    // CÁLCULO EN VIVO DE DÍAS PARA EL FILTRO
    if (rule.field === 'diasRezago') {
       const dApartado = getDiffDays(prop.fechaApartado);
       propVal = prop.fechaApartado ? (dApartado ?? 0) - (prop.diasAutorizadosApartado || 0) : null;
    } else if (rule.field === 'diasDesdeRevisar') {
       propVal = prop.fechaDesde ? (getDiffDays(prop.fechaDesde) || 0) + 1 : null;
    }

    const valStr = String(propVal ?? '').toLowerCase();
    const targetStr = String(rule.value).toLowerCase();
    const numVal = Number(propVal);
    const numTarget = Number(rule.value);

    switch (rule.operator) {
      case 'equals': return valStr === targetStr;
      case 'not_equals': return valStr !== targetStr;
      case 'contains': return valStr.includes(targetStr);
      case 'greater_than': return !isNaN(numVal) && !isNaN(numTarget) ? numVal > numTarget : valStr > targetStr;
      case 'less_than': return !isNaN(numVal) && !isNaN(numTarget) ? numVal < numTarget : valStr < targetStr;
      case 'empty': return propVal === null || propVal === undefined || valStr === '';
      case 'not_empty': return propVal !== null && propVal !== undefined && valStr !== '';
      default: return true;
    }
  };

  const requestSort = (key: string) => {
    setSortConfig((current) => {
      if (current && current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredProperties = useMemo(() => {
    const term = normalizeText(searchTerm);
    
    let result = properties.filter(prop => {
      if (esCoordinador && !desarrollosAsignados.includes(prop.desarrollo || '')) return false;
      const matchesSearch = term === '' || Object.values(prop).some(v => normalizeText(String(v)).includes(term));
      if (!matchesSearch) return false;
      const esEscriturado = prop.estado === 'ESCRITURADO' || prop.estado === 'ESCRITURADO-P';
      if (esEscriturado && !mostrarEscriturados) return false;

      if (activeFilters.length > 0) {
          const passed = filterLogic === 'AND'
            ? activeFilters.every(rule => evaluateRule(prop, rule))
            : activeFilters.some(rule => evaluateRule(prop, rule));
          if (!passed) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
        if (sortConfig) {
            let aVal = a[sortConfig.key as keyof Propiedad];
            let bVal = b[sortConfig.key as keyof Propiedad];
            
            if (sortConfig.key === 'diasRezago') {
               aVal = a.fechaApartado ? (getDiffDays(a.fechaApartado) ?? 0) - (a.diasAutorizadosApartado || 0) : -999;
               bVal = b.fechaApartado ? (getDiffDays(b.fechaApartado) ?? 0) - (b.diasAutorizadosApartado || 0) : -999;
            } else if (sortConfig.key === 'diasDesdeRevisar') {
               aVal = a.fechaDesde ? (getDiffDays(a.fechaDesde) || 0) + 1 : -999;
               bVal = b.fechaDesde ? (getDiffDays(b.fechaDesde) || 0) + 1 : -999;
            }
            
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined || aVal === '') return 1; 
            if (bVal === null || bVal === undefined || bVal === '') return -1;
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
               return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        return (STATUS_PRIORITY[a.estado || ''] || 99) - (STATUS_PRIORITY[b.estado || ''] || 99);
    });

  }, [properties, searchTerm, mostrarEscriturados, esCoordinador, desarrollosAsignados, activeFilters, filterLogic, sortConfig]); 

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = filteredProperties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCell = (val: any, colId: string) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-400 dark:text-slate-500">-</span>;
    if (['precioFinal', 'precioOperacion', 'precioLista', 'descuento', 'precioTerrExc', 'precioObrasAdicionales', 'valorAvaluo'].includes(colId)) {
        return <span className="font-medium text-slate-900 dark:text-slate-200">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(val))}</span>;
    }
    if (colId === 'asesorExterno') {
        return val ? 'SÍ' : 'NO';
    }
    if (colId === 'estado') {
        let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (val === 'DISPONIBLE') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
        if (val === 'APARTADO') colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
        if (val === 'VENDIDO') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
        if (val === 'ESCRITURADO' || val === 'ESCRITURADO-P') colorClass = 'bg-slate-800 text-white dark:bg-slate-700 dark:text-slate-200';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>{String(val)}</span>;
    }
    if (colId === 'dtuAvaluo') {
        let colorClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
        if (val === 'AVALUO CERRADO') colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
        if (val === 'CON DTU') colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
        return <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${colorClass}`}>{String(val)}</span>;
    }
    return String(val);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between shadow-sm transition-colors relative z-20">
        
        <div className="relative flex items-center group flex-1 min-w-[250px] max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 dark:text-slate-500" /></div>
          <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all text-sm font-medium" placeholder="Buscar..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
        </div>

        <div className="flex flex-wrap gap-2 items-center" ref={configPanelRef}>
          
          <label className="flex items-center cursor-pointer px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mr-2">
            <input type="checkbox" className="sr-only" checked={mostrarEscriturados} onChange={() => {setMostrarEscriturados(!mostrarEscriturados); setCurrentPage(1);}} />
            <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${mostrarEscriturados ? 'bg-indigo-500' : 'bg-slate-500 dark:bg-slate-600'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mostrarEscriturados ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="ml-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 select-none">
              Escriturados
            </span>
          </label>

          <button onClick={() => { setShowAdvancedFilters(!showAdvancedFilters); setShowColumnConfig(false); }} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold border transition-all ${activeFilters.length > 0 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Filter className="w-4 h-4" /> Filtros Avanzados {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>

          {isAdmin && <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1 hidden lg:block"></div>}
          
          {isAdmin && (
            <>
              <button onClick={downloadTemplate} className="px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" title="Descargar plantilla de Excel">
                <Download className="w-4 h-4" /> Plantilla
              </button>

              <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
              <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                <Upload className="w-4 h-4" /> {isUploading ? 'Procesando...' : 'Importar'}
              </button>

              <button onClick={exportToExcel} className="px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Exportar BD
              </button>
            </>
          )}

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1 hidden lg:block"></div>

          <div className="relative">
              <button onClick={() => { setShowColumnConfig(!showColumnConfig); setShowAdvancedFilters(false); }} className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${showColumnConfig ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-white border-indigo-200 dark:border-slate-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`} title="Configurar Columnas">
                  <Settings className="w-4 h-4" /> Columnas
              </button>
              
              {showColumnConfig && (
                <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700"><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Columnas Visibles</p><button onClick={() => setShowColumnConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-4 h-4"/></button></div>
                  <div className="max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {columns.map((col, idx) => (
                        <div key={col.id} draggable onDragStart={() => (dragColumnItem.current = idx)} onDragEnter={(e) => { e.preventDefault(); const dragIndex = dragColumnItem.current; if (dragIndex === null || dragIndex === idx) return; const newList = [...columns]; const item = newList.splice(dragIndex, 1)[0]; newList.splice(idx, 0, item); dragColumnItem.current = idx; setColumns(newList); }} onDragOver={(e) => e.preventDefault()} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-grab active:cursor-grabbing transition-colors group">
                          <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400" />
                          <input type="checkbox" checked={col.visible} onChange={() => setColumns(columns.map(c => c.id === col.id ? {...c, visible: !c.visible} : c))} className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {showAdvancedFilters && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md p-6 animate-in fade-in slide-in-from-top-4 relative z-10 transition-colors">
              <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-widest">
                      <Filter className="w-4 h-4 text-indigo-500"/> Filtros Avanzados
                  </p>
                  {activeFilters.length > 0 && (
                      <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 uppercase tracking-wider transition-colors">Limpiar Filtros</button>
                  )}
              </div>

              <div className="mb-4 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cumplir condiciones:</span>
                  <select className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg p-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none" value={filterLogic} onChange={e => setFilterLogic(e.target.value as 'AND'|'OR')}>
                      <option value="AND">Todas (AND)</option>
                      <option value="OR">Cualquiera (OR)</option>
                  </select>
              </div>

              <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-5 min-h-[80px] flex flex-wrap gap-2 items-center justify-center bg-slate-50 dark:bg-slate-900/50 mb-6 transition-colors">
                  {activeFilters.length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500 text-sm italic font-medium">No hay filtros activos</span>
                  ) : (
                      <div className="flex flex-wrap gap-2 w-full justify-start">
                          {activeFilters.map((f) => {
                              const opLabel = f.operator === 'equals' ? '=' : f.operator === 'not_equals' ? '!=' : f.operator === 'greater_than' ? '>' : f.operator === 'less_than' ? '<' : f.operator === 'contains' ? 'Contiene' : f.operator === 'empty' ? 'Vacío' : 'No Vacío';
                              return (
                                <span key={f.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm transition-colors">
                                    {f.field.toUpperCase()} <span className="text-[10px] text-indigo-500 dark:text-indigo-400">{opLabel}</span> <span className="font-black">{f.value}</span>
                                    <button onClick={() => removeFilter(f.id)} className="hover:text-red-500 ml-1 bg-white/50 dark:bg-black/20 rounded-full p-0.5"><X className="w-3 h-3"/></button>
                                </span>
                              )
                          })}
                      </div>
                  )}
              </div>

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  
                  <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center whitespace-nowrap uppercase tracking-wider">
                          <Plus className="w-4 h-4 mr-1"/> Regla:
                      </span>
                      <select className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200" value={newRuleField} onChange={e => setNewRuleField(e.target.value)}>
                          {DEFAULT_COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
                      </select>
                      
                      <select className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none" value={newRuleOperator} onChange={e => setNewRuleOperator(e.target.value)}>
                          <option value="equals">Igual a (=)</option>
                          <option value="not_equals">Diferente (!=)</option>
                          <option value="contains">Contiene (*)</option>
                          <option value="greater_than">Mayor que {'>'}</option>
                          <option value="less_than">Menor que {'<'}</option>
                          <option value="empty">Está vacío</option>
                          <option value="not_empty">No está vacío</option>
                      </select>

                      {newRuleOperator !== 'empty' && newRuleOperator !== 'not_empty' && (
                        <div className="relative">
                            <input 
                              type="text" 
                              list={`suggestions-${newRuleField}`} 
                              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg p-2.5 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 min-w-[200px]" 
                              placeholder="Escriba o seleccione..." 
                              value={newRuleValue} 
                              onChange={e => setNewRuleValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddRule()}
                            />
                            <datalist id={`suggestions-${newRuleField}`}>
                                {getOptionsForField(newRuleField).map(opt => <option key={opt} value={opt} />)}
                            </datalist>
                        </div>
                      )}

                      <button onClick={handleAddRule} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors">Agregar</button>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <button onClick={() => loadFilterSet(1)} className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-sm transition-colors">{filterSlot1Name}</button>
                      <button onClick={() => loadFilterSet(2)} className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-sm transition-colors">{filterSlot2Name}</button>
                      <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                      <button onClick={() => saveFilterSet(1)} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-colors">+ Guardar</button>
                      <button onClick={() => saveFilterSet(2)} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-colors">+ Guardar</button>
                  </div>
              </div>
          </div>
      )}

      {/* TABLA PRINCIPAL CON ORDENACIÓN */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden relative z-0 transition-colors">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{filteredProperties.length} propiedades encontradas</span>
        </div>

        <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
              <tr>
                {isAdmin && <th className="p-4 w-12 border-b border-slate-200 dark:border-slate-700"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === filteredProperties.length && filteredProperties.length > 0} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" /></th>}
                
                {columns.filter(c => c.visible).map(col => (
                    <th 
                        key={col.id} 
                        onClick={() => requestSort(col.id)}
                        className="p-4 font-black text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors select-none"
                    >
                        <div className="flex items-center gap-1">
                            {col.label}
                            {sortConfig?.key === col.id && (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-500"/> : <ArrowDown className="w-3 h-3 text-indigo-500"/>
                            )}
                        </div>
                    </th>
                ))}
                
                <th className="p-4 text-center font-black text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-700 sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.3)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {paginatedProperties.length === 0 ? (
                  <tr><td colSpan={columns.filter(c => c.visible).length + (isAdmin ? 2 : 1)} className="p-12 text-center text-slate-500 dark:text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" /><p className="text-lg font-medium">No se encontraron resultados</p></td></tr>
              ) : (
                paginatedProperties.map(prop => (
                  <tr key={prop.idPropiedad} className={`transition-colors ${selectedIds.has(prop.idPropiedad) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}>
                    {isAdmin && <td className="p-4"><input type="checkbox" checked={selectedIds.has(prop.idPropiedad)} onChange={(e) => { const next = new Set(selectedIds); e.target.checked ? next.add(prop.idPropiedad) : next.delete(prop.idPropiedad); setSelectedIds(next); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" /></td>}
                    {columns.filter(c => c.visible).map(col => <td key={col.id} className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300">{formatCell(
                      col.id === 'diasRezago' ? (prop.fechaApartado ? (getDiffDays(prop.fechaApartado) ?? 0) - (prop.diasAutorizadosApartado || 0) : null) :
                      col.id === 'diasDesdeRevisar' ? (prop.fechaDesde ? (getDiffDays(prop.fechaDesde) || 0) + 1 : null) :
                      prop[col.id as keyof Propiedad], col.id
                    )}</td>)}
                    <td className="p-4 text-center space-x-1 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/80 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.02)] transition-colors">
                      <button onClick={() => onView(prop)} className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenHistory(prop.idPropiedad)} className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-2 rounded-lg transition-colors"><Clock className="w-4 h-4" /></button>
                      {canEdit && (
                        <>
                          <button onClick={() => onEdit(prop)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(prop.idPropiedad)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredProperties.length} propiedades</p>
            <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><ChevronRight className="w-4 h-4"/></button>
            </div>
        </div>
      </div>

      {isAdmin && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Acción Masiva</span><span className="text-sm font-bold">{selectedIds.size} registros</span></div>
          <div className="h-8 w-px bg-slate-700 dark:bg-slate-200 mx-2"></div>
          <button onClick={() => setIsBulkEditOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 transition-transform active:scale-95 flex items-center gap-2"><Edit3 className="w-4 h-4"/> Editar Seleccionados</button>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
      )}

      {isAdmin && isBulkEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Edición Masiva</h2><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Actualizando {selectedIds.size} registros</p></div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><Layers className="w-6 h-6" /></div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Campo a actualizar</label>
                <select className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={bulkEditField} onChange={(e) => setBulkEditField(e.target.value)}>
                    {BULK_EDITABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nuevo Valor</label>
                  <input 
                    type={BULK_EDITABLE_FIELDS.find(f => f.key === bulkEditField)?.type === 'date' ? 'date' : 'text'}
                    className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase" 
                    placeholder="Valor (Deje vacío para borrar)..." 
                    value={bulkEditValue} 
                    onChange={(e) => setBulkEditValue(e.target.value.toUpperCase())}
                  />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                  <button onClick={() => setIsBulkEditOpen(false)} className="px-5 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                  <button onClick={handleExecuteBulkUpdate} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg active:scale-95 flex items-center transition-transform"><Check className="w-4 h-4 mr-2"/> Aplicar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyModalId && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden transition-colors">
            
            <div className="bg-slate-50 dark:bg-slate-900/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500"/> Historial de Movimientos</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">ID: {historyModalId}</p>
              </div>
              <button onClick={() => setHistoryModalId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"><X className="w-5 h-5"/></button>
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

    </div>
  );
};