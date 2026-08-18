const DEFAULT_RETURN_PATH = "/loyalty";
const INTERNAL_ORIGIN = "https://internal.invalid";

function isAuthPath(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

function decodeForValidation(value: string) {
  let decoded = value;

  for (let index = 0; index < 5; index += 1) {
    if (
      decoded.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decoded) ||
      /%(?:2f|5c)/i.test(decoded)
    ) {
      return null;
    }

    const next = decodeURIComponent(decoded);
    if (next === decoded) return decoded;
    decoded = next;
  }

  return null;
}

export function safeReturnPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") return DEFAULT_RETURN_PATH;
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return DEFAULT_RETURN_PATH;
  }

  try {
    const decoded = decodeForValidation(value);
    if (!decoded) return DEFAULT_RETURN_PATH;

    const url = new URL(value, INTERNAL_ORIGIN);
    const decodedUrl = new URL(decoded, INTERNAL_ORIGIN);
    const normalizedPath = `${url.pathname}${url.search}${url.hash}`;
    if (
      url.origin !== INTERNAL_ORIGIN ||
      decodedUrl.origin !== INTERNAL_ORIGIN ||
      normalizedPath.startsWith("//") ||
      decodedUrl.pathname.startsWith("//") ||
      isAuthPath(url.pathname) ||
      isAuthPath(decodedUrl.pathname)
    ) {
      return DEFAULT_RETURN_PATH;
    }

    return normalizedPath;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
