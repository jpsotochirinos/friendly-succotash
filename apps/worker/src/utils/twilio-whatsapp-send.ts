/** Envío vía REST Twilio (sin SDK en worker). */
export async function sendTwilioWhatsAppMessage(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn('[whatsapp-briefing] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set, skip send');
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const toW = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/^\+/, '+')}`;
  const params = new URLSearchParams({ From: from, To: toW, Body: body });
  const appUrl = (
    process.env.TWILIO_WEBHOOK_BASE_URL ||
    process.env.APP_URL_NGROK ||
    process.env.APP_URL ||
    'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, '');
  params.set('StatusCallback', `${appUrl}/api/whatsapp/webhook/status`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${t}`);
  }
}
