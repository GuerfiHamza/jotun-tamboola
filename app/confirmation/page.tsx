import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function ConfirmationPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.confirmation;
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {t.body1}<br />
          {t.body2}
        </p>
        <div className="bg-green-50 rounded-lg p-4 text-green-800 text-sm font-medium">
          {t.goodLuck}
        </div>
      </div>
    </main>
  );
}
