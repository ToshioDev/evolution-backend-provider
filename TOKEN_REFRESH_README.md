# Sistema de Renovación Automática de Tokens GHL

## Descripción

Este sistema implementa la renovación automática de tokens de acceso de GoHighLevel (GHL) que se ejecuta periódicamente para mantener los tokens válidos y actualizados en la base de datos.

## Características

- **Renovación Automática**: Un scheduler verifica cada 5 minutos si hay tokens que están expirados o por expirar
- **Buffer de Seguridad**: Los tokens se renuevan 10 minutos antes de su expiración real
- **Tracking de Fechas**: Se guarda la fecha de creación y expiración de cada token
- **APIs Manuales**: Endpoints para renovar tokens manualmente y verificar su estado
- **Logs Detallados**: Sistema de logging con colores para mejor seguimiento

## Nuevos Campos en GhlAuth

```typescript
interface GhlAuth {
  // ... campos existentes ...
  expires_at?: Date; // Fecha de expiración calculada
  created_at?: Date; // Fecha de creación del token
}
```

## Endpoints Disponibles

### 1. Renovar Todos los Tokens

```http
POST /oauth/refresh-tokens
```

Ejecuta una verificación manual de todos los tokens y renueva los que estén expirados.

### 2. Renovar Token de Usuario Específico

```http
POST /oauth/refresh-token/:locationId
```

Renueva el token de un usuario específico por su `locationId`.

### 3. Estado de Tokens

```http
GET /oauth/token-status
```

Retorna el estado de todos los tokens en el sistema:

```json
{
  "status": "success",
  "data": [
    {
      "locationId": "JVNpuC2h3NmmWohtPTQ5",
      "username": "usuario@example.com",
      "hasRefreshToken": true,
      "isExpired": false,
      "expiresIn": 82399,
      "expiresAt": "2025-07-13T12:00:00.000Z",
      "createdAt": "2025-07-12T12:00:00.000Z"
    }
  ]
}
```

## Configuración del Scheduler

El scheduler se inicia automáticamente cuando la aplicación arranca y:

- Se ejecuta cada **5 minutos**
- Verifica tokens que expiran en los próximos **10 minutos**
- Renueva automáticamente los tokens usando el `refresh_token`
- Actualiza la base de datos con los nuevos tokens

## Variables de Entorno Requeridas

Asegúrate de tener configuradas estas variables:

```env
GHL_CLIENT_ID=tu_client_id
GHL_CLIENT_SECRET=tu_client_secret
```

## Flujo de Renovación

1. **Verificación Periódica**: Cada 5 minutos el sistema verifica todos los usuarios con `ghlAuth`
2. **Detección de Expiración**: Se verifica si `expires_at` está dentro del buffer de 10 minutos
3. **Renovación**: Se usa el `refresh_token` para obtener un nuevo `access_token`
4. **Actualización**: Se actualiza la base de datos con:
   - Nuevo `access_token`
   - Nuevo `refresh_token` (si se proporciona)
   - Nueva fecha `expires_at`
   - Nueva fecha `created_at`

## Manejo de Errores

- Si falla la renovación de un token, se registra el error pero no afecta otros tokens
- Los tokens que no tienen `refresh_token` se omiten
- Los errores de API de GHL se registran con detalles completos

## Logging

El sistema usa logging con colores para identificar fácilmente:

- 🔵 **Azul**: Marca WhatHub Gateway
- 🟢 **Verde**: Operaciones exitosas
- 🟡 **Amarillo**: Advertencias (tokens por expirar)
- 🔴 **Rojo**: Errores

## Consideraciones de Seguridad

- Los `refresh_token` se mantienen seguros en la base de datos
- Las operaciones de renovación se registran para auditoría
- Los tokens expirados se renuevan automáticamente sin intervención manual

## Migración de Datos Existentes

Para tokens existentes sin fechas `expires_at` o `created_at`, el sistema:

1. Calcula la fecha de expiración basada en `created_at + expires_in`
2. Si no hay `created_at`, asume que el token está expirado y lo renueva
