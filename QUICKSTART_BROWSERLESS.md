# 🎯 QUICK START - Browserless.io

## ¿Qué cambió?

✅ **API Route actualizada** (`/api/generate-pdf`)
- Ahora usa Browserless.io para PDFs profesionales
- Fallback automático si no está configurado

✅ **Frontend actualizado** (EbitdaDashboard + GraphView)
- Detecta PDFs de Browserless (calidad profesional)
- Mensaje verde: "PDF generado con Browserless.io"
- Mensaje amarillo: "Fallback dom-to-image" (sin configurar)

## 🚀 Para activar calidad profesional:

### 1️⃣ Obtén tu token GRATIS (2 minutos):
```
1. Ve a: https://www.browserless.io/
2. Sign Up (email + contraseña)
3. Copia tu API Token del dashboard
```

### 2️⃣ Configura en LOCAL (desarrollo):
```bash
# 1. Crear archivo de configuración
cp .env.local.example .env.local

# 2. Editar .env.local y pegar tu token:
BROWSERLESS_API_TOKEN=tu_token_aqui

# 3. Reiniciar servidor
npm run dev
```

### 3️⃣ Configura en VERCEL (producción):
```
1. Ir a: https://vercel.com/dashboard
2. Tu proyecto → Settings → Environment Variables
3. Agregar nueva:
   Key: BROWSERLESS_API_TOKEN
   Value: tu_token_aqui
   Environments: Todos ✓
4. Save
5. Redeploy (git push o manual)
```

## ✅ Verificar que funciona:

### Desarrollo:
```bash
npm run dev
# Abrir http://localhost:3000
# Exportar PDF
# Ver consola: "✅ PDF generado con Browserless.io exitosamente"
# Mensaje verde en UI
```

### Producción:
```bash
# Después de configurar variable en Vercel
git add .
git commit -m "feat: Integrar Browserless.io para PDFs profesionales"
git push origin main

# Esperar deployment
# Probar PDF en tu app de Vercel
# Mensaje verde = OK ✅
# Mensaje amarillo = Falta configurar token ⚠️
```

## 📊 Plan FREE incluye:
- ✅ 6,000 PDFs/mes (suficiente para mayoría de casos)
- ✅ Calidad profesional (Chrome real)
- ✅ Gradientes, fuentes, colores perfectos
- ✅ Sin cambios en tu código de Vercel

## 🔄 Sin configurar (fallback):
- ⚠️ Sigue funcionando (dom-to-image-more)
- ⚠️ Calidad reducida pero aceptable
- ✅ Sin costo
- ✅ Sin configuración necesaria

---

**Ver guía completa:** `BROWSERLESS_SETUP.md`

**Tiempo total de setup:** 5 minutos ⏱️
