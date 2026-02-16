# 🦁 CONTEXTO DE PROYECTO: INFRAESTRUCTURA LUX (ORACLE ARM)
> **⚠️ AI ASSISTANT: LEER ESTO PRIMERO ANTES DE ESCRIBIR CÓDIGO.**
> Este proyecto se despliega en una infraestructura propia (Self-Hosted) en Oracle Cloud gestionada por **Coolify**.

---

## 1. Arquitectura del Sistema 🏗️

### A. Backend (PocketBase) 🐹
*   **Gestor:** Coolify (Resource: Service > PocketBase).
*   **URL Pública Segura (HTTPS):** `https://pb-juan.129.213.26.212.sslip.io`
    *   *Nota:* Usar siempre esta URL para conectar desde el Frontend.
*   **Admin Panel:** `https://pb-juan.129.213.26.212.sslip.io/_/`
*   **Credenciales:** Ver `DOCUMENTACION_LUX.md` (Usuario: `omega3031@gmail.com`).
*   **Versión:** PocketBase v0.22+ (Usa `superuser` en lugar de `admin`).

### B. Frontend (Vite/React/Next.js) ⚛️
*   **Gestor:** Coolify (Static Site o Dockerfile) o Vercel (Recomendado para menos dolores de cabeza).
*   **URL Pública:** `https://habitos.129.213.26.212.sslip.io` (Ejemplo).
*   **Configuración Vital (Vite):**
    *   En `vite.config.ts`, **SIEMPRE** agregar:
        ```typescript
        server: { allowedHosts: true },
        preview: { allowedHosts: true }
        ```
    *   Sin esto, Coolify tira Error 403 "Forbidden" al intentar entrar a la web.

---

## 2. Instrucciones de Implementación (AI Rules) 🤖

### Regla #1: Despliegue de PocketBase (El Karma) 🧘
Si hay problemas con PocketBase en Coolify, revisar estos puntos críticos:
1.  **Puerto 8090 Ocupado:** Si da Error 503, verificar que no haya un PocketBase "Manual" corriendo en el servidor (`sudo systemctl stop pocketbase`).
2.  **Admin Fantasma:** Si pide login y no sabemos la pass, entrar por SSH y crear un superusuario manual:
    ```bash
    # En el servidor (SSH):
    sudo docker ps  # Buscar ID del contenedor de PocketBase
    sudo docker exec -it <CONTAINER_ID> /app/pocketbase superuser create tu_email@gmail.com tu_pass
    ```
3.  **Colecciones Privadas (403/400):** Las colecciones nuevas son **PRIVADAS** por defecto.
    *   Si el Frontend falla al leer datos, ir a **Settings > API Rules** de la colección y desbloquear los candados (Dejar vacío "Public").

### Regla #2: Conexión Frontend -> Backend 🔌
*   **NUNCA** usar `localhost` o `127.0.0.1` en el código del Frontend desplegado.
*   **Código Frontend (Vite/React):**
    ```typescript
    import PocketBase from 'pocketbase';
    
    // Usar la variable de entorno definida en Coolify/Vercel
    const url = import.meta.env.VITE_PB_URL || 'https://pb-juan.129.213.26.212.sslip.io';
    
    export const pb = new PocketBase(url);
    ```
*   **En Coolify/Vercel:** Configurar la variable de entorno en el proyecto del Frontend:
    *   **Key:** `VITE_PB_URL`
    *   **Value:** `https://pb-juan.129.213.26.212.sslip.io` (HTTPS es obligatorio si el frontend es HTTPS).

### Regla #3: HTTPS y Dominios (`sslip.io`) 🔒
*   Coolify intenta generar certificados Let's Encrypt automáticamente.
*   Si falla (como pasó con el "Rate Limiting"), la app puede quedar en HTTP (`http://...`).
*   **Solución:** Esperar 1 hora o cambiar el subdominio (ej: `pb-juan-v2...`) para pedir un certificado nuevo.

### Regla #4: Modificación del Esquema (Base de Datos) 🛠️
*   **Método Principal:** Usar la Interfaz de Administración Web (`/_/`).
    *   URL: `https://pb-juan.129.213.26.212.sslip.io/_/`
    *   **No intentar crear scripts de migración complejos** a menos que sea estrictamente necesario. Es más rápido y seguro hacerlo visualmente en el panel.
*   **Flujo de Trabajo:**
    1.  Entrar al Admin Panel.
    2.  Editar la Colección (ícono ⚙️).
    3.  Agregar/Editar campos (Botón "New Field").
    4.  **IMPORTANTE:** Si agregas un campo nuevo, actualiza la interfaz TypeScript en el Frontend (`src/types/pocketbase-types.ts` o similar) para que coincida.

---

## 3. Snippets de Supervivencia (SSH & Docker) 🛠️

### Reiniciar un Servicio Trabado
Si Coolify dice "Exited" y no revive con Restart:
1.  Entrar por SSH (`ssh -i key ubuntu@IP`).
2.  Listar contenedores: `sudo docker ps -a`
3.  Ver logs del muerto: `sudo docker logs <ID>`
4.  Si dice "Address in use", matar lo que ocupe el puerto.

### Crear Usuario Admin en PocketBase (v0.22+)
Comando definitivo que funciona dentro del contenedor Docker:
`sudo docker exec -it <CONTAINER_ID> /app/pocketbase superuser create email@test.com password123`
