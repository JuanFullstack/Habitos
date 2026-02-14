# 🚀 Guía Maestra de Despliegue en Vercel

Esta guía documenta el estándar de despliegue utilizado en **LinguaFlow AI** y aplicable a futuros proyectos que requieran integración con servicios backend (como R2) y despliegue automatizado desde PowerShell en Windows.

## 📋 Prerrequisitos

1.  **Node.js instalado**: Para ejecutar npm y npx.
2.  **Cuenta en Vercel**: Debes tener el CLI autorizado o usar un token.
3.  **PowerShell**: Entorno de ejecución para el script de automatización.

---

## 🔑 Datos Críticos de R2 (Cloudflare) que Necesitas

Antes de configurar el script, **debes recopilar los siguientes 4 datos** de tu panel de Cloudflare R2. Sin esto, la aplicación no podrá guardar audios ni archivos:

1.  **Account ID** (`CF_R2_ACCOUNT_ID`): El ID de tu cuenta de Cloudflare (se ve en la URL o el dashboard principal).
2.  **Access Key ID** (`CF_R2_ACCESS_KEY_ID`): La clave de acceso generada al crear un token API R2.
3.  **Secret Access Key** (`CF_R2_SECRET_ACCESS_KEY`): La clave secreta generada junto con el Access Key (¡solo se muestra una vez al crearla!).
4.  **Bucket Name** (`CF_R2_BUCKET`): El nombre exacto de tu bucket (ej. `linguaflow`).

> **💡 Importante:** Asegúrate de que el token API tenga permisos de **Admin Read & Write** sobre el bucket para poder subir archivos.

---

## ❓ Preguntas Frecuentes: R2 y Múltiples Proyectos

**¿Estas credenciales cambian para cada proyecto?**
*   **ACCOUNT_ID:** ❌ No cambia. Es único para toda tu cuenta de Cloudflare.
*   **ACCESS_KEY & SECRET:** ⚠️ Depende de ti. Puedes crear **un solo Token "Admin"** que tenga permiso para *todos* tus buckets y usarlo en todos tus proyectos (más fácil). O puedes crear un token específico para cada proyecto (más seguro).
*   **BUCKET:** ✅ Sí cambia. Cada proyecto debería tener su propio bucket (ej: `linguaflow`, `chat-app`, `ecommerce`) para no mezclar archivos.

**¿Cuántos buckets puedo tener?**
*   **Ilimitado:** Cloudflare R2 te permite crear **cuantos buckets quieras**, prácticamente sin límite.
*   **Costo:** Pagas por el almacenamiento total consumido y las operaciones (lectura/escritura), **no por la cantidad de buckets**. Tienes una capa gratuita ("Free Tier") de 10GB al mes que se comparte entre todos tus proyectos.

---

## 🛠️ Estructura del Despliegue

En lugar de usar la integración automática de GitHub (que puede ser lenta o compleja de configurar con variables secretas monorepo), utilizamos un script local **`deploy.ps1`**.

Este script hace 3 cosas clave:
1.  Define localmente las variables de entorno críticas (ej. Credenciales de Cloudflare R2).
2.  Construye el comando de Vercel inyectando estas variables `--env`.
3.  Ejecuta el despliegue a producción (`--prod`) saltándose confirmaciones (`--yes`).

---

## 📄 Plantilla del Script `deploy.ps1`

Crea un archivo llamado `deploy.ps1` en la raíz de tu proyecto con el siguiente contenido. Asegúrate de actualizar los valores de las credenciales para cada nuevo proyecto.

```powershell
# 🚀 Deploy Script Estándar
# Uso: .\deploy.ps1

Write-Host "Iniciando despliegue a Vercel..." -ForegroundColor Cyan

# ---------------------------------------------------------
# 1. ACTUALIZA TUS VARIABLES DE ENTORNO AQUI
# ---------------------------------------------------------
# Ejemplo base: Credenciales de Cloudflare R2 (Storage)
# REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO
$env:CF_R2_ACCOUNT_ID = "7b815a1776578da9da6408bc07b4c1d7"
$env:CF_R2_ACCESS_KEY_ID = "9d4e25df90c838faeaf1ba2c70125c15"
$env:CF_R2_SECRET_ACCESS_KEY = "e49c369a56235290543a16f5992847a14d79f0f7f8b88cee6ff24b17c13a1518"
$env:CF_R2_BUCKET = "linguaflow"

# Token de Vercel (Puedes generarlo en Settings > Tokens)
# Si ya estás logueado en CLI (`vercel login`), puedes omitir el token,
# pero para automatización pura es mejor tenerlo.
$VERCEL_TOKEN = "TU_VERCEL_TOKEN_OPCIONAL" 

Write-Host "Construyendo y subiendo..." -ForegroundColor Yellow

# ---------------------------------------------------------
# 2. COMANDO DE DESPLIEGUE
# ---------------------------------------------------------
# Nota: --prod fuerza producción. --yes salta confirmaciones.
# Inyectamos las variables con --env para que estén disponibles en el build/server.

$cmd = "npx vercel --prod --yes " 

if ($VERCEL_TOKEN) {
    $cmd += "--token $VERCEL_TOKEN "
}

# Agrega aquí cada variable que definiste arriba
$cmd += "--env CF_R2_ACCOUNT_ID=$env:CF_R2_ACCOUNT_ID " +
        "--env CF_R2_ACCESS_KEY_ID=$env:CF_R2_ACCESS_KEY_ID " +
        "--env CF_R2_SECRET_ACCESS_KEY=$env:CF_R2_SECRET_ACCESS_KEY " +
        "--env CF_R2_BUCKET=$env:CF_R2_BUCKET"

# ---------------------------------------------------------
# 3. EJECUCIÓN
# ---------------------------------------------------------
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
}
else {
    Write-Host "❌ Error en el despliegue." -ForegroundColor Red
}
```

---

## 🚦 Cómo Ejecutar el Despliegue

1.  Abre tu terminal (PowerShell o VSCode).
2.  Asegúrate de estar en la raíz del proyecto.
3.  Ejecuta:
    ```powershell
    .\deploy.ps1
    ```

## 💡 Notas Importantes

*   **Mixed Content / HTTPS**: Vercel sirve todo por HTTPS. Si tu proyecto intenta conectarse a un servidor HTTP (como una IP directa), fallará. Usa siempre servicios con HTTPS (como Cloudflare R2 via https://pub-xxx.r2.dev).
*   **Variables de Entorno**: Al usar este script, **NO** necesitas configurar las variables manualmente en el panel web de Vercel. El script las inyecta en cada despliegue. Esto es ideal para iterar rápido.
*   **Token**: Si obtienes errores de autenticación, genera untoken en Vercel (Account Settings > Tokens) y ponlo en el script, o ejecuta `npx vercel login` una vez en tu máquina.

## 📦 Configuración `vercel.json` (Opcional)

Si necesitas configurar headers (CORS), rutas o rewrites, crea un `vercel.json` en la raíz:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```
