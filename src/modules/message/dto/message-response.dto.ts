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
