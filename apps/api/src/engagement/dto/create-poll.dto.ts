import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class CreatePollDto {
  @IsString()
  @MinLength(5)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  options: string[];
}
