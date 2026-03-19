import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Tag, AlertCircle, Layers, X, Edit3, Check, GripVertical, Loader2 } from 'lucide-react';

interface CatalogManagerProps {
  // Ahora solo necesitamos notificar al padre que algo cambió para que recargue globalmente
  onCatalogChanged: () => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({ onCatalogChanged }) => {
  const catalogOptions = [
    { key: 'desarrollo', label: 'Desarrollos' },
    { key: 'nivel', label: 'Niveles' },
    { key: 'modelo', label: 'Modelos' },
    { key: 'modeloAgrupador', label: 'Modelos Agrupadores' },
    { key: 'estado', label: 'Estados' },
    { key: 'estadoAgrupador', label: 'Estados Agrupadores' },
    { key: 'banco', label: 'Bancos' },
    { key: 'metodoCompra', label: 'Métodos de Compra' },
    { key: 'metodoCompraAgrupador', label: 'Mét. Compra Agrupadores' },
    { key: 'tipoUsuario', label: 'Tipos de Usuario' }
  ];

  const [selectedKey, setSelectedKey] = useState<string>(catalogOptions[0].key);
  const [newItemValue, setNewItemValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de los datos desde Supabase
  const [currentItems, setCurrentItems] = useState<{id: string, valor: string, orden: number}[]>([]);
  const [assignments, setAssignments] = useState<{padre: string, hijo: string}[]>([]);
  const [childItems, setChildItems] = useState<{id: string, valor: string}[]>([]);

  // Estados de edición
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE SUPABASE ---

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Cargar el catálogo seleccionado
      const { data: catalogData, error: catError } = await supabase
        .from('catalogos_maestro')
        .select('id, valor, orden')
        .eq('tipo_catalogo', selectedKey)
        .order('orden', { ascending: true });
      
      if (catError) throw catError;
      setCurrentItems(catalogData || []);

      // 2. Si es agrupador, cargar asignaciones y los hijos posibles
      if (isGroupingCatalog()) {
        const tipoRelacion = getRelacionName();
        const childKey = getChildCatalogKey();

        const [assignRes, childRes] = await Promise.all([
          supabase.from('asignaciones_catalogos').select('*').eq('tipo_relacion', tipoRelacion),
          supabase.from('catalogos_maestro').select('id, valor').eq('tipo_catalogo', childKey)
        ]);

        if (assignRes.error) throw assignRes.error;
        if (childRes.error) throw childRes.error;

        setAssignments(assignRes.data || []);
        setChildItems(childRes.data || []);
      }
    } catch (err: any) {
      setError("Error al cargar datos: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedKey]);

  useEffect(() => {
      if (editingItem && editInputRef.current) editInputRef.current.focus();
  }, [editingItem]);

  // --- HELPERS DE AGRUPACIÓN ---
  const isGroupingCatalog = () => ['modeloAgrupador', 'estadoAgrupador', 'metodoCompraAgrupador'].includes(selectedKey);
  
  const getRelacionName = () => {
      if (selectedKey === 'modeloAgrupador') return 'modelo_a_agrupador';
      if (selectedKey === 'estadoAgrupador') return 'estado_a_agrupador';
      if (selectedKey === 'metodoCompraAgrupador') return 'metodo_a_agrupador';
      return '';
  };

  const getChildCatalogKey = () => {
      if (selectedKey === 'modeloAgrupador') return 'modelo';
      if (selectedKey === 'estadoAgrupador') return 'estado';
      if (selectedKey === 'metodoCompraAgrupador') return 'metodoCompra';
      return '';
  };

  const handleSelectCatalog = (key: string) => {
      setSelectedKey(key);
      setError(null); setNewItemValue(''); setEditingItem(null); setDeletingItem(null);
  };

  // --- ACCIONES PRINCIPALES (SUPABASE) ---

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValue.trim()) { setError("El valor no puede estar vacío"); return; }
    const normalizedValue = newItemValue.trim().toUpperCase();
    
    if (currentItems.some(i => i.valor === normalizedValue)) {
        setError("Este valor ya existe en el catálogo"); return;
    }

    setIsLoading(true);
    const newOrder = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.orden)) + 1 : 1;
    
    const { error: insertError } = await supabase
      .from('catalogos_maestro')
      .insert([{ tipo_catalogo: selectedKey, valor: normalizedValue, orden: newOrder }]);

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
    } else {
      setNewItemValue('');
      fetchData();
      onCatalogChanged();
    }
  };

  const handleSaveEdit = async () => {
      if (!editingItem) return;
      const normalizedNewValue = editValue.trim().toUpperCase();
      const itemToEdit = currentItems.find(i => i.id === editingItem);
      
      if (!normalizedNewValue || !itemToEdit) return;
      if (normalizedNewValue !== itemToEdit.valor && currentItems.some(i => i.valor === normalizedNewValue)) {
          setError("Este valor ya existe."); return;
      }

      setIsLoading(true);
      
      // 1. Actualizar el valor en la tabla maestra
      const { error: updateError } = await supabase
        .from('catalogos_maestro')
        .update({ valor: normalizedNewValue })
        .eq('id', editingItem);

      if (updateError) { setError(updateError.message); setIsLoading(false); return; }

      // 2. Si es agrupador, actualizar el nombre del padre en las asignaciones
      if (isGroupingCatalog()) {
         await supabase.from('asignaciones_catalogos')
          .update({ padre: normalizedNewValue })
          .eq('padre', itemToEdit.valor)
          .eq('tipo_relacion', getRelacionName());
      }

      cancelEditing();
      fetchData();
      onCatalogChanged();
  };

  const confirmDelete = async () => {
      if (!deletingItem) return;
      setIsLoading(true);
      
      const itemToDelete = currentItems.find(i => i.id === deletingItem);

      // Borrar de la tabla maestra
      const { error } = await supabase.from('catalogos_maestro').delete().eq('id', deletingItem);
      
      if (error) {
        setError(error.message);
      } else {
        // Si era agrupador, borrar sus asignaciones
        if (isGroupingCatalog() && itemToDelete) {
           await supabase.from('asignaciones_catalogos').delete().eq('padre', itemToDelete.valor).eq('tipo_relacion', getRelacionName());
        }
        setDeletingItem(null);
        fetchData();
        onCatalogChanged();
      }
      setIsLoading(false);
  };

  const handleAssignItem = async (groupName: string, itemToAssign: string) => {
      if (!itemToAssign) return;
      setIsLoading(true);
      const { error } = await supabase
        .from('asignaciones_catalogos')
        .insert([{ tipo_relacion: getRelacionName(), padre: groupName, hijo: itemToAssign }]);
      
      if (error) setError(error.message);
      fetchData();
      onCatalogChanged();
  };

  const handleUnassignItem = async (groupName: string, itemToUnassign: string) => {
      setIsLoading(true);
      const { error } = await supabase
        .from('asignaciones_catalogos')
        .delete()
        .eq('tipo_relacion', getRelacionName())
        .eq('padre', groupName)
        .eq('hijo', itemToUnassign);
      
      if (error) setError(error.message);
      fetchData();
      onCatalogChanged();
  };

  // --- Helpers Locales ---
  const startEditing = (id: string, val: string) => { setDeletingItem(null); setEditingItem(id); setEditValue(val); setError(null); };
  const cancelEditing = () => { setEditingItem(null); setEditValue(''); setError(null); };
  const requestDelete = (id: string) => { setEditingItem(null); setDeletingItem(id); };
  const cancelDelete = () => setDeletingItem(null);

  const getAvailableItems = (): string[] => {
      const assigned = assignments.map(a => a.hijo);
      return childItems.map(c => c.valor).filter(v => !assigned.includes(v));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Tag className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Gestión Maestra de Catálogos
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Administra los valores que aparecen en los selectores del formulario. Sincronizado en tiempo real.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
            {/* SIDEBAR */}
            <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3 pl-2">
                    Catálogos
                </label>
                <div className="space-y-1">
                    {catalogOptions.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => handleSelectCatalog(opt.key)}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                selectedKey === opt.key 
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <span>{opt.label}</span>
                                {['modeloAgrupador', 'estadoAgrupador', 'metodoCompraAgrupador'].includes(opt.key) && 
                                  <Layers className="w-4 h-4 text-indigo-400 dark:text-indigo-500" />
                                }
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN AREA */}
            <div className="col-span-1 md:col-span-3 p-6 relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}

                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                        Editando: <span className="text-indigo-600 dark:text-indigo-400 ml-2">{catalogOptions.find(o => o.key === selectedKey)?.label}</span>
                    </h3>
                    
                    <form onSubmit={handleAddItem} className="flex gap-3 items-start">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={newItemValue}
                                onChange={(e) => { setNewItemValue(e.target.value); setError(null); }}
                                className="block w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 transition-colors outline-none"
                                placeholder={`Agregar nuevo elemento...`}
                            />
                            {error && (
                                <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" /> {error}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Agregar
                        </button>
                    </form>
                </div>

                {/* LISTA DE ELEMENTOS */}
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                        {currentItems.length === 0 ? (
                            <li className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                                Catálogo vacío. Agrega el primer elemento arriba.
                            </li>
                        ) : (
                            currentItems.map((item) => (
                                <li key={item.id} className="px-5 py-4 flex flex-col gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                                    
                                    {deletingItem === item.id ? (
                                        <div className="flex items-center justify-between w-full py-2 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 border border-red-100 dark:border-red-900/50">
                                            <div className="flex items-center text-red-700 dark:text-red-400">
                                                <AlertCircle className="w-5 h-5 mr-2" />
                                                <span className="text-sm font-bold">¿Borrar "{item.valor}" permanentemente?</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={confirmDelete} className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm transition-colors">Confirmar</button>
                                                <button onClick={cancelDelete} className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                                            </div>
                                        </div>
                                    ) : editingItem === item.id ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input 
                                                ref={editInputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') cancelEditing(); }}
                                                className="block w-full rounded-md border-indigo-500 ring-2 ring-indigo-500/20 dark:bg-slate-700 dark:text-white sm:text-sm p-2 font-bold text-slate-900 outline-none"
                                            />
                                            <button onClick={handleSaveEdit} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 transition-colors"><Check className="w-5 h-5" /></button>
                                            <button onClick={cancelEditing} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">{item.valor}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditing(item.id, item.valor)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"><Edit3 className="w-4 h-4" /></button>
                                                <button onClick={() => requestDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECCIÓN DE AGRUPACIÓN (Solo visible si es catálogo agrupador) */}
                                    {isGroupingCatalog() && editingItem !== item.id && deletingItem !== item.id && (
                                        <div className="mt-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800/50">
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {assignments.filter(a => a.padre === item.valor).length === 0 ? (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 italic font-medium">Sin elementos asignados</span>
                                                ) : (
                                                    assignments.filter(a => a.padre === item.valor).map(a => (
                                                        <span key={a.hijo} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                                            {a.hijo}
                                                            <button onClick={() => handleUnassignItem(item.valor, a.hijo)} className="ml-2 text-indigo-400 hover:text-indigo-900 dark:hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Asignar hijo:</span>
                                                <select
                                                    className="block w-full max-w-xs rounded-lg border-slate-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 sm:text-xs py-1.5 px-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                                    onChange={(e) => { if (e.target.value) { handleAssignItem(item.valor, e.target.value); e.target.value = ""; } }}
                                                >
                                                    <option value="">Seleccione elemento...</option>
                                                    {getAvailableItems().map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-400 dark:text-slate-500 flex justify-between uppercase tracking-wider">
                    <span>Total: {currentItems.length} registros</span>
                    {isGroupingCatalog() && <span>Hijos libres: {getAvailableItems().length}</span>}
                </p>
            </div>
        </div>
    </div>
  );
};