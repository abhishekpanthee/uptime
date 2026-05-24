import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = Bun.env.SMTP_HOST;
  const port = Number(Bun.env.SMTP_PORT) || 587;
  const user = Bun.env.SMTP_USER;
  const pass = Bun.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP not configured, email disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

const FROM_ADDRESS = Bun.env.EMAIL_FROM || "uptime@localhost";
const APP_NAME = Bun.env.APP_NAME || "Uptime Monitor";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;

  try {
    await t.sendMail({
      from: `"${APP_NAME}" <${FROM_ADDRESS}>`,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]*>/g, ""),
    });
    return true;
  } catch (err: any) {
    console.error("[Email] Send failed:", err.message);
    return false;
  }
}

// Alert templates
export function alertDownEmail(monitorName: string, url: string, statusCode: number): EmailOptions {
  return {
    to: "",
    subject: `[DOWN] ${monitorName} is not responding`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">Monitor Down: ${monitorName}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">URL</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${url}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Status Code</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${statusCode}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Time</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${new Date().toISOString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">${APP_NAME}</p>
      </div>
    `,
  };
}

export function alertRecoveryEmail(monitorName: string, url: string, downtimeMinutes: number): EmailOptions {
  return {
    to: "",
    subject: `[RECOVERED] ${monitorName} is back online`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Monitor Recovered: ${monitorName}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">URL</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${url}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Downtime</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${downtimeMinutes} minutes</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Recovered At</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${new Date().toISOString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">${APP_NAME}</p>
      </div>
    `,
  };
}

export function incidentUpdateEmail(title: string, status: string, message: string): EmailOptions {
  const colors: Record<string, string> = {
    investigating: "#f59e0b",
    identified: "#f97316",
    monitoring: "#3b82f6",
    resolved: "#16a34a",
  };
  return {
    to: "",
    subject: `[${status.toUpperCase()}] ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:${colors[status] || "#6b7280"}">Incident Update: ${title}</h2>
        <p><strong>Status:</strong> ${status}</p>
        <div style="padding:16px;background:#f9fafb;border-left:4px solid ${colors[status] || "#6b7280"};margin:16px 0">${message}</div>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">${APP_NAME}</p>
      </div>
    `,
  };
}

export function maintenanceNoticeEmail(title: string, scheduledStart: string, scheduledEnd: string, description?: string): EmailOptions {
  return {
    to: "",
    subject: `[MAINTENANCE] ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#3b82f6">Scheduled Maintenance: ${title}</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Start</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${scheduledStart}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">End</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${scheduledEnd}</td></tr>
        </table>
        ${description ? `<p style="margin-top:16px">${description}</p>` : ""}
        <p style="color:#6b7280;font-size:12px;margin-top:24px">${APP_NAME}</p>
      </div>
    `,
  };
}

export function subscriberVerificationEmail(verifyUrl: string): EmailOptions {
  return {
    to: "",
    subject: `Confirm your subscription - ${APP_NAME}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Confirm Your Subscription</h2>
        <p>Click the button below to confirm your subscription to status updates.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Confirm Subscription</a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };
}
