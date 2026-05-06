import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { ciphers: "SSLv3" },
});

export interface MailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(options: MailOptions) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@alorica.com",
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    cc: options.cc
      ? Array.isArray(options.cc)
        ? options.cc.join(", ")
        : options.cc
      : undefined,
    subject: options.subject,
    html: options.html,
  });
  return info;
}
