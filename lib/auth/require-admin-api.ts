import { getServerSession } from 'next-auth';
import { authOptions } from './options';

export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  return session;
}
