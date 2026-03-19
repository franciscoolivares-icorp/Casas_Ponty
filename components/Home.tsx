import React from 'react';
import { Propiedad } from '../types';
import { Building2, Home as HomeIcon, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface HomeProps {
  properties: Propiedad[];
}

export const Home: React.FC<HomeProps> = ({ properties }) => {
  const totalPropiedades = properties.length;
  const disponibles = properties.filter(p => (p.estado || '').toUpperCase() === 'DISPONIBLE').length;
  const apartados = properties.filter(p => (p.estado || '').toUpperCase() === 'APARTADO').length;
  const rezagados = properties.filter(p => (p.diasRezagoApartado || 0) > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Encabezado del Home */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center transition-colors">
            <HomeIcon className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
            Panel General
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">
            Resumen en tiempo real del inventario Ponty.
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg text-sm font-semibold border border-indigo-100 dark:border-indigo-800/50 transition-colors">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors duration-200">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Total Inventario</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{totalPropiedades}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:border-green-300 dark:hover:border-green-500 transition-colors duration-200">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Disponibles</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{disponibles}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:border-yellow-300 dark:hover:border-yellow-500 transition-colors duration-200">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">En Apartado</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{apartados}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 hover:border-red-300 dark:hover:border-red-500 transition-colors duration-200">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Apartados Rezagados</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 transition-colors">{rezagados}</p>
          </div>
        </div>

      </div>

      {/* Sección de Accesos Rápidos o Info Extra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-200">
           <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center mb-4 transition-colors">
             <TrendingUp className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" />
             Actividad Reciente
           </h3>
           <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 transition-colors">
              <p className="text-sm">Aquí se mostrará el historial de cambios recientes.</p>
           </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-200">
           <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center mb-4 transition-colors">
             <AlertCircle className="w-5 h-5 mr-2 text-amber-500 dark:text-amber-400" />
             Atención Requerida
           </h3>
           <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 transition-colors">
              <p className="text-sm">{rezagados > 0 ? `Tienes ${rezagados} propiedad(es) con rezago en apartado.` : 'No hay alertas críticas en este momento.'}</p>
           </div>
        </div>
      </div>

    </div>
  );
};