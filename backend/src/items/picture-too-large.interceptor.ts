import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError, type Observable } from 'rxjs';
import { PICTURE_TOO_LARGE } from './item-picture-rules.js';

// Multer stops reading a file at the size limit and Nest turns that into a
// 413 "File too large". Placed before FileInterceptor, this makes it the
// same 400 and wording as every other picture refusal.
@Injectable()
export class PictureTooLargeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() => (error instanceof PayloadTooLargeException ? new BadRequestException(PICTURE_TOO_LARGE) : error)),
        ),
      );
  }
}
