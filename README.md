# API Summary

## API Endpoints

### POST /evolution/webhook
- **Description**: Handles incoming messages. Processes the message based on the `remoteJid` and `instance` provided in the request body.
- **Request Body**: 
  - `remoteJid`: The remote JID of the sender.
  - `instance`: The instance identifier.
  - `message`: The message content.
- **Response**: Returns 'Message received' upon successful processing.
