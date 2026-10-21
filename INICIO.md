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

El archivo `.env.local` debe estar en la raíz del proyecto (nunca se sube a GitHub).
La lista completa de variables, con una descripción de cada una, está en
[`.env.example`](.env.example).

**Opción rápida (recomendada):** descargar las variables que ya están en Vercel:

```
npx vercel link
npx vercel env pull .env.local
```

**Opción manual:** copiar la plantilla y completar los valores
(se encuentran en Vercel → Settings → Environment Variables):

```
copy .env.example .env.local      # Windows
cp .env.example .env.local        # macOS / Linux
```

Variables principales: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `REVIEWER_PASSWORD`, `REVIEWER_SESSION_TOKEN`,
`EMAIL_USER`, `EMAIL_PASS`, `COORDINATOR_EMAIL`, `MACARENA_EMAIL`, más las de
Google Drive y `GEMINI_API_KEY`.

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
