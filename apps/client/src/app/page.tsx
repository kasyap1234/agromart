import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }

  // This part will not be rendered because of the redirects.
  // It can be a loading state or null.
  return null;
}
