// Buzzing Agent - i18n Middleware

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
