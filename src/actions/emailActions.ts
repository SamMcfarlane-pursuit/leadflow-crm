"use server";

export async function sendEmail(to: string, subject: string, body: string) {
    const BREVO_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@leadflow.app';
    const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'LeadFlow CRM';

    // ─── Mock Mode (Default — no API key configured) ──────────────────
    if (!BREVO_KEY) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK BODY]:\n${body}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return { success: true, mode: 'mock' as const };
    }

    // ─── Real Sending via Brevo Transactional API ─────────────────────
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: SENDER_NAME, email: SENDER_EMAIL },
                to: [{ email: to }],
                subject,
                htmlContent: `<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
                    ${body.split('\n').map(line => `<p style="margin: 0 0 8px 0;">${line}</p>`).join('')}
                </div>`,
                textContent: body,
            }),
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`Brevo API Error: ${response.status}`, errorData);
            return { success: false, mode: 'real' as const, error: `Email service returned ${response.status}` };
        }

        const data = await response.json();
        console.log(`[EMAIL SENT] To: ${to} | MessageId: ${data.messageId}`);

        return { success: true, mode: 'real' as const, messageId: data.messageId };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, mode: 'real' as const, error: String(error) };
    }
}
