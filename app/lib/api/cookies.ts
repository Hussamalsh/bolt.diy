export function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  // Split the cookie string by semicolons and spaces
  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest.length > 0) {
      // Decode the name and value, and join value parts in case it contains '='
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

function parseObjectCookie<T extends Record<string, any>>(value: string | undefined): T {
  if (!value) {
    return {} as T;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // Ignore malformed cookie values and fall back to an empty object.
  }

  return {} as T;
}

export function getApiKeysFromCookie(cookieHeader: string | null): Record<string, string> {
  void cookieHeader;

  // Server-side API keys must come from environment/runtime secrets only.
  return {};
}

export function getProviderSettingsFromCookie(cookieHeader: string | null): Record<string, any> {
  const cookies = parseCookies(cookieHeader);

  return parseObjectCookie<Record<string, any>>(cookies.providers);
}
