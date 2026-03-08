# 📱 Mi Entrenador Personal — Guía de instalación

## Archivos que necesitas
```
mi-entrenador/
├── index.html       ✅ ya está
├── app.jsx          ✅ ya está (la app completa)
├── manifest.json    ✅ ya está
├── sw.js            ✅ ya está
├── netlify.toml     ✅ ya está
└── LEEME.md         ✅ este archivo
```

---

## PASO 3 — Añade tu API Key a la app

Abre el archivo `app.jsx` con cualquier editor de texto (el Bloc de Notas funciona).

Busca esta línea cerca del principio:

```
// PON TU API KEY AQUÍ
const API_KEY = "TU_API_KEY_AQUI";
```

Reemplaza `TU_API_KEY_AQUI` con tu clave real de Anthropic.
Ejemplo: `const API_KEY = "sk-ant-api03-xxxxxxxxxxxx";`

Guarda el archivo.

---

## PASO 4 — Sube a Netlify (hosting gratuito)

### 4a. Crea una cuenta en Netlify
1. Ve a **netlify.com**
2. Regístrate gratis (puedes usar tu cuenta de Google o GitHub)

### 4b. Sube los archivos
1. Una vez dentro, verás un área grande que dice **"Drag and drop your site folder here"**
2. Arrastra la carpeta `mi-entrenador` completa a esa área
3. Netlify sube todo automáticamente en 30 segundos
4. Te dará una URL del tipo: `https://nombre-aleatorio.netlify.app`

### 4c. Cambia la URL (opcional pero recomendado)
1. Ve a **Site settings → General → Site name**
2. Cámbiala a algo como `mi-coach-2024`
3. Tu URL será: `https://mi-coach-2024.netlify.app`

---

## PASO 5 — Instala en tu móvil como app

### En iPhone (Safari):
1. Abre Safari (importante: no Chrome)
2. Ve a tu URL de Netlify
3. Pulsa el botón de compartir (cuadrado con flecha hacia arriba)
4. Baja y pulsa **"Añadir a pantalla de inicio"**
5. Ponle nombre y pulsa **"Añadir"**
6. ¡Ya tienes el icono en tu pantalla de inicio!

### En Android (Chrome):
1. Abre Chrome
2. Ve a tu URL de Netlify
3. Pulsa los 3 puntos (menú)
4. Pulsa **"Añadir a pantalla de inicio"** o **"Instalar app"**
5. Confirma

---

## 🔒 Seguridad — Lo que debes saber

**Tu URL es privada pero no secreta:**
- La URL de Netlify no aparece en buscadores si no la publicas
- Cualquiera que tenga la URL puede acceder (y usar tu API key)
- **No compartas la URL con nadie**

**Si algún día sospechas que alguien tiene tu URL:**
1. Ve a console.anthropic.com
2. Revoca la API key actual
3. Crea una nueva
4. Actualiza el archivo app.jsx con la nueva key
5. Vuelve a subir a Netlify

**Monitoriza el gasto:**
- Ve a console.anthropic.com → "Usage"
- Si ves un pico de uso inesperado, revoca la key inmediatamente

---

## 🔄 Cómo actualizar la app en el futuro

Si quiero enviarte una versión mejorada de la app:
1. Sustituye el archivo `app.jsx` nuevo en tu carpeta
2. Vuelve a arrastrar la carpeta a Netlify
3. La app se actualiza en segundos en todos tus dispositivos

---

## ❓ Problemas frecuentes

**"La app no carga el chat"**
→ Revisa que la API key en app.jsx esté bien copiada (sin espacios al inicio/final)

**"En iPhone no se instala como app"**
→ Asegúrate de usar Safari, no Chrome. En iOS solo Safari puede instalar PWAs.

**"La app se abre en el navegador, no como app"**
→ Tienes que acceder desde el icono de la pantalla de inicio, no desde el navegador.
