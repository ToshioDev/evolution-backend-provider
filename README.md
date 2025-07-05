# Evolution Backend Provider

Backend en NestJS con integración OAuth2 para Go High Level y MongoDB.

## Tecnologías principales

- [NestJS](https://nestjs.com/)
- [Mongoose](https://mongoosejs.com/) + [@nestjs/mongoose](https://docs.nestjs.com/techniques/mongodb)
- [Go High Level API v2](https://highlevel.stoplight.io/docs/integrations/)

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
```

## Endpoints disponibles

### OAuth2 Go High Level

- **GET /oauth**  
  Redirige al usuario al flujo de autorización de Go High Level.

- **GET /oauth/callback**  
  Recibe el código de autorización (`code`) y automáticamente solicita el access_token a Go High Level. Devuelve el token en la respuesta.

- **GET /oauth/token?code=...**  
  Permite obtener el access_token manualmente usando un código de autorización.

### Webhook Evolution

- **POST /evolution/webhook**
  - **Descripción**: Maneja mensajes entrantes. Procesa el mensaje según `remoteJid` e `instance` en el body.
  - **Body**:
    - `remoteJid`: JID remoto del remitente.
    - `instance`: Identificador de instancia.
    - `message`: Contenido del mensaje.
  - **Respuesta**: 'Message received' si se procesa correctamente.

## Integración MongoDB

- Se utiliza Mongoose y @nestjs/mongoose.
- La conexión se configura en `src/app.module.ts` usando la variable `MONGODB_URI` del `.env`.
- Actualmente no hay modelos/esquemas definidos ni persistencia de datos implementada.

## Paquetes relevantes instalados

- `@nestjs/mongoose`
- `mongoose`
- `dotenv`
- `axios`
- `passport-oauth2`, `@nestjs/passport`, `passport`

## Flujo OAuth2 implementado

1. El usuario inicia el flujo en `/oauth`.
2. Go High Level redirige a `/oauth/callback` con un parámetro `code`.
3. El backend solicita el access_token a Go High Level y lo muestra en la respuesta.
4. El parámetro `user_type` se envía como `Location` según la documentación de GHL.
5. Los scopes y credenciales se gestionan desde el archivo `.env`.

## Qué falta implementar / posibles siguientes pasos

- Definir modelos/esquemas de Mongoose para persistir tokens, usuarios, logs, etc.
- Guardar el access_token y refresh_token en MongoDB tras la autenticación.
- Implementar endpoints protegidos que usen el access_token para consumir recursos de Go High Level.
- Agregar pruebas unitarias y de integración.
- Mejorar la gestión de errores y logs.
- Documentar endpoints adicionales y ejemplos de uso.

---

> Para dudas sobre el flujo OAuth2, revisa la documentación oficial de Go High Level y los comentarios en el código fuente.
