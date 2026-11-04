import { BadRequestException, ForbiddenException, PayloadTooLargeException, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { PICTURE_TOO_LARGE } from './item-picture-rules.js';
import { PictureTooLargeInterceptor } from './picture-too-large.interceptor.js';

const run = (error: Error) =>
  firstValueFrom(
    new PictureTooLargeInterceptor().intercept({} as ExecutionContext, { handle: () => throwError(() => error) }),
  );

describe('PictureTooLargeInterceptor', () => {
  it('turns multer’s 413 for a file over 1 MB into a 400 with the reason', async () => {
    const refused = await run(new PayloadTooLargeException('File too large')).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(BadRequestException);
    expect((refused as BadRequestException).message).toBe(PICTURE_TOO_LARGE);
  });

  it('passes every other error on unchanged', async () => {
    const forbidden = new ForbiddenException();
    await expect(run(forbidden)).rejects.toBe(forbidden);
  });
});
