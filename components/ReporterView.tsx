import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Propiedad } from '../types';
import { 
  Layout, BarChart3, PieChart, Table as TableIcon, 
  Plus, Trash2, Settings, X, Check, Edit3, 
  Hash, DollarSign, Calculator, Filter, AlertCircle, GripVertical
} from 'lucide-react';

interface ReporterViewProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
}

type WidgetType = 'kpi' | 'bar' | 'pie' | 'table';
type MetricType = 'count' | 'sum' | 'avg';
type OperatorType = 'equals' | 'neq' | 'gt' | 'lt' | 'contains';

interface FilterRule {
    id: string;
    field: keyof Propiedad;
    operator: OperatorType;
    value: string;
}

interface WidgetConfig {
  id: string;
  title: string;
  type: WidgetType;
  dimension: keyof Propiedad | 'idPropiedad' | ''; 
  metric: MetricType; 
  metricField: keyof Propiedad | ''; 
  width: 'full' | 'half' | 'third';
  filters: FilterRule[]; 
  tableColumns?: string[]; 
}

const STORAGE_KEY_REPORTS = 'propertyMaster_dashboard_widgets';

const COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
];

const AVAILABLE_FIELDS: { key: string; label: string; type: 'text' | 'number' | 'catalog' | 'boolean' | 'date' }[] = [
    { key: 'idPropiedad', label: 'ID Propiedad', type: 'text' },
    { key: 'desarrollo', label: 'Desarrollo', type: 'catalog' },
    { key: 'modelo', label: 'Modelo', type: 'catalog' },
    { key: 'nivel', label: 'Nivel', type: 'catalog' },
    { key: 'estado', label: 'Estado', type: 'catalog' },
    { key: 'asesor', label: 'Asesor', type: 'catalog' },
    { key: 'nombreComprador', label: 'Comprador', type: 'text' },
    { key: 'metodoCompra', label: 'Método Compra', type: 'catalog' },
    { key: 'precioFinal', label: 'Precio Final', type: 'number' },
    { key: 'precioLista', label: 'Precio Lista', type: 'number' },
    { key: 'diasRezagoApartado', label: 'Días Rezago', type: 'number' },
    { key: 'diasAutorizadosApartado', label: 'Días Aut. Apartado', type: 'number' },
    { key: 'dtuAvaluo', label: 'DTU Avalúo', type: 'catalog' },
    { key: 'dtu', label: 'DTU (Bool)', type: 'boolean' },
    { key: 'fechaApartado', label: 'Fecha Apartado', type: 'date' },
    { key: 'calle', label: 'Calle', type: 'text' },
    { key: 'manzana', label: 'Manzana', type: 'text' },
    { key: 'lote', label: 'Lote', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
];

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
      id: 'w-kpi-1',
      title: 'Apartados rezagados con Avalúo Cerrado',
      type: 'kpi',
      dimension: '',
      metric: 'count',
      metricField: '',
      width: 'third',
      filters: [
          { id: 'f1', field: 'estado', operator: 'equals', value: 'APARTADO' },
          { id: 'f2', field: 'dtuAvaluo', operator: 'equals', value: 'AVALÚO CERRADO' },
          { id: 'f3', field: 'diasRezagoApartado', operator: 'gt', value: '0' }
      ]
  },
  {
      id: 'w-kpi-2',
      title: 'Apartados rezagados con DTU',
      type: 'kpi',
      dimension: '',
      metric: 'count',
      metricField: '',
      width: 'third',
      filters: [
          { id: 'f1', field: 'estado', operator: 'equals', value: 'APARTADO' },
          { id: 'f2', field: 'dtuAvaluo', operator: 'equals', value: 'CON DTU' },
          { id: 'f3', field: 'diasRezagoApartado', operator: 'gt', value: '0' }
      ]
  },
  {
      id: 'w-kpi-3',
      title: 'Apartados con Avalúo Cerrado o DTU',
      type: 'kpi',
      dimension: '',
      metric: 'count',
      metricField: '',
      width: 'third',
      filters: [
          { id: 'f1', field: 'estado', operator: 'equals', value: 'APARTADO' },
          { id: 'f2', field: 'dtuAvaluo', operator: 'neq', value: 'SIN DTU' }
      ]
  },
  { 
      id: '1', 
      title: 'Rezago en Apartados con Avalúo Cerrado', 
      type: 'table', 
      dimension: '', 
      metric: 'count', 
      metricField: '', 
      width: 'full',
      tableColumns: ['desarrollo', 'modelo', 'asesor', 'nombreComprador', 'diasRezagoApartado'],
      filters: [
          { id: 'f1', field: 'estado', operator: 'equals', value: 'APARTADO' },
          { id: 'f2', field: 'dtuAvaluo', operator: 'equals', value: 'AVALÚO CERRADO' },
          { id: 'f3', field: 'diasRezagoApartado', operator: 'gt', value: '0' }
      ]
  },
  { 
      id: 'table-rezago-dtu', 
      title: 'Rezago en Apartados CON DTU', 
      type: 'table', 
      dimension: '', 
      metric: 'count', 
      metricField: '', 
      width: 'full',
      tableColumns: ['desarrollo', 'modelo', 'asesor', 'nombreComprador', 'diasRezagoApartado'],
      filters: [
          { id: 'f1', field: 'estado', operator: 'equals', value: 'APARTADO' },
          { id: 'f2', field: 'dtuAvaluo', operator: 'equals', value: 'CON DTU' },
          { id: 'f3', field: 'diasRezagoApartado', operator: 'gt', value: '0' }
      ]
  },
  { 
      id: '2', 
      title: 'Ventas Totales (Monto)', 
      type: 'kpi', 
      dimension: '', 
      metric: 'sum', 
      metricField: 'precioFinal', 
      width: 'third',
      filters: [
          { id: 'f1', field: 'estado', operator: 'contains', value: 'VENDIDO' }
      ]
  },
  { 
      id: '3', 
      title: 'Inventario por Desarrollo', 
      type: 'bar', 
      dimension: 'desarrollo', 
      metric: 'count', 
      metricField: '', 
      width: 'third',
      filters: [
           { id: 'f1', field: 'estado', operator: 'equals', value: 'DISPONIBLE' }
      ]
  },
];

export const ReporterView: React.FC<ReporterViewProps> = ({ properties, catalogs }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  
  // Drag refs
  const dragItem = useRef<number | null>(null);
  
  // Persistence Initialization
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load dashboard from storage", e);
      }
    }
    return DEFAULT_WIDGETS;
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(widgets));
  }, [widgets]);

  // --- ENGINE: DATA PROCESSING ---
  const getFilteredData = (widget: WidgetConfig) => {
       return properties.filter(prop => {
        if (widget.filters.length === 0) return true;
        
        return widget.filters.every(filter => {
            const propValue = prop[filter.field];
            const filterValue = filter.value;
            
            if (propValue === undefined || propValue === null) return false;

            const strProp = String(propValue).toUpperCase();
            const strFilter = String(filterValue).toUpperCase();
            const numProp = Number(propValue);
            const numFilter = Number(filterValue);

            switch (filter.operator) {
                case 'equals': return strProp === strFilter;
                case 'neq': return strProp !== strFilter;
                case 'contains': return strProp.includes(strFilter);
                case 'gt': return !isNaN(numProp) && !isNaN(numFilter) ? numProp > numFilter : false;
                case 'lt': return !isNaN(numProp) && !isNaN(numFilter) ? numProp < numFilter : false;
                default: return true;
            }
        });
    });
  }

  const processData = (widget: WidgetConfig) => {
    const validData = getFilteredData(widget);

    if (widget.type === 'table') {
        return validData;
    }

    if (widget.type === 'kpi') {
        const value = validData.reduce((acc, curr) => {
            if (widget.metric === 'count') return acc + 1;
            const fieldVal = Number(curr[widget.metricField as keyof Propiedad]) || 0;
            return acc + fieldVal;
        }, 0);
        
        const finalValue = widget.metric === 'avg' ? value / (validData.length || 1) : value;
        return [{ label: 'Total', value: finalValue }];
    }

    if (!widget.dimension) return [];

    const groups: { [key: string]: number[] } = {};
    validData.forEach(p => {
        const key = String(p[widget.dimension as keyof Propiedad] || 'Sin Asignar');
        if (!groups[key]) groups[key] = [];
        
        if (widget.metric === 'count') {
            groups[key].push(1);
        } else {
            const val = Number(p[widget.metricField as keyof Propiedad]) || 0;
            groups[key].push(val);
        }
    });

    const result = Object.entries(groups).map(([label, values]) => {
        const sum = values.reduce((a, b) => a + b, 0);
        let finalVal = sum;
        if (widget.metric === 'avg') finalVal = sum / values.length;
        return { label, value: finalVal };
    });

    return result.sort((a, b) => b.value - a.value);
  };

  const formatValue = (val: any, fieldName: string) => {
      if (typeof val === 'number') {
        const field = String(fieldName).toLowerCase();
        if (field.includes('precio') || field.includes('costo') || field.includes('monto') || field.includes('valor') || field.includes('avaluo')) {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
        }
        return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(val);
      }
      if (typeof val === 'boolean') {
          return val ? 'Sí' : 'No';
      }
      return val;
  };

  // --- ACTIONS ---
  const addWidget = () => {
      const newWidget: WidgetConfig = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Nuevo Gráfico',
          type: 'bar',
          dimension: 'desarrollo',
          metric: 'count',
          metricField: '',
          width: 'half',
          filters: []
      };
      setWidgets([...widgets, newWidget]);
      setSelectedWidgetId(newWidget.id);
  };

  const removeWidget = (id: string) => {
      setWidgets(widgets.filter(w => w.id !== id));
      if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
      setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const addFilter = (widgetId: string) => {
      const w = widgets.find(w => w.id === widgetId);
      if(!w) return;
      const newFilter: FilterRule = {
          id: Math.random().toString(36).substr(2, 9),
          field: 'estado',
          operator: 'equals',
          value: ''
      };
      updateWidget(widgetId, { filters: [...w.filters, newFilter] });
  };

  const updateFilter = (widgetId: string, filterId: string, updates: Partial<FilterRule>) => {
      const w = widgets.find(w => w.id === widgetId);
      if(!w) return;
      const newFilters = w.filters.map(f => f.id === filterId ? { ...f, ...updates } : f);
      updateWidget(widgetId, { filters: newFilters });
  };

  const removeFilter = (widgetId: string, filterId: string) => {
      const w = widgets.find(w => w.id === widgetId);
      if(!w) return;
      const newFilters = w.filters.filter(f => f.id !== filterId);
      updateWidget(widgetId, { filters: newFilters });
  };

  // Drag and Drop Handlers for Table Columns
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    const dragIndex = dragItem.current;
    if (dragIndex === null || dragIndex === position || !selectedWidgetId) return;

    const currentWidget = widgets.find(w => w.id === selectedWidgetId);
    if (!currentWidget || !currentWidget.tableColumns) return;

    const newCols = [...currentWidget.tableColumns];
    const draggedItem = newCols[dragIndex];
    newCols.splice(dragIndex, 1);
    newCols.splice(position, 0, draggedItem);
    
    dragItem.current = position;
    updateWidget(selectedWidgetId, { tableColumns: newCols });
  };

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

  // --- RENDERERS ---

  const renderKPI = (data: { label: string, value: number }[], config: WidgetConfig) => {
      const val = data[0]?.value || 0;
      return (
          <div className="flex flex-col items-center justify-center h-full pb-4">
              <span className="text-5xl font-bold text-indigo-600 tracking-tight">{formatValue(val, config.metricField as string || 'count')}</span>
              <span className="text-sm text-slate-400 mt-2 uppercase tracking-wider font-semibold">{config.metric === 'count' ? 'Registros Totales' : config.metricField}</span>
          </div>
      );
  };

  const renderBarChart = (data: { label: string, value: number }[], config: WidgetConfig) => {
      const max = Math.max(...data.map(d => d.value)) || 1;
      return (
          <div className="h-full flex flex-col justify-end gap-2 pb-2 overflow-x-auto">
              {data.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                      <div className="w-28 text-xs text-slate-500 truncate text-right flex-shrink-0 font-medium" title={d.label}>{d.label}</div>
                      <div className="flex-1 h-7 bg-slate-50 rounded-r overflow-hidden relative border border-slate-100">
                          <div 
                            className="h-full rounded-r transition-all duration-500 opacity-90 group-hover:opacity-100" 
                            style={{ 
                                width: `${(d.value / max) * 100}%`,
                                backgroundColor: COLORS[i % COLORS.length] 
                            }} 
                          />
                          <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-slate-700 drop-shadow-sm">
                              {formatValue(d.value, config.metricField as string)}
                          </span>
                      </div>
                  </div>
              ))}
              {data.length > 10 && <div className="text-xs text-center text-slate-400 pt-1 italic">...y {data.length - 10} más</div>}
          </div>
      );
  };

  const renderPieChart = (data: { label: string, value: number }[], config: WidgetConfig) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    if (total === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">Sin datos suficientes</div>;
    return (
        <div className="h-full flex items-center justify-center gap-6 overflow-hidden">
            <div 
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg flex-shrink-0"
                style={{
                    background: `conic-gradient(${data.map((d, i) => {
                        const prevSum = data.slice(0, i).reduce((a, b) => a + b.value, 0);
                        const start = (prevSum / total) * 100;
                        const end = start + (d.value / total) * 100;
                        return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
                    }).join(', ')})`
                }}
            />
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                {data.slice(0, 8).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                        <span className="text-slate-600 truncate max-w-[100px]" title={d.label}>{d.label}</span>
                        <span className="font-bold text-slate-800">{Math.round((d.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderTable = (data: Propiedad[], config: WidgetConfig) => {
      const columns = config.tableColumns && config.tableColumns.length > 0 
          ? config.tableColumns 
          : ['idPropiedad', 'desarrollo', 'modelo', 'precioFinal'];

      return (
          <div className="h-full overflow-auto custom-scrollbar border border-slate-100 rounded bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                      <tr>
                          {columns.map(colKey => {
                              const field = AVAILABLE_FIELDS.find(f => f.key === colKey);
                              return (
                                  <th key={colKey} className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                      {field?.label || colKey}
                                  </th>
                              );
                          })}
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                      {data.map((item, i) => (
                          <tr key={item.idPropiedad} className="hover:bg-slate-50 transition-colors">
                              {columns.map(colKey => (
                                  <td key={colKey} className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap border-r border-transparent last:border-0">
                                      {formatValue(item[colKey as keyof Propiedad], colKey)}
                                  </td>
                              ))}
                          </tr>
                      ))}
                      {data.length === 0 && (
                          <tr><td colSpan={columns.length} className="text-center py-8 text-xs text-slate-400">Sin datos</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-100 overflow-hidden">
      
      <div className="flex-1 overflow-y-auto p-6 transition-all duration-300">
        
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                    <Layout className="w-6 h-6 mr-2 text-indigo-600" />
                    Reporteador
                </h2>
                <p className="text-slate-500 text-sm">Crea tableros personalizados con filtros avanzados.</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if(isEditing) setSelectedWidgetId(null);
                    }}
                    className={`flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium transition-colors ${isEditing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
                >
                    {isEditing ? <Check className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                    {isEditing ? 'Terminar Edición' : 'Editar Tablero'}
                </button>
                {isEditing && (
                    <button 
                        onClick={addWidget}
                        className="flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Widget
                    </button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {widgets.map((widget) => {
                const data = processData(widget);
                const isSelected = selectedWidgetId === widget.id;
                
                let colSpan = 'col-span-1';
                if (widget.width === 'half') colSpan = 'col-span-1 md:col-span-1 lg:col-span-2';
                if (widget.width === 'full') colSpan = 'col-span-1 md:col-span-2 lg:col-span-3';

                return (
                    <div 
                        key={widget.id} 
                        onClick={() => isEditing && setSelectedWidgetId(widget.id)}
                        className={`
                            relative bg-white rounded-xl shadow-sm border transition-all duration-200 flex flex-col h-96
                            ${colSpan}
                            ${isEditing ? 'cursor-pointer hover:shadow-md hover:border-indigo-300' : ''}
                            ${isSelected && isEditing ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}
                        `}
                    >
                        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 rounded-t-xl">
                            <div className="flex flex-col overflow-hidden">
                                <h3 className="font-bold text-slate-700 truncate">{widget.title}</h3>
                                {widget.filters.length > 0 && (
                                    <div className="flex items-center text-[10px] text-indigo-600 gap-1 mt-0.5">
                                        <Filter className="w-3 h-3" />
                                        <span>{widget.filters.length} filtro(s) activo(s)</span>
                                    </div>
                                )}
                            </div>
                            {isEditing && (
                                <div className="flex gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 p-5 min-h-0">
                            {widget.type === 'kpi' && renderKPI(data as any, widget)}
                            {widget.type === 'bar' && renderBarChart(data as any, widget)}
                            {widget.type === 'pie' && renderPieChart(data as any, widget)}
                            {widget.type === 'table' && renderTable(data as any, widget)}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {isEditing && selectedWidget && (
          <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-20">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Configuración de Widget
                  </h3>
                  <button onClick={() => setSelectedWidgetId(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  
                  <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
                      <input 
                        type="text" 
                        value={selectedWidget.title}
                        onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      />
                  </div>

                  <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visualización</label>
                      <div className="grid grid-cols-2 gap-2">
                          {[
                              { id: 'kpi', label: 'KPI', icon: Hash },
                              { id: 'bar', label: 'Barras', icon: BarChart3 },
                              { id: 'pie', label: 'Pastel', icon: PieChart },
                              { id: 'table', label: 'Tabla', icon: TableIcon },
                          ].map(t => (
                              <button
                                key={t.id}
                                onClick={() => updateWidget(selectedWidget.id, { type: t.id as WidgetType })}
                                className={`flex items-center justify-center gap-2 p-2 rounded border text-sm transition-all ${selectedWidget.type === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                              >
                                  <t.icon className="w-4 h-4" />
                                  {t.label}
                              </button>
                          ))}
                      </div>
                  </div>

                  <hr className="border-slate-100" />

                   <div className="space-y-4">
                        <h4 className="font-bold text-sm text-slate-800">Datos</h4>
                        
                        {selectedWidget.type === 'table' ? (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columnas Visibles (Arrastrar para ordenar)</label>
                                
                                <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-200 max-h-60 overflow-y-auto">
                                    {(selectedWidget.tableColumns || []).map((colKey, index) => {
                                        const fieldLabel = AVAILABLE_FIELDS.find(f => f.key === colKey)?.label || colKey;
                                        return (
                                            <div 
                                                key={colKey}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded shadow-sm cursor-grab active:cursor-grabbing hover:bg-slate-50"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-700">{fieldLabel}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newCols = (selectedWidget.tableColumns || []).filter(c => c !== colKey);
                                                        updateWidget(selectedWidget.id, { tableColumns: newCols });
                                                    }}
                                                    className="text-slate-400 hover:text-red-500 bg-transparent hover:bg-red-50 p-1 rounded transition-colors"
                                                    title="Quitar columna"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                    {(selectedWidget.tableColumns || []).length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-2 italic">Sin columnas seleccionadas. Se mostrarán por defecto.</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Agregar Columna</label>
                                    <select 
                                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs p-1.5 border"
                                        onChange={(e) => {
                                            if(e.target.value) {
                                                const newCols = [...(selectedWidget.tableColumns || []), e.target.value];
                                                updateWidget(selectedWidget.id, { tableColumns: newCols });
                                                e.target.value = '';
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">Seleccione para agregar...</option>
                                        {AVAILABLE_FIELDS
                                            .filter(f => !(selectedWidget.tableColumns || []).includes(f.key))
                                            .sort((a,b) => a.label.localeCompare(b.label))
                                            .map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <>
                                {selectedWidget.type !== 'kpi' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dimensión (Agrupar por)</label>
                                        <select
                                            value={selectedWidget.dimension}
                                            onChange={(e) => updateWidget(selectedWidget.id, { dimension: e.target.value as any })}
                                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        >
                                            <option value="">Seleccione...</option>
                                            {AVAILABLE_FIELDS.filter(f => f.type === 'catalog' || f.key === 'idPropiedad').map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Métrica</label>
                                        <select
                                            value={selectedWidget.metric}
                                            onChange={(e) => updateWidget(selectedWidget.id, { metric: e.target.value as MetricType })}
                                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        >
                                            <option value="count">Conteo</option>
                                            <option value="sum">Suma</option>
                                            <option value="avg">Promedio</option>
                                        </select>
                                    </div>
                                    
                                    {selectedWidget.metric !== 'count' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campo Valor</label>
                                            <select
                                                value={selectedWidget.metricField}
                                                onChange={(e) => updateWidget(selectedWidget.id, { metricField: e.target.value as any })}
                                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                            >
                                                {AVAILABLE_FIELDS.filter(f => f.type === 'number').map(f => (
                                                    <option key={f.key} value={f.key}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                   </div>

                   <hr className="border-slate-100" />

                   <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm text-slate-800 flex items-center">
                                <Filter className="w-4 h-4 mr-2 text-indigo-500" />
                                Filtros (Lógica AND)
                            </h4>
                            <button onClick={() => addFilter(selectedWidget.id)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center">
                                <Plus className="w-3 h-3 mr-1" /> Agregar
                            </button>
                        </div>
                        
                        <div className="space-y-2 bg-slate-50 p-2 rounded-md border border-slate-200 min-h-[100px]">
                            {selectedWidget.filters.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4 italic">No hay filtros activos.</p>
                            )}
                            {selectedWidget.filters.map((filter, idx) => (
                                <div key={filter.id} className="bg-white p-2 rounded border border-slate-200 shadow-sm relative group">
                                    {idx > 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-200 text-[10px] px-2 rounded-full font-bold text-slate-600 z-10">Y</div>}
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-1/2 text-xs border-slate-300 rounded focus:ring-indigo-500"
                                                value={filter.field}
                                                onChange={(e) => updateFilter(selectedWidget.id, filter.id, { field: e.target.value as any, value: '' })}
                                            >
                                                {AVAILABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                            </select>
                                            <select 
                                                className="w-1/2 text-xs border-slate-300 rounded focus:ring-indigo-500"
                                                value={filter.operator}
                                                onChange={(e) => updateFilter(selectedWidget.id, filter.id, { operator: e.target.value as OperatorType })}
                                            >
                                                <option value="equals">Igual a</option>
                                                <option value="neq">Diferente de</option>
                                                <option value="contains">Contiene</option>
                                                <option value="gt">Mayor que</option>
                                                <option value="lt">Menor que</option>
                                            </select>
                                        </div>
                                        
                                        {(() => {
                                            const fieldType = AVAILABLE_FIELDS.find(f => f.key === filter.field)?.type;
                                            
                                            if (fieldType === 'catalog' && catalogs[filter.field as string]) {
                                                return (
                                                    <select
                                                        className="w-full text-xs border-slate-300 rounded focus:ring-indigo-500"
                                                        value={String(filter.value)}
                                                        onChange={(e) => updateFilter(selectedWidget.id, filter.id, { value: e.target.value })}
                                                    >
                                                        <option value="">Seleccione...</option>
                                                        {catalogs[filter.field as string].map(val => (
                                                            <option key={val} value={val}>{val}</option>
                                                        ))}
                                                    </select>
                                                )
                                            }
                                            
                                            if (fieldType === 'boolean') {
                                                return (
                                                    <select
                                                         className="w-full text-xs border-slate-300 rounded focus:ring-indigo-500"
                                                         value={String(filter.value)}
                                                         onChange={(e) => updateFilter(selectedWidget.id, filter.id, { value: e.target.value })}
                                                    >
                                                        <option value="">Seleccione...</option>
                                                        <option value="true">Verdadero</option>
                                                        <option value="false">Falso</option>
                                                    </select>
                                                )
                                            }

                                            return (
                                                <input 
                                                    type={fieldType === 'number' ? 'number' : 'text'}
                                                    className="w-full text-xs border-slate-300 rounded focus:ring-indigo-500 px-2 py-1"
                                                    placeholder="Valor..."
                                                    value={filter.value}
                                                    onChange={(e) => updateFilter(selectedWidget.id, filter.id, { value: e.target.value })}
                                                />
                                            )
                                        })()}
                                    </div>
                                    <button 
                                        onClick={() => removeFilter(selectedWidget.id, filter.id)}
                                        className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 hover:bg-red-200 shadow-sm"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                   </div>

                   <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ancho del Widget</label>
                        <div className="flex bg-slate-100 p-1 rounded">
                            <button onClick={() => updateWidget(selectedWidget.id, { width: 'third' })} className={`flex-1 py-1 text-xs rounded ${selectedWidget.width === 'third' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-500'}`}>1/3</button>
                            <button onClick={() => updateWidget(selectedWidget.id, { width: 'half' })} className={`flex-1 py-1 text-xs rounded ${selectedWidget.width === 'half' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-500'}`}>1/2</button>
                            <button onClick={() => updateWidget(selectedWidget.id, { width: 'full' })} className={`flex-1 py-1 text-xs rounded ${selectedWidget.width === 'full' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-500'}`}>Full</button>
                        </div>
                   </div>
              </div>
          </div>
      )}

    </div>
  );
};