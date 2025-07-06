# Evolution Backend Provider

Backend en NestJS con integración OAuth2 para Go High Level, MongoDB y Evolution API.

## Tecnologías principales

- [NestJS](https://nestjs.com/)
- [Mongoose](https://mongoosejs.com/) + [@nestjs/mongoose](https://docs.nestjs.com/techniques/mongodb)
- [Go High Level API v2](https://highlevel.stoplight.io/docs/integrations/)
- [Evolution API](https://doc.evolution-api.com/)

## Configuración de entorno

El proyecto utiliza un archivo `.env` para gestionar credenciales y configuración. Ejemplo:

```env
# Go High Level OAuth2 Credentials
GHL_CLIENT_ID=68685634707918512c0d0f58-mcpfxcgr
GHL_CLIENT_SECRET=40091997-0eb3-4fe1-b7ad-0e536a4121b9
GHL_REDIRECT_URI=http://localhost:3000/oauth/callback
GHL_SCOPES=contacts.readonly contacts.write locations.readonly conversations/message.write users.readonly

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/evolutiondb

# Evolution API Configuration
EVOLUTION_API_KEY=tu_clave_de_evolution_api

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

## Documentación de Endpoints

### 🔐 OAuth2 Go High Level

#### `GET /oauth`

- **Descripción**: Inicia el flujo OAuth2 redirigiendo al usuario a Go High Level
- **Respuesta**: Redirección a la página de autorización de GHL
- **Ejemplo**:
  ```bash
  curl "http://localhost:3000/oauth"
  ```

#### `GET /oauth/callback`

- **Descripción**: Callback de OAuth2 que recibe el código de autorización
- **Parámetros**: `code` (query parameter)
- **Respuesta**: Redirección al frontend tras procesar el token
- **Funcionalidad**: Automáticamente actualiza el `ghlAuth` del usuario correspondiente

#### `GET /oauth/token`

- **Descripción**: Obtiene manualmente el access token usando un código
- **Parámetros**:
  - `code` (query parameter) - Código de autorización
  - `user_type` (query parameter, opcional)
- **Respuesta**:
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "...",
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "...",
      "scope": "...",
      "locationId": "..."
    }
  }
  ```

#### `POST /oauth`

- **Descripción**: Manejo interno de OAuth para Lead Connector
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Datos OAuth específicos
- **Respuesta**: Procesamiento interno de OAuth

---

### 👥 Gestión de Usuarios

#### `POST /users`

- **Descripción**: Crear un nuevo usuario
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "locationId": "string (opcional)"
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "success",
    "user": { ... }
  }
  ```

#### `GET /users`

- **Descripción**: Obtener todos los usuarios
- **Respuesta**: Array de usuarios con sus datos completos

#### `GET /users/:id`

- **Descripción**: Obtener un usuario por ID
- **Parámetros**: `id` (user ID)
- **Respuesta**: Datos del usuario específico

#### `GET /users/location/:locationId`

- **Descripción**: Buscar usuario por locationId
- **Parámetros**: `locationId` (GHL location ID)
- **Respuesta**:
  ```json
  {
    "status": "success",
    "user": {
      "username": "...",
      "email": "...",
      "locationId": "...",
      "ghlAuth": { ... },
      "evolutionInstances": [...]
    }
  }
  ```

#### `PUT /users/:id`

- **Descripción**: Actualizar un usuario
- **Parámetros**: `id` (user ID)
- **Body**: Datos parciales del usuario a actualizar
- **Respuesta**: Usuario actualizado

#### `DELETE /users/:id`

- **Descripción**: Eliminar un usuario
- **Parámetros**: `id` (user ID)
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "User deleted"
  }
  ```

---

### 📱 Evolution API - Gestión de Instancias

#### `POST /evolution/instance/create-basic`

- **Descripción**: Crear una instancia básica de WhatsApp con nombre único automático
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "number": "string (opcional)"
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Instancia básica creada exitosamente",
    "data": {
      "instanceName": "wh_12345",
      "qrcode": "data:image/png;base64...",
      "connectionStatus": "disconnected"
    }
  }
  ```
- **Nota**: El `instanceName` se genera automáticamente basado en el número (ej: `wh_67890`) o aleatoriamente si no se proporciona número

#### `GET /evolution/instances`

- **Descripción**: Obtener todas las instancias de Evolution API
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Lista de instancias obtenida exitosamente",
    "data": [
      {
        "instance": {
          "instanceName": "wh_12345",
          "connectionStatus": "open",
          "ownerJid": "5491234567890@s.whatsapp.net"
        }
      }
    ]
  }
  ```

#### `GET /evolution/instance/:instanceName`

- **Descripción**: Obtener información específica de una instancia
- **Headers**: `Authorization: Bearer <token>`
- **Parámetros**: `instanceName` (nombre de la instancia)
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Información de instancia obtenida exitosamente",
    "data": {
      "instance": {
        "instanceName": "wh_12345",
        "connectionStatus": "open",
        "ownerJid": "5491234567890@s.whatsapp.net"
      }
    }
  }
  ```

#### `DELETE /evolution/instance/:instanceName`

- **Descripción**: Eliminar una instancia específica
- **Headers**: `Authorization: Bearer <token>`
- **Parámetros**: `instanceName` (nombre de la instancia)
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Instancia eliminada exitosamente",
    "data": { ... }
  }
  ```

---

### 💬 Evolution API - Mensajería

#### `POST /evolution/message`

- **Descripción**: Enviar mensaje de texto a través de Evolution API
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "conversationId": "string",
    "message": "string",
    "contact": {
      "id": "string",
      "phone": "string"
    },
    "locationId": "string"
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Mensaje enviado a Evolution API"
  }
  ```

#### `POST /evolution/webhook`

- **Descripción**: Webhook para recibir mensajes entrantes de Evolution API
- **Body**:
  ```json
  {
    "remoteJid": "string",
    "instance": "string",
    "message": "string"
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Webhook recibido"
  }
  ```

#### `POST /evolution/leadconnector/oauth`

- **Descripción**: Manejo interno de OAuth para Lead Connector
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Datos específicos de Lead Connector
- **Respuesta**:
  ```json
  {
    "status": "success",
    "data": "created"
  }
  ```

---

## 🗄️ Estructura de Datos

### Usuario (User Schema)

```typescript
{
  username: string,        // Único
  email: string,          // Único
  password: string,
  locationId: string,     // Default: 'JVNpuC2h3NmmWohtPTQ5'
  ghlAuth: {              // Datos OAuth de GHL
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string,
    refreshTokenId?: string,
    userType: string,
    companyId: string,
    locationId: string,
    isBulkInstallation?: boolean,
    userId: string
  },
  evolutionInstances: [    // Instancias de WhatsApp
    {
      id: string,
      name: string,
      connectionStatus: string,
      ownerJid: string,
      token: string
    }
  ]
}
```

---

## 🔄 Flujos de Trabajo

### 1. Flujo OAuth2 completo

1. `GET /oauth` → Redirección a GHL
2. Usuario autoriza en GHL
3. `GET /oauth/callback?code=...` → Procesamiento automático
4. Actualización automática de `ghlAuth` en el usuario correspondiente
5. Redirección al frontend

### 2. Flujo de creación de instancia WhatsApp

1. `POST /evolution/instance/create-basic` con número opcional
2. Generación automática de nombre único (`wh_12345`)
3. Creación de instancia en Evolution API
4. Retorno de datos de instancia y QR code

### 3. Flujo de mensajería

1. `POST /evolution/message` → Envío de mensaje
2. `POST /evolution/webhook` → Recepción de respuestas
3. Procesamiento y logs automáticos

---

## 🚀 Instalación y Uso

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run start:dev

# Ejecutar en producción
npm run build
npm run start:prod
```

---

## 📋 Notas Importantes

- **Autenticación**: La mayoría de endpoints requieren token Bearer
- **Nombres únicos**: Las instancias de Evolution se generan con nombres únicos automáticamente
- **Integración automática**: El OAuth actualiza automáticamente los datos del usuario
- **Logs detallados**: Todos los servicios incluyen logs con branding WhatHub GateWay
- **Manejo de errores**: Respuestas consistentes con formato estándar

---

> Para más información sobre las APIs integradas, consulta:
>
> - [Documentación de Go High Level](https://highlevel.stoplight.io/docs/integrations/)
> - [Documentación de Evolution API](https://doc.evolution-api.com/)
