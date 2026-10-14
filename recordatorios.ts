// Función "recordatorios": envía las notificaciones del calendario al celular.
// La llama una tarea programada cada minuto (ver calendario_setup.sql).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

Deno.serve(async (req) => {
  // Seguridad: solo responde si la llamada trae el secreto compartido.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }
  // Clave interna del proyecto: se toma de CLAVE_SERVICIO (si la cargaste), de la clave que
  // Supabase da por defecto a las funciones, o de su lista de claves secretas.
  let claveInterna = Deno.env.get('CLAVE_SERVICIO') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!claveInterna) {
    try { claveInterna = Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'))[0] as string } catch (_) { /* sin clave */ }
  }
  if (!claveInterna) {
    return new Response(JSON.stringify({ error: 'Falta la clave interna: cargá el secreto CLAVE_SERVICIO' }), { status: 500 })
  }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, claveInterna)
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const marcar = (r: { id: string; data: Record<string, unknown> }, valor: string) =>
    sb.from('registros')
      .update({ data: { ...r.data, notified: valor }, updated_at: new Date().toISOString() })
      .eq('kind', 'evts').eq('id', r.id)

  const ahora = new Date()
  const ahoraIso = ahora.toISOString()
  const limite = new Date(ahora.getTime() - 48 * 3600 * 1000).toISOString()

  // Eventos cuyo aviso ya llegó a su hora y todavía no se notificaron.
  const { data: evs, error } = await sb.from('registros').select('id,data')
    .eq('kind', 'evts').lte('data->>remindAt', ahoraIso).is('data->>notified', null)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const pendientes = (evs ?? []).filter((r) => !r.data.done)
  if (!pendientes.length) return Response.json({ enviados: 0, pendientes: 0 })

  const { data: subs } = await sb.from('registros').select('id,data').eq('kind', 'push')
  let enviados = 0

  for (const r of pendientes) {
    const ev = r.data
    // Avisos de hace más de 48 h: se descartan para no mandar notificaciones viejas.
    if (ev.remindAt < limite) { await marcar(r, 'vencido'); continue }

    const destinos = (subs ?? []).filter((s) => !ev.to || s.data.by === ev.to)
    if (!destinos.length) continue // todavía no hay dispositivos: reintenta el minuto siguiente

    const payload = JSON.stringify({
      title: ev.title,
      body: [ev.when, ev.cn && `Cliente: ${ev.cn}`, ev.notes].filter(Boolean).join(' · ').slice(0, 180),
      tag: ev.id,
      url: './?tab=cal',
    })
    let ok = 0
    await Promise.all(destinos.map(async (s) => {
      try {
        await webpush.sendNotification(s.data.sub, payload, { TTL: 3600 })
        ok++
      } catch (e) {
        // Dispositivo dado de baja: se elimina para no insistir.
        if (e.statusCode === 404 || e.statusCode === 410) {
          await sb.from('registros').delete().eq('kind', 'push').eq('id', s.id)
        }
      }
    }))
    if (ok) { await marcar(r, ahoraIso); enviados += ok }
  }
  return Response.json({ enviados, pendientes: pendientes.length })
})
