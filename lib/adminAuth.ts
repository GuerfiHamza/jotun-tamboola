import { cookies } from 'next/headers';
import { verifyAdminToken, type Role } from './auth';

export type Account = { accountId: number; role: Role };

export async function getAdminFromRequest(): Promise<Account | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
