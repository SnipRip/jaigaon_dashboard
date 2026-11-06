import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { trim } from '../../common/dto/text-transforms.js';

export class SearchQueryDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Search for 2 to 60 characters' })
  q: string;
}
