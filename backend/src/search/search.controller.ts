import { Controller, Get, Query } from '@nestjs/common';
import { CurrentAuth } from '../common/decorators/current-auth.decorator.js';
import type { AuthContext } from '../common/types/authenticated-request.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import type { SearchResultView } from './search-views.js';
import { SearchService } from './search.service.js';

// Open to every signed-in user: the service searches only the kinds whose
// screens the user's role may open.
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentAuth() auth: AuthContext, @Query() query: SearchQueryDto): Promise<SearchResultView[]> {
    return this.searchService.search(auth, query.q);
  }
}
