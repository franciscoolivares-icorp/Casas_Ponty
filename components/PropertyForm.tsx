import React, { useState, useEffect, useRef } from 'react';
import { Propiedad, DTUAvaluo } from '../types';
import { Save, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft, Calculator, Edit2, X, Check, Clock } from 'lucide-react';

interface PropertyFormProps {
  initialData?: Partial<Propiedad>;
  catalogs: { [key: string]: string[] };
  modelAssignments?: { [group: string]: string[] };
  statusAssignments?: { [group: string]: string[] };
  metodoCompraAssignments?: { [group: string]: string[] };
  onSubmit: (data: Partial<Propiedad>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

// --- SMART FIELD COMPONENT FOR INLINE EDITING ---
interface SmartFieldProps {
    label: string;
    name: keyof Propiedad;
    value: any;
    type?: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'currency';
    options?: string[];
    isEditingMode: boolean;
    readOnly?: boolean;
    onChange: (name: string, val: any) => void; 
    onSave?: (name: string, val: any) => void; 
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    placeholder?: string;
    helperText?: string;
    transformDisplay?: (val: any) => string | React.ReactNode; 
}

const SmartField: React.FC<SmartFieldProps> = ({
    label, name, value, type = 'text', options = [], isEditingMode, readOnly, 
    onChange, onSave, prefix, suffix, placeholder, helperText, transformDisplay
}) => {
    const [isActive, setIsActive] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isActive]);

    const handleCancel = () => {
        setTempValue(value);
        setIsActive(false);
    };

    const handleConfirm = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (onSave) {
            onSave(name as string, tempValue);
        }
        setIsActive(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        let processed = type === 'number' || type === 'currency' ? (val === '' ? 0 : Number(val)) : val;
        
        if ((type === 'text' || type === undefined) && typeof processed === 'string') {
            processed = processed.toUpperCase();
        }

        if (isEditingMode) {
            setTempValue(processed);
        } else {
            onChange(name as string, processed);
        }
    };

    // 1. Create Mode or ReadOnly
    if (!isEditingMode) {
        return (
            <div className={type === 'checkbox' ? 'flex items-center mt-6' : ''}>
                {type !== 'checkbox' && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                )}
                
                {type === 'checkbox' ? (
                     <>
                        <input 
                            type="checkbox" 
                            checked={!!value} 
                            disabled={readOnly}
                            onChange={(e) => onChange(name as string, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded disabled:bg-slate-100 dark:disabled:bg-slate-800 transition-colors" 
                        />
                        <label className="ml-2 block text-sm text-slate-900 dark:text-slate-200">{label}</label>
                     </>
                ) : type === 'select' ? (
                    <select 
                        value={value || ''} 
                        onChange={handleChange}
                        disabled={readOnly}
                        className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                    >
                        <option value="">Seleccione...</option>
                        {options.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                ) : (
                    <div className="relative rounded-md shadow-sm">
                        {prefix && (
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                {prefix}
                            </div>
                        )}
                        <input
                            type={type === 'currency' ? 'number' : type}
                            value={value === undefined || value === null ? '' : value}
                            onChange={handleChange}
                            readOnly={readOnly}
                            placeholder={placeholder}
                            className={`block w-full rounded-md border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-12' : ''} ${readOnly ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400' : ''}`}
                        />
                        {suffix && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                {suffix}
                            </div>
                        )}
                    </div>
                )}
                {helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
            </div>
        );
    }

    // 2. Edit Mode
    let displayValue: React.ReactNode = value;
    if (transformDisplay) {
        displayValue = transformDisplay(value);
    } else if (type === 'currency') {
        displayValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value || 0);
    } else if (type === 'checkbox') {
        displayValue = value ? 'Sí' : 'No';
    } else if (type === 'date' && value) {
        const parts = String(value).split('-');
        if (parts.length === 3) {
             const [year, month, day] = parts;
             displayValue = `${day}-${month}-${year}`;
        }
    } else if (!value && value !== 0) {
        displayValue = '-';
    }

    if (isActive && !readOnly) {
        return (
            <div className={`relative ${type === 'checkbox' ? 'mt-6' : ''}`}>
                 {type !== 'checkbox' && (
                    <label className="block text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-1">{label}</label>
                )}
                <div className="flex items-center gap-1 animate-in zoom-in-95 duration-100">
                     {type === 'select' ? (
                        <select 
                            ref={inputRef as any}
                            value={tempValue || ''} 
                            onChange={handleChange}
                            className="block w-full rounded-md border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            <option value="">Seleccione...</option>
                            {options.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                     ) : type === 'checkbox' ? (
                        <div className="flex items-center h-9">
                             <input 
                                ref={inputRef as any}
                                type="checkbox" 
                                checked={!!tempValue} 
                                onChange={(e) => setTempValue(e.target.checked)}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded" 
                            />
                            <label className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-200">{label}</label>
                        </div>
                     ) : (
                        <div className="relative w-full">
                            {prefix && <span className="absolute left-2 top-2 text-slate-400 text-sm">{prefix}</span>}
                            <input
                                ref={inputRef as any}
                                type={type === 'currency' ? 'number' : type}
                                value={tempValue === undefined ? '' : tempValue}
                                onChange={handleChange}
                                className={`block w-full rounded-md border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${prefix ? 'pl-6' : ''}`}
                            />
                        </div>
                     )}
                     
                     <button 
                        type="button"
                        onClick={() => handleConfirm()}
                        className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                        title="Guardar cambios"
                     >
                        <Check className="w-4 h-4" />
                     </button>
                     <button 
                        type="button"
                        onClick={handleCancel}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Cancelar"
                     >
                        <X className="w-4 h-4" />
                     </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`group relative p-2 -mx-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 ${type === 'checkbox' ? 'mt-6' : ''}`}
            onClick={() => !readOnly && setIsActive(true)}
        >
             {type !== 'checkbox' && (
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</label>
            )}
            
            <div className="flex justify-between items-center">
                <div className={`text-sm text-slate-900 dark:text-slate-100 font-medium truncate ${type === 'checkbox' ? 'flex items-center' : ''}`}>
                    {type === 'checkbox' && <span className="mr-2 text-slate-500 dark:text-slate-400">{label}:</span>}
                    {displayValue}
                </div>
                {!readOnly && (
                    <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                {readOnly && (
                     <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-1 rounded border border-slate-200 dark:border-slate-700">Locked</span>
                )}
            </div>
        </div>
    );
};


export const PropertyForm: React.FC<PropertyFormProps> = ({ 
    initialData, catalogs, modelAssignments, statusAssignments,
    metodoCompraAssignments, onSubmit, onCancel, isEditing = false 
}) => {
  const [formData, setFormData] = useState<Partial<Propiedad>>({
    idPropiedad: `pnty-${Math.floor(100000 + Math.random() * 900000)}`,
    asesorExterno: false, m2TerrExc: 0, precioXM2Exc: 0, precioTerrExc: 0,
    diasRezagoApartado: 0, diasAtrasoApartado: 0, diasAutorizadosApartado: 7, dtu: false,
    ...initialData
  });

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // --- LÓGICA DE CÁLCULOS (Se mantiene intacta) ---
  const calculateFinalPrice = (data: Partial<Propiedad>) => {
    const pLista = Number(data.precioLista) || 0;
    const desc = Math.abs(Number(data.descuento) || 0); 
    const pObras = Number(data.precioObrasAdicionales) || 0;
    const pTerr = Number(data.precioTerrExc) || 0;
    return pLista - desc + pObras + pTerr;
  };

  const calculateDaysLogic = (estado: string, fechaApartado?: string, diasAutorizados?: number) => {
      if (estado !== 'APARTADO' || !fechaApartado) return { elapsed: 0, rezago: 0 };
      const today = new Date(); today.setHours(0,0,0,0);
      const [year, month, day] = String(fechaApartado).split('-').map(Number);
      if (!year || !month || !day) return { elapsed: 0, rezago: 0 };
      const fApartado = new Date(year, month - 1, day); fApartado.setHours(0,0,0,0);
      const diffTime = today.getTime() - fApartado.getTime();
      const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const authorizedLimit = diasAutorizados ?? 7; 
      const rezago = elapsedDays > authorizedLimit ? elapsedDays - authorizedLimit : 0;
      return { elapsed: elapsedDays > 0 ? elapsedDays : 0, rezago };
  };

  const calculateDiasDesdeRevisar = (fechaDesde?: string) => {
      if (!fechaDesde) return undefined;
      const today = new Date(); today.setHours(0,0,0,0);
      const [year, month, day] = String(fechaDesde).split('-').map(Number);
      const fD = new Date(year, month - 1, day); fD.setHours(0,0,0,0);
      if (isNaN(fD.getTime())) return undefined;
      const diffDays = Math.floor((today.getTime() - fD.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays + 1;
  };

  useEffect(() => {
    if (initialData) {
      setFormData({ 
          dtu: false, diasAutorizadosApartado: initialData.diasAutorizadosApartado ?? 7,
          ...initialData, precioFinal: calculateFinalPrice(initialData),
          diasDesdeRevisar: calculateDiasDesdeRevisar(initialData.fechaDesde)
      });
    } else {
       setFormData({
        idPropiedad: `pnty-${Math.floor(100000 + Math.random() * 900000)}`,
        asesorExterno: false, dtu: false, dtuAvaluo: DTUAvaluo.SIN_DTU,
        diasRezagoApartado: 0, diasAtrasoApartado: 0, diasAutorizadosApartado: 7
      });
    }
  }, [initialData]);

  useEffect(() => {
      const calculatedTerrPrice = (Number(formData.m2TerrExc) || 0) * (Number(formData.precioXM2Exc) || 0);
      if (formData.precioTerrExc !== calculatedTerrPrice) setFormData(prev => ({ ...prev, precioTerrExc: calculatedTerrPrice }));
  }, [formData.m2TerrExc, formData.precioXM2Exc]);

  useEffect(() => {
    const precioFinalCalculado = calculateFinalPrice(formData);
    if (formData.precioFinal !== precioFinalCalculado) setFormData(prev => ({ ...prev, precioFinal: precioFinalCalculado }));
  }, [formData.precioLista, formData.descuento, formData.precioObrasAdicionales, formData.precioTerrExc]);

  useEffect(() => {
      const valor = Number(formData.valorAvaluo) || 0;
      let result = valor > 0 ? DTUAvaluo.AVALUO_CERRADO : (formData.dtu === true && valor === 0 ? DTUAvaluo.CON_DTU : DTUAvaluo.SIN_DTU);
      if (formData.dtuAvaluo !== result) setFormData(prev => ({ ...prev, dtuAvaluo: result }));
  }, [formData.valorAvaluo, formData.dtu]);

  useEffect(() => {
      const { elapsed, rezago } = calculateDaysLogic(formData.estado || '', formData.fechaApartado, formData.diasAutorizadosApartado);
      if (formData.diasRezagoApartado !== rezago || formData.diasAtrasoApartado !== elapsed) {
          setFormData(prev => ({ ...prev, diasRezagoApartado: rezago, diasAtrasoApartado: elapsed }));
      }
  }, [formData.estado, formData.fechaApartado, formData.diasAutorizadosApartado]);

  useEffect(() => {
      const result = calculateDiasDesdeRevisar(formData.fechaDesde);
      if (formData.diasDesdeRevisar !== result) setFormData(prev => ({ ...prev, diasDesdeRevisar: result }));
  }, [formData.fechaDesde]);

  const findGroupForModel = (modelName: string) => {
      if (!modelAssignments) return 'Sin Asignación';
      for (const [group, models] of Object.entries(modelAssignments)) if ((models as string[]).includes(modelName)) return group;
      return 'Sin Asignación';
  };

  const findGroupForStatus = (status: string) => {
      if (!statusAssignments) return 'Sin Asignación';
      for (const [group, statuses] of Object.entries(statusAssignments)) if ((statuses as string[]).includes(status)) return group;
      return 'Sin Asignación';
  };

  const findGroupForMetodoCompra = (method: string) => {
      if (!metodoCompraAssignments) return 'Sin Asignación';
      for (const [group, methods] of Object.entries(metodoCompraAssignments)) if ((methods as string[]).includes(method)) return group;
      return 'Sin Asignación';
  };

  // --- Handlers (Se mantienen intactos) ---
  const handleCreateChange = (name: string, value: any) => setFormData(prev => ({ ...prev, [name]: value }));

  const handleImmediateSave = (name: string, val: any) => {
      const updatedData = { ...formData, [name]: val };
      updatedData.precioFinal = calculateFinalPrice(updatedData);

      if (name === 'valorAvaluo' || name === 'dtu') {
          const valor = Number(updatedData.valorAvaluo) || 0;
          updatedData.dtuAvaluo = valor > 0 ? DTUAvaluo.AVALUO_CERRADO : (updatedData.dtu === true && valor === 0 ? DTUAvaluo.CON_DTU : DTUAvaluo.SIN_DTU);
      }
      if (['estado', 'fechaApartado', 'diasAutorizadosApartado'].includes(name)) {
          const { elapsed, rezago } = calculateDaysLogic(updatedData.estado || '', updatedData.fechaApartado, updatedData.diasAutorizadosApartado);
          updatedData.diasAtrasoApartado = elapsed; updatedData.diasRezagoApartado = rezago;
      }
      if (name === 'fechaDesde') updatedData.diasDesdeRevisar = calculateDiasDesdeRevisar(String(val));

      setFormData(updatedData);
      const payload: Partial<Propiedad> = { idPropiedad: formData.idPropiedad, [name]: val, precioFinal: updatedData.precioFinal };
      if (['valorAvaluo', 'dtu'].includes(name)) payload.dtuAvaluo = updatedData.dtuAvaluo;
      if (['estado', 'fechaApartado', 'diasAutorizadosApartado'].includes(name)) { payload.diasRezagoApartado = updatedData.diasRezagoApartado; payload.diasAtrasoApartado = updatedData.diasAtrasoApartado; }
      if (name === 'fechaDesde') payload.diasDesdeRevisar = updatedData.diasDesdeRevisar;

      onSubmit(payload);
      setNotification({ type: 'success', message: 'Campo actualizado correctamente.' });
      setTimeout(() => setNotification(null), 2000);
  };

  const handleLandCalcSave = (name: string, val: any) => {
      const updatedData = { ...formData, [name]: val };
      const newTerrPrice = (Number(updatedData.m2TerrExc) || 0) * (Number(updatedData.precioXM2Exc) || 0);
      updatedData.precioTerrExc = newTerrPrice;
      const newFinalPrice = calculateFinalPrice(updatedData);
      updatedData.precioFinal = newFinalPrice;
      setFormData(updatedData);
      onSubmit({ idPropiedad: formData.idPropiedad, [name]: val, precioTerrExc: newTerrPrice, precioFinal: newFinalPrice });
      setNotification({ type: 'success', message: 'Cálculos actualizados.' });
      setTimeout(() => setNotification(null), 2000);
  };

  const handleModelChange = (name: string, value: any) => {
      const newGroup = findGroupForModel(value);
      if (isEditing) {
          const updates = { [name]: value, modeloAgrupador: newGroup, precioFinal: calculateFinalPrice({ ...formData, [name]: value }) };
          setFormData(prev => ({ ...prev, ...updates })); onSubmit({ idPropiedad: formData.idPropiedad, ...updates });
          setNotification({ type: 'success', message: 'Modelo actualizado.' }); setTimeout(() => setNotification(null), 2000);
      } else setFormData(prev => ({ ...prev, [name]: value, modeloAgrupador: newGroup }));
  };

  const handleStatusChange = (name: string, value: any) => {
      const newGroup = findGroupForStatus(value);
      if (isEditing) {
          const { elapsed, rezago } = calculateDaysLogic(value, formData.fechaApartado, formData.diasAutorizadosApartado);
          const updates = { [name]: value, estadoAgrupador: newGroup, precioFinal: calculateFinalPrice({ ...formData, [name]: value }), diasRezagoApartado: rezago, diasAtrasoApartado: elapsed };
          setFormData(prev => ({ ...prev, ...updates })); onSubmit({ idPropiedad: formData.idPropiedad, ...updates });
          setNotification({ type: 'success', message: 'Estado actualizado.' }); setTimeout(() => setNotification(null), 2000);
      } else setFormData(prev => ({ ...prev, [name]: value, estadoAgrupador: newGroup }));
  };

  const handleMetodoCompraChange = (name: string, value: any) => {
      const newGroup = findGroupForMetodoCompra(value);
      if (isEditing) {
          const updates = { [name]: value, metodoCompraAgrupador: newGroup };
          setFormData(prev => ({ ...prev, ...updates })); onSubmit({ idPropiedad: formData.idPropiedad, ...updates });
          setNotification({ type: 'success', message: 'Método actualizado.' }); setTimeout(() => setNotification(null), 2000);
      } else setFormData(prev => ({ ...prev, [name]: value, metodoCompraAgrupador: newGroup }));
  };

  const handleDiscountChange = (name: string, value: any) => {
     const negVal = -Math.abs(value === '' ? 0 : Number(value));
     if (isEditing) handleImmediateSave(name, negVal); else handleCreateChange(name, negVal);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.desarrollo || !formData.modelo) {
        setNotification({ type: 'error', message: 'Complete Desarrollo y Modelo.' }); return;
    }
    const finalData = { ...formData };
    if (!finalData.modeloAgrupador && finalData.modelo) finalData.modeloAgrupador = findGroupForModel(finalData.modelo);
    if (!finalData.estadoAgrupador && finalData.estado) finalData.estadoAgrupador = findGroupForStatus(finalData.estado);
    if (!finalData.metodoCompraAgrupador && finalData.metodoCompra) finalData.metodoCompraAgrupador = findGroupForMetodoCompra(finalData.metodoCompra);
    finalData.precioTerrExc = (Number(finalData.m2TerrExc) || 0) * (Number(finalData.precioXM2Exc) || 0);
    finalData.precioFinal = calculateFinalPrice(finalData);
    
    const valor = Number(finalData.valorAvaluo) || 0;
    finalData.dtuAvaluo = valor > 0 ? DTUAvaluo.AVALUO_CERRADO : (finalData.dtu === true && valor === 0 ? DTUAvaluo.CON_DTU : DTUAvaluo.SIN_DTU);
    
    const { elapsed, rezago } = calculateDaysLogic(finalData.estado || '', finalData.fechaApartado, finalData.diasAutorizadosApartado);
    finalData.diasRezagoApartado = rezago; finalData.diasAtrasoApartado = elapsed;
    finalData.diasDesdeRevisar = calculateDiasDesdeRevisar(finalData.fechaDesde);

    onSubmit(finalData);
    setNotification({ type: 'success', message: 'Registro creado exitosamente.' });
    setTimeout(() => {
         setFormData({ idPropiedad: `pnty-${Math.floor(100000 + Math.random() * 900000)}`, asesorExterno: false, precioLista: 0, descuento: 0, precioObrasAdicionales: 0, precioTerrExc: 0, precioXM2Exc: 0, m2TerrExc: 0, precioFinal: 0, dtu: false, dtuAvaluo: DTUAvaluo.SIN_DTU, diasRezagoApartado: 0, diasAtrasoApartado: 0, diasAutorizadosApartado: 7 });
         setNotification(null);
    }, 1500);
  };

  const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="mt-8 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
      <h4 className="text-lg font-medium text-slate-800 dark:text-slate-100">{title}</h4>
    </div>
  );

  return (
    <form onSubmit={handleSubmitCreate} className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 relative transition-colors duration-300">
      {notification && (
        <div className={`fixed top-24 right-4 z-50 p-4 rounded-md shadow-lg flex items-center animate-in slide-in-from-right ${notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/90 text-green-800 dark:text-green-100 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/90 text-red-800 dark:text-red-100 border border-red-200 dark:border-red-800'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
          {notification.message}
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Detalle de Propiedad' : 'Nueva Propiedad'}</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isEditing ? 'Edite los campos necesarios. Los cambios se guardan al confirmar.' : 'Complete el formulario para registrar una nueva propiedad.'}
          </p>
        </div>
        
        <div className="flex space-x-3 w-full md:w-auto">
            {!isEditing ? (
                <>
                     <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2 inline" /> Cancelar
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors">
                        <Save className="w-4 h-4 mr-2 inline" /> Guardar
                    </button>
                </>
            ) : (
                 <button type="button" onClick={onCancel} className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                     <ArrowLeft className="w-4 h-4 mr-2 inline" /> Volver
                </button>
            )}
        </div>
      </div>

      {/* --- FORM BODY --- */}
      <div className="p-8">
        
        {/* --- 1. IDENTIFICACIÓN --- */}
        <SectionTitle title="1. Identificación" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SmartField label="ID Propiedad" name="idPropiedad" value={formData.idPropiedad} isEditingMode={isEditing} readOnly={true} onChange={handleCreateChange} helperText="Generado automáticamente" />
            <SmartField label="Desarrollo" name="desarrollo" value={formData.desarrollo} type="select" options={catalogs.desarrollo} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Nivel" name="nivel" value={formData.nivel} type="select" options={catalogs.nivel} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Modelo" name="modelo" value={formData.modelo} type="select" options={catalogs.modelo} isEditingMode={isEditing} onChange={handleModelChange} onSave={handleModelChange} />
            <SmartField label="Modelo Agrupador" name="modeloAgrupador" value={formData.modeloAgrupador} type="select" options={catalogs.modeloAgrupador} isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado automáticamente" />
        </div>

        {/* --- 2. ESTADO --- */}
        <SectionTitle title="2. Estado Actual" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SmartField label="Estado" name="estado" value={formData.estado} type="select" options={catalogs.estado} isEditingMode={isEditing} onChange={handleStatusChange} onSave={handleStatusChange} />
            <SmartField label="Estado Agrupador" name="estadoAgrupador" value={formData.estadoAgrupador} type="select" options={catalogs.estadoAgrupador} isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado automáticamente" />
            <SmartField label="FECHA APARTADO (dd-mm-aaaa)" name="fechaApartado" value={formData.fechaApartado} type="date" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="DÍAS AUTORIZADOS APARTADO" name="diasAutorizadosApartado" value={formData.diasAutorizadosApartado} type="number" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} helperText="Días límite antes de contar rezago" />
            <SmartField label="DÍAS DE APARTADO" name="diasAtrasoApartado" value={formData.diasAtrasoApartado} type="number" isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado: Hoy - Fecha Apartado" />
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3 flex flex-col justify-between h-full shadow-sm transition-colors">
                <div className="flex items-center mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                    <label className="block text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Días Rezago</label>
                </div>
                <div className="flex items-end justify-between">
                    <p className="text-[10px] text-red-600 dark:text-red-400 leading-tight max-w-[60%]">Calculado: Días Apartado - Días Autorizados</p>
                    <div className="text-3xl font-bold text-red-700 dark:text-red-400">{formData.diasRezagoApartado || 0}</div>
                </div>
            </div>
            <SmartField label="FECHA VENTA (dd-mm-aaaa)" name="fechaVenta" value={formData.fechaVenta} type="date" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="FECHA ESCRITURA (dd-mm-aaaa)" name="fechaEscritura" value={formData.fechaEscritura} type="date" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
        </div>

        {/* --- 3. FINANCIERO --- */}
        <SectionTitle title="3. Información Financiera" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SmartField label="Precio de Lista" name="precioLista" value={formData.precioLista} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} suffix={<span className="text-slate-500 dark:text-slate-400">MXN</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Descuento" name="descuento" value={Math.abs(formData.descuento || 0)} type="currency" prefix={<span className="text-red-500 dark:text-red-400">-$</span>} helperText="Ingrese monto positivo, se aplicará como resta" isEditingMode={isEditing} onChange={handleDiscountChange} onSave={(n, v) => handleImmediateSave(n, -Math.abs(Number(v)))} transformDisplay={(v) => (<span className="text-red-600 dark:text-red-400">-{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0)}</span>)} />
            <SmartField label="$ Obras Adicionales" name="precioObrasAdicionales" value={formData.precioObrasAdicionales} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="M2 Terr. Excedente" name="m2TerrExc" value={formData.m2TerrExc} type="number" suffix={<span className="text-slate-500 dark:text-slate-400">m²</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleLandCalcSave} />
            <SmartField label="$ x m² Exc" name="precioXM2Exc" value={formData.precioXM2Exc} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleLandCalcSave} />
            <SmartField label="$ Terreno Excedente" name="precioTerrExc" value={formData.precioTerrExc} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado: M2 x $ por m²" />
            <div className={`md:col-span-3 rounded-lg border flex items-center justify-between p-4 transition-colors ${isEditing ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                <div>
                    <label className="block text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center"><Calculator className="w-4 h-4 mr-2" />Precio Final (Calculado)</label>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400">Lista - Descuento + Obras + Terr. Exc</p>
                </div>
                <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(formData.precioFinal || 0)}</div>
            </div>
            <SmartField label="DTU" name="dtu" value={formData.dtu} type="checkbox" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Valor Avalúo" name="valorAvaluo" value={formData.valorAvaluo} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="DTU Avalúo" name="dtuAvaluo" value={formData.dtuAvaluo} type="select" options={catalogs.dtuAvaluo} isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado según reglas (Valor/DTU)" />
            <SmartField label="Precio Operación" name="precioOperacion" value={formData.precioOperacion} type="currency" prefix={<span className="text-slate-500 dark:text-slate-400">$</span>} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="EK" name="ek" value={formData.ek} type="text" helperText="ID ERP" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
        </div>

        {/* --- 4. UBICACIÓN --- */}
        <SectionTitle title="4. Ubicación" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2"><SmartField label="Calle" name="calle" value={formData.calle} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} /></div>
            <SmartField label="Núm Ext" name="numeroExterior" value={formData.numeroExterior} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Manzana" name="manzana" value={formData.manzana} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Lote" name="lote" value={formData.lote} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Condomino" name="condomino" value={formData.condomino} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Edificio" name="edificio" value={formData.edificio} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Núm Int" name="numeroInterior" value={formData.numeroInterior} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
        </div>

        {/* --- 5. PROCESO DE VENTA --- */}
        <SectionTitle title="5. Proceso de Venta" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SmartField label="Nombre Comprador" name="nombreComprador" value={formData.nombreComprador} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} placeholder="MAYÚSCULAS" />
            <SmartField label="Asesor de Venta" name="asesor" value={formData.asesor} type="select" options={catalogs.asesor} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Es Asesor Externo" name="asesorExterno" value={formData.asesorExterno} type="checkbox" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Método Compra" name="metodoCompra" value={formData.metodoCompra} type="select" options={catalogs.metodoCompra} isEditingMode={isEditing} onChange={handleMetodoCompraChange} onSave={handleMetodoCompraChange} />
            <SmartField label="Método Compra Agrupador" name="metodoCompraAgrupador" value={formData.metodoCompraAgrupador} type="select" options={catalogs.metodoCompraAgrupador} isEditingMode={isEditing} readOnly={true} onChange={() => {}} helperText="Calculado automáticamente" />
            <SmartField label="Banco" name="banco" value={formData.banco} type="select" options={catalogs.banco} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Nombre Broker Banco" name="nombreBrokerBanco" value={formData.nombreBrokerBanco} type="text" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Teléfono Broker Banco" name="telefonoBrokerBanco" value={formData.telefonoBrokerBanco} type="text" placeholder="10 dígitos" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Correo Broker Banco" name="correoBrokerBanco" value={formData.correoBrokerBanco} type="text" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            <SmartField label="Tipo Usuario" name="tipoUsuario" value={formData.tipoUsuario} type="select" options={catalogs.tipoUsuario} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />
            
            <div className="md:col-span-3">
                <SmartField label="Observaciones" name="observaciones" value={formData.observaciones} type="text" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} placeholder="Ingrese notas o comentarios sobre el proceso..." />
            </div>

            <div className="md:col-span-3">
                <SmartField label="RETRO ASESOR" name="retroAsesor" value={formData.retroAsesor} type="text" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} placeholder="Ingrese retroalimentación del asesor..." />
            </div>

            <SmartField label="Titulación" name="titulacion" value={formData.titulacion} isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} placeholder="MAYÚSCULAS" />
            <SmartField label="Fecha Desde" name="fechaDesde" value={formData.fechaDesde} type="date" isEditingMode={isEditing} onChange={handleCreateChange} onSave={handleImmediateSave} />

            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 p-3 flex flex-col justify-between h-full shadow-sm transition-colors">
                <div className="flex items-center mb-1">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2" />
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">DIAS DESDE REVISAR</label>
                </div>
                <div className="flex items-end justify-between">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-tight max-w-[60%]">Calculado: (Hoy - Fecha Desde) + 1</p>
                    <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{formData.diasDesdeRevisar ?? '-'}</div>
                </div>
            </div>
        </div>
      </div>

      <button type="button" onClick={onCancel} className="fixed bottom-8 right-8 p-4 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-400 z-50 transition-all hover:scale-105 print:hidden" title="Volver al Inicio">
        <ArrowLeft className="w-6 h-6" />
      </button>
    </form>
  );
};