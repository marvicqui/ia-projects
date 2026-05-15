export type NotificationChannel = "email" | "whatsapp";

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  accepted: boolean;
}

export * from "./resend";
export * from "./twilio";
export * from "./whatsapp-templates";
