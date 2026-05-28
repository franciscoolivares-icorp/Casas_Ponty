import re

with open('/Users/olaf/Documents/inventario-ponty/App.tsx', 'r') as f:
    content = f.read()

email_logic = """
  const notifyStatusUpdate = async (prop: Propiedad, oldEstatus: string, newEstatus: string) => {
    if (oldEstatus === newEstatus) return;
    
    // Helper para formatear
    const formatMiles = (num: number | undefined) => num ? '$' + num.toLocaleString('en-US') : '$0';
    
    // 1. Notificación al Asesor
    const asesor = usuariosDB.find(u => u.nombre === prop.asesor);
    if (asesor && asesor.correo) {
      const asuntoAsesor = `Actualización de Estatus: ${prop.nombreComprador || 'S/N'} ${prop.desarrollo || ''}`;
      const mensajeAsesor = `Hola ${prop.asesor},\n\nTe notificamos que ha habido un cambio en el estatus de una de tus propiedades en proceso:\n\nCliente: ${prop.nombreComprador || 'S/N'}\nDesarrollo: ${prop.desarrollo || ''}\nModelo: ${prop.modelo || ''} ${prop.nivel || ''}\nCondominio: ${prop.condomino || ''}\nEdificio: ${prop.edificio || ''}\nInterior: ${prop.numeroInterior || ''}\nPrecio: ${formatMiles(prop.precioFinal)}\n\nID Propiedad: ${prop.idPropiedad}\nEstatus Anterior: ${oldEstatus}\nNUEVO ESTATUS: ${newEstatus}\n\nPor favor, revisa el sistema para más detalles.\n\nSaludos,`;
      
      try {
        await emailjs.send('service_q6nzdzh', 'template_n4fo0xb', {
          to_email: asesor.correo,
          asunto: asuntoAsesor,
          mensaje: mensajeAsesor
        }, 'Wk9H8F1qHcLw1V9H3');
        console.log("🛠️ Correo de estatus enviado al asesor:", asesor.correo);
      } catch (err) { console.error("🚨 Error enviando correo al asesor", err); }
    }

    // 2. Notificación a Admin Ventas
    if (newEstatus === 'VENDIDO' && prop.asesorExterno) {
      try {
        const { data: catalogData } = await supabase
          .from('catalogos_maestro')
          .select('valor')
          .eq('tipo_catalogo', 'correos_admin_ventas');
        
        const correos = (catalogData || []).map(c => c.valor).filter(Boolean);
        
        if (correos.length > 0) {
          const asuntoAdmin = `Venta con asesor externo: ${prop.nombreComprador || 'S/N'} ${prop.desarrollo || ''}`;
          const mensajeAdmin = `Hola,\n\nDetallo la siguiente VENTA con asesor externo:\n\nCliente: ${prop.nombreComprador || 'S/N'}\nEK: ${prop.ek || ''}\nAsesor: ${prop.asesor || ''}\nDesarrollo: ${prop.desarrollo || ''}\nModelo: ${prop.modelo || ''} ${prop.nivel || ''}\nCondominio: ${prop.condomino || ''}\nEdificio: ${prop.edificio || ''}\nInterior: ${prop.numeroInterior || ''}\n\nSaludos,`;
          
          // Send to each email
          for (const correo of correos) {
            await emailjs.send('service_q6nzdzh', 'template_n4fo0xb', {
              to_email: correo,
              asunto: asuntoAdmin,
              mensaje: mensajeAdmin
            }, 'Wk9H8F1qHcLw1V9H3');
            console.log("🛠️ Correo de admin ventas enviado a:", correo);
          }
        }
      } catch (err) { console.error("🚨 Error procesando correos de admin ventas", err); }
    }
  };
"""

content = content.replace("  const handleSendAlertEmail = async", email_logic + "\n  const handleSendAlertEmail = async")

inline_call = """
      if (oldProp) {
        if (restOfData.estado && oldProp.estado !== restOfData.estado) {
           notifyStatusUpdate({ ...oldProp, ...restOfData } as Propiedad, oldProp.estado || '', restOfData.estado);
        }
"""
content = content.replace("      if (oldProp) {", inline_call)

with open('/Users/olaf/Documents/inventario-ponty/App.tsx', 'w') as f:
    f.write(content)

print("Emails injected to App.tsx")
