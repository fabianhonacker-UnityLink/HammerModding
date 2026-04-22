const TEBEX_BASE_URL = 'https://headless.tebex.io/api';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Fehlende Umgebungsvariable: ${name}`);
    error.statusCode = 500;
    error.publicMessage = `Server-Konfiguration unvollständig: ${name}.`;
    throw error;
  }
  return value;
}

function buildBasicAuthHeader() {
  const publicToken = requireEnv('TEBEX_PUBLIC_TOKEN');
  const privateKey = requireEnv('TEBEX_PRIVATE_KEY');
  return `Basic ${Buffer.from(`${publicToken}:${privateKey}`).toString('base64')}`;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const detail = json?.detail || json?.error_message || json?.message || text || 'Tebex-Anfrage fehlgeschlagen.';
    const error = new Error(detail);
    error.statusCode = response.status;
    error.publicMessage = `Tebex-Fehler: ${detail}`;
    error.tebexStatus = response.status;
    error.tebexDetail = String(detail || '').trim();
    error.tebexJson = json;
    error.tebexRawText = text;
    throw error;
  }

  return json;
}

async function tebexPost(path, body) {
  const response = await fetch(`${TEBEX_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse(response);
}

async function tebexGet(path) {
  const response = await fetch(`${TEBEX_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: buildBasicAuthHeader(),
      Accept: 'application/json',
    },
  });

  return parseJsonResponse(response);
}

export async function createBasket({ completeUrl, cancelUrl, custom, ipAddress }) {
  const token = requireEnv('TEBEX_PUBLIC_TOKEN');
  return tebexPost(`/accounts/${token}/baskets`, {
    complete_url: completeUrl,
    cancel_url: cancelUrl,
    complete_auto_redirect: false,
    custom,
    ip_address: ipAddress,
  });
}

export async function getBasket({ basketIdent }) {
  const token = requireEnv('TEBEX_PUBLIC_TOKEN');
  return tebexGet(`/accounts/${token}/baskets/${basketIdent}`);
}

export async function addPackageToBasket({ basketIdent, packageId, quantity = 1, variableData, custom }) {
  const body = {
    package_id: String(packageId),
    quantity,
    custom,
  };

  if (variableData && typeof variableData === 'object' && Object.keys(variableData).length) {
    body.variable_data = variableData;
  }

  return tebexPost(`/baskets/${basketIdent}/packages`, body);
}

export async function getBasketAuthLinks({ basketIdent, returnUrl }) {
  const token = requireEnv('TEBEX_PUBLIC_TOKEN');
  return tebexGet(`/accounts/${token}/baskets/${basketIdent}/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
}
