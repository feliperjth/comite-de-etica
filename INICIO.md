# Cómo iniciar el portal Comité de Ética

## Requisitos previos
- Node.js instalado
- Archivo `.env.local` con las variables de entorno (ver abajo)

---

## Iniciar el servidor de desarrollo

1. Abre una terminal en la carpeta del proyecto:
   - En VS Code: menú **Terminal → New Terminal**
   - O abre PowerShell/CMD y escribe:
     ```
     cd C:\Users\felip\Desktop\comite-de-etica
     ```

2. Ejecuta:
   ```
   npm run dev
   ```

3. Abre el navegador en:
   ```
   http://localhost:3000
   ```

---

## URLs principales

| Página | URL |
|---|---|
| Portal principal (investigadores) | http://localhost:3000 |
| Enviar proyecto | http://localhost:3000/submit |
| Seguimiento por código | http://localhost:3000/track |
| Panel de revisores | http://localhost:3000/revisores |
| Dashboard revisores | http://localhost:3000/revisores/dashboard |

---

## Variables de entorno (.env.local)

El archivo `.env.local` debe estar en la raíz del proyecto con estas variables:

```
NEXT_PUBLIC_SUPABASE_URL=        # URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Clave anon de Supabase
REVIEWER_PASSWORD=               # Clave de acceso para revisores
REVIEWER_SESSION_TOKEN=          # Token secreto de sesión (cualquier string largo)
GMAIL_USER=                      # Correo Gmail para enviar notificaciones
GMAIL_PASS=                      # Contraseña de aplicación de Gmail (no la clave normal)
COORDINATOR_EMAIL=               # Email de Macarena Cárdenas (coordinadora)
```

> Para obtener la contraseña de aplicación de Gmail:
> Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación

---

## Base de datos (Supabase)

Si la base de datos necesita reconfigurarse, el esquema SQL está en:
`src/lib/` — revisar el historial de chat con Claude para el SQL completo.

Tablas usadas:
- `projects` — proyectos enviados por investigadores
- `reviews` — revisiones por revisor y ronda
- `section_reviews` — detalle por sección de cada revisión
- `documents` — archivos adjuntos subidos

---

## Detener el servidor

Presiona `Ctrl + C` en la terminal donde corre `npm run dev`.
