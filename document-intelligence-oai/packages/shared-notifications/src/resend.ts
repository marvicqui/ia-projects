import type { ReactElement } from "react";
import { Resend } from "resend";
import type { NotificationResult } from "./index";

export interface EmailMessage {
  to: string;
  subject: string;
  react: ReactElement;
}

export class EmailClient {
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL ?? "Document Intelligence <notificaciones@example.com>") {
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = from;
  }

  async send(message: EmailMessage): Promise<NotificationResult> {
    if (!this.resend) {
      return { id: "email-dry-run", channel: "email", accepted: false };
    }

    const result = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      react: message.react
    });

    return {
      id: result.data?.id ?? "email-unknown",
      channel: "email",
      accepted: Boolean(result.data?.id)
    };
  }
}
