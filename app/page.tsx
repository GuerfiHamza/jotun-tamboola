import { redirect } from 'next/navigation';

// No public site anymore — stores and the master work entirely from the
// authenticated dashboard. Root just sends you to login.
export default function Page() {
  redirect('/admin/login');
}
