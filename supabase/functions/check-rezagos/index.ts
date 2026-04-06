import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (req) => {
  try {
    // 1. Conectarnos a la base de datos con permisos de administrador (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Traer todas las propiedades en estado 'APARTADO'
    const { data: propiedades } = await supabase
      .from('propiedades')
      .select('*')
      .eq('estado', 'APARTADO');

    if (!propiedades || propiedades.length === 0) {
      return new Response("No hay apartados activos.", { status: 200 });
    }

    // 3. Traer correos de los usuarios (asesores)
    const { data: usuarios } = await supabase.from('usuarios').select('nombre, correo');
    const today = new Date();
    let correosEnviados = 0;

    // 4. Revisar una por una
    for (const prop of propiedades) {
      if (prop.fechaApartado) {
        const d = new Date(prop.fechaApartado + 'T12:00:00');
        const diasTranscurridos = Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
        const diasAut = prop.diasAutorizadosApartado || 7;
        const diasRezago = diasTranscurridos - diasAut;

        // Si hay rezago, enviamos el correo a través de la API de EmailJS
        if (diasRezago > 0) {
          const asesor = usuarios?.find(u => u.nombre === prop.asesor);
          
          if (asesor && asesor.correo) {
            // Mandamos la petición HTTP a EmailJS
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: 'service_q6nzdzh',     // Tu Service ID
                template_id: 'template_n4fo0xb', // <--- CAMBIA ESTO
                user_id: 'Wk9H8F1qHcLw1V9H3',      // Tu Public Key
                template_params: {
                  to_email: asesor.correo,
                  asesor: prop.asesor,
                  id_propiedad: prop.idPropiedad,
                  desarrollo: prop.desarrollo,
                  modelo: prop.modelo,
                  dias_rezago: diasRezago
                }
              })
            });
            correosEnviados++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, correosEnviados }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})