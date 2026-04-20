import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ============================================================
// Overpass API helpers
// ============================================================

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

async function queryOverpass(query: string): Promise<OverpassNode[]> {
  try {
    console.log("[auto-enrich] Overpass query:", query.slice(0, 120));
    const body = new URLSearchParams({ data: query });
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "FeliaPropertySystem/1.0 (contact: info@felia-home.jp)",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log("[auto-enrich] Overpass error:", res.status, res.statusText, text.slice(0, 200));
      return [];
    }
    const data = await res.json() as { elements: OverpassNode[] };
    console.log("[auto-enrich] Overpass elements:", data.elements?.length ?? 0);
    return (data.elements ?? []).filter((e) => e.type === "node");
  } catch (e) {
    console.log("[auto-enrich] Overpass exception:", e);
    return [];
  }
}

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = (lat2 - lat1) * 111;
  const dlng = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180) * 111;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function distanceToWalkMinutes(distKm: number): number {
  return Math.max(1, Math.ceil((distKm * 1000) / 80));
}

// ---- 最寄り駅（上位3件） ----
async function findNearbyStations(
  lat: number, lng: number, radiusM = 1500
): Promise<{ name: string; line: string; walk_minutes: number }[]> {
  const query = `[out:json][timeout:25];
node["railway"="station"](around:${radiusM},${lat},${lng});
out body;`;
  const nodes = await queryOverpass(query);

  return nodes
    .map((node) => {
      const distKm = calcDistanceKm(lat, lng, node.lat, node.lon);
      const name = node.tags["name:ja"] || node.tags["name"] || "";
      // 路線名: line > railway:line > operator > network の優先順で取得
      const line =
        node.tags["line"] ||
        node.tags["railway:line"] ||
        node.tags["operator"] ||
        node.tags["network"] ||
        "";
      return { name, line, walk_minutes: distanceToWalkMinutes(distKm), distKm };
    })
    .filter((s) => s.name)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 3)
    .map(({ name, line, walk_minutes }) => ({ name, line, walk_minutes }));
}

// ---- 近隣学校（小学校・中学校） ----
async function findNearbySchools(
  lat: number, lng: number, radiusM = 800
): Promise<{ elementary: string | null; juniorHigh: string | null }> {
  const query = `[out:json][timeout:25];
node["amenity"="school"](around:${radiusM},${lat},${lng});
out body;`;
  const nodes = await queryOverpass(query);

  const sorted = nodes
    .map((node) => ({
      name: node.tags["name:ja"] || node.tags["name"] || "",
      distKm: calcDistanceKm(lat, lng, node.lat, node.lon),
    }))
    .filter((s) => s.name)
    .sort((a, b) => a.distKm - b.distKm);

  let elementary: string | null = null;
  let juniorHigh: string | null = null;
  for (const s of sorted) {
    if (!elementary && s.name.includes("小学校")) elementary = s.name;
    // 「小学校」を含まない「中学校」のみを中学校と判定（小中一貫校を除外）
    if (!juniorHigh && s.name.includes("中学校") && !s.name.includes("小学校")) juniorHigh = s.name;
    if (elementary && juniorHigh) break;
  }

  return { elementary, juniorHigh };
}

// ---- 路線名フォーマット ----
function formatLineName(line: string): string {
  // Overpass の operator タグ「東急電鉄」→「東急」などを標準化
  const replacements: Record<string, string> = {
    "東日本旅客鉄道": "JR",
    "東急電鉄": "東急",
    "東京地下鉄": "東京メトロ",
    "東京都交通局": "都営",
    "小田急電鉄": "小田急",
    "京王電鉄": "京王",
    "西武鉄道": "西武",
    "東武鉄道": "東武",
    "京浜急行電鉄": "京急",
    "京成電鉄": "京成",
  };
  for (const [from, to] of Object.entries(replacements)) {
    if (line.includes(from)) return line.replace(from, to);
  }
  return line;
}

// ============================================================
// POST /api/properties/[id]/auto-enrich
// ============================================================

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      city: true,
      station_line1: true,
      station_name1: true,
      station_walk1: true,
      station_line2: true,
      station_name2: true,
      station_walk2: true,
      station_line3: true,
      station_name3: true,
      station_walk3: true,
      school_elementary: true,
      school_junior_high: true,
    },
  });

  if (!property) {
    return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
  }

  const lat = property.latitude as number | null;
  const lng = property.longitude as number | null;

  console.log("[auto-enrich] property:", params.id, "lat:", lat, "lng:", lng);

  if (!lat || !lng) {
    return NextResponse.json({ error: "緯度経度が未設定です" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const enriched: string[] = [];

  // ---- 最寄り駅（空の場合のみ）----
  const top3 = await findNearbyStations(lat, lng);
  console.log("[auto-enrich] nearby stations:", top3.length, top3.map(s => s.name).join(", "));

  // 駅1が空の場合は最も近い駅で埋める
  if (!property.station_line1 && !property.station_name1 && top3[0]) {
    updateData.station_line1 = formatLineName(top3[0].line);
    updateData.station_name1 = top3[0].name;
    updateData.station_walk1 = top3[0].walk_minutes;
    enriched.push(`交通1: ${top3[0].name}（${top3[0].walk_minutes}分）`);
  }

  if (!property.station_line2 && !property.station_name2 && top3[1]) {
    updateData.station_line2 = formatLineName(top3[1].line);
    updateData.station_name2 = top3[1].name;
    updateData.station_walk2 = top3[1].walk_minutes;
    enriched.push(`交通2: ${top3[1].name}（${top3[1].walk_minutes}分）`);
  }

  if (!property.station_line3 && !property.station_name3 && top3[2]) {
    updateData.station_line3 = formatLineName(top3[2].line);
    updateData.station_name3 = top3[2].name;
    updateData.station_walk3 = top3[2].walk_minutes;
    enriched.push(`交通3: ${top3[2].name}（${top3[2].walk_minutes}分）`);
  }

  // ---- 学校区（空の場合のみ）----
  const schools = await findNearbySchools(lat, lng);
  console.log("[auto-enrich] schools:", schools);

  if (!property.school_elementary && schools.elementary) {
    updateData.school_elementary = schools.elementary;
    enriched.push(`小学校区: ${schools.elementary}`);
  }

  if (!property.school_junior_high && schools.juniorHigh) {
    updateData.school_junior_high = schools.juniorHigh;
    enriched.push(`中学校区: ${schools.juniorHigh}`);
  }

  // ---- 周辺環境写真のリンク（半径500m以内）----
  const envImages = await prisma.propertyEnvironmentImage.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, latitude: true, longitude: true },
  });

  const nearby = envImages.filter((img) => {
    if (!img.latitude || !img.longitude) return false;
    return calcDistanceKm(lat, lng, img.latitude, img.longitude) <= 0.5;
  });

  let linkedCount = 0;
  for (const img of nearby) {
    try {
      await prisma.propertyEnvImageLink.upsert({
        where: {
          property_id_env_image_id: {
            property_id: params.id,
            env_image_id: img.id,
          },
        },
        create: { property_id: params.id, env_image_id: img.id },
        update: {},
      });
      linkedCount++;
    } catch { /* skip duplicates */ }
  }
  if (linkedCount > 0) enriched.push(`周辺環境写真: ${linkedCount}枚リンク`);

  // ---- DB更新 ----
  if (Object.keys(updateData).length > 0) {
    await prisma.property.update({
      where: { id: params.id },
      data: updateData,
    });
  }

  return NextResponse.json({
    success: true,
    enriched,
    message: enriched.length > 0
      ? `${enriched.length}件を自動取得しました`
      : "追加取得できる情報はありませんでした",
  });
}
