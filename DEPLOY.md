# BISM Dashboard - Instrucciones de Deploy

## 🚀 Variables de Entorno Requeridas

Para que la aplicación funcione en Vercel, **DEBES configurar estas variables de entorno**:

### En Vercel Dashboard:

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto **BISM-DASHBOARD**
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables para **Production, Preview y Development**:

```
MONGODB_URI=mongodb+srv://kirovich_dev:%408%40HcHDzUgHweD%2AA@kirovich.oedv2gq.mongodb.net/
MONGODB_DATABASE=bism-data
```

### Importante:
- Después de agregar las variables, debes hacer un **Redeploy** del proyecto
- Ve a **Deployments** → selecciona el último deployment → **Redeploy**
- O simplemente haz un nuevo commit y push

## 🔧 Desarrollo Local

Copia `.env.example` a `.env.local` y configura tus variables:

```bash
cp .env.example .env.local
```

## 📦 Scripts Disponibles

```bash
npm run dev      # Inicia el servidor de desarrollo
npm run build    # Construye la aplicación para producción
npm run start    # Inicia el servidor de producción
```

## 🏗️ Tecnologías

- Next.js 16
- MongoDB
- TypeScript
- Tailwind CSS
- Vercel (Deploy)
