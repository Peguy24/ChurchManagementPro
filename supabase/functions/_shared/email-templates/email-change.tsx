/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { emailTranslations, type EmailLang } from './translations.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: EmailLang
}

const LOGO_URL = 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
  lang = 'en',
}: EmailChangeEmailProps) => {
  const t = emailTranslations.email_change[lang]
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{t.preview(siteName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={siteName} width="180" height="auto" style={logo} />
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={text}>{t.text(siteName, email, newEmail)}</Text>
          <Text style={text}>{t.confirmText}</Text>
          <Button style={button} href={confirmationUrl}>
            {t.button}
          </Button>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '500px', margin: '0 auto' }
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222, 47%, 11%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(221, 16%, 47%)',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: 'hsl(221, 83%, 40%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
