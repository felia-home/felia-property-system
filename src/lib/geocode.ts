/**
 * 住所から緯度経度を取得する（OpenStreetMap Nominatim API使用・無料・APIキー不要）
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&accept-language=ja`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "felia-home-admin/1.0 (contact@felia-home.co.jp)",
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}
