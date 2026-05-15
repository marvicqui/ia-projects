import { Resend } from 'resend';
import twilio from 'twilio';

let _resend: Resend | null = null;
const resendClient = () => {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

let _twilio: ReturnType<typeof twilio> | null = null;
const twilioClient = () => {
  if (!_twilio) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error('Twilio credentials missing');
    _twilio = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return _twilio;
};

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const sendEmail = async (params: EmailParams) => {
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  return resendClient().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
};

export interface WhatsAppParams {
  to: string;
  body: string;
}

export const sendWhatsApp = async (params: WhatsAppParams) => {
  const from = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886';
  const to = params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to}`;
  return twilioClient().messages.create({ from, to, body: params.body.slice(0, 1500) });
};
