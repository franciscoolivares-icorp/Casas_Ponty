import React from 'react';
import { SCHEMA_DEFINITION } from '../constants';

export const SchemaTable: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Diccionario de Datos & Catálogos</h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">Read Only</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Nombre Campo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">Tipo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Observaciones</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valores / Catálogo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {SCHEMA_DEFINITION.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.field}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.type.includes('ENUM') ? 'bg-indigo-100 text-indigo-800' :
                    item.type.includes('Currency') ? 'bg-green-100 text-green-800' :
                    item.type.includes('Calculado') ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.obs}</td>
                <td className="px-6 py-4 text-sm text-slate-600 break-words whitespace-normal">
                  <div className="max-h-32 overflow-y-auto custom-scrollbar">
                    {item.values}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};