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

### � Autenticación y Autorización

#### `POST /auth/register`

- **Descripción**: Registrar un nuevo usuario en el sistema
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
    "message": "Usuario registrado exitosamente",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "user_id",
        "username": "username",
        "email": "email@example.com",
        "locationId": "JVNpuC2h3NmmWohtPTQ5"
      }
    }
  }
  ```

#### `POST /auth/login`

- **Descripción**: Iniciar sesión y obtener token de autenticación
- **Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Login exitoso",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "user_id",
        "username": "username",
        "email": "email@example.com",
        "locationId": "JVNpuC2h3NmmWohtPTQ5"
      }
    }
  }
  ```

---

### �👥 Gestión de Usuarios

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

#### `GET /users/me`

- **Descripción**: Obtener datos del usuario autenticado
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Datos del usuario autenticado",
    "data": {
      "id": "user_id",
      "username": "username",
      "email": "email@example.com",
      "locationId": "JVNpuC2h3NmmWohtPTQ5",
      "evolutionInstances": [...]
    }
  }
  ```

#### `GET /users/me/location`

- **Descripción**: Obtener solo el locationId del usuario autenticado
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "LocationId del usuario autenticado",
    "data": {
      "locationId": "JVNpuC2h3NmmWohtPTQ5"
    }
  }
  ```

#### `GET /users/profile`

- **Descripción**: Obtener perfil completo del usuario con token personalizado
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Perfil obtenido con token de usuario",
    "data": {
      "userData": {
        "id": "user_id",
        "username": "username",
        "email": "email@example.com",
        "locationId": "JVNpuC2h3NmmWohtPTQ5",
        "userToken": "custom_token",
        "ghlAuth": {...},
        "evolutionInstances": [...]
      },
      "locationId": "JVNpuC2h3NmmWohtPTQ5",
      "message": "Este endpoint requiere token de usuario personalizado"
    }
  }
  ```

#### `PUT /users/profile`

- **Descripción**: Actualizar perfil del usuario autenticado
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Datos parciales del usuario a actualizar
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Perfil actualizado con token de usuario",
    "data": {
      "userId": "user_id",
      "username": "username",
      "email": "email@example.com",
      "locationId": "JVNpuC2h3NmmWohtPTQ5",
      "message": "Este endpoint requiere token de usuario personalizado",
      "receivedData": {...}
    }
  }
  ```

#### `POST /users/me/token/revoke`

- **Descripción**: Revocar el token del usuario autenticado
- **Headers**: `Authorization: Bearer <token>`
- **Respuesta**:
  ```json
  {
    "status": "success",
    "message": "Token revocado exitosamente"
  }
  ```
  ```

  ```

---

### �️ Custom Decorators para Autenticación

El sistema incluye decorators personalizados para simplificar el manejo de datos del usuario autenticado:

#### `@CurrentUser()`

- **Descripción**: Extrae el usuario completo de la request
- **Uso**:
  ```typescript
  @Get('endpoint')
  @UseGuards(AuthGuard)
  async method(@CurrentUser() user: any) {
    // user contiene todos los datos del usuario autenticado
  }
  ```
- **Parámetro opcional**: Puede recibir una key específica del usuario
  ```typescript
  @CurrentUser('username') username: string
  ```

#### `@LocationId()`

- **Descripción**: Extrae únicamente el locationId del usuario autenticado
- **Uso**:
  ```typescript
  @Get('endpoint')
  @UseGuards(AuthGuard)
  async method(@LocationId() locationId: string) {
    // locationId contiene el locationId del usuario
  }
  ```

#### `@UserData()`

- **Descripción**: Extrae un objeto estructurado con los datos principales del usuario
- **Uso**:
  ```typescript
  @Get('endpoint')
  @UseGuards(AuthGuard)
  async method(@UserData() userData: any) {
    // userData contiene: id, username, email, locationId, userToken, ghlAuth, evolutionInstances
  }
  ```
- **Estructura retornada**:
  ```typescript
  {
    id: string,
    username: string,
    email: string,
    locationId: string,
    userToken: string,
    ghlAuth: object,
    evolutionInstances: array
  }
  ```

#### Ejemplo de implementación completa:

```typescript
@Controller('example')
export class ExampleController {
  @Get('user-info')
  @UseGuards(AuthGuard)
  async getUserInfo(
    @CurrentUser() user: any,
    @LocationId() locationId: string,
    @UserData() userData: any,
  ) {
    return {
      fullUser: user, // Usuario completo
      location: locationId, // Solo locationId
      structured: userData, // Datos estructurados
    };
  }

  @Get('username-only')
  @UseGuards(AuthGuard)
  async getUsername(@CurrentUser('username') username: string) {
    return { username };
  }
}
```

---

### �📱 Evolution API - Gestión de Instancias

#### `POST /evolution/instance/create-basic`

- **Descripción**: Crear una instancia básica de WhatsApp con nombre único automático
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

### 1. Flujo de Autenticación completo

1. `POST /auth/register` → Registro de nuevo usuario
2. `POST /auth/login` → Obtención de token JWT
3. Uso del token en headers: `Authorization: Bearer <token>`
4. Acceso a endpoints protegidos con decorators `@CurrentUser`, `@LocationId`, `@UserData`

### 2. Flujo OAuth2 completo

1. `GET /oauth` → Redirección a GHL
2. Usuario autoriza en GHL
3. `GET /oauth/callback?code=...` → Procesamiento automático
4. Actualización automática de `ghlAuth` en el usuario correspondiente
5. Redirección al frontend

### 3. Flujo de creación de instancia WhatsApp

1. `POST /auth/login` → Obtener token de autenticación
2. `POST /evolution/instance/create-basic` con número opcional
3. Generación automática de nombre único (`wh_12345`)
4. Creación de instancia en Evolution API
5. Retorno de datos de instancia y QR code

### 4. Flujo de mensajería

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

- **Autenticación**: Los endpoints `/auth/*` no requieren token, el resto sí requieren token Bearer
- **Decorators personalizados**: Usa `@CurrentUser()`, `@LocationId()`, `@UserData()` para simplificar el acceso a datos del usuario
- **Nombres únicos**: Las instancias de Evolution se generan con nombres únicos automáticamente
- **Integración automática**: El OAuth actualiza automáticamente los datos del usuario
- **Logs detallados**: Todos los servicios incluyen logs con branding WhatHub GateWay
- **Manejo de errores**: Respuestas consistentes con formato estándar
- **Guards de protección**: Usa `@UseGuards(AuthGuard)` en endpoints que requieren autenticación

---

> Para más información sobre las APIs integradas, consulta:
>
> - [Documentación de Go High Level](https://highlevel.stoplight.io/docs/integrations/)
> - [Documentación de Evolution API](https://doc.evolution-api.com/)
