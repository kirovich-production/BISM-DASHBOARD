# 🔐 Sistema de Sesiones (DB Sessions)

## 📋 Descripción

Este proyecto utiliza **Database Sessions** para manejar la persistencia de usuarios de forma segura y profesional, ideal para producción.

## 🎯 Ventajas sobre localStorage

| Característica | localStorage | DB Sessions |
|----------------|--------------|-------------|
| **Seguridad** | ⚠️ Vulnerable a XSS | ✅ HttpOnly cookies |
| **Validación** | ❌ Solo cliente | ✅ Servidor valida siempre |
| **Usuario eliminado** | ❌ Persiste dato obsoleto | ✅ Auto-invalida sesión |
| **Multi-device** | ❌ Por navegador | ✅ Puede sincronizarse |
| **Producción** | ⚠️ No recomendado | ✅ Estándar de industria |

## 🏗️ Arquitectura

```
┌─────────────┐
│   Cliente   │
│  (Browser)  │
└──────┬──────┘
       │ 1. Selecciona usuario
       │
       ▼
┌──────────────────────────┐
│  POST /api/auth/session  │
│  - Valida usuario existe │
│  - Crea sesión en DB     │
│  - Set cookie httpOnly   │
└──────────────────────────┘
       │
       │ 2. Cookie: bism_session_id
       ▼
┌─────────────────────────┐
│   MongoDB - sessions    │
│  {                      │
│    sessionId: "uuid"    │
│    userId: "123"        │
│    userName: "Juan"     │
│    expiresAt: Date      │
│  }                      │
└─────────────────────────┘
       │
       │ 3. En cada request
       ▼
┌──────────────────────────┐
│  GET /api/auth/session   │
│  - Lee cookie            │
│  - Valida en DB          │
│  - Verifica usuario      │
│  - Retorna datos o error │
└──────────────────────────┘
```

## 📁 Estructura de Archivos

```
app/
├── api/
│   └── auth/
│       ├── session/
│       │   └── route.ts       # CRUD de sesiones
│       └── cleanup/
│           └── route.ts       # Limpieza de sesiones expiradas
lib/
└── sessionCleanup.ts          # Utilidades de limpieza
types/
└── index.ts                   # Interface UserSession
```

## 🔄 Flujo de Autenticación

### 1. Usuario Selecciona Usuario

```typescript
// page.tsx
const handleUserChange = (userId, userName) => {
  // Crear sesión en servidor
  await fetch('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ userId, userName })
  });
};
```

### 2. Servidor Crea Sesión

```typescript
// app/api/auth/session/route.ts
export async function POST(request) {
  // ✅ Validar usuario existe
  const userExists = await db.users.findOne({ id: userId });
  if (!userExists) return error;
  
  // 💾 Crear sesión
  const session = {
    sessionId: randomUUID(),
    userId,
    userName,
    expiresAt: new Date(+7 days)
  };
  await db.sessions.insertOne(session);
  
  // 🍪 Guardar en cookie httpOnly
  response.cookies.set('bism_session_id', sessionId, {
    httpOnly: true,
    secure: true,
    maxAge: 7 days
  });
}
```

### 3. Cliente Recarga Página

```typescript
// page.tsx - useEffect
useEffect(() => {
  // Validar sesión existente
  const response = await fetch('/api/auth/session');
  const result = await response.json();
  
  if (result.success) {
    // Sesión válida, restaurar usuario
    setSelectedUserId(result.userId);
    setSelectedUserName(result.userName);
  }
}, []);
```

### 4. Servidor Valida Sesión

```typescript
// app/api/auth/session/route.ts
export async function GET(request) {
  // 🍪 Leer cookie
  const sessionId = request.cookies.get('bism_session_id');
  
  // 🔍 Buscar en DB
  const session = await db.sessions.findOne({ sessionId });
  if (!session) return error;
  
  // ⏰ Verificar expiración
  if (new Date() > session.expiresAt) {
    await db.sessions.deleteOne({ sessionId });
    return error;
  }
  
  // ✅ Verificar usuario existe
  const user = await db.users.findOne({ id: session.userId });
  if (!user) {
    // Usuario eliminado, invalidar sesión
    await db.sessions.deleteOne({ sessionId });
    return error;
  }
  
  // ✅ Todo OK, retornar datos
  return { success: true, userId, userName };
}
```

## 🗑️ Limpieza de Sesiones

### Automática (Recomendado en Producción)

**Opción 1: Cron Job (Vercel, AWS, etc.)**

```bash
# Cada hora
0 * * * * curl https://tu-app.com/api/auth/cleanup
```

**Opción 2: Vercel Cron**

```json
// vercel.json
{
  "crons": [{
    "path": "/api/auth/cleanup",
    "schedule": "0 */6 * * *"  // Cada 6 horas
  }]
}
```

### Manual

```bash
# Via API
curl https://localhost:3000/api/auth/cleanup

# O desde código
import { cleanExpiredSessions } from '@/lib/sessionCleanup';
await cleanExpiredSessions();
```

## 🔐 Seguridad

### Cookies HttpOnly

```typescript
response.cookies.set('bism_session_id', sessionId, {
  httpOnly: true,      // ✅ No accesible desde JS (anti-XSS)
  secure: true,        // ✅ Solo HTTPS en producción
  sameSite: 'lax',     // ✅ Protección CSRF
  maxAge: 604800       // ✅ 7 días
});
```

### Validación en Cada Request

- ✅ Sesión existe en DB
- ✅ Sesión no expirada
- ✅ Usuario aún existe
- ✅ Actualiza última actividad

## 📊 Modelo de Datos

### Colección: `sessions`

```typescript
{
  sessionId: string      // UUID único (índice)
  userId: string         // ID del usuario (índice)
  userName: string       // Desnormalizado para performance
  createdAt: Date        // Cuándo se creó
  expiresAt: Date        // Cuándo expira (índice para limpieza)
  lastActivityAt: Date   // Última actividad (para renovar)
  userAgent?: string     // Navegador (opcional)
  ipAddress?: string     // IP (opcional)
}
```

### Índices Recomendados

```javascript
// MongoDB
db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 });
```

## 🧪 Testing

### Probar Creación de Sesión

```bash
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "userName": "Juan"}'
```

### Probar Validación de Sesión

```bash
curl http://localhost:3000/api/auth/session \
  -H "Cookie: bism_session_id=tu-session-id"
```

### Probar Cierre de Sesión

```bash
curl -X DELETE http://localhost:3000/api/auth/session \
  -H "Cookie: bism_session_id=tu-session-id"
```

## 🚀 Despliegue a Producción

### 1. Variables de Entorno

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=bism_production
NODE_ENV=production
```

### 2. Configurar Limpieza Automática

Agrega a `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/auth/cleanup",
    "schedule": "0 */12 * * *"
  }]
}
```

### 3. Monitoreo

```typescript
// Logs importantes
[SESSION] ✅ Nueva sesión creada
[SESSION] ❌ Usuario de sesión fue eliminado
[SESSION] ⏰ Sesión expirada
[CLEANUP] 🗑️ X sesiones expiradas eliminadas
```

## 📝 Notas

- **Duración:** 7 días por defecto (configurable en `SESSION_DURATION_DAYS`)
- **Una sesión por usuario:** Al crear nueva sesión, se eliminan las anteriores
- **Auto-limpieza:** Las sesiones expiradas se eliminan automáticamente
- **Usuario eliminado:** Sus sesiones se invalidan automáticamente

## 🔄 Migración desde localStorage

Si ya usabas localStorage:

1. ✅ El nuevo sistema ya está implementado
2. ⚠️ Las sesiones antiguas de localStorage quedarán huérfanas
3. 💡 Solución: Al cargar la app, si no hay sesión válida, pedir al usuario que vuelva a seleccionar

```typescript
// Ya implementado en page.tsx
useEffect(() => {
  const loadSession = async () => {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      // No hay sesión, mostrar selector de usuario
    }
  };
}, []);
```

## 🆘 Troubleshooting

### "No hay sesión activa"

- Verifica que la cookie `bism_session_id` existe (DevTools → Application → Cookies)
- Revisa que MongoDB esté corriendo
- Verifica logs del servidor

### "Usuario no existe"

- El usuario fue eliminado de la BD
- La sesión se invalida automáticamente
- El usuario debe volver a seleccionarse

### Sesiones no expiran

- Verifica que el cron job esté configurado
- Llama manualmente a `/api/auth/cleanup`
- Revisa logs: `[CLEANUP] 🗑️ X sesiones eliminadas`
