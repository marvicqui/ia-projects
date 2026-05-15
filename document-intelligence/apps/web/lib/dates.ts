// Helpers de formato de fecha que siempre usan zona Ciudad de México,
// independientemente de si renderiza en server (Vercel UTC) o cliente.

const TZ = 'America/Mexico_City';
const LOCALE = 'es-MX';

export const formatDate = (input: string | Date): string =>
  new Date(input).toLocaleDateString(LOCALE, { timeZone: TZ });

export const formatDateTime = (input: string | Date): string =>
  new Date(input).toLocaleString(LOCALE, { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });

export const formatTime = (input: string | Date): string =>
  new Date(input).toLocaleTimeString(LOCALE, { timeZone: TZ, timeStyle: 'short' });
