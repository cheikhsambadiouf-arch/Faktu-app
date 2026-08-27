import { IsNotEmpty, IsString } from 'class-validator';

export class InterpretDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;
}
