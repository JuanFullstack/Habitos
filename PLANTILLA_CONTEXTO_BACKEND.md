# 🦁 CONTEXTO DE PROYECTO: INFRAESTRUCTURA LUX (ORACLE ARM)
> **⚠️ AI ASSISTANT: LEER ESTO PRIMERO ANTES DE ESCRIBIR CÓDIGO.**
> Este proyecto se despliega en una infraestructura propia (Self-Hosted) en Oracle Cloud.
> **NO UTILIZAR** servicios externos como Vercel, Netlify, Heroku, Firebase o Supabase.
> **UTILIZAR** los recursos ya configurados en el servidor `Lux` (IP: `129.213.26.212`).

---

## 1. Arquitectura del Sistema 🏗️

### A. Backend & Base de Datos (PocketBase) 🐹
*   **Rol:** Base de Datos, Autenticación, Almacenamiento de Archivos y API Backend.
*   **URL Interna (Docker):** `http://pocketbase:8090` (Si la app corre en Coolify misma red).
*   **URL Pública:** `http://129.213.26.212:8090` (Acceso directo HTTP).
*   **URL Pública Segura:** `https://pocketbase.129.213.26.212.sslip.io` (Si se ha configurado en Coolify).
*   **SDK:** Usar siempre `pocketbase` (JS/TS Client).

### B. DevOps & Despliegue (Coolify) 🐙
*   **Rol:** Orquestador de Contenedores (Reemplazo de Vercel).
*   **URL Panel:** `http://129.213.26.212:8000`
*   **Cómo Desplegar:**
    1.  Subir código a GitHub.
    2.  Conectar repositorio en Coolify.
    3.  Coolify detecta el stack (Node, Next.js, Python, Dockerfile).
    4.  Coolify asigna URL automática con HTTPS.

### C. Dominios & HTTPS (Estrategia `sslip.io`) 🪄
*   **No usamos dominios `.com` ni DNS manuales.**
*   **Patrón de URL:** `http://<nombre-proyecto>.129.213.26.212.sslip.io`
*   **HTTPS:** Coolify gestiona automáticamente el certificado SSL (Let's Encrypt) para este subdominio.
*   **Instrucción para la IA:** Si debes configurar una URL pública en el código o variables de entorno, usa este patrón.

---

## 2. Instrucciones de Implementación (AI Rules) 🤖

### Regla #1: No Inventar Infraestructura
*   Si el usuario pide "Base de Datos", **usa PocketBase**.
*   Si el usuario pide "Deploy", **usa Coolify**.
*   Si el usuario pide "Storage S3", **usa PocketBase (Files)** o MinIO si está instalado.

### Regla #2: Conexión al Backend
*   Al iniciar un proyecto (Frontend), instalar el cliente: `npm install pocketbase`
*   Inicializar con la URL pública:
    ```javascript
    import PocketBase from 'pocketbase';
    const pb = new PocketBase('http://129.213.26.212:8090'); // O la URL HTTPS si existe
    ```

### Regla #3: Manejo de Secretos
*   Las credenciales maestras (Oracle, PocketBase Admin, Coolify Admin) están documentadas en **`DOCUMENTACION_LUX.md`** en la raíz de la carpeta de infraestructura.
*   **NO** escribir contraseñas en el código fuente. Usar variables de entorno (`.env`).

### Regla #4: Puertos Prohibidos 🚫
*   **NO** intentar abrir puertos nuevos en el firewall (iptables/Oracle) a menos que sea estrictamente necesario.
*   Usar los puertos estándar ya abiertos: `80`, `443`, `8000` (Coolify), `8090` (PocketBase).
*   Si despliegas una App nueva, dejá que Coolify asigne el puerto interno dinámicamente.

---

## 3. Snippets Útiles (Copiar y Pegar)

### Configuración Típica de Next.js en Coolify
Si despliegas una app Next.js en Coolify, asegurar:
*   **Build Command:** `npm run build`
*   **Start Command:** `npm start`
*   **Port:** `3000` (Exposed Port)

### Script de Migración Rápida (PocketBase)
Si necesitas crear una colección `posts` rápidamente vía API:
*(Pedir token de admin al usuario primero)*.
```javascript
const pb = new PocketBase('http://129.213.26.212:8090');
await pb.admins.authWithPassword('omega3031@gmail.com', '***'); // Pedir pass
await pb.collections.create({
    name: 'posts',
    type: 'base',
    schema: [
        {name: 'title', type: 'text', required: true},
        {name: 'content', type: 'editor'}
    ]
});
```
