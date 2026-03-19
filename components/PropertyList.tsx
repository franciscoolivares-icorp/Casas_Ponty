import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Propiedad } from '../types';
import { 
  Edit2, Trash2, Search, Filter, X, Settings, Check, 
  ChevronLeft, ChevronRight, Edit3, GripVertical, AlertCircle, Layers
} from 'lucide-react';

interface PropertyListProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
  onEdit: (property: Propiedad) => void;
  onDelete: (id: string) => void;
  onBulkImport: (data: any[]) => void;
  onBulkUpdate: (ids: string[], field: keyof Propiedad, value: any) => void;
  isAdmin: boolean; // <-- NUEVA PROPIEDAD
}

interface ColumnConfig { id: string; label: string; visible: boolean; }
interface FilterRule { id: string; field: string; operator: string; value: string; }

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

const ITEMS_PER_PAGE = 50;
const BULK_EDITABLE_FIELDS = [
    { key: 'precioLista', label: 'Precio de Lista', type: 'currency' },
    { key: 'dtu', label: 'DTU', type: 'boolean' },
    { key: 'diasAutorizadosApartado', label: 'Días Aut. Apartado', type: 'number' },
];

const STATUS_PRIORITY: Record<string, number> = { 'APARTADO': 1, 'DISPONIBLE': 2, 'VENDIDO': 3, 'ESCRITURADO': 4 };
const normalizeText = (text: string) => (text || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const PropertyList: React.FC<PropertyListProps> = ({ 
  properties, catalogs, onEdit, onDelete, onBulkImport, onBulkUpdate, isAdmin 
}) => {
  const configPanelRef = useRef<HTMLDivElement>(null);
  const dragColumnItem = useRef<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showFilterConfig, setShowFilterConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<FilterRule[]>([]);
  
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>(BULK_EDITABLE_FIELDS[0].key);
  const [bulkEditValue, setBulkEditValue] = useState<string>('');

  const STORAGE_KEY_COLS = 'propertyMaster_columnConfig_v2';

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

  const filteredProperties = useMemo(() => {
    const term = normalizeText(searchTerm);
    return properties.filter(prop => {
      const matchesSearch = term === '' || Object.values(prop).some(v => normalizeText(String(v)).includes(term));
      if (!matchesSearch) return false;
      return activeFilters.every(rule => {
        const val = normalizeText(String(prop[rule.field as keyof Propiedad] || ""));
        const target = normalizeText(rule.value);
        if (!rule.value) return true;
        switch (rule.operator) {
          case 'equals': return val === target;
          case 'contains': return val.includes(target);
          case 'neq': return val !== target;
          default: return true;
        }
      });
    }).sort((a, b) => (STATUS_PRIORITY[a.estado] || 99) - (STATUS_PRIORITY[b.estado] || 99));
  }, [properties, searchTerm, activeFilters]);

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = filteredProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredProperties.map(p => p.idPropiedad)) : new Set());
  };

  const handleExecuteBulkUpdate = () => {
    onBulkUpdate(Array.from(selectedIds), bulkEditField as keyof Propiedad, bulkEditValue);
    setIsBulkEditOpen(false);
    setSelectedIds(new Set());
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
        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>{String(val)}</span>;
    }
    return String(val);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Buscador y Controles */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between shadow-sm transition-colors">
        <div className="relative flex-1 min-w-[300px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white transition-all text-sm font-medium" 
            placeholder="Buscar por comprador, ID, desarrollo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 relative" ref={configPanelRef}>
          <button 
            onClick={() => { setShowFilterConfig(!showFilterConfig); setShowColumnConfig(false); }}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${activeFilters.length > 0 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <Filter className="w-4 h-4" /> Filtros {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          
          <button 
            onClick={() => { setShowColumnConfig(!showColumnConfig); setShowFilterConfig(false); }} 
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${showColumnConfig ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-white border-indigo-200 dark:border-slate-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            title="Configurar Columnas"
          >
            <Settings className="w-4 h-4" /> Columnas
          </button>

          {showColumnConfig && (
            <div className="absolute right-0 top-14 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Columnas Visibles</p>
                  <button onClick={() => setShowColumnConfig(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-4 h-4"/></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
                {columns.map((col, idx) => (
                    <div 
                    key={col.id} draggable onDragStart={() => (dragColumnItem.current = idx)}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        const dragIndex = dragColumnItem.current;
                        if (dragIndex === null || dragIndex === idx) return;
                        const newList = [...columns];
                        const item = newList.splice(dragIndex, 1)[0];
                        newList.splice(idx, 0, item);
                        dragColumnItem.current = idx;
                        setColumns(newList);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-grab active:cursor-grabbing transition-colors group"
                    >
                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400" />
                    <input type="checkbox" checked={col.visible} onChange={() => setColumns(columns.map(c => c.id === col.id ? {...c, visible: !c.visible} : c))} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{filteredProperties.length} propiedades encontradas</span>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
              <tr>
                {/* Checkbox general (SOLO ADMIN) */}
                {isAdmin && (
                  <th className="p-4 w-12 border-b border-slate-200 dark:border-slate-700">
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === filteredProperties.length && filteredProperties.length > 0} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"/>
                  </th>
                )}
                {columns.filter(c => c.visible).map(col => (
                  <th key={col.id} className="p-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                      {col.label}
                  </th>
                ))}
                {/* Columna Acciones (SOLO ADMIN) */}
                {isAdmin && (
                  <th className="p-4 text-center font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700 sticky right-0 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.05)] dark:shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.3)]">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {paginatedProperties.length === 0 ? (
                  <tr>
                      <td colSpan={columns.filter(c => c.visible).length + (isAdmin ? 2 : 0)} className="p-12 text-center text-slate-500 dark:text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-medium">No se encontraron resultados</p>
                      </td>
                  </tr>
              ) : (
                paginatedProperties.map(prop => (
                    <tr key={prop.idPropiedad} className={`transition-colors ${selectedIds.has(prop.idPropiedad) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                    
                    {/* Checkbox por fila (SOLO ADMIN) */}
                    {isAdmin && (
                      <td className="p-4">
                          <input type="checkbox" checked={selectedIds.has(prop.idPropiedad)} onChange={(e) => { const next = new Set(selectedIds); e.target.checked ? next.add(prop.idPropiedad) : next.delete(prop.idPropiedad); setSelectedIds(next); }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800" />
                      </td>
                    )}
                    
                    {columns.filter(c => c.visible).map(col => (
                        <td key={col.id} className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatCell(prop[col.id as keyof Propiedad], col.id)}
                        </td>
                    ))}

                    {/* Botones de acción (SOLO ADMIN) */}
                    {isAdmin && (
                      <td className="p-4 text-center space-x-1 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 shadow-[-4px_0_6px_-1px_rgb(0,0,0,0.02)] transition-colors">
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

        {/* Paginación */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Mostrando <span className="font-bold text-slate-900 dark:text-white">{filteredProperties.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0}</span> a <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProperties.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{filteredProperties.length}</span> registros
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-sm">
                <ChevronLeft className="w-4 h-4"/> Anterior
            </button>
            <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-sm">
                Siguiente <ChevronRight className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      {/* Barra Flotante Edición Masiva (SOLO ADMIN) */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex flex-col">
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Acción Masiva</span>
              <span className="text-sm font-bold">{selectedIds.size} registros seleccionados</span>
          </div>
          <div className="h-8 w-px bg-slate-700 dark:bg-slate-200 mx-2"></div>
          <button onClick={() => setIsBulkEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-indigo-900/20">
            <Edit3 className="w-4 h-4"/> Editar Seleccionados
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg transition-colors" title="Cancelar selección">
              <X className="w-5 h-5"/>
          </button>
        </div>
      )}

      {/* Modal Edición Masiva */}
      {isAdmin && isBulkEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Actualización Masiva</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Se modificarán {selectedIds.size} registros al mismo tiempo.</p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-6 h-6" />
                </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Campo a editar</label>
                  <select className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={bulkEditField} onChange={(e) => setBulkEditField(e.target.value)}>
                    {BULK_EDITABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
              </div>
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Nuevo Valor</label>
                  <input className="w-full border border-slate-300 dark:border-slate-600 p-3 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Escribe el nuevo valor..." value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value.toUpperCase())}/>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start mt-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">Esta acción sobrescribirá el valor actual en los {selectedIds.size} registros. No se puede deshacer.</p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setIsBulkEditOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleExecuteBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"><Check className="w-4 h-4 mr-2"/> Aplicar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};