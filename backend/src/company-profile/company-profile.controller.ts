import { Body, Controller, Get, Patch } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import {
  CompanyProfileService,
  type CompanyProfileView,
} from './company-profile.service.js';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto.js';

// Edited on the GST & export setup screen (frontend config/navigation.ts).
const MODULE = '/masters/tax-export';

// Reading is open to every signed-in user: every document needs our state
// for its GST, and prints our name and address.
@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly profile: CompanyProfileService) {}

  @Get()
  get(): Promise<CompanyProfileView> {
    return this.profile.get();
  }

  @RequireAccess(MODULE, 'edit')
  @Patch()
  update(@Body() dto: UpdateCompanyProfileDto): Promise<CompanyProfileView> {
    return this.profile.update(dto);
  }
}
