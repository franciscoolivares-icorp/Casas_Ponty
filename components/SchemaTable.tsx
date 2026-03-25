import React from 'react';
import { SCHEMA_DEFINITION } from '../constants';
import { Database, Lock, Type, DollarSign, Calculator, AlignLeft, List, CheckCircle, Calendar } from 'lucide-react';

export const SchemaTable: React.FC = () => {
  
  // Función blindada para asignar colores e iconos (no crashea si el tipo viene vacío)
  const getTypeConfig = (type?: string) => {
    if (!type) return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: <AlignLeft className="w-3 h-3 mr-1.5" /> };

    const t = type.toLowerCase();
    if (t.includes('enum') || t.includes('catálogo')) 
        return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: <List className="w-3 h-3 mr-1.5" /> };
    if (t.includes('currency') || t.includes('moneda')) 
        return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: <DollarSign className="w-3 h-3 mr-1.5" /> };
    if (t.includes('calculado') || t.includes('fórmula')) 
        return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: <Calculator className="w-3 h-3 mr-1.5" /> };
    if (t.includes('date') || t.includes('fecha')) 
        return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: <Calendar className="w-3 h-3 mr-1.5" /> };
    if (t.includes('boolean') || t.includes('bool')) 
        return { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800', icon: <CheckCircle className="w-3 h-3 mr-1.5" /> };
    if (t.includes('number') || t.includes('entero') || t.includes('decimal')) 
        return { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: <Type className="w-3 h-3 mr-1.5" /> };
    
    // Default (Texto, String, etc)
    return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: <AlignLeft className="w-3 h-3 mr-1.5" /> };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 h-full flex flex-col pb-10">
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
        
        {/* CABECERA */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Diccionario de Datos & Catálogos</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">Estructura de la Base de Datos</p>
            </div>
          </div>
          <span className="flex items-center text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-slate-300 dark:border-slate-700 shadow-sm">
            <Lock className="w-3 h-3 mr-1.5" /> Read Only
          </span>
        </div>
        
        {/* TABLA PRINCIPAL */}
        <div className="overflow-auto max-h-[70vh] custom-scrollbar">
          <table className="min-w-full text-left divide-y divide-slate-200 dark:divide-slate-700/50">
            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
              <tr>
                <th scope="col" className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Nombre Campo</th>
                <th scope="col" className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/6">Tipo de Dato</th>
                <th scope="col" className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-1/4">Observaciones / Lógica</th>
                <th scope="col" className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valores / Catálogo</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/30">
              {SCHEMA_DEFINITION.map((item, index) => {
                const typeConfig = getTypeConfig(item?.type);
                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white align-top">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md text-[12px] border border-indigo-100 dark:border-indigo-800/50">
                        {item?.field || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${typeConfig.color}`}>
                        {typeConfig.icon}
                        {item?.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed align-top">
                      {item?.obs || <span className="text-slate-400 dark:text-slate-500 italic">-</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-700 dark:text-slate-300 align-top">
                      <div className="max-h-24 overflow-y-auto custom-scrollbar pr-2 font-medium">
                        {item?.values || <span className="text-slate-400 dark:text-slate-500 italic">-</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
};