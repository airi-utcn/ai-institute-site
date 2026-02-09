function formatEnvNameList(names) {
  return names.map((n) => `'${n}'`).join(' or ');
}

export function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.length) return value;
  }
  return undefined;
}

export function requireEnv(names, options = {}) {
  const nameList = Array.isArray(names) ? names : [names];
  const value = getEnv(...nameList);

  if (value !== undefined) return value;

  const where = options.where ? ` (${options.where})` : '';
  throw new Error(`Missing required environment variable${where}: ${formatEnvNameList(nameList)}`);
}

export function normalizeBaseUrl(raw) {
  const value = (raw ?? '').toString().trim();
  return value.replace(/\/+$/, '');
}
