# 🦁 Bitácora de Guerra: El Karma del Despliegue PocketBase en Coolify (Oracle Cloud)

> **"Si tenés un error 503, es porque tu backend está muerto. Si tenés un error 403, es porque tu backend está vivo pero te odia."**

Esta bitácora documenta todos los problemas ("Karma"), errores y soluciones encontradas durante el despliegue de PocketBase en una instancia Oracle Cloud ARM64 gestionada con Coolify.

---

## 🛑 El Karma #1: "Address already in use" (Puerto 8090)
**Síntoma:**
- Error **503 Service Unavailable** en la web.
- Logs de Coolify en rojo: `Address already in use`.
- El contenedor se reiniciaba infinitamente.

**Causa:**
Teníamos **DOS PocketBase** peleando por el mismo puerto:
1.  El PocketBase "Manual" (instalado ayer por SSH) corriendo como servicio (`systemd`).
2.  El PocketBase "Docker" (que Coolify intentaba levantar).

**Solución (El Exorcismo):**
Entrar por SSH y matar al proceso zombie manual:
```bash
sudo systemctl stop pocketbase
# Opcional para asegurar que no reviva al reiniciar el servidor:
sudo systemctl disable pocketbase
```
Luego en Coolify: **Deploy** (para recrear el contenedor).

---

## 👻 El Karma #2: El Admin Fantasma
**Síntoma:**
- Al entrar a `/_/` (Panel Admin), pedía Login en vez de "Create Admin".
- No sabíamos la contraseña autogenerada por Coolify.
- Las variables de entorno `ADMIN_EMAIL` no funcionaban.

**Intentos Fallidos:**
- Cambiar `PB_DATA_DIR` para forzar una carpeta nueva (casi funciona, pero complicó los volúmenes).
- Borrar volúmenes de Docker a mano (`rm -rf ...`).

**Solución Definitiva (La Bala de Plata 🔫):**
Crear el usuario admin **DIRECTAMENTE ADENTRO DEL CONTENEDOR** usando la terminal SSH.

---

## 💥 El Karma #3: El Comando Maldito (`admin` vs `superuser`)
**Síntoma:**
- Intentamos usar el comando clásico: `./pocketbase admin create ...`
- Error: **`unknown command "admin"`**.

**Causa:**
PocketBase cambió la sintaxis en las versiones nuevas (v0.22+). Ya no se llaman "admins", se llaman "superusers".

**El Comando Ganador 🏆:**
```bash
# 1. Buscar el ID del contenedor
sudo docker ps
# (Copiar el ID, ej: 8831962fe95e)

# 2. Ejecutar el comando mágico
sudo docker exec -it <CONTAINER_ID> /app/pocketbase superuser create tu_email@gmail.com tu_password
```

---

## 🔒 El Karma #4: "Forbidden 403" / "Only superusers"
**Síntoma:**
- El Frontend cargaba, pero los gráficos estaban vacíos.
- Consola del navegador llena de errores rojos: `403 Forbidden` y `400 Bad Request`.
- Mensaje: *"Only superusers can perform this action"*.

**Causa:**
Las colecciones en PocketBase nacen **PRIVADAS** por defecto. El Frontend (público) no tenía permiso para leer `daily_logs`.

**Solución:**
1.  Ir a **Settings (⚙️) -> API Rules** de la colección.
2.  Desbloquear los candados (List, View, Create, Update, Delete).
3.  Dejar el campo vacío (que diga "Public/Anyone").
4.  Guardar cambios.

---

## 🌐 El Karma #5: SSL y Dominios (`sslip.io`)
**Síntoma:**
- Error `NET::ERR_CERT_AUTHORITY_INVALID` o "No es seguro".
- Let's Encrypt bloqueó la IP por "Rate Limiting" (demasiados intentos fallidos).

**Estado Actual:**
- **Backend (PocketBase):** Funciona con HTTPS (`https://pb-juan...`).
- **Frontend (Web):** A veces carga como "No seguro" (HTTP).
- **Solución a Futuro:** Esperar que se desbloquee Let's Encrypt o usar un dominio propio (`duckdns` o comprado).

---

## ✅ Resumen de Comandos Útiles (SSH)

| Acción | Comando |
| :--- | :--- |
| **Ver contenedores** | `sudo docker ps` |
| **Ver logs de un contenedor** | `sudo docker logs <CONTAINER_ID>` |
| **Entrar al contenedor** | `sudo docker exec -it <CONTAINER_ID> /bin/sh` |
| **Crear Superuser** | `sudo docker exec -it <ID> /app/pocketbase superuser create <EMAIL> <PASS>` |
| **Reiniciar Coolify** | `sudo docker restart coolify` |
| **Matar proceso rebelde** | `sudo killall pocketbase` |
