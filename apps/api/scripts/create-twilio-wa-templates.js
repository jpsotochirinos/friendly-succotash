#!/usr/bin/env node
/**
 * Creates WhatsApp Content templates via Twilio Content API with **named variables**
 * that match TwilioProvider (body, btn_*, item_*_id, item_*_title, item_*_desc).
 *
 * Usage (from repo root):
 *   pnpm --filter @tracker/api wa:create-templates
 *
 * Options:
 *   --dry-run       Print payloads only (no HTTP).
 *   --no-approval   Skip POST .../ApprovalRequests/whatsapp for Quick Reply only.
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * Optional: TWILIO_TEMPLATE_SUFFIX (appended to friendly_name / approval name, e.g. _v2)
 */

const CONTENT_BASE = 'https://content.twilio.com/v1';

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    noApproval: argv.includes('--no-approval'),
  };
}

function authHeader(accountSid, authToken) {
  const raw = `${accountSid}:${authToken}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

async function twilioFetch(path, { method, body, accountSid, authToken }) {
  const url = path.startsWith('http') ? path : `${CONTENT_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(accountSid, authToken),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Twilio ${method} ${url} -> ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function buildQuickReplyPayload(suffix) {
  const friendly = `alega_confirm_yes_no${suffix}`;
  // WhatsApp approval rejects `{{…}}` in button *titles* (Meta: titles cannot contain `{}`).
  // Titles are fixed "Sí" / "No" (same as assistant.service sendButtons). Payload IDs stay dynamic.
  const variables = {
    body: '¿Confirmas ejecutar esta acción? Responde con los botones de abajo.',
    btn_1_id: 'confirm_yes',
    btn_2_id: 'confirm_no',
  };
  return {
    friendly_name: friendly,
    language: 'es',
    variables,
    types: {
      'twilio/quick-reply': {
        body: 'Alega — {{body}}',
        actions: [
          { title: 'Sí', id: '{{btn_1_id}}' },
          { title: 'No', id: '{{btn_2_id}}' },
        ],
      },
    },
  };
}

function buildListPickerPayload(suffix) {
  const friendly = `alega_list_options${suffix}`;
  const variables = {
    body: 'Elige una opción de la lista para continuar.',
    button: 'Opciones',
  };
  const items = [];
  for (let i = 1; i <= 10; i++) {
    variables[`item_${i}_id`] = `sample_id_${i}`;
    variables[`item_${i}_title`] = `Opción ${i}`;
    variables[`item_${i}_desc`] = '';
    items.push({
      id: '{{item_' + i + '_id}}',
      item: '{{item_' + i + '_title}}',
      description: '{{item_' + i + '_desc}}',
    });
  }
  return {
    friendly_name: friendly,
    language: 'es',
    variables,
    types: {
      'twilio/list-picker': {
        body: 'Alega — {{body}}',
        button: '{{button}}',
        items,
      },
    },
  };
}

async function main() {
  const { dryRun, noApproval } = parseArgs(process.argv.slice(2));
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const suffix = (process.env.TWILIO_TEMPLATE_SUFFIX ?? '').trim();

  if (!accountSid || !authToken) {
    console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in environment.');
    console.error('Tip: pnpm --filter @tracker/api wa:create-templates (loads ../../.env)');
    process.exit(1);
  }

  const qrPayload = buildQuickReplyPayload(suffix);
  const listPayload = buildListPickerPayload(suffix);

  if (dryRun) {
    console.log('--- dry-run: Quick Reply payload ---\n', JSON.stringify(qrPayload, null, 2));
    console.log('\n--- dry-run: List Picker payload ---\n', JSON.stringify(listPayload, null, 2));
    process.exit(0);
  }

  console.log('Creating Quick Reply template…');
  const qr = await twilioFetch('/Content', {
    method: 'POST',
    body: qrPayload,
    accountSid,
    authToken,
  });
  const confirmSid = qr.sid;
  console.log('Quick Reply ContentSid:', confirmSid);

  if (!noApproval) {
    const approvalName = `alega_confirm_yes_no${suffix}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    console.log('Submitting Quick Reply for WhatsApp approval…', approvalName);
    try {
      const appr = await twilioFetch(`/Content/${confirmSid}/ApprovalRequests/whatsapp`, {
        method: 'POST',
        body: { name: approvalName, category: 'UTILITY' },
        accountSid,
        authToken,
      });
      console.log('Approval status:', appr.status ?? appr);
    } catch (e) {
      console.warn(
        'Approval request failed (sandbox / in-session may still work; revisa títulos estáticos y IDs sin caracteres prohibidos):',
        e.message,
      );
    }
  }

  console.log('\nCreating List Picker template…');
  const lp = await twilioFetch('/Content', {
    method: 'POST',
    body: listPayload,
    accountSid,
    authToken,
  });
  const listSid = lp.sid;
  console.log('List Picker ContentSid:', listSid);
  console.log(
    '\nNota: twilio/list-picker no admite envío a aprobación WhatsApp; solo aplica dentro de la ventana de 24h iniciada por el usuario.\n',
  );

  console.log('\n--- Copiar a .env ---\n');
  console.log(`TWILIO_CONFIRM_CONTENT_SID=${confirmSid}`);
  console.log(`TWILIO_LIST_CONTENT_SID=${listSid}`);
  console.log('\nReinicia el API después de guardar.');
}

main().catch((err) => {
  console.error(err);
  if (err.status === 409) {
    console.error('\nConflicto (nombre duplicado). Borra el template viejo en Twilio o define TWILIO_TEMPLATE_SUFFIX=_v2');
  }
  process.exit(1);
});
