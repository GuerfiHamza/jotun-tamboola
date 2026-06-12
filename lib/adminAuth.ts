import { cookies } from 'next/headers';
import { verifyAdminToken } from './auth';

export async function getAdminFromRequest(): Promise<{ adminId: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}