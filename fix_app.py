with open('/Users/olaf/Documents/inventario-ponty/App.tsx', 'r') as f:
    content = f.read()

inline_handler = """
  const handleUpdatePropertyInline = async (updatedProperty: Partial<Propiedad>) => {
    const { idPropiedad, ...restOfData } = updatedProperty;
    const oldProp = properties.find(p => p.idPropiedad === idPropiedad);
    
    // We only log if it's an inline update to not clutter, or we just silently update
    const { error } = await supabase.from('propiedades').update(restOfData).eq('idPropiedad', idPropiedad);
    if (error) {
      showPopup({ type: 'alert', variant: 'danger', title: 'Error', message: 'Error al actualizar campo: ' + error.message });
    } else {
      if (oldProp) {
        // Log changes
        const camposAuditar = [
          { key: 'titulacion', label: 'Titulación' },
          { key: 'fechaDesde', label: 'Fecha Desde' },
          { key: 'metodoCompra', label: 'Método de Compra' },
          { key: 'dtuAvaluo', label: 'DTU/Avalúo' },
          { key: 'nombreComprador', label: 'Titular' },
          { key: 'fechaResolucion', label: 'Fecha de Resolución' },
          { key: 'estado', label: 'Estado' }
        ];

        for (const campo of camposAuditar) {
          const oldVal = String(oldProp[campo.key as keyof Propiedad] || '');
          const newVal = String(updatedProperty[campo.key as keyof Propiedad] || '');

          if (oldVal !== newVal && !(oldVal === '' && newVal === 'null') && newVal !== 'undefined') {
            await logMovimiento(
              idPropiedad as string,
              `CAMBIO DE ${campo.label.toUpperCase()}`,
              `Pasó de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`
            );
          }
        }
      }
      fetchProperties();
      // Notice: NO setActiveTab('list') here!
    }
  };
"""

content = content.replace("  const handleUpdateProperty = async", inline_handler + "\n  const handleUpdateProperty = async")

content = content.replace(
    "onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty}",
    "onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty}\n              onInlineUpdate={handleUpdatePropertyInline}"
)

with open('/Users/olaf/Documents/inventario-ponty/App.tsx', 'w') as f:
    f.write(content)

print("App updated")
