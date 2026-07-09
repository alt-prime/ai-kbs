import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Match only internationalized pathnames, ignore /admin and /api
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)', '/(ja|en)/:path*']
};
