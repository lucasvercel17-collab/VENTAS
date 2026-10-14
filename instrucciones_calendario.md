# Avisos del calendario al celular: configuración (una sola vez)

El calendario funciona apenas subís los archivos nuevos a GitHub. Para que **las notificaciones lleguen al celular a la hora del evento, aunque la app esté cerrada**, hace falta una configuración única en Supabase. Son unos 20 minutos.

Los nombres de los menús de Supabase pueden variar un poco.

---

## 1. Generar las claves de avisos

1. Abrí la app → **Calendario** → **Configurar avisos** → **Generar claves de avisos**.
2. Aparecen dos textos: la **clave pública** y la **clave privada**. Copiá los dos y guardalos en un lugar seguro (por ejemplo, un gestor de contraseñas).
3. La clave privada **no se comparte con nadie** ni se pega en el archivo de la app.

## 2. Pegar la clave pública en `config.js`

Abrí `config.js` con el Bloc de notas y pegá la **clave pública** en la línea `vapid`, entre las comillas simples:

```
vapid: 'LA_CLAVE_PUBLICA_QUE_COPIASTE'
```

Completá también `url` y `key` (los mismos datos de siempre).

## 3. Crear la función en Supabase

1. En Supabase: **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre de la función: **`recordatorios`** (exactamente así, en minúsculas).
3. Borrá el texto de ejemplo y pegá el contenido completo del archivo **`recordatorios.ts`**. Tocá **Deploy**.
4. Entrá a la configuración de esa función y **desactivá la verificación de JWT** ("Verify JWT" / "Enforce JWT verification"). La función se protege con su propio secreto.
5. Cargá los **secretos** (en **Edge Functions → Secrets**, o en **Project Settings → Edge Functions**). Agregá estos cuatro:

| Nombre | Valor |
|---|---|
| `CRON_SECRET` | un texto largo inventado por vos (por ejemplo 30 letras y números al azar). Guardalo: lo vas a usar en el paso 4 |
| `VAPID_PUBLIC_KEY` | la clave pública del paso 1 |
| `VAPID_PRIVATE_KEY` | la clave privada del paso 1 |
| `VAPID_SUBJECT` | `mailto:` seguido de tu correo, por ejemplo `mailto:tucorreo@gmail.com` |

Dónde se cargan: en el menú de la izquierda de Supabase entrá a **Edge Functions** y abrí la pestaña **Secrets**. Para cada secreto escribí el nombre en **Key**, el valor en **Value** (sin comillas ni espacios de más) y tocá **Save**. Los nombres tienen que quedar exactamente como en la tabla.

Supabase le da a la función, por su cuenta, la dirección del proyecto y su clave interna, así que normalmente no hay que cargarlas. Solo si en los **Logs** de la función aparece "Falta la clave interna", agregá un quinto secreto llamado `CLAVE_SERVICIO` con la clave **secret** (o `service_role`) de tu proyecto, que está en **Project Settings → API Keys**.

## 4. Programar la tarea que revisa el calendario cada minuto

1. Abrí `calendario_setup.sql` con el Bloc de notas.
2. Reemplazá **`TU_REFERENCIA`** por la primera parte de la URL de tu proyecto (si es `https://abcdwxyz.supabase.co`, es `abcdwxyz`).
3. Reemplazá **`TU_SECRETO`** por el mismo texto que usaste como `CRON_SECRET`.
4. En Supabase: **SQL Editor → New query**, pegá el contenido y tocá **Run**.
5. Si da error con `pg_cron` o `pg_net`, habilitá esas dos extensiones en **Database → Extensions** y volvé a ejecutar.

## 5. Subir los archivos a GitHub

En tu repositorio: **Add file → Upload files**, y subí estos tres archivos (reemplazan a los anteriores):

- `sistema_ventas_nube.html` renombrado a **`index.html`**
- **`sw.js`**
- **`config.js`** (con tus datos y la clave pública)

Esperá uno o dos minutos y abrí la app con Ctrl+F5 (en el celular, cerrala y volvé a abrirla).

## 6. Activar los avisos en cada celular

1. Abrí la app e iniciá sesión. En **Android** conviene usar Chrome y tener la app instalada. En **iPhone** es obligatorio instalarla primero (Safari → Compartir → **Agregar a pantalla de inicio**) y abrirla desde ese ícono; hace falta iOS 16.4 o superior.
2. Entrá a **Calendario** → **Activar notificaciones** → **Permitir**.
3. Tiene que aparecer una notificación de confirmación ("Notificaciones activadas").

Cada persona del equipo debe hacer este paso en su propio celular.

## 7. Probar que funciona de punta a punta

1. Creá un evento para dentro de 3 minutos, con **Avisar: Al momento**.
2. Cerrá la app por completo y bloqueá el celular.
3. A la hora del evento (puede demorar hasta un minuto) tiene que llegar la notificación.

---

## Cómo funciona

- Al guardar un evento, la app calcula el momento exacto del aviso (según la hora de Argentina) y lo guarda.
- Cada minuto, la tarea programada llama a la función, que busca los avisos que ya llegaron a su hora y manda la notificación a los celulares activados.
- Cada evento se avisa **una sola vez**. Si lo cambiás de fecha u hora, se vuelve a avisar.
- En el formulario del evento podés elegir **Avisar a**: todos los dispositivos o solo una persona.
- Si la app está abierta a esa hora, además aparece un cartel adentro de la app.

## Si algo no funciona

- **No llega nada:** revisá que el celular figure como activado en Calendario y que las notificaciones del navegador o de la app estén permitidas en los ajustes del teléfono. En Android, desactivá el ahorro de batería para Chrome o para la app.
- **Ver si la tarea corre:** en el SQL Editor ejecutá `select * from cron.job_run_details order by start_time desc limit 5;`.
- **Ver qué responde la función:** en **Edge Functions → recordatorios → Logs**. Si responde 403, el `CRON_SECRET` de la función y el del SQL no coinciden.
- **Dispositivo que ya no recibe:** tocá **Desactivar** y luego **Activar notificaciones** de nuevo.

## Límites a tener en cuenta

- Los avisos pueden demorar hasta un minuto respecto de la hora exacta.
- Si el proyecto gratuito de Supabase se pausa por falta de uso, los avisos se detienen hasta reactivarlo.
- Los avisos que quedaron sin enviar por más de 48 horas se descartan.
- Los eventos del calendario son visibles para todos los usuarios del sistema.
