import React, { useMemo } from 'react';
import { Propiedad } from '../types';
import { Building2, Home as HomeIcon, CheckCircle2, AlertCircle, Clock, PieChart } from 'lucide-react';

interface HomeProps {
  properties: Propiedad[];
}

export const Home: React.FC<HomeProps> = ({ properties }) => {
  
  // --- LÓGICA DE CÁLCULOS DE FECHAS ---
  const today = new Date();
  const getDiffDays = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr + 'T12:00:00');
      return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };

  // --- MÉTRICAS PRINCIPALES ---
  const totalPropiedades = properties.length;
  const disponibles = properties.filter(p => (p.estado || '').toUpperCase() === 'DISPONIBLE').length;
  const apartados = properties.filter(p => (p.estado || '').toUpperCase() === 'APARTADO');
  
  const rezagadosTotal = apartados.filter(p => {
    const dias = getDiffDays(p.fechaApartado) || 0;
    return dias > (p.diasAutorizadosApartado || 7);
  }).length;

  // --- NUEVA TABLA: APARTADOS TOTALES X MODELO AGRUPADOR ---
  // Agrupamos y contamos solo los que están en APARTADO
  const apartadosPorAgrupador = useMemo(() => {
    const counts: Record<string, number> = {};
    apartados.forEach(p => {
      const agrp = p.modeloAgrupador || 'SIN AGRUPAR';
      counts[agrp] = (counts[agrp] || 0) + 1;
    });
    // Ordenamos de mayor a menor y si no, alfabéticamente
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [apartados]);

  // --- LÓGICA DE LA TABLA DE RESUMEN POR DTU/AVALÚO CORREGIDA ---
  const summaryData = useMemo(() => {
    const data: Record<string, { onTime: number, rezago: number, revisar: number }> = {};
    let tOnTime = 0;
    let tRezago = 0;
    let tRevisar = 0;

    properties.forEach(p => {
      // CORRECCIÓN DE ETIQUETA: AVALUO CERRADO sin acento para que coincida con la BD
      let cat = (p.dtuAvaluo || 'SIN DTU').toUpperCase();
      if (cat === 'AVALÚO CERRADO') cat = 'AVALUO CERRADO';

      if (!data[cat]) {
        data[cat] = { onTime: 0, rezago: 0, revisar: 0 };
      }

      if (p.estado === 'APARTADO') {
        const dApartado = getDiffDays(p.fechaApartado) ?? 0;
        const dAutorizados = p.diasAutorizadosApartado || 7;
        
        if (p.fechaApartado && dApartado > dAutorizados) {
          data[cat].rezago++;
          tRezago++;
        } else {
          data[cat].onTime++;
          tOnTime++;
        }
      }

      // CORRECCIÓN INCONGRUENCIA "REVISAR": 
      // Contamos todas las propiedades con días desde revisar > 0, sin importar estado.
      if (p.fechaDesde) {
        const dDesde = (getDiffDays(p.fechaDesde) || 0) + 1;
        if (dDesde > 0) {
          data[cat].revisar++;
          tRevisar++;
        }
      }
    });

    // Ordenamos alfabéticamente
    const sortedRows = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));

    return { rows: sortedRows, tOnTime, tRezago, tRevisar };
  }, [properties]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center uppercase tracking-wider transition-colors">
            <HomeIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Panel General
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider transition-colors">
            Resumen en tiempo real del inventario Ponty.
          </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* GRID DE TARJETAS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors group flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"><Building2 className="w-5 h-5" /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Inventario</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totalPropiedades}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors group flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Disponibles</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{disponibles}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 transition-colors group flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Clock className="w-5 h-5" /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">En Apartado</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{apartados.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500 transition-colors group flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Apartados Rezagados</p>
            <p className="text-3xl font-black text-red-600 dark:text-red-400">{rezagadosTotal}</p>
          </div>
        </div>

      </div>

      {/* --- SECCIÓN DE REPORTES INFERIOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* TABLA DE RESUMEN OPERATIVO */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-200 flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center uppercase tracking-widest mb-4">
              <Clock className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" />
              Resumen Operativo
            </h3>
            
            <div className="flex flex-wrap gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center gap-2">
                On Time <span className="bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-900 dark:text-emerald-100">{summaryData.tOnTime}</span>
              </div>
              <div className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200 dark:border-red-800 shadow-sm flex items-center gap-2">
                Rezagados <span className="bg-red-200 dark:bg-red-800 px-1.5 py-0.5 rounded text-red-900 dark:text-red-100">{summaryData.tRezago}</span>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center gap-2">
                Revisar <span className="bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-900 dark:text-indigo-100">{summaryData.tRevisar}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-center">
              <thead className="bg-white dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="text-left p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 w-1/4">Clasificación DTU</th>
                  <th className="p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50">On Time</th>
                  <th className="p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50">Rezago</th>
                  <th className="p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50">Revisar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                {summaryData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-slate-500 dark:text-slate-400 italic text-sm">No hay información.</td>
                  </tr>
                ) : (
                  summaryData.rows.map(([cat, counts]) => (
                    <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-left font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">{cat}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{counts.onTime}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{counts.rezago}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{counts.revisar}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NUEVA TABLA: APARTADOS TOTALES X MODELO AGRUPADOR */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-200 flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center uppercase tracking-widest">
              <PieChart className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" />
              Apartados Totales x Modelo Agrupador
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-white dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 w-2/3">Modelo Agrupador</th>
                  <th className="p-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 text-center">Total Apartados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                {apartadosPorAgrupador.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-500 dark:text-slate-400 italic text-sm">No hay apartados activos.</td>
                  </tr>
                ) : (
                  apartadosPorAgrupador.map(([agrupador, count]) => (
                    <tr key={agrupador} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 font-black text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">{agrupador}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200 text-center">
                        <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-3 py-1 rounded-md text-sm">
                          {count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};