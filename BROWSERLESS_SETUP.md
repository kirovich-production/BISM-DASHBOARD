# 🚀 Configuración de Browserless.io para PDFs Profesionales

## 📋 Pasos para configurar Browserless.io

### 1. Crear cuenta gratuita

1. Ir a https://www.browserless.io/
2. Hacer clic en "Start Free Trial" o "Sign Up"
3. Registrarte con tu email
4. Verificar email

### 2. Obtener API Token

1. Una vez logueado, ir al dashboard: https://cloud.browserless.io/
2. En la sección **"API Tokens"** o **"Account"**, encontrarás tu token
3. Copiar el token (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 3. Configurar en desarrollo local

1. Crear archivo `.env.local` en la raíz del proyecto:
```bash
cp .env.local.example .env.local
```

2. Editar `.env.local` y agregar tu token:
```env
BROWSERLESS_API_TOKEN=tu_token_copiado_aqui
```

3. Reiniciar el servidor de desarrollo:
```bash
npm run dev
```

### 4. Configurar en Vercel (Producción)

#### Opción A: Desde Vercel Dashboard (Recomendado)

1. Ir a tu proyecto en Vercel: https://vercel.com/dashboard
2. Click en tu proyecto `bism-dashboard`
3. Ir a **Settings** → **Environment Variables**
4. Agregar nueva variable:
   - **Key**: `BROWSERLESS_API_TOKEN`
   - **Value**: Tu token de Browserless
   - **Environments**: Production, Preview, Development (seleccionar todos)
5. Click en **Save**
6. Hacer un nuevo deploy (push a main o redeploy manual)

#### Opción B: Desde Vercel CLI

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Agregar variable de entorno
vercel env add BROWSERLESS_API_TOKEN production

# Pegar tu token cuando te lo pida
# Repetir para preview y development si quieres
```

### 5. Verificar funcionamiento

#### En desarrollo:
1. Abrir http://localhost:3000
2. Cargar datos
3. Hacer clic en "Exportar PDF"
4. Ver en consola: `✅ PDF generado con Browserless.io exitosamente`
5. Mensaje verde: "PDF generado con Browserless.io (calidad profesional)"

#### En producción:
1. Abrir tu app en Vercel
2. Hacer lo mismo
3. Si ves mensaje amarillo "usando fallback", revisar:
   - Variable de entorno configurada en Vercel
   - Logs de Vercel (ver errores de API)

---

## 📊 Planes y Límites

| Plan | Costo | PDFs/mes | Concurrent | Mejor para |
|------|-------|----------|------------|------------|
| **Free** | $0 | 6,000 | 2 | Testing y startups pequeñas |
| **Startup** | $30/mes | 30,000 | 5 | Pequeñas empresas |
| **Business** | $100/mes | 120,000 | 20 | Empresas medianas |

### ¿Cuántos PDFs necesitas?

- **1 usuario** generando ~200 PDFs/mes = FREE ✅
- **10 usuarios** = ~2,000 PDFs/mes = FREE ✅
- **30 usuarios** = ~6,000 PDFs/mes = FREE ✅
- **100+ usuarios** = Considerar plan Startup

---

## 🔄 Comportamiento del Sistema

### Con Browserless configurado:
```
1. Usuario hace clic "Exportar PDF"
2. Frontend envía HTML a /api/generate-pdf
3. API llama a Browserless.io
4. Browserless renderiza con Chrome real
5. Retorna PDF de alta calidad
6. Usuario descarga PDF profesional
```

### Sin Browserless (fallback automático):
```
1. Usuario hace clic "Exportar PDF"
2. Frontend envía HTML a /api/generate-pdf
3. API detecta: no hay BROWSERLESS_API_TOKEN
4. API retorna: { useClientFallback: true }
5. Frontend usa dom-to-image-more (calidad reducida)
6. Usuario descarga PDF (funcional pero pixelado)
```

**El sistema SIEMPRE funciona**, con o sin Browserless. La diferencia es la calidad del PDF.

---

## 🎯 Comparación Visual

### Con Browserless.io:
✅ Gradientes perfectos  
✅ Fuentes nítidas  
✅ Gráficos en alta resolución  
✅ Colores exactos (lab(), oklch(), etc.)  
✅ Sombras y efectos preservados  

### Sin Browserless (fallback):
⚠️ Gradientes comprimidos o perdidos  
⚠️ Fuentes algo pixeladas  
⚠️ Gráficos en resolución media  
⚠️ Algunos colores aproximados  
⚠️ Sombras y efectos simplificados  

---

## 🐛 Troubleshooting

### Error: "Browserless no disponible, usando fallback"

**Causas posibles:**

1. **Token no configurado**
   - Verificar `.env.local` en desarrollo
   - Verificar Environment Variables en Vercel

2. **Token inválido**
   - Verificar que el token esté completo
   - Probar generar nuevo token en Browserless dashboard

3. **Plan Free agotado** (>6,000 PDFs en el mes)
   - Ver usage en Browserless dashboard
   - Esperar inicio de mes o upgrade a plan pago

4. **Error de red**
   - Verificar que Vercel pueda conectar a chrome.browserless.io
   - Revisar Vercel Function Logs

### Ver logs en Vercel:

1. Ir a tu proyecto en Vercel
2. Click en **Deployments**
3. Click en el deployment más reciente
4. Click en **Functions** → `api/generate-pdf`
5. Ver logs en tiempo real

### Probar API manualmente:

```bash
# Reemplazar YOUR_TOKEN con tu token real
curl -X POST https://chrome.browserless.io/pdf?token=YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Test</h1>","options":{"format":"Letter"}}' \
  --output test.pdf
```

Si esto funciona, tu token es válido.

---

## 💡 Tips de Optimización

### Reducir consumo de PDFs:

1. **Cachear PDFs generados** (si el contenido no cambia frecuentemente)
2. **Ofrecer exportar solo período específico** (ya lo haces ✅)
3. **Limitar frecuencia** (max 1 PDF cada 30 segundos por usuario)

### Código opcional para rate limiting:

```typescript
// En EbitdaDashboard.tsx
const [lastPdfTime, setLastPdfTime] = useState(0);

const handleExportPDF = async () => {
  const now = Date.now();
  if (now - lastPdfTime < 30000) {
    alert('Espera 30 segundos entre cada PDF');
    return;
  }
  setLastPdfTime(now);
  
  // ... resto del código
};
```

---

## 📞 Soporte

- **Browserless Docs**: https://docs.browserless.io/
- **Browserless Support**: support@browserless.io
- **Status Page**: https://status.browserless.io/

---

## ✅ Checklist de Setup

- [ ] Cuenta creada en Browserless.io
- [ ] API Token copiado
- [ ] `.env.local` creado con token (desarrollo)
- [ ] Variable de entorno agregada en Vercel (producción)
- [ ] Nuevo deploy realizado
- [ ] PDF probado en desarrollo - mensaje verde
- [ ] PDF probado en producción - mensaje verde
- [ ] Calidad verificada: gradientes, fuentes, gráficos

**Una vez completado todo, tendrás PDFs profesionales ilimitados (hasta 6K/mes gratis)!** 🎉
