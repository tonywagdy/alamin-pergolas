export const LEAD_SERVICES = [
  'برجولة حديقة وفلل', 'برجولة روف وأسطح', 'سقف ديكوري وتجاليد حوائط',
  'أعمال خشبية وبوابات مخصصة', 'صيانة وتجديد برجولة قديمة'
] as const;

export type LeadForm = { name: string; phone: string; service: string; city: string; message: string };

export function normalizePhone(value: string): string {
  let phone = value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[\s()+-]/g, '');
  if (phone.startsWith('0020')) phone = phone.slice(4);
  else if (phone.startsWith('20')) phone = phone.slice(2);
  if (/^1[0125]\d{8}$/.test(phone)) phone = '0' + phone;
  return phone;
}

export function validateLead(input: LeadForm): { data?: LeadForm; error?: string } {
  const data = { name: input.name.trim(), phone: normalizePhone(input.phone),
    service: input.service, city: input.city.trim(), message: input.message.trim() };
  if (data.name.length < 2 || data.name.length > 80) return { error: 'اكتب اسمًا من حرفين إلى 80 حرفًا.' };
  if (!/^01[0125]\d{8}$/.test(data.phone)) return { error: 'اكتب رقم موبايل مصري صحيحًا، مثل 01012345678.' };
  if (!(LEAD_SERVICES as readonly string[]).includes(data.service)) return { error: 'اختر الخدمة المطلوبة من القائمة.' };
  if (data.city.length < 2 || data.city.length > 80) return { error: 'اكتب منطقة التنفيذ أو المحافظة.' };
  if (data.message.length > 1500) return { error: 'التفاصيل يجب ألا تزيد عن 1500 حرف.' };
  return { data };
}

// A timeout does not cancel a Firestore write. Keep and await the SAME promise
// on retry so an uncertain network result never creates a duplicate lead.
export async function awaitLeadConfirmation<T>(write: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([write, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('confirmation-timeout')), timeoutMs);
    })]);
  } finally { clearTimeout(timer!); }
}
