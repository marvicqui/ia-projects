export type NotificationChannel = "email" | "whatsapp";

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  accepted: boolean;
}
