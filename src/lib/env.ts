export class MissingSupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase belum dikonfigurasi.");
    this.name = "MissingSupabaseConfigurationError";
  }
}

export class InvalidSiteConfigurationError extends Error {
  constructor(message = "Origin situs belum dikonfigurasi dengan aman.") {
    super(message);
    this.name = "InvalidSiteConfigurationError";
  }
}

const LOCAL_SITE_URL = "http://localhost:3000";

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "[::1]"
  );
}

export function normalizeSiteUrl(
  value: string,
  production = process.env.NODE_ENV === "production",
) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new InvalidSiteConfigurationError();
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new InvalidSiteConfigurationError();
  }

  if (production && url.protocol !== "https:" && !isLoopbackHost(url.hostname)) {
    throw new InvalidSiteConfigurationError(
      "Origin situs produksi harus menggunakan HTTPS.",
    );
  }

  return url.origin;
}

export function getConfiguredSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeSiteUrl(configured);

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return normalizeSiteUrl(
      vercelHost.startsWith("http://") || vercelHost.startsWith("https://")
        ? vercelHost
        : `https://${vercelHost}`,
      true,
    );
  }

  return null;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      !key.includes("your-publishable"),
  );
}

export function getSupabaseEnv() {
  if (!isSupabaseConfigured()) {
    throw new MissingSupabaseConfigurationError();
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}

export function getSupabaseAdminEnv() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new MissingSupabaseConfigurationError();
  }

  return { url, serviceRoleKey };
}

export function getSiteUrl() {
  return getConfiguredSiteUrl() ?? LOCAL_SITE_URL;
}
