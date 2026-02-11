"use server";

export async function sendEmail(to: string, subject: string, body: string) {
    // Check for Provider Keys
    const BREVO_KEY = process.env.BREVO_API_KEY;
    const SENDGRID_KEY = process.env.SENDGRID_API_KEY;

    // 1. Mock Mode (Default)
    if (!BREVO_KEY && !SENDGRID_KEY) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK BODY]:\n${body}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return { success: true, mode: 'mock' };
    }

    // 2. Real Sending (Future Implementation)
    // if (BREVO_KEY) { ... }

    return { success: false, error: 'Provider configured but not implemented' };
}
