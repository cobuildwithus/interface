type ChatGeo = {
  country: string | null;
  countryRegion: string | null;
};

type ChatGeoResponse = {
  country?: string | null;
  countryRegion?: string | null;
};

const CHAT_GEO_STORAGE_KEY = "cobuild:chat-geo";
const CHAT_GEO_ENDPOINT = "/api/geo";

let geoPromise: Promise<ChatGeo | null> | null = null;

const normalizeGeoValue = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeGeo = (payload: ChatGeoResponse | null | undefined): ChatGeo | null => {
  const country = normalizeGeoValue(payload?.country);
  const countryRegion = normalizeGeoValue(payload?.countryRegion);
  if (!country && !countryRegion) return null;
  return { country, countryRegion };
};

const readStoredGeo = (): ChatGeo | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CHAT_GEO_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChatGeoResponse;
    return normalizeGeo(parsed);
  } catch {
    return null;
  }
};

const storeGeo = (geo: ChatGeo | null) => {
  if (typeof window === "undefined") return;
  if (!geo || (!geo.country && !geo.countryRegion)) {
    sessionStorage.removeItem(CHAT_GEO_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(CHAT_GEO_STORAGE_KEY, JSON.stringify(geo));
};

const fetchGeo = async (): Promise<ChatGeo | null> => {
  try {
    const response = await fetch(CHAT_GEO_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as ChatGeoResponse | null;
    const geo = normalizeGeo(payload);
    storeGeo(geo);
    return geo;
  } catch {
    return null;
  }
};

export const primeChatGeo = async () => {
  if (typeof window === "undefined") return null;
  const cached = readStoredGeo();
  if (cached) return cached;
  if (!geoPromise) {
    geoPromise = fetchGeo().finally(() => {
      geoPromise = null;
    });
  }
  return geoPromise;
};

export const getChatGeoHeaders = () => {
  const geo = readStoredGeo();
  if (!geo) return {};
  const headers: Record<string, string> = {};
  if (geo.country) {
    headers["country"] = geo.country;
  }
  if (geo.countryRegion) {
    headers["country-region"] = geo.countryRegion;
  }
  return headers;
};
