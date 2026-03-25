import React, { useState, useMemo } from 'react';
import { Propiedad } from '../types';
import * as XLSX from 'xlsx';
import { 
  PieChart, Download, Building2, 
  Home, CheckCircle, Clock, AlertCircle, Filter, 
  TrendingUp, BarChart3, Layers, CreditCard, FileSignature, Award, Users, FolderCheck
} from 'lucide-react';

interface ReporterViewProps {
  properties: Propiedad[];
  catalogs: { [key: string]: string[] };
}

export const ReporterView: React.FC<ReporterViewProps> = ({ properties }) => {
  // --- FILTROS ---
  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string>('');
  const [selectedModelo, setSelectedModelo] = useState<string>('');

  const desarrollosUnicos = useMemo(() => Array.from(new Set(properties.map(p => p.desarrollo).filter(Boolean))).sort(), [properties]);
  const modelosUnicos = useMemo(() => {
    let filtradas = properties;
    if (selectedDesarrollo) filtradas = filtradas.filter(p => p.desarrollo === selectedDesarrollo);
    return Array.from(new Set(filtradas.map(p => p.modelo).filter(Boolean))).sort();
  }, [properties, selectedDesarrollo]);

  // --- DATOS FILTRADOS ---
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchDesarrollo = selectedDesarrollo ? p.desarrollo === selectedDesarrollo : true;
      const matchModelo = selectedModelo ? p.modelo === selectedModelo : true;
      return matchDesarrollo && matchModelo;
    });
  }, [properties, selectedDesarrollo, selectedModelo]);

  // --- CÁLCULO DE MÉTRICAS (KPIs) ---
  const totalPropiedades = filteredProperties.length;
  const disponibles = filteredProperties.filter(p => p.estado === 'DISPONIBLE');
  const apartados = filteredProperties.filter(p => p.estado === 'APARTADO' || p.estado === 'PENDIENTE APROBACIÓN');
  const vendidos = filteredProperties.filter(p => ['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P'].includes(p.estado || ''));
  const enProcesoTotal = apartados.length + vendidos.length;

  const pctDisponible = totalPropiedades ? (disponibles.length / totalPropiedades) * 100 : 0;
  const pctApartado = totalPropiedades ? (apartados.length / totalPropiedades) * 100 : 0;
  const pctVendido = totalPropiedades ? (vendidos.length / totalPropiedades) * 100 : 0;

  const valorInventarioDisponible = disponibles.reduce((acc, curr) => acc + (Number(curr.precioFinal) || 0), 0);
  const ingresosAsegurados = vendidos.reduce((acc, curr) => acc + (Number(curr.precioFinal) || 0), 0);
  const ingresosEnProceso = apartados.reduce((acc, curr) => acc + (Number(curr.precioFinal) || 0), 0);
  
  const ticketPromedio = enProcesoTotal > 0 
    ? (ingresosAsegurados + ingresosEnProceso) / enProcesoTotal 
    : 0;

  // --- AGRUPACIONES AVANZADAS ---

  // 1. Por Desarrollo
  const statsPorDesarrollo = useMemo(() => {
    const stats: Record<string, { total: number, disp: number, apart: number, vend: number }> = {};
    filteredProperties.forEach(p => {
      const des = p.desarrollo || 'SIN ASIGNAR';
      if (!stats[des]) stats[des] = { total: 0, disp: 0, apart: 0, vend: 0 };
      stats[des].total++;
      if (p.estado === 'DISPONIBLE') stats[des].disp++;
      if (p.estado === 'APARTADO' || p.estado === 'PENDIENTE APROBACIÓN') stats[des].apart++;
      if (['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P'].includes(p.estado || '')) stats[des].vend++;
    });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [filteredProperties]);

  // 2. Top Modelos Vendidos/Apartados
  const topModelos = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredProperties.filter(p => ['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P', 'APARTADO', 'PENDIENTE APROBACIÓN'].includes(p.estado || '')).forEach(p => {
        const mod = p.modelo || 'OTRO';
        stats[mod] = (stats[mod] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredProperties]);

  // 3. Métodos de Compra
  const metodosCompra = useMemo(() => {
      const stats: Record<string, number> = {};
      filteredProperties.filter(p => p.metodoCompra && ['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P', 'APARTADO', 'PENDIENTE APROBACIÓN'].includes(p.estado || '')).forEach(p => {
          stats[p.metodoCompra!] = (stats[p.metodoCompra!] || 0) + 1;
      });
      return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredProperties]);

  // 4. Estatus DTU (Operativo)
  const dtuStats = useMemo(() => {
      const stats = { cerrado: 0, conDtu: 0, sinDtu: 0 };
      filteredProperties.forEach(p => {
          if (p.dtuAvaluo === 'AVALÚO CERRADO') stats.cerrado++;
          else if (p.dtuAvaluo === 'CON DTU') stats.conDtu++;
          else stats.sinDtu++;
      });
      return stats;
  }, [filteredProperties]);

  // 5. NUEVO: Top Asesores (Ranking de Rendimiento)
  const topAsesores = useMemo(() => {
    const stats: Record<string, { cantidad: number, monto: number }> = {};
    filteredProperties.filter(p => p.asesor && ['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P', 'APARTADO', 'PENDIENTE APROBACIÓN'].includes(p.estado || '')).forEach(p => {
        const asesor = p.asesor || 'SIN ASIGNAR';
        if (!stats[asesor]) stats[asesor] = { cantidad: 0, monto: 0 };
        stats[asesor].cantidad++;
        stats[asesor].monto += (Number(p.precioFinal) || 0);
    });
    return Object.entries(stats).sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 5);
  }, [filteredProperties]);

  // 6. NUEVO: Salud del Expediente Digital (Nube)
  const expedientesStats = useMemo(() => {
      let conArchivos = 0;
      let enProceso = enProcesoTotal;
      
      filteredProperties.filter(p => ['VENDIDO', 'ESCRITURADO', 'ESCRITURADO-P', 'APARTADO', 'PENDIENTE APROBACIÓN'].includes(p.estado || '')).forEach(p => {
          if (p.url_comprobante_apartado || p.url_autorizacion_bancaria || p.url_mail_fovissste || p.url_solicitud_reubicacion) {
              conArchivos++;
          }
      });
      
      return { conArchivos, faltantes: enProceso - conArchivos, total: enProceso, porcentaje: enProceso > 0 ? (conArchivos/enProceso)*100 : 0 };
  }, [filteredProperties, enProcesoTotal]);

  // --- HELPERS ---
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  const formatCompact = (amount: number) => new Intl.NumberFormat('es-MX', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(amount);

  const exportToExcel = () => {
    if (filteredProperties.length === 0) {
        alert("No hay datos para exportar."); return;
    }
    const dataToExport = filteredProperties.map(p => ({
        "ID Propiedad": p.idPropiedad,
        "Desarrollo": p.desarrollo,
        "Modelo": p.modelo,
        "Nivel": p.nivel,
        "Estado": p.estado,
        "Comprador": p.nombreComprador || 'N/A',
        "Precio Final": p.precioFinal || 0,
        "DTU / Avalúo": p.dtuAvaluo || 'SIN DTU',
        "Valor Avalúo": p.valorAvaluo || 0,
        "Metodo Compra": p.metodoCompra || 'N/A',
        "Asesor Asignado": p.asesor || 'N/A',
        "Broker Banco": p.nombreBrokerBanco || 'N/A',
        "Días Atraso (Rev)": p.diasDesdeRevisar || 0,
        "Ubicación": `${p.calle || ''} ${p.numeroExterior || ''} ${p.numeroInterior ? 'Int ' + p.numeroInterior : ''}`.trim(),
        "M2 Exc": p.m2TerrExc || 0,
        "Obras Adicionales": p.obrasAdicionales || 'N/A',
        "URL Comprobante (Nube)": p.url_comprobante_apartado || 'Sin Archivo',
        "URL Aut. Banco (Nube)": p.url_autorizacion_bancaria || 'Sin Archivo',
        "URL FOVISSSTE (Nube)": p.url_mail_fovissste || 'Sin Archivo'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte_General");
    XLSX.writeFile(workbook, `Reporte_Inteligencia_Ponty_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER Y FILTROS */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl"><BarChart3 className="w-6 h-6" /></div>
            <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wide">Inteligencia de Negocio</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Métricas integrales de inventario y titulación</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                <Filter className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                <select value={selectedDesarrollo} onChange={e => {setSelectedDesarrollo(e.target.value); setSelectedModelo('');}} className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 py-1.5 px-2 outline-none w-full md:w-auto min-w-[140px]">
                    <option value="">Todos los Desarrollos</option>
                    {desarrollosUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                <Layers className="w-4 h-4 text-slate-400 ml-2 mr-1" />
                <select value={selectedModelo} onChange={e => setSelectedModelo(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 py-1.5 px-2 outline-none w-full md:w-auto min-w-[140px]">
                    <option value="">Todos los Modelos</option>
                    {modelosUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <button onClick={exportToExcel} className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95">
                <Download className="w-4 h-4" /> Exportar BD
            </button>
        </div>
      </div>

      {/* TARJETAS DE KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Inventario</p>
                <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"><Home className="w-5 h-5" /></div>
            </div>
            <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalPropiedades}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Ticket Prom: {formatCurrency(ticketPromedio)}</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors group hover:border-red-300 dark:hover:border-red-800">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cierre (Vendidos)</p>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><CheckCircle className="w-5 h-5" /></div>
            </div>
            <div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{vendidos.length}</h3>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">({pctVendido.toFixed(1)}%)</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-1">${formatCompact(ingresosAsegurados)} MXN Ingresados</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors group hover:border-amber-300 dark:hover:border-amber-800">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Proceso (Apartados)</p>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"><Clock className="w-5 h-5" /></div>
            </div>
            <div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{apartados.length}</h3>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">({pctApartado.toFixed(1)}%)</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-1">${formatCompact(ingresosEnProceso)} MXN en tubería</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors group hover:border-green-300 dark:hover:border-green-800">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock Disponible</p>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{disponibles.length}</h3>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">({pctDisponible.toFixed(1)}%)</span>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-1">Valor: ${formatCompact(valorInventarioDisponible)} MXN</p>
            </div>
        </div>
      </div>

      {/* --- GRÁFICA GIGANTE DE DISTRIBUCIÓN --- */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Estatus Global de Inventario</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Vendido</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div> Apartado</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Disponible</span>
              </div>
          </div>
          
          <div className="w-full h-12 flex rounded-xl overflow-hidden mb-2 shadow-inner border border-slate-100 dark:border-slate-700">
              {pctVendido > 0 && <div style={{ width: `${pctVendido}%` }} className="bg-red-500 dark:bg-red-600 flex items-center justify-center text-white text-xs font-bold transition-all duration-1000" title="Vendido/Escriturado">{pctVendido > 5 && `${pctVendido.toFixed(1)}%`}</div>}
              {pctApartado > 0 && <div style={{ width: `${pctApartado}%` }} className="bg-amber-400 dark:bg-amber-500 flex items-center justify-center text-amber-900 text-xs font-bold transition-all duration-1000" title="Apartado">{pctApartado > 5 && `${pctApartado.toFixed(1)}%`}</div>}
              {pctDisponible > 0 && <div style={{ width: `${pctDisponible}%` }} className="bg-green-500 dark:bg-green-600 flex items-center justify-center text-white text-xs font-bold transition-all duration-1000" title="Disponible">{pctDisponible > 5 && `${pctDisponible.toFixed(1)}%`}</div>}
          </div>
      </div>

      {/* --- BLOQUE DE 4 COLUMNAS (MÉTRICAS CLAVE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* COLUMNA 1: Desglose por Desarrollo */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-colors">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Por Desarrollo</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
                {statsPorDesarrollo.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Sin datos</p></div>
                ) : (
                    statsPorDesarrollo.map(([desarrollo, stat]) => (
                        <div key={desarrollo} className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{desarrollo}</p>
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{stat.total} Unds</span>
                            </div>
                            <div className="w-full flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                                <div style={{width: `${(stat.vend / stat.total) * 100}%`}} className="bg-red-500" title={`Vendidos: ${stat.vend}`}></div>
                                <div style={{width: `${(stat.apart / stat.total) * 100}%`}} className="bg-amber-400" title={`Apartados: ${stat.apart}`}></div>
                                <div style={{width: `${(stat.disp / stat.total) * 100}%`}} className="bg-green-500" title={`Disponibles: ${stat.disp}`}></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* COLUMNA 2: Top Modelos y Métodos de Compra */}
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 transition-colors">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Top Modelos</h3>
                </div>
                <div className="space-y-3">
                    {topModelos.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Sin ventas</p> : 
                    topModelos.map(([modelo, cantidad], idx) => (
                        <div key={modelo} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{modelo}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{cantidad}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 transition-colors">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Métodos de Compra</h3>
                </div>
                <div className="space-y-3">
                    {metodosCompra.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Sin datos</p> : 
                    metodosCompra.map(([metodo, cantidad]) => (
                        <div key={metodo}>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate pr-2">{metodo}</span>
                                <span className="text-[9px] font-black text-slate-900 dark:text-white">{((cantidad / enProcesoTotal) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                                <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${(cantidad / enProcesoTotal) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* COLUMNA 3: Estatus Titulación (DTU) y Expedientes */}
        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-colors flex-1">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <FileSignature className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Titulación (DTU)</h3>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-3">
                    <div className="p-3 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest mb-0.5">Avalúo Cerrado</p>
                        </div>
                        <span className="text-xl font-black text-green-700 dark:text-green-400">{dtuStats.cerrado}</span>
                    </div>

                    <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-0.5">Con DTU</p>
                        </div>
                        <span className="text-xl font-black text-amber-700 dark:text-amber-400">{dtuStats.conDtu}</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">Sin DTU</p>
                        </div>
                        <span className="text-xl font-black text-slate-700 dark:text-slate-300">{dtuStats.sinDtu}</span>
                    </div>
                </div>
            </div>

            {/* NUEVA TARJETA: SALUD DEL EXPEDIENTE (NUBE) */}
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                    <FolderCheck className="w-32 h-32 text-white" />
                </div>
                <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 relative z-10">Expedientes en Nube</h3>
                <p className="text-4xl font-black text-white relative z-10 mb-1">{expedientesStats.porcentaje.toFixed(0)}%</p>
                <p className="text-[10px] text-indigo-100 font-medium relative z-10 uppercase tracking-wider">{expedientesStats.conArchivos} de {expedientesStats.total} clientes con doc.</p>
            </div>
        </div>

        {/* COLUMNA 4: NUEVA - Ranking de Asesores */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-colors">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Top Asesores</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {topAsesores.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm font-medium">Sin ventas asignadas</p></div>
                ) : (
                    topAsesores.map(([asesor, stat], idx) => (
                        <div key={asesor} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : idx === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase truncate max-w-[120px]">{asesor}</p>
                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCompact(stat.monto)} MXN</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-slate-900 dark:text-white">{stat.cantidad}</span>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};