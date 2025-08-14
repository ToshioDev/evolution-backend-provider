import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  userId?: string;

  @ApiProperty()
  attachments: any[];

  @ApiProperty()
  contactId: string;

  @ApiProperty()
  locationId: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] })
  typeMessage: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ClientInfoDto {
  @ApiProperty({ description: 'Número de teléfono del cliente' })
  phone: string;

  @ApiProperty({ description: 'Nombre del cliente' })
  name: string;

  @ApiProperty({ description: 'URL de la foto de perfil', required: false })
  profilePicture?: string;

  @ApiProperty({ description: 'Nombre push de WhatsApp', required: false })
  pushName?: string;
}

export class ClientChatDto {
  @ApiProperty({ type: ClientInfoDto })
  clientInfo: ClientInfoDto;

  @ApiProperty({ type: [MessageDto], description: 'Mensajes del cliente' })
  messages: MessageDto[];

  @ApiProperty({ type: MessageDto, description: 'Último mensaje' })
  lastMessage: MessageDto;

  @ApiProperty({ description: 'Número de mensajes no leídos' })
  unreadCount: number;
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty({
    description: 'Número total de clientes únicos',
    required: false,
  })
  totalClients?: number;
}

export class MessagesResponseDto {
  @ApiProperty()
  status: number;

  @ApiProperty({
    description: 'Mensajes agrupados por número de cliente',
    example: {
      '1234567890': [
        {
          _id: '1',
          phone: '1234567890',
          message: 'Hola',
          typeMessage: 'INBOUND',
        },
        {
          _id: '2',
          phone: '1234567890',
          message: 'Adiós',
          typeMessage: 'OUTBOUND',
        },
      ],
      '0987654321': [
        {
          _id: '3',
          phone: '0987654321',
          message: 'Hola mundo',
          typeMessage: 'INBOUND',
        },
      ],
    },
  })
  data: {
    messages: {
      [cliente: string]: MessageDto[];
    };
    pagination: PaginationDto;
  };
}

export class MessagesWithClientInfoResponseDto {
  @ApiProperty()
  status: number;

  @ApiProperty({
    description:
      'Mensajes agrupados por número de cliente con información personalizada',
    example: {
      '1234567890': {
        clientInfo: {
          phone: '1234567890',
          name: 'Juan Pérez',
          profilePicture: 'https://pps.whatsapp.net/v/...',
          pushName: 'Juan',
        },
        messages: [
          {
            _id: '1',
            phone: '1234567890',
            message: 'Hola',
            typeMessage: 'INBOUND',
          },
        ],
        lastMessage: {
          _id: '1',
          phone: '1234567890',
          message: 'Hola',
          typeMessage: 'INBOUND',
        },
        unreadCount: 1,
      },
    },
  })
  data: {
    messages: {
      [cliente: string]: ClientChatDto;
    };
    pagination: PaginationDto;
  };
}

export class MessageQueryDto {
  @ApiProperty({ required: false, description: 'Número de página', default: 1 })
  page?: string;

  @ApiProperty({
    required: false,
    description: 'Límite de mensajes por página',
    default: 20,
  })
  limit?: string;

  @ApiProperty({ required: false, description: 'ID del contacto para filtrar' })
  contactId?: string;

  @ApiProperty({
    required: false,
    description: 'ID de la conversación para filtrar',
  })
  conversationId?: string;
}
