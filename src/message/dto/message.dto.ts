import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateMessageDto {

  @IsString()
  @IsNotEmpty()
  locationId: string;
}


export class MessageResponseDto {
  id: string;

  locationId: string;



  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
