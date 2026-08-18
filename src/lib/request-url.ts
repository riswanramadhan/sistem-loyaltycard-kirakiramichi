import { headers } from "next/headers";
import { getConfiguredSiteUrl, InvalidSiteConfigurationError, normalizeSiteUrl } from "@/lib/env";

const LOCAL_SITE_URL = "http://localhost:3000";

function firstHeaderValue(value: string | null | undefined) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function normalizeRequestHost(value: string | null | undefined) {
  const host = firstHeaderValue(value)?.toLowerCase();
  if (!host) return null;
  if (!/^(?:\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host)) {
    throw new InvalidSiteConfigurationError("Host request tidak valid.");
  }
  return host;
}

export function resolveAuthRedirectOrigin({
  configuredOrigin,
  requestOrigin,
  requestHost,
  production = process.env.NODE_ENV === "production",
}: {
  configuredOrigin?: string | null;
  requestOrigin?: string | null;
  requestHost?: string | null;
  production?: boolean;
}) {
  if (configuredOrigin) return normalizeSiteUrl(configuredOrigin, production);

  if (requestOrigin) {
    const origin = normalizeSiteUrl(requestOrigin, production);
    const host = normalizeRequestHost(requestHost);
    const originUrl = new URL(origin);
    const requestUrl = host ? new URL(`${originUrl.protocol}//${host}`) : null;
    if (requestUrl && originUrl.host.toLowerCase() !== requestUrl.host.toLowerCase()) {
      throw new InvalidSiteConfigurationError(
        "Origin dan host request tidak cocok.",
      );
    }
    return origin;
  }

  if (production) {
    throw new InvalidSiteConfigurationError(
      "NEXT_PUBLIC_SITE_URL diperlukan saat origin request tidak tersedia.",
    );
  }

  return LOCAL_SITE_URL;
}

export async function getAuthRedirectOrigin() {
  const configuredOrigin = getConfiguredSiteUrl();
  if (configuredOrigin) return configuredOrigin;

  const requestHeaders = await headers();
  return resolveAuthRedirectOrigin({
    configuredOrigin: null,
    requestOrigin: requestHeaders.get("origin"),
    requestHost:
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  });
}
