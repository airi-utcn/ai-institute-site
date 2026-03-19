import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'; // Defaults to 'en' if no cookie exists

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});