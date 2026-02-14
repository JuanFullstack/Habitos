# 🦁 INFRAESTRUCTURA BACKEND: SERVIDOR LUX (POCKETBASE)
> **AI ASSISTANT: LEER ESTO PRIMERO.**
> Este proyecto utiliza un Backend dedicado y persistente alojado en Oracle Cloud (Instancia ARM "Lux").
> **NO PROPOSER** otras bases de datos (Firebase, Supabase, MongoDB Atlas) ni soluciones locales (SQLite local) a menos que sea explícitamente solicitado.

---

## 1. Credenciales de Conexión
El backend ya está desplegado y funcionando. Usar los siguientes parámetros para conectar el Frontend o Scripts:

*   **URL de la API:** `http://129.213.26.212:8090` (HTTP Puro - Ignorar advertencias de SSL/CORS en desarrollo).
*   **Panel Administrativo (UI):** `http://129.213.26.212:8090/_/`
*   **Tecnología:** PocketBase (v0.22.3+) ejecutándose en Ubuntu ARM64.
*   **SDK Recomendado:** `pocketbase` (JavaScript/TypeScript) o API REST pura.
*   **Nota de Acceso:** En este contexto de proyecto, **NO** asumas acceso SSH al servidor salvo que se provean las llaves `.key` explícitamente. Manejar todo vía API/SDK.

---

## 2. Standard de Implementación (Copiar y Pegar)

Para conectar este proyecto, instalar el SDK oficial:
```bash
npm install pocketbase
```

Usar SIEMPRE este patrón de inicialización (Singleton):

```javascript
import PocketBase from 'pocketbase';

// Conexión Directa al Servidor Lux
export const pb = new PocketBase('http://129.213.26.212:8090');

// Desactivar auto-cancelación de peticiones (Opcional, recomendado para evitar errores en React 18+)
pb.autoCancellation(false);
```

---

## 3. Manejo de Autenticación y Esquema

### Si necesitás Modificar la Base de Datos (Crear Tablas/Colecciones):
**NO PUEDES** hacerlo desde el código del cliente "público".
1.  Debes pedirle al USUARIO las credenciales de **Admin** (Email/Pass).
2.  Loguearte como admin vía SDK (`pb.admins.authWithPassword`).
3.  Usar la API de administración para crear colecciones.

### Si necesitás Autenticar Usuarios Finales:
Usar el método estándar de colecciones:
```javascript
// Login de usuario normal (no admin)
const authData = await pb.collection('users').authWithPassword('user@email.com', '123456');
```

---

## 4. Manejo de Archivos (Imágenes/Audio)
**REGLA DE ORO:** Nunca subir base64 a la DB. Usar el sistema de archivos nativo de PocketBase.

*   El servidor tiene 150GB de almacenamiento SSD NVMe.
*   Al subir un archivo a una colección tipo `file`, PocketBase devuelve el nombre del archivo.
*   **Para mostrar la imagen:**
    `http://129.213.26.212:8090/api/files/{collectionId_o_Name}/{recordId}/{fileName}`

---

## 5. Instrucciones para el AI (Roleplay)
1.  **Asumir que el backend existe.** No preguntes "¿Quieres que configure un backend?". Ya está ahí.
2.  **Si el usuario pide una nueva funcionalidad:** Genera el script de migración o indicale al usuario qué campos agregar en el Panel Admin (`/_/`).
3.  **No hardcodear passwords.** Si necesitás el pass de Admin para un script de setup, usá variables de entorno o `prompt()`.

---

## 6. Sincronización de Tipos (CRÍTICO PARA LA IA)
Para que la IA entienda la estructura de la base de datos (Colecciones y Campos) sin adivinar, generar el archivo de tipos TypeScript ejecutando en la terminal local:

```bash
npx pocketbase-typegen --db ./pb_schema.json --out pocketbase-types.ts
```
*(Nota: Si no tienes el schema local, describir explícitamente las colecciones existentes a la IA).*
