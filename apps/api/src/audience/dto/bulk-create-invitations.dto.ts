import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from 'class-validator';

export class BulkCreateInvitationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsEmail({}, { each: true })
  emails!: string[];
}
