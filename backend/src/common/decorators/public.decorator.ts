import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route that does not need a signed-in session.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
