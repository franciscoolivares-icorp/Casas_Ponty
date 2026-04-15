import React, { useState, useEffect } from 'react';
import { Propiedad } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Save, Home, DollarSign, MapPin, User, 
  FileText, Layers, AlertCircle, FolderOpen, 
  UploadCloud, CheckCircle2, Check, X, ArrowLeft, Clock
} from 'lucide-react';

interface PropertyFormProps {
  initialData?: Propiedad;
  catalogs: { [key: string]: string[] };
  modelAssignments: { [group: string]: string[] };
  statusAssignments: { [group: string]: string[] };
  metodoCompraAssignments: { [group: string]: string[] };
  onSubmit: (property: Partial<Propiedad>) => void;
  onCancel: () => void;
  isEditing: boolean;
  isViewing?: boolean;
}

const InlineField = ({
  isEditing,
  isViewing,
  value,
  type = 'text',
  onChange,
  children
}: {
  isEditing: boolean;
  isViewing?: boolean;
  value: any;
  type?: 'text' | 'currency' | 'boolean' | 'date' | 'number';
  onChange: (val: any) => void;
  children: (val: any, changeHandler: (v: any) => void) => React.ReactNode;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (isViewing) {
     let disp = value;
     if (type === 'currency') disp = new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', maximumFractionDigits: 0}).format(Number(value) || 0);
     else if (type === 'boolean') disp = value ? 'Sí' : 'No';
     else if (type === 'date') disp = value ? String(value).split('T')[0] : '-';
     else disp = value || '-';
     
     return <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase py-2">{disp}</div>;
  }

  const handleChange = (v: any) => { 
      let processedValue = v;
      if (type === 'currency' || type === 'number') {
          if (v === '' || isNaN(Number(v))) processedValue = '';
          else processedValue = Math.round(Number(v));
      }
      setDraft(processedValue);
      onChange(processedValue); 
  };

  return (
    <div className="relative w-full flex items-center group">
      <div className="w-full">{children(draft, handleChange)}</div>
    </div>
  );
};

export const PropertyForm: React.FC<PropertyFormProps> = ({ 
  initialData, catalogs, modelAssignments, statusAssignments, metodoCompraAssignments, onSubmit, onCancel, isEditing, isViewing = false
}) => {
  const [formData, setFormData] = useState<Partial<Propiedad>>(
    initialData || {
      idPropiedad: `PNTY-${Math.floor(100000 + Math.random() * 900000)}`,
      desarrollo: '', nivel: '', modelo: '', estado: 'DISPONIBLE',
      precioLista: 0, descuento: 0, precioFinal: 0, precioOperacion: 0,
      m2TerrExc: 0, precioXM2Exc: 0, precioTerrExc: 0, precioObrasAdicionales: 0,
      obrasAdicionales: '', observaciones: '', dtuAvaluo: 'SIN DTU', valorAvaluo: 0,
      metodoCompra: '', banco: '', asesorExterno: false, asesor: '', calle: '', manzana: '',
      lote: '', condomino: '', edificio: '', numeroExterior: '', numeroInterior: '',
      nombreComprador: '', ek: '', tipoUsuario: '', diasAutorizadosApartado: 7,
      url_comprobante_apartado: null, url_autorizacion_bancaria: null, 
      url_mail_fovissste: null, url_solicitud_reubicacion: null,
      modeloAgrupador: '', estadoAgrupador: '', metodoCompraAgrupador: '',
      fechaApartado: null, fechaVenta: null, fechaEscritura: null, fechaDesde: null,
      retroAsesor: '', titulacion: '', nombreBrokerBanco: '', telefonoBrokerBanco: '', correoBrokerBanco: ''
    }
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  const today = new Date();
  const getDiffDays = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr + 'T12:00:00');
      return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };

  const diasApartado = getDiffDays(formData.fechaApartado) ?? 0;
  const diasRezago = formData.fechaApartado ? diasApartado - (formData.diasAutorizadosApartado || 0) : 0;
  const diasDesdeRevisar = formData.fechaDesde ? (getDiffDays(formData.fechaDesde) || 0) + 1 : 0;

  // --- AUTOMATIZACIÓN 1: REGLAS DE AVALÚO ---
  useEffect(() => {
    setFormData(prev => {
      const valor = Number(prev.valorAvaluo) || 0;
      let nuevoDtuAvaluo = prev.dtuAvaluo;

      // Si el valor es mayor a cero, forzamos AVALUO CERRADO
      if (valor > 0) {
        nuevoDtuAvaluo = 'AVALUO CERRADO';
      } 
      // Si el valor se borra y estaba en AVALUO CERRADO, lo regresamos a SIN DTU por defecto
      else if (prev.dtuAvaluo === 'AVALUO CERRADO') {
        nuevoDtuAvaluo = 'SIN DTU';
      }

      if (prev.dtuAvaluo !== nuevoDtuAvaluo) return { ...prev, dtuAvaluo: nuevoDtuAvaluo };
      return prev;
    });
  }, [formData.valorAvaluo]);

  // --- AUTOMATIZACIÓN 2: AGRUPADORES ---
  useEffect(() => {
    setFormData(prev => {
      let changed = false;
      const updates = { ...prev };

      if (prev.modelo) {
        const agrp = Object.keys(modelAssignments).find(agrupador => modelAssignments[agrupador].includes(prev.modelo as string));
        if (agrp && agrp !== prev.modeloAgrupador) { updates.modeloAgrupador = agrp; changed = true; } 
        else if (!agrp && prev.modeloAgrupador !== null && prev.modeloAgrupador !== '') { updates.modeloAgrupador = null; changed = true; }
      }

      if (prev.estado) {
        const agrp = Object.keys(statusAssignments).find(agrupador => statusAssignments[agrupador].includes(prev.estado as string));
        if (agrp && agrp !== prev.estadoAgrupador) { updates.estadoAgrupador = agrp; changed = true; } 
        else if (!agrp && prev.estadoAgrupador !== null && prev.estadoAgrupador !== '') { updates.estadoAgrupador = null; changed = true; }
      }

      if (prev.metodoCompra) {
        const agrp = Object.keys(metodoCompraAssignments).find(agrupador => metodoCompraAssignments[agrupador].includes(prev.metodoCompra as string));
        if (agrp && agrp !== prev.metodoCompraAgrupador) { updates.metodoCompraAgrupador = agrp; changed = true; } 
        else if (!agrp && prev.metodoCompraAgrupador !== null && prev.metodoCompraAgrupador !== '') { updates.metodoCompraAgrupador = null; changed = true; }
      }

      return changed ? updates : prev;
    });
  }, [formData.modelo, formData.estado, formData.metodoCompra, modelAssignments, statusAssignments, metodoCompraAssignments]);

  // --- CÁLCULO DE PRECIO FINAL (RESTANDO DESCUENTO) ---
  useEffect(() => {
    const pLista = Number(formData.precioLista) || 0;
    const desc = Math.abs(Number(formData.descuento) || 0); 
    const m2Exc = Number(formData.m2TerrExc) || 0;
    const pxm2 = Number(formData.precioXM2Exc) || 0;
    const pObras = Number(formData.precioObrasAdicionales) || 0;

    const terrExc = m2Exc * pxm2;
    const final = pLista - desc + terrExc + pObras;

    setFormData(prev => ({
      ...prev, precioTerrExc: terrExc, precioFinal: final,
      precioOperacion: ['DISPONIBLE', 'PRODUCCIÓN'].includes(prev.estado || '') ? 0 : (prev.precioOperacion || final) 
    }));
  }, [formData.precioLista, formData.descuento, formData.m2TerrExc, formData.precioXM2Exc, formData.precioObrasAdicionales, formData.estado]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Propiedad) => {
    if (isViewing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [field]: true }));
    setFormError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.idPropiedad}_${field}_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('expedientes_ponty').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('expedientes_ponty').getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
    } catch (error: any) { setFormError('Error al subir archivo: ' + error.message); } 
    finally { setIsUploading(prev => ({ ...prev, [field]: false })); }
  };

  const validateAndSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null); 
    const finalData = { ...formData };
    
    // Eliminamos dtu físico por limpieza de BD si existía antes
    delete finalData.dtu; 
    
    if (['DISPONIBLE', 'PRODUCCIÓN'].includes(finalData.estado || '')) finalData.precioOperacion = 0;
    else if (finalData.estado === 'APARTADO' && !isEditing) finalData.precioOperacion = finalData.precioFinal;
    onSubmit(finalData);
  };

  const getModelosDisponibles = () => formData.desarrollo ? modelAssignments[formData.desarrollo] || catalogs.modelo || [] : catalogs.modelo || [];

  const renderFileUpload = (field: keyof Propiedad, label: string, isRequired: boolean) => {
    const isUploadingThis = isUploading[field];
    const hasFile = !!formData[field];

    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
          {label} {isRequired && !isViewing && <span className="text-red-500 ml-1">* Obligatorio</span>}
        </label>
        {hasFile ? (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold truncate">Documento cargado</span>
            </div>
            <div className="flex gap-3">
               <a href={formData[field] as string} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">Ver</a>
               {!isViewing && (
                 <button type="button" onClick={() => { setFormData(prev => ({...prev, [field]: null})); }} className="text-xs font-black text-red-600 hover:text-red-800 dark:text-red-400 uppercase tracking-wider">Borrar</button>
               )}
            </div>
          </div>
        ) : (
          isViewing ? (
             <div className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase py-2">Sin documento</div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-11 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer overflow-hidden bg-white dark:bg-slate-800">
               {isUploadingThis ? (
                 <span className="text-xs font-bold text-slate-500 animate-pulse">Subiendo a la nube...</span>
               ) : (
                 <>
                   <UploadCloud className="w-4 h-4 text-indigo-500 mr-2" />
                   <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Clic para adjuntar PDF/Foto</span>
                   <input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, field)} disabled={isUploadingThis} />
                 </>
               )}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <>
      <form onSubmit={validateAndSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500 transition-colors flex flex-col h-[85vh]">
        
        {/* HEADER MODAL */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
              {isViewing ? 'Detalle de Propiedad' : isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
              ID: <span className="text-indigo-600 dark:text-indigo-400">{formData.idPropiedad}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </button>
            {!isViewing && (
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center">
                <Save className="w-4 h-4 mr-2" /> {isEditing ? 'Guardar Cambios' : 'Crear Propiedad'}
              </button>
            )}
          </div>
        </div>

        {formError && (
          <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-900/50 p-4 shrink-0 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{formError}</p>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1">
          
          {/* SECCIÓN 1: IDENTIFICACIÓN */}
          <section>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Identificación
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ID Propiedad</label>
                <InlineField isEditing={!isViewing} isViewing={isViewing} value={formData.idPropiedad || ''} onChange={v => setFormData({...formData, idPropiedad: String(v).trim().toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none uppercase focus:ring-2 focus:ring-indigo-500" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Desarrollo</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.desarrollo || ''} onChange={v => setFormData({...formData, desarrollo: v})}>
                  {(val, change) => <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)}><option value="">-</option>{catalogs.desarrollo?.map(d => <option key={d} value={d}>{d}</option>)}</select>}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nivel</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.nivel || ''} onChange={v => setFormData({...formData, nivel: v})}>
                  {(val, change) => <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)}><option value="">-</option>{catalogs.nivel?.map(n => <option key={n} value={n}>{n}</option>)}</select>}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.modelo || ''} onChange={v => setFormData({...formData, modelo: v})}>
                  {(val, change) => <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)}><option value="">-</option>{getModelosDisponibles().map(m => <option key={m} value={m}>{m}</option>)}</select>}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo Agrupador</label>
                <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex justify-between items-center opacity-80 h-[38px]">
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formData.modeloAgrupador || '-'}</span>
                   <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Bloqueado</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: ESTADO ACTUAL */}
          <section>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Estado Actual
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.estado || 'DISPONIBLE'} onChange={v => setFormData({...formData, estado: v})}>
                  {(val, change) => <select className="w-full border border-indigo-300 dark:border-indigo-600 rounded-lg p-2 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none" value={val} onChange={e => change(e.target.value)}>{catalogs.estado?.map(e => <option key={e} value={e}>{e}</option>)}</select>}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado Agrupador</label>
                <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex justify-between items-center opacity-80 h-[38px]">
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formData.estadoAgrupador || '-'}</span>
                   <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Bloqueado</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Apartado</label>
                <InlineField type="date" isEditing={true} isViewing={isViewing} value={formData.fechaApartado || ''} onChange={v => setFormData({...formData, fechaApartado: v})}>
                  {(val, change) => <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val ? String(val).split('T')[0] : ''} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              {/* CÁLCULOS DE DÍAS */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Días Aut. Apartado</label>
                <InlineField type="number" isEditing={true} isViewing={isViewing} value={formData.diasAutorizadosApartado ?? 7} onChange={v => setFormData({...formData, diasAutorizadosApartado: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Días de Apartado</label>
                <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase py-2">{formData.fechaApartado ? diasApartado : '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className={`p-3 rounded-xl border ${diasRezago > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1 ${diasRezago > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {diasRezago > 0 && <AlertCircle className="w-3.5 h-3.5"/>} Días Rezago
                  </p>
                  <p className={`text-[9px] font-bold mb-1.5 ${diasRezago > 0 ? 'text-red-500' : 'text-slate-400'}`}>Calculado: Días Apartado - Días Autorizados</p>
                  <p className={`text-xl font-black ${diasRezago > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>{formData.fechaApartado ? diasRezago : '-'}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Venta</label>
                <InlineField type="date" isEditing={true} isViewing={isViewing} value={formData.fechaVenta || ''} onChange={v => setFormData({...formData, fechaVenta: v})}>
                  {(val, change) => <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val ? String(val).split('T')[0] : ''} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Escritura</label>
                <InlineField type="date" isEditing={true} isViewing={isViewing} value={formData.fechaEscritura || ''} onChange={v => setFormData({...formData, fechaEscritura: v})}>
                  {(val, change) => <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val ? String(val).split('T')[0] : ''} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: INFORMACIÓN FINANCIERA */}
          <section>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Información Financiera
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio de Lista</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={formData.precioLista ?? ''} onChange={v => setFormData({...formData, precioLista: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descuento (-)</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={Math.abs(Number(formData.descuento) || 0) || ''} onChange={v => setFormData({...formData, descuento: Math.abs(Number(v))})}>
                  {(val, change) => <input type="number" className="w-full border border-red-200 dark:border-red-900/50 rounded-lg p-2 bg-red-50 dark:bg-red-900/10 text-sm font-bold text-red-700 dark:text-red-400 outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">$ Obras Adicionales (+)</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={formData.precioObrasAdicionales ?? ''} onChange={v => setFormData({...formData, precioObrasAdicionales: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M2 Terr. Excedente</label>
                <InlineField type="number" isEditing={true} isViewing={isViewing} value={formData.m2TerrExc ?? ''} onChange={v => setFormData({...formData, m2TerrExc: Number(v)})}>
                  {(val, change) => <input type="number" step="0.01" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">$ X M2 Exc</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={formData.precioXM2Exc ?? ''} onChange={v => setFormData({...formData, precioXM2Exc: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">$ Terreno Excedente (+)</label>
                <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase py-2">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(formData.precioTerrExc || 0)}</div>
              </div>

              {/* BANNER PRECIO FINAL */}
              <div className="col-span-2 md:col-span-3 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center my-2">
                <div>
                  <p className="text-sm font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><FileText className="w-4 h-4"/> Precio Final (Calculado)</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-widest">Lista - Descuento + Obras + Terr. Exc</p>
                </div>
                <span className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(formData.precioFinal || 0)}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valor Avalúo</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={formData.valorAvaluo ?? ''} onChange={v => setFormData({...formData, valorAvaluo: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              
              {/* --- CAMBIO: DTU AVALÚO INTELIGENTE Y SIN EL CHECKBOX FÍSICO --- */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DTU Avalúo</label>
                {Number(formData.valorAvaluo) > 0 ? (
                    <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex justify-between items-center opacity-80 h-[38px]">
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-300">AVALUO CERRADO</span>
                       <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Auto</span>
                    </div>
                ) : (
                    <InlineField isEditing={true} isViewing={isViewing} value={formData.dtuAvaluo || 'SIN DTU'} onChange={v => setFormData({...formData, dtuAvaluo: v})}>
                      {(val, change) => (
                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" value={val} onChange={e => change(e.target.value)}>
                          <option value="SIN DTU">SIN DTU</option>
                          <option value="CON DTU">CON DTU</option>
                        </select>
                      )}
                    </InlineField>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Operación</label>
                <InlineField type="currency" isEditing={true} isViewing={isViewing} value={formData.precioOperacion ?? ''} onChange={v => setFormData({...formData, precioOperacion: Number(v)})}>
                  {(val, change) => <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">EK</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.ek || ''} onChange={v => setFormData({...formData, ek: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: UBICACIÓN */}
          <section>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Ubicación
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calle</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.calle || ''} onChange={v => setFormData({...formData, calle: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Núm Ext</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.numeroExterior || ''} onChange={v => setFormData({...formData, numeroExterior: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Manzana</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.manzana || ''} onChange={v => setFormData({...formData, manzana: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lote</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.lote || ''} onChange={v => setFormData({...formData, lote: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Condómino</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.condomino || ''} onChange={v => setFormData({...formData, condomino: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Edificio</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.edificio || ''} onChange={v => setFormData({...formData, edificio: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Núm Int</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.numeroInterior || ''} onChange={v => setFormData({...formData, numeroInterior: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: PROCESO DE VENTA */}
          <section>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              5. Proceso de Venta
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Comprador</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.nombreComprador || ''} onChange={v => setFormData({...formData, nombreComprador: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asesor de Venta</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.asesor || ''} onChange={v => setFormData({...formData, asesor: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Método Compra</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.metodoCompra || ''} onChange={v => setFormData({...formData, metodoCompra: v})}>
                  {(val, change) => <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)}><option value="">-</option>{catalogs.metodoCompra?.map(m => <option key={m} value={m}>{m}</option>)}</select>}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Método Agrupador</label>
                <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex justify-between items-center opacity-80 h-[38px]">
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formData.metodoCompraAgrupador || '-'}</span>
                   <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">Bloqueado</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Es Asesor Externo</label>
                <InlineField type="boolean" isEditing={true} isViewing={isViewing} value={formData.asesorExterno || false} onChange={v => setFormData({...formData, asesorExterno: v})}>
                  {(val, change) => <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600" checked={val} onChange={e => change(e.target.checked)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Banco</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.banco || ''} onChange={v => setFormData({...formData, banco: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Broker</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.nombreBrokerBanco || ''} onChange={v => setFormData({...formData, nombreBrokerBanco: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono Broker</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.telefonoBrokerBanco || ''} onChange={v => setFormData({...formData, telefonoBrokerBanco: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Broker</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.correoBrokerBanco || ''} onChange={v => setFormData({...formData, correoBrokerBanco: String(v).toLowerCase()})}>
                  {(val, change) => <input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo Usuario</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.tipoUsuario || ''} onChange={v => setFormData({...formData, tipoUsuario: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.observaciones || ''} onChange={v => setFormData({...formData, observaciones: String(v).toUpperCase()})}>
                  {(val, change) => <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" rows={1} value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Retro Asesor</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.retroAsesor || ''} onChange={v => setFormData({...formData, retroAsesor: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Titulación</label>
                <InlineField isEditing={true} isViewing={isViewing} value={formData.titulacion || ''} onChange={v => setFormData({...formData, titulacion: String(v).toUpperCase()})}>
                  {(val, change) => <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none uppercase" value={val} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Desde</label>
                <InlineField type="date" isEditing={true} isViewing={isViewing} value={formData.fechaDesde || ''} onChange={v => setFormData({...formData, fechaDesde: v})}>
                  {(val, change) => <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none" value={val ? String(val).split('T')[0] : ''} onChange={e => change(e.target.value)} />}
                </InlineField>
              </div>
              <div className="md:col-span-3">
                <div className={`p-3 rounded-xl border w-max min-w-[200px] ${diasDesdeRevisar > 0 ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                     <Clock className="w-3.5 h-3.5"/> Días Desde Revisar
                  </p>
                  <p className="text-[9px] font-bold mb-1.5 text-indigo-500">Calculado: (Hoy - Fecha Desde) + 1</p>
                  <p className="text-xl font-black text-indigo-800 dark:text-indigo-300">{formData.fechaDesde ? diasDesdeRevisar : '-'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Expediente digital */}
          {(isEditing || isViewing) && (
            <section className="bg-indigo-50/30 dark:bg-slate-800/50 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-indigo-200 dark:border-slate-600 pb-3">
                <FolderOpen className="w-5 h-5 text-indigo-500" /> Expediente Digital (Nube)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.dtuAvaluo === 'SIN DTU' && renderFileUpload('url_comprobante_apartado', 'Comprobante de Apartado', true)}
                {['BANCARIO', 'COFINAVIT', 'INFO + BANCO'].includes(formData.metodoCompra || '') && renderFileUpload('url_autorizacion_bancaria', 'Autorización Bancaria', true)}
                {formData.metodoCompra === 'FOVISSSTE TRADICIONAL' && renderFileUpload('url_mail_fovissste', 'Mail FOVISSSTE', true)}
                {renderFileUpload('url_solicitud_reubicacion', 'Solicitud de Reubicación (Opcional)', false)}
              </div>
            </section>
          )}

        </div>
      </form>
    </>
  );
};