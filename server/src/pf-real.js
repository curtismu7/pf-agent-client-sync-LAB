// Real PingFederate 13.1 admin API client (read-only).
// Config comes from env at call time: PF_BASE_URL, PF_ADMIN_USER, PF_ADMIN_PASSWORD.
// Never logs credentials. Answers a structured error on unreachable upstream (rule 23).
// PF 13.1 admin API client. Only reads; never writes.
export function pfConfigFromEnv(env = process.env) {
  return {
    baseUrl: env.PF_BASE_URL || null,
    username: env.PF_ADMIN_USER || null,
    password: env.PF_ADMIN_PASSWORD || null,
  };
}

export function isRealConfigured(env = process.env) {
  const c = pfConfigFromEnv(env);
  return Boolean(c.baseUrl && c.username && c.password);
}

function mapFetchError(err) {
  const code = err?.code ?? err?.cause?.code;
  if (code || err?.message === 'fetch failed') {
    return { error: 'pf_unreachable', message: `Could not connect to PingFederate at the configured base URL (${code ?? 'fetch failed'}).` };
  }
  return { error: 'pf_request_failed', message: 'Request to PingFederate failed.' };
}

async function pfFetchJson(config, path, { timeoutMs = 8000 } = {}) {
  if (!(config.baseUrl && config.username && config.password)) {
    return { error: 'pf_not_configured', message: 'Real mode needs PF_BASE_URL, PF_ADMIN_USER and PF_ADMIN_PASSWORD.' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const res = await fetch(new URL(path, config.baseUrl), {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { error: 'pf_http_error', message: `PingFederate answered ${res.status} for ${path}.` };
    }
    return await res.json();
  } catch (err) {
    return mapFetchError(err);
  } finally {
    clearTimeout(timer);
  }
}


// PF 13.1 admin API: list OAuth clients; tag filtering is client-side (tag lives on the client).
// Path shape follows /oauth/clients (PF admin REST). Only reads; never writes.
export function createPfReal(env = process.env) {
  const config = pfConfigFromEnv(env);
  return {
    sourceName: 'real-pf',
    async listClients({ filterTag } = {}) {
      const body = await pfFetchJson(config, '/oauth/clients?numberOfResults=1000');
      if (body.error) return body;
      const items = Array.isArray(body.items) ? body.items : [];
      const mapped = items.map((c) => ({
        clientId: c.clientId ?? c.name,
        name: c.name ?? c.clientId,
        grantTypes: c.allowedGrantTypes ?? c.grantTypes ?? [],
        scopes: (c.restrictedScopes ?? c.scopes ?? []),
        tags: c.tags ?? [],
        enabled: c.enabled ?? true,
        owner: c.ownerId ?? null,
        createdAt: c.createdBy?.date ?? null,
      }));
      return filterTag ? mapped.filter((c) => c.tags.includes(filterTag)) : mapped;
    },
  };
}
