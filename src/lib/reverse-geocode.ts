/** Browser-safe reverse geocode. Never uses Puter, LLMs, or custom Origin headers. */

export const REVERSE_GEOCODE_TIMEOUT_MS = 8000;

export const CITY_LEVEL_LOOKUP_NOTICE =
  "Neighborhood lookup unavailable — using city-level benchmarks.";

export type ReverseGeocodeResult = {
  neighborhood: string;
  city: string;
  locality: string;
  /** Value Sale/Operational research prompts consume as `location.subMarket`. */
  subMarket: string;
};

type BigDataCloudPlace = {
  name?: string;
  description?: string;
  isoName?: string;
  adminLevel?: number;
};

type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  localityInfo?: {
    informative?: BigDataCloudPlace[];
    administrative?: BigDataCloudPlace[];
  };
};

function placeName(place: BigDataCloudPlace | undefined): string {
  return (place?.name || place?.isoName || "").trim();
}

function isNeighborhoodPlace(place: BigDataCloudPlace): boolean {
  const label = `${place.description ?? ""} ${place.isoName ?? ""}`.toLowerCase();
  return /neighbourhood|neighborhood|suburb|quarter|district|hamlet/.test(
    label
  );
}

function mapBigDataCloudResponse(
  data: BigDataCloudResponse
): ReverseGeocodeResult {
  const informative = data.localityInfo?.informative ?? [];
  const administrative = data.localityInfo?.administrative ?? [];

  const neighborhood =
    placeName(informative.find(isNeighborhoodPlace)) ||
    placeName(administrative.find(isNeighborhoodPlace));

  const city = (data.city || "").trim();
  const locality = (data.locality || "").trim();
  const subMarket = neighborhood || locality || city;

  return { neighborhood, city, locality, subMarket };
}

/**
 * Reverse-geocode a dropped pin via BigDataCloud's keyless client endpoint.
 * Times out after 8s. Callers must catch — never leave UI gated on this promise.
 */
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    REVERSE_GEOCODE_TIMEOUT_MS
  );

  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${encodeURIComponent(String(lat))}` +
      `&longitude=${encodeURIComponent(String(lng))}` +
      `&localityLanguage=en`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Reverse geocode failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as BigDataCloudResponse;
    const mapped = mapBigDataCloudResponse(data);
    if (!mapped.subMarket) {
      throw new Error("Reverse geocode returned no locality");
    }
    return mapped;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Map neighborhood lookup timed out after 8s");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
