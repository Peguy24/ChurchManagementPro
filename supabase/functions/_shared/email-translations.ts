// Shared translations for transactional email templates (birthday, event reminder, attendance alert, absence alert)
// Used as defaults when no custom template is configured in the database

export type EmailLang = 'fr' | 'en' | 'ht';

export function detectLang(raw?: string | null): EmailLang {
  if (!raw) return 'fr';
  const l = raw.toLowerCase().trim();
  if (l === 'en') return 'en';
  if (l === 'ht') return 'ht';
  return 'fr';
}

// ----- Birthday -----
export const birthdayTranslations: Record<EmailLang, {
  subject: (name: string) => string;
  body: (name: string, age: number, churchName: string) => string;
}> = {
  fr: {
    subject: (name) => `🎂 Joyeux Anniversaire ${name}!`,
    body: (name, age, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">🎉 Joyeux Anniversaire ${name}! 🎉</h1>
        <p>En ce jour spécial, toute la communauté de ${churchName} vous souhaite un très joyeux ${age}ème anniversaire!</p>
        <p>Que cette nouvelle année de vie soit remplie de bénédictions.</p>
        <p>Avec amour,<br><strong>${churchName}</strong></p>
      </div>`,
  },
  en: {
    subject: (name) => `🎂 Happy Birthday ${name}!`,
    body: (name, age, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">🎉 Happy Birthday ${name}! 🎉</h1>
        <p>On this special day, the entire community of ${churchName} wishes you a wonderful ${age}th birthday!</p>
        <p>May this new year of life be filled with blessings.</p>
        <p>With love,<br><strong>${churchName}</strong></p>
      </div>`,
  },
  ht: {
    subject: (name) => `🎂 Bòn Anivèsè ${name}!`,
    body: (name, age, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">🎉 Bòn Anivèsè ${name}! 🎉</h1>
        <p>Nan jou espesyal sa a, tout kominote ${churchName} swete ou yon bèl ${age}yèm anivèsè!</p>
        <p>Ke nouvo ane lavi sa a plen ak benediksyon.</p>
        <p>Avèk lanmou,<br><strong>${churchName}</strong></p>
      </div>`,
  },
};

// ----- Event Reminder -----
export const eventReminderTranslations: Record<EmailLang, {
  subject: (serviceType: string) => string;
  body: (name: string, serviceType: string, serviceDate: string, churchName: string) => string;
  serviceTypes: Record<string, string>;
}> = {
  fr: {
    subject: (serviceType) => `📅 Rappel: Culte du ${serviceType} demain`,
    body: (name, serviceType, serviceDate, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">📅 Rappel de Service</h1>
        <p style="font-size: 18px;">Bonjour ${name},</p>
        <p>Nous vous rappelons notre culte de <strong>${serviceType}</strong> prévu le <strong>${serviceDate}</strong>.</p>
        <p>Nous espérons vous voir!</p>
        <p>${churchName}</p>
      </div>`,
    serviceTypes: { Dimanche: 'Dimanche', Mercredi: 'Mercredi' },
  },
  en: {
    subject: (serviceType) => `📅 Reminder: ${serviceType} Service Tomorrow`,
    body: (name, serviceType, serviceDate, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">📅 Service Reminder</h1>
        <p style="font-size: 18px;">Hello ${name},</p>
        <p>This is a reminder for our <strong>${serviceType}</strong> service on <strong>${serviceDate}</strong>.</p>
        <p>We hope to see you!</p>
        <p>${churchName}</p>
      </div>`,
    serviceTypes: { Dimanche: 'Sunday', Mercredi: 'Wednesday' },
  },
  ht: {
    subject: (serviceType) => `📅 Rapèl: Sèvis ${serviceType} Demen`,
    body: (name, serviceType, serviceDate, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">📅 Rapèl Sèvis</h1>
        <p style="font-size: 18px;">Bonjou ${name},</p>
        <p>Sa a se yon rapèl pou sèvis <strong>${serviceType}</strong> nou an ki pral fèt <strong>${serviceDate}</strong>.</p>
        <p>Nou espere wè ou!</p>
        <p>${churchName}</p>
      </div>`,
    serviceTypes: { Dimanche: 'Dimanch', Mercredi: 'Mèkredi' },
  },
};

// ----- Attendance Alert -----
export const attendanceAlertTranslations: Record<EmailLang, {
  subject: string;
  body: (name: string, churchName: string) => string;
}> = {
  fr: {
    subject: '💙 Nous pensons à vous',
    body: (name, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">💙 Nous pensons à vous</h1>
        <p>Bonjour ${name},</p>
        <p>Nous avons remarqué que nous ne vous avons pas vu récemment et nous voulions vous faire savoir que vous nous manquez.</p>
        <p>Avec amour,<br><strong>${churchName}</strong></p>
      </div>`,
  },
  en: {
    subject: '💙 We are thinking of you',
    body: (name, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">💙 We are thinking of you</h1>
        <p>Hello ${name},</p>
        <p>We noticed we haven't seen you recently and we wanted you to know that we miss you.</p>
        <p>With love,<br><strong>${churchName}</strong></p>
      </div>`,
  },
  ht: {
    subject: '💙 Nou panse ak ou',
    body: (name, churchName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">💙 Nou panse ak ou</h1>
        <p>Bonjou ${name},</p>
        <p>Nou remake nou pa wè ou dènyèman e nou te vle fè ou konnen ou manke nou.</p>
        <p>Avèk lanmou,<br><strong>${churchName}</strong></p>
      </div>`,
  },
};

// ----- Absence Alert (manual trigger) -----
export const absenceAlertTranslations: Record<EmailLang, {
  subject: string;
  body: (name: string, declinePercent: string, lastAttendance: string) => string;
}> = {
  fr: {
    subject: 'Nous remarquons votre absence',
    body: (name, declinePercent, lastAttendance) => `
      <h1>Bonjour ${name},</h1>
      <p>Nous avons remarqué que votre présence à l'église a diminué récemment.</p>
      <p><strong>Statistiques:</strong></p>
      <ul>
        <li>Baisse de présence: ${declinePercent}%</li>
        <li>Dernière présence: ${lastAttendance}</li>
      </ul>
      <p>Nous nous soucions de vous et aimerions savoir si tout va bien. N'hésitez pas à nous contacter si vous avez besoin de quoi que ce soit.</p>
      <p>Que Dieu vous bénisse,<br>L'équipe de l'église</p>`,
  },
  en: {
    subject: 'We noticed your absence',
    body: (name, declinePercent, lastAttendance) => `
      <h1>Hello ${name},</h1>
      <p>We noticed that your attendance at church has decreased recently.</p>
      <p><strong>Statistics:</strong></p>
      <ul>
        <li>Attendance decline: ${declinePercent}%</li>
        <li>Last attendance: ${lastAttendance}</li>
      </ul>
      <p>We care about you and would love to know if everything is alright. Please don't hesitate to reach out if you need anything.</p>
      <p>God bless you,<br>The church team</p>`,
  },
  ht: {
    subject: 'Nou remake absans ou',
    body: (name, declinePercent, lastAttendance) => `
      <h1>Bonjou ${name},</h1>
      <p>Nou remake ke prezans ou nan legliz la diminye dènyèman.</p>
      <p><strong>Estatistik:</strong></p>
      <ul>
        <li>Bès prezans: ${declinePercent}%</li>
        <li>Dènye prezans: ${lastAttendance}</li>
      </ul>
      <p>Nou pran swen ou e nou ta renmen konnen si tout bagay ap mache byen. Pa ezite kontakte nou si ou bezwen anyen.</p>
      <p>Ke Bondye beni ou,<br>Ekip legliz la</p>`,
  },
};

// ----- Date formatting per language -----
export function formatDateLocalized(dateStr: string | null, lang: EmailLang): string {
  if (!dateStr) {
    return { fr: 'aucune présence récente', en: 'no recent attendance', ht: 'pa gen prezans resan' }[lang];
  }
  const locale = { fr: 'fr-FR', en: 'en-US', ht: 'fr-HT' }[lang];
  return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatServiceDate(date: Date, lang: EmailLang): string {
  const locale = { fr: 'fr-FR', en: 'en-US', ht: 'fr-HT' }[lang];
  return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
