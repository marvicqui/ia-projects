import twilio from "twilio";
import type { NotificationResult } from "./index";

export class WhatsAppClient {
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly from: string;

  constructor(
    accountSid = process.env.TWILIO_ACCOUNT_SID,
    authToken = process.env.TWILIO_AUTH_TOKEN,
    from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886"
  ) {
    this.client = accountSid && authToken ? twilio(accountSid, authToken) : null;
    this.from = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  }

  async send(to: string, body: string): Promise<NotificationResult> {
    if (!this.client) {
      return { id: "whatsapp-dry-run", channel: "whatsapp", accepted: false };
    }

    const message = await this.client.messages.create({
      from: this.from,
      to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      body
    });

    return { id: message.sid, channel: "whatsapp", accepted: message.status !== "failed" };
  }
}
