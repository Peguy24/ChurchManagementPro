export type EmailLang = 'en' | 'fr' | 'ht'

export const emailTranslations = {
  signup: {
    en: {
      preview: (siteName: string) => `Confirm your email for ${siteName}`,
      heading: 'Confirm your email',
      thanks: (siteName: string) => `Thanks for signing up for`,
      confirmText: (recipient: string) => `Please confirm your email address (${recipient}) by clicking the button below:`,
      button: 'Verify my email',
      footer: "If you didn't create an account, you can safely ignore this email.",
    },
    fr: {
      preview: (siteName: string) => `Confirmez votre adresse email pour ${siteName}`,
      heading: 'Confirmez votre adresse email',
      thanks: (siteName: string) => `Merci de vous être inscrit sur`,
      confirmText: (recipient: string) => `Veuillez confirmer votre adresse email (${recipient}) en cliquant sur le bouton ci-dessous :`,
      button: 'Vérifier mon email',
      footer: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.",
    },
    ht: {
      preview: (siteName: string) => `Konfime adrès imèl ou pou ${siteName}`,
      heading: 'Konfime adrès imèl ou',
      thanks: (siteName: string) => `Mèsi paske ou enskri sou`,
      confirmText: (recipient: string) => `Tanpri konfime adrès imèl ou (${recipient}) lè ou klike sou bouton ki anba a :`,
      button: 'Verifye imèl mwen',
      footer: "Si ou pa t kreye yon kont, ou ka inyore imèl sa a san danje.",
    },
  },
  recovery: {
    en: {
      preview: (siteName: string) => `Reset your password for ${siteName}`,
      heading: 'Reset your password',
      text: (siteName: string) => `We received a request to reset your password for ${siteName}. Click the button below to choose a new password.`,
      button: 'Reset password',
      footer: "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
    },
    fr: {
      preview: (siteName: string) => `Réinitialisez votre mot de passe pour ${siteName}`,
      heading: 'Réinitialisation du mot de passe',
      text: (siteName: string) => `Nous avons reçu une demande de réinitialisation de votre mot de passe pour ${siteName}. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.`,
      button: 'Réinitialiser le mot de passe',
      footer: "Si vous n'avez pas demandé de réinitialisation, vous pouvez ignorer cet email. Votre mot de passe ne sera pas modifié.",
    },
    ht: {
      preview: (siteName: string) => `Reyinisyalize modpas ou pou ${siteName}`,
      heading: 'Reyinisyalize modpas ou',
      text: (siteName: string) => `Nou resevwa yon demann pou reyinisyalize modpas ou pou ${siteName}. Klike sou bouton ki anba a pou chwazi yon nouvo modpas.`,
      button: 'Reyinisyalize modpas',
      footer: "Si ou pa t mande pou reyinisyalize modpas, ou ka inyore imèl sa a. Modpas ou p ap chanje.",
    },
  },
  magiclink: {
    en: {
      preview: (siteName: string) => `Your login link for ${siteName}`,
      heading: 'Your login link',
      text: (siteName: string) => `Click the button below to log in to ${siteName}. This link will expire shortly.`,
      button: 'Log in',
      footer: "If you didn't request this link, you can safely ignore this email.",
    },
    fr: {
      preview: (siteName: string) => `Votre lien de connexion pour ${siteName}`,
      heading: 'Votre lien de connexion',
      text: (siteName: string) => `Cliquez sur le bouton ci-dessous pour vous connecter à ${siteName}. Ce lien expirera sous peu.`,
      button: 'Se connecter',
      footer: "Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email en toute sécurité.",
    },
    ht: {
      preview: (siteName: string) => `Lyen koneksyon ou pou ${siteName}`,
      heading: 'Lyen koneksyon ou',
      text: (siteName: string) => `Klike sou bouton ki anba a pou konekte sou ${siteName}. Lyen sa a ap ekspire byento.`,
      button: 'Konekte',
      footer: "Si ou pa t mande lyen sa a, ou ka inyore imèl sa a san danje.",
    },
  },
  invite: {
    en: {
      preview: (siteName: string) => `You've been invited to join ${siteName}`,
      heading: "You've been invited",
      text: "Click the button below to accept the invitation and create your account.",
      joinText: "You've been invited to join",
      button: 'Accept invitation',
      footer: "If you weren't expecting this invitation, you can safely ignore this email.",
    },
    fr: {
      preview: (siteName: string) => `Vous avez été invité à rejoindre ${siteName}`,
      heading: 'Vous avez été invité',
      text: "Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte.",
      joinText: 'Vous avez été invité à rejoindre',
      button: "Accepter l'invitation",
      footer: "Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email en toute sécurité.",
    },
    ht: {
      preview: (siteName: string) => `Yo envite ou rejwenn ${siteName}`,
      heading: 'Yo envite ou',
      text: 'Klike sou bouton ki anba a pou aksepte envitasyon an epi kreye kont ou.',
      joinText: 'Yo envite ou rejwenn',
      button: 'Aksepte envitasyon',
      footer: "Si ou pa t ap tann envitasyon sa a, ou ka inyore imèl sa a san danje.",
    },
  },
  email_change: {
    en: {
      preview: (siteName: string) => `Confirm your email change for ${siteName}`,
      heading: 'Email address change',
      text: (siteName: string, email: string, newEmail: string) =>
        `You requested to change your email address for ${siteName} from ${email} to ${newEmail}.`,
      confirmText: 'Click the button below to confirm this change:',
      button: 'Confirm change',
      footer: "If you didn't request this change, please secure your account immediately.",
    },
    fr: {
      preview: (siteName: string) => `Confirmez le changement de votre adresse email pour ${siteName}`,
      heading: "Changement d'adresse email",
      text: (siteName: string, email: string, newEmail: string) =>
        `Vous avez demandé à changer votre adresse email pour ${siteName} de ${email} à ${newEmail}.`,
      confirmText: 'Cliquez sur le bouton ci-dessous pour confirmer ce changement :',
      button: 'Confirmer le changement',
      footer: "Si vous n'avez pas demandé ce changement, veuillez sécuriser votre compte immédiatement.",
    },
    ht: {
      preview: (siteName: string) => `Konfime chanjman adrès imèl ou pou ${siteName}`,
      heading: 'Chanjman adrès imèl',
      text: (siteName: string, email: string, newEmail: string) =>
        `Ou mande pou chanje adrès imèl ou pou ${siteName} soti nan ${email} ale nan ${newEmail}.`,
      confirmText: 'Klike sou bouton ki anba a pou konfime chanjman sa a :',
      button: 'Konfime chanjman',
      footer: "Si ou pa t mande chanjman sa a, tanpri sekirize kont ou imedyatman.",
    },
  },
  reauthentication: {
    en: {
      preview: 'Your verification code',
      heading: 'Confirm reauthentication',
      text: 'Use the code below to confirm your identity:',
      footer: "This code will expire shortly. If you didn't request this, you can safely ignore this email.",
    },
    fr: {
      preview: 'Votre code de vérification',
      heading: 'Confirmation de réauthentification',
      text: 'Utilisez le code ci-dessous pour confirmer votre identité :',
      footer: "Ce code expirera sous peu. Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email.",
    },
    ht: {
      preview: 'Kòd verifikasyon ou',
      heading: 'Konfime reyotantifikasyon',
      text: 'Itilize kòd ki anba a pou konfime idantite ou :',
      footer: "Kòd sa a ap ekspire byento. Si ou pa t mande sa a, ou ka inyore imèl sa a san danje.",
    },
  },
  subjects: {
    en: {
      signup: 'Confirm your email',
      invite: "You've been invited",
      magiclink: 'Your login link',
      recovery: 'Reset your password',
      email_change: 'Confirm your new email',
      reauthentication: 'Your verification code',
    },
    fr: {
      signup: 'Confirmez votre adresse email',
      invite: 'Vous avez été invité',
      magiclink: 'Votre lien de connexion',
      recovery: 'Réinitialisation du mot de passe',
      email_change: 'Confirmez votre nouvelle adresse email',
      reauthentication: 'Votre code de vérification',
    },
    ht: {
      signup: 'Konfime adrès imèl ou',
      invite: 'Yo envite ou',
      magiclink: 'Lyen koneksyon ou',
      recovery: 'Reyinisyalize modpas ou',
      email_change: 'Konfime nouvo adrès imèl ou',
      reauthentication: 'Kòd verifikasyon ou',
    },
  },
} as const

export function getLang(raw?: string | null): EmailLang {
  if (!raw) return 'en'
  const l = raw.toLowerCase().slice(0, 2)
  if (l === 'fr') return 'fr'
  if (l === 'ht') return 'ht'
  return 'en'
}
