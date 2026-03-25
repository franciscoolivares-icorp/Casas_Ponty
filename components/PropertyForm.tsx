import React, { useState, useEffect } from 'react';
import { Propiedad } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Save, X, Home, DollarSign, MapPin, User, 
  FileText, CalendarClock, Layers, AlertCircle, 
  FolderOpen, UploadCloud, CheckCircle2 
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
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ 
  initialData, catalogs, modelAssignments, onSubmit, onCancel, isEditing 
}) => {
  const [formData, setFormData] = useState<Partial<Propiedad>>(
    initialData || {
      idPropiedad: `pnty-${Math.floor(100000 + Math.random() * 900000)}`,
      desarrollo: '', nivel: '', modelo: '', estado: 'DISPONIBLE',
      precioLista: 0, descuento: 0, precioFinal: 0, precioOperacion: 0,
      m2TerrExc: 0, precioXM2Exc: 0, precioTerrExc: 0, precioObrasAdicionales: 0,
      obrasAdicionales: '', observaciones: '', dtu: false, dtuAvaluo: 'SIN DTU', valorAvaluo: 0,
      metodoCompra: '', banco: '', asesorExterno: false, asesor: '', calle: '', manzana: '',
      lote: '', condomino: '', edificio: '', numeroExterior: '', numeroInterior: '',
      nombreComprador: '', ek: '', tipoUsuario: '', diasAutorizadosApartado: 7,
      url_comprobante_apartado: null, url_autorizacion_bancaria: null, 
      url_mail_fovissste: null, url_solicitud_reubicacion: null
    }
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const pLista = Number(formData.precioLista) || 0;
    const desc = Number(formData.descuento) || 0;
    const m2Exc = Number(formData.m2TerrExc) || 0;
    const pxm2 = Number(formData.precioXM2Exc) || 0;
    const pObras = Number(formData.precioObrasAdicionales) || 0;

    const terrExc = m2Exc * pxm2;
    const final = pLista + desc + terrExc + pObras;

    setFormData(prev => ({
      ...prev,
      precioTerrExc: terrExc,
      precioFinal: final,
      precioOperacion: ['DISPONIBLE', 'PRODUCCIÓN'].includes(prev.estado || '') ? 0 : (prev.precioOperacion || final) 
    }));
  }, [formData.precioLista, formData.descuento, formData.m2TerrExc, formData.precioXM2Exc, formData.precioObrasAdicionales, formData.estado]);

  // --- LÓGICA DE SUBIDA A SUPABASE STORAGE ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof Propiedad) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [field]: true }));
    setFormError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.idPropiedad}_${field}_${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expedientes_ponty')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('expedientes_ponty')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
    } catch (error: any) {
      setFormError('Error al subir archivo: ' + error.message);
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); 

    const nivelesExcedentes = ['CASA EXC', 'PBF EXC', 'PBP EXC'];
    if (nivelesExcedentes.includes(formData.nivel || '')) {
      if (!formData.m2TerrExc || formData.m2TerrExc <= 0) return setFormError("Al seleccionar Nivel con Excedente, los M2 deben ser mayores a cero.");
      if (!formData.precioXM2Exc || formData.precioXM2Exc <= 0) return setFormError("Al seleccionar Nivel con Excedente, el Precio por M2 debe ser mayor a cero.");
    }

    if (formData.dtuAvaluo === 'AVALÚO CERRADO') {
      if (!formData.valorAvaluo || formData.valorAvaluo <= 0) return setFormError("Si el DTU/Avalúo está 'AVALÚO CERRADO', el Valor no puede ser cero.");
    }

    // --- REGLAS DE OBLIGATORIEDAD DE ARCHIVOS ---
    if (formData.dtuAvaluo === 'SIN DTU' && !formData.url_comprobante_apartado) {
      return setFormError("Regla de Negocio: Si la propiedad está 'SIN DTU', el Comprobante de Apartado es obligatorio.");
    }

    const requiereAutBanco = ['BANCARIO', 'COFINAVIT', 'INFO + BANCO'].includes(formData.metodoCompra || '');
    if (requiereAutBanco && !formData.url_autorizacion_bancaria) {
      return setFormError(`Regla de Negocio: Para el método ${formData.metodoCompra}, la Autorización Bancaria es obligatoria.`);
    }

    if (formData.metodoCompra === 'FOVISSSTE TRADICIONAL' && !formData.url_mail_fovissste) {
      return setFormError("Regla de Negocio: Para FOVISSSTE TRADICIONAL, el Mail FOVISSSTE es obligatorio.");
    }

    let finalData = { ...formData };
    if (['DISPONIBLE', 'PRODUCCIÓN'].includes(finalData.estado || '')) {
      finalData.precioOperacion = 0;
    } else if (finalData.estado === 'APARTADO' && !isEditing) {
      finalData.precioOperacion = finalData.precioFinal;
    }

    onSubmit(finalData);
  };

  const getModelosDisponibles = () => {
    if (!formData.desarrollo) return catalogs.modelo || [];
    return modelAssignments[formData.desarrollo] || catalogs.modelo || [];
  };

  const renderFileUpload = (field: keyof Propiedad, label: string, isRequired: boolean) => {
    const isUploadingThis = isUploading[field];
    const hasFile = !!formData[field];

    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
          {label} {isRequired && <span className="text-red-500 ml-1">* Obligatorio</span>}
        </label>
        {hasFile ? (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold truncate">Documento cargado</span>
            </div>
            <div className="flex gap-3">
               <a href={formData[field] as string} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 uppercase tracking-wider">Ver</a>
               <button type="button" onClick={() => setFormData({...formData, [field]: null})} className="text-xs font-black text-red-600 hover:text-red-800 dark:text-red-400 uppercase tracking-wider">Borrar</button>
            </div>
          </div>
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
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500 transition-colors flex flex-col h-[85vh]">
      
      <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
            {isEditing ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
            ID: <span className="text-indigo-600 dark:text-indigo-400">{formData.idPropiedad}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center">
            <X className="w-4 h-4 mr-2" /> Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center">
            <Save className="w-4 h-4 mr-2" /> Guardar
          </button>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-900/50 p-4 shrink-0 flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-red-800 dark:text-red-300">{formError}</p>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1">
        
        <section>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Clasificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desarrollo</label>
              <select required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={formData.desarrollo || ''} onChange={e => setFormData({...formData, desarrollo: e.target.value, modelo: ''})}>
                <option value="">Seleccione...</option>
                {catalogs.desarrollo?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo</label>
              <select required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={formData.modelo || ''} onChange={e => setFormData({...formData, modelo: e.target.value})}>
                <option value="">Seleccione...</option>
                {getModelosDisponibles().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nivel</label>
              <select required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={formData.nivel || ''} onChange={e => setFormData({...formData, nivel: e.target.value})}>
                <option value="">Seleccione...</option>
                {catalogs.nivel?.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estado</label>
              <select required className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-black outline-none focus:ring-2 focus:ring-indigo-500" value={formData.estado || 'DISPONIBLE'} onChange={e => setFormData({...formData, estado: e.target.value})}>
                {catalogs.estado?.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Financiero y Excedentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio de Lista</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-400 font-bold">$</span>
                <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 pl-8 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" value={formData.precioLista || ''} onChange={e => setFormData({...formData, precioLista: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descuento (-)</label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-red-400 font-bold">-$</span>
                <input type="number" className="w-full border border-red-200 dark:border-red-900/50 rounded-xl p-3 pl-9 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 font-bold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" value={Math.abs(formData.descuento || 0) || ''} onChange={e => setFormData({...formData, descuento: -Math.abs(Number(e.target.value))})} />
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col justify-center items-center shadow-inner">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Precio Final Estimado</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(formData.precioFinal || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">M2 Excedente</label>
              <input type="number" step="0.01" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.m2TerrExc || ''} onChange={e => setFormData({...formData, m2TerrExc: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">$ x M2</label>
              <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.precioXM2Exc || ''} onChange={e => setFormData({...formData, precioXM2Exc: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monto Obras ($)</label>
              <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.precioObrasAdicionales || ''} onChange={e => setFormData({...formData, precioObrasAdicionales: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desc. Obras Adic.</label>
              <textarea 
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                rows={2} 
                value={formData.obrasAdicionales || ''} 
                onChange={e => setFormData({...formData, obrasAdicionales: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-indigo-500" /> Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Calle</label>
                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.calle || ''} onChange={e => setFormData({...formData, calle: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Num Ext</label>
                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.numeroExterior || ''} onChange={e => setFormData({...formData, numeroExterior: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Num Int</label>
                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.numeroInterior || ''} onChange={e => setFormData({...formData, numeroInterior: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Manzana</label>
                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.manzana || ''} onChange={e => setFormData({...formData, manzana: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lote</label>
                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.lote || ''} onChange={e => setFormData({...formData, lote: e.target.value.toUpperCase()})} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-amber-500" /> Operativo (DTU / Avalúo)
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-5">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700" checked={formData.dtu || false} onChange={e => setFormData({...formData, dtu: e.target.checked})} />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cuenta con DTU Físico</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estatus DTU Avalúo</label>
                <select className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={formData.dtuAvaluo || 'SIN DTU'} onChange={e => setFormData({...formData, dtuAvaluo: e.target.value})}>
                  {catalogs.dtuAvaluo?.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor Avalúo ($)</label>
                <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" value={formData.valorAvaluo || ''} onChange={e => setFormData({...formData, valorAvaluo: Number(e.target.value)})} />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">
            <User className="w-4 h-4 text-indigo-500" /> Extras y Observaciones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comprador</label>
              <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={formData.nombreComprador || ''} onChange={e => setFormData({...formData, nombreComprador: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Método de Compra</label>
              <select className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.metodoCompra || ''} onChange={e => setFormData({...formData, metodoCompra: e.target.value})}>
                <option value="">Seleccione...</option>
                {catalogs.metodoCompra?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Días Aut. Apartado
              </label>
              <input type="number" min="1" className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={formData.diasAutorizadosApartado || 7} onChange={e => setFormData({...formData, diasAutorizadosApartado: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observaciones Generales</label>
              <textarea 
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                rows={2} 
                value={formData.observaciones || ''} 
                onChange={e => setFormData({...formData, observaciones: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>
        </section>

        {/* --- NUEVA SECCIÓN: EXPEDIENTE DIGITAL (ARCHIVOS) --- */}
        <section className="bg-indigo-50/30 dark:bg-slate-800/50 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-indigo-200 dark:border-slate-600 pb-3">
            <FolderOpen className="w-5 h-5 text-indigo-500" /> Expediente Digital (Nube)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formData.dtuAvaluo === 'SIN DTU' && 
              renderFileUpload('url_comprobante_apartado', 'Comprobante de Apartado', true)
            }
            
            {['BANCARIO', 'COFINAVIT', 'INFO + BANCO'].includes(formData.metodoCompra || '') && 
              renderFileUpload('url_autorizacion_bancaria', 'Autorización Bancaria', true)
            }

            {formData.metodoCompra === 'FOVISSSTE TRADICIONAL' && 
              renderFileUpload('url_mail_fovissste', 'Mail FOVISSSTE', true)
            }

            {renderFileUpload('url_solicitud_reubicacion', 'Solicitud de Reubicación (Opcional)', false)}
          </div>
          
          {!(formData.dtuAvaluo === 'SIN DTU') && !['BANCARIO', 'COFINAVIT', 'INFO + BANCO', 'FOVISSSTE TRADICIONAL'].includes(formData.metodoCompra || '') && (
            <p className="text-xs text-slate-500 font-bold italic">No se requieren documentos obligatorios para la configuración actual.</p>
          )}
        </section>

      </div>
    </form>
  );
};