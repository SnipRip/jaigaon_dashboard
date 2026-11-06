import { Controller, Get } from '@nestjs/common';
import { RequireAccess } from '../common/decorators/require-access.decorator.js';
import type { DocumentRegisterView } from './document-register-views.js';
import { DocumentRegisterService } from './document-register.service.js';

/** The Export documents screen's permission key (frontend config/navigation.ts). */
export const DOCUMENTS_MODULE = '/documents';

@Controller('documents')
export class DocumentRegisterController {
  constructor(private readonly register: DocumentRegisterService) {}

  @RequireAccess(DOCUMENTS_MODULE, 'view')
  @Get('register')
  get(): Promise<DocumentRegisterView> {
    return this.register.register();
  }
}
