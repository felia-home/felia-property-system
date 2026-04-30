import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ============================================================
// Overpass API helpers
// ============================================================

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  // node の場合
  lat?: number;
  lon?: number;
  // way / relation の場合（out center; で取得）
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  // relation の場合
  members?: Array<{ type: string; ref: number; role: string }>;
}

async function queryOverpassRaw(query: string): Promise<OverpassElement[]> {
  try {
    console.log("[auto-enrich] Overpass query:", query.slice(0, 160));
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
    const data = await res.json() as { elements: OverpassElement[] };
    console.log("[auto-enrich] Overpass elements:", data.elements?.length ?? 0);
    return data.elements ?? [];
  } catch (e) {
    console.log("[auto-enrich] Overpass exception:", e);
    return [];
  }
}

/** node/way/relation から座標を取得（way/relation は center を使用） */
function getCoords(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.type === "node" && el.lat != null && el.lon != null) {
    return { lat: el.lat, lon: el.lon };
  }
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = (lat2 - lat1) * 111;
  const dlng = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180) * 111;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function distanceToWalkMinutes(distKm: number): number {
  return Math.max(1, Math.ceil((distKm * 1000) / 80));
}

// ---- 路線名フォーマット ----
function formatLineName(line: string): string {
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
    "相模鉄道": "相鉄",
    "東京臨海高速鉄道": "りんかい線",
    "首都圏新都市鉄道": "つくばエクスプレス",
    "多摩都市モノレール": "多摩モノレール",
    "東京モノレール": "東京モノレール",
    "ゆりかもめ": "ゆりかもめ",
  };
  for (const [from, to] of Object.entries(replacements)) {
    if (line.includes(from)) return line.replace(from, to);
  }
  return line;
}

// 路線名を短縮・正規化
//   "東京メトロ丸ノ内線 : 池袋→荻窪" → "東京メトロ丸ノ内線"
//   "JR中央・総武緩行線"             → "JR中央・総武線"
//   "JR中央線快速"                   → "JR中央線"
//   "JR中央線JC"                     → "JR中央線"
function cleanLineName(name: string): string {
  let clean = name.trim();
  // ' : 池袋→荻窪' のような区間表示を除去
  clean = clean.replace(/\s*[：:]\s*.+$/, "");
  // ' (上り)' '（外回り）' '（方向）' のような方向表示を除去
  clean = clean.replace(/\s*[（(][^）)]*(方向|回り|上り|下り)[^）)]*[）)]\s*$/, "");
  // '=>' '→' '＝＞' 以降を除去（区間名）
  clean = clean.replace(/\s*(=>|→|＝＞|⇒).+$/, "");
  // JR系の正規化
  clean = clean.replace("総武緩行線", "総武線");
  clean = clean.replace("線快速", "線");
  clean = clean.replace(/線[A-Z]+$/, "線");
  return clean.trim();
}

// リレーションの name タグから路線名のみを抽出
// 例: "四ツ谷 (東京メトロ南北線)" → "東京メトロ南北線"
//     "東京メトロ丸ノ内線" → "東京メトロ丸ノ内線"
//     "信濃町駅" → "" （駅名のみは路線名ではない）
function extractLineName(tags: Record<string, string>): string {
  const candidates = [
    tags["name:ja"],
    tags.name,
    tags["official_name:ja"],
    tags.official_name,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    // 「駅名 (路線名)」形式 → 括弧内に「線」「Line」を含む場合は採用
    const m = raw.match(/[（(]([^）)]+)[）)]/);
    if (m) {
      const inner = m[1].trim();
      if (inner.includes("線") || /Line/i.test(inner)) return cleanLineName(inner);
    }
    // 駅名のみ（"...駅" / "... station"）はスキップ
    if (raw.endsWith("駅") || /station\s*$/i.test(raw)) continue;
    // それ以外はそのまま（短縮処理を適用）
    if (raw) return cleanLineName(raw);
  }

  // 最後のフォールバック
  return cleanLineName(tags.operator || tags.network || tags.ref || "");
}

// ---- 最寄り駅（上位3件）— 2リクエスト方式でリレーションから路線名を取得 ----
async function findNearbyStations(
  lat: number, lng: number, radiusM = 1500
): Promise<{ name: string; line: string; walk_minutes: number }[]> {
  // Step1: 駅ノードを取得
  const stationQuery = `[out:json][timeout:20];
node["railway"="station"](around:${radiusM},${lat},${lng});
out body;`;

  const stationElements = await queryOverpassRaw(stationQuery);
  const stationNodes = stationElements.filter(
    e => e.type === "node" && e.tags?.railway === "station"
  );
  console.log("[auto-enrich] station nodes:", stationNodes.length);

  if (stationNodes.length === 0) return [];

  // レート制限対策: Step1 → Step2 間に待機
  await new Promise(r => setTimeout(r, 1000));

  // Step2: stop_position（路線リレーションが直接参照するノード）と
  // それを member に持つ路線リレーションをまとめて取得する。
  // route relation は railway=station ノードではなく
  // public_transport=stop_position / railway=stop ノードを参照する。
  const stopQuery = `[out:json][timeout:30];
(
  node["public_transport"="stop_position"](around:1500,${lat},${lng});
  node["railway"="stop"](around:1500,${lat},${lng});
)->.stops;
rel["route"~"train|subway|monorail|tram|light_rail"](bn.stops);
out body;
.stops out body;`;

  const stopElements = await queryOverpassRaw(stopQuery);
  const stopNodes = stopElements.filter(e => e.type === "node");
  const stopRelations = stopElements.filter(e => e.type === "relation");
  console.log("[auto-enrich] stop nodes:", stopNodes.length, "stop relations:", stopRelations.length);

  // stop_position node ID → 路線名リスト
  const stopNodeLineMap = new Map<number, string[]>();
  for (const rel of stopRelations) {
    const lineName = extractLineName(rel.tags ?? {});
    if (!lineName || !rel.members) continue;
    for (const member of rel.members) {
      if (member.type !== "node") continue;
      const lines = stopNodeLineMap.get(member.ref) ?? [];
      if (!lines.includes(lineName)) lines.push(lineName);
      stopNodeLineMap.set(member.ref, lines);
    }
  }

  // stop_position 名前 → 路線名リスト（駅名で突合できるように集約）
  const stopNameLineMap = new Map<string, string[]>();
  for (const stopNode of stopNodes) {
    const tags = stopNode.tags ?? {};
    const name = tags["name:ja"] || tags.name || "";
    if (!name) continue;
    const lines = stopNodeLineMap.get(stopNode.id) ?? [];
    if (lines.length === 0) continue;

    const existing = stopNameLineMap.get(name) ?? [];
    for (const line of lines) {
      if (!existing.includes(line)) existing.push(line);
    }
    stopNameLineMap.set(name, existing);
  }
  console.log("[auto-enrich] stop name line map:",
    Array.from(stopNameLineMap.entries())
      .slice(0, 10)
      .map(([n, lines]) => `${n}:${lines.join(",")}`).join(" | ")
  );

  // 共通マッピング（フォールバック用）
  const operatorMap: Record<string, string> = {
    "東日本旅客鉄道":         "JR東日本",
    "東日本旅客鉄道株式会社": "JR東日本",
    "東京地下鉄":             "東京メトロ",
    "東京地下鉄株式会社":     "東京メトロ",
    "東京都交通局":           "都営",
    "JR東日本":               "JR東日本",
    "東京急行電鉄":           "東急",
    "小田急電鉄":             "小田急",
    "京王電鉄":               "京王",
    "西武鉄道":               "西武",
    "東武鉄道":               "東武",
    "京成電鉄":               "京成",
    "相模鉄道":               "相鉄",
    "京浜急行電鉄":           "京急",
  };
  const networkMap: Record<string, string> = {
    "JR東日本":   "JR東日本",
    "東京メトロ": "東京メトロ",
    "都営地下鉄": "都営",
  };

  // 駅ノードID → 路線名（先頭1件、複数列挙したい場合は別途）
  const nodeLineMap = new Map<number, string>();
  for (const node of stationNodes) {
    const tags = node.tags ?? {};
    const stationName = tags["name:ja"] || tags.name || "";

    // 1. stop_position 名で駅名と突合
    const matchedLines = stopNameLineMap.get(stationName) ?? [];
    if (matchedLines.length > 0) {
      nodeLineMap.set(node.id, matchedLines[0]);
      continue;
    }

    // 2. 駅ノード自身のタグ
    const lineFromTags =
      tags["railway:line"] ||
      tags.line ||
      tags["ref:train_name"] ||
      "";
    if (lineFromTags) {
      nodeLineMap.set(node.id, lineFromTags);
      continue;
    }

    // 3. operator / network から推定
    const operator = tags.operator || "";
    const network = tags.network || "";
    const inferred =
      operatorMap[operator] ||
      networkMap[network] ||
      operator ||
      network ||
      "";
    if (inferred) nodeLineMap.set(node.id, inferred);
  }

  console.log("[auto-enrich] final station mapping:",
    stationNodes.map(n => {
      const nm = n.tags?.["name:ja"] || n.tags?.name || "";
      return `${nm}→${nodeLineMap.get(n.id) || "(none)"}`;
    }).join(", ")
  );

  return stationNodes
    .map((node) => {
      const coords = getCoords(node);
      if (!coords) return null;
      const distKm = calcDistanceKm(lat, lng, coords.lat, coords.lon);
      const name = node.tags?.["name:ja"] || node.tags?.["name"] || "";
      if (!name) return null;

      const line = nodeLineMap.get(node.id) ?? "";

      return { name, line, walk_minutes: distanceToWalkMinutes(distKm), distKm };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.name !== "")
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 3)
    .map(({ name, line, walk_minutes }) => ({
      name,
      line: formatLineName(line),
      walk_minutes,
    }));
}

/** OSM データの学校名から余分なスペース・改行を除去して正規化 */
function normalizeSchoolName(name: string): string {
  return name.replace(/\s+/g, "").trim();
}

// ---- 近隣学校（小学校・中学校）— nwr で way も取得 ----
async function findNearbySchools(
  lat: number, lng: number, radiusM = 800
): Promise<{ elementary: string | null; juniorHigh: string | null }> {
  // nwr（node/way/relation）で取得 + out center で way/relation の座標も取得
  const query = `[out:json][timeout:25];
nwr["amenity"="school"](around:${radiusM},${lat},${lng});
out center;`;
  const elements = await queryOverpassRaw(query);

  const sorted = elements
    .map((el) => {
      const coords = getCoords(el);
      if (!coords) return null;
      const rawName = el.tags?.["name:ja"] || el.tags?.["name"] || "";
      const name = normalizeSchoolName(rawName);
      if (!name) return null;
      return { name, distKm: calcDistanceKm(lat, lng, coords.lat, coords.lon) };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.distKm - b.distKm);

  console.log("[auto-enrich] school candidates:", sorted.map(s => s.name));

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
      env_elementary_school: true,
      env_junior_high_school: true,
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
  console.log("[auto-enrich] nearby stations:", top3.length, top3.map(s => `${s.name}(${s.line})`).join(", "));

  // 「住所から自動取得」操作なので、既存の駅情報は常に上書きする
  // （誤った既存データを最新の OSM 結果で修正するため）
  if (top3[0]) {
    updateData.station_line1 = top3[0].line || null;
    updateData.station_name1 = top3[0].name || null;
    updateData.station_walk1 = top3[0].walk_minutes ?? null;
    enriched.push(`交通1: ${top3[0].name}（${top3[0].walk_minutes}分）`);
  }
  if (top3[1]) {
    updateData.station_line2 = top3[1].line || null;
    updateData.station_name2 = top3[1].name || null;
    updateData.station_walk2 = top3[1].walk_minutes ?? null;
    enriched.push(`交通2: ${top3[1].name}（${top3[1].walk_minutes}分）`);
  }
  if (top3[2]) {
    updateData.station_line3 = top3[2].line || null;
    updateData.station_name3 = top3[2].name || null;
    updateData.station_walk3 = top3[2].walk_minutes ?? null;
    enriched.push(`交通3: ${top3[2].name}（${top3[2].walk_minutes}分）`);
  } else {
    // 取得結果が3件未満のときは既存3件目をクリア
    updateData.station_line3 = null;
    updateData.station_name3 = null;
    updateData.station_walk3 = null;
  }

  // レート制限対策: 駅クエリ（2リクエスト）完了後、学校クエリ前に待機
  await new Promise(r => setTimeout(r, 1500));

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

  // UI 入力欄が参照している env_elementary_school / env_junior_high_school にも反映（空の場合のみ）
  if (!property.env_elementary_school && schools.elementary) {
    updateData.env_elementary_school = schools.elementary;
  }
  if (!property.env_junior_high_school && schools.juniorHigh) {
    updateData.env_junior_high_school = schools.juniorHigh;
  }

  // ---- 周辺環境写真のリンク（半径500m以内）----
  const envImages = await prisma.propertyEnvironmentImage.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
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
          property_id_image_id: { property_id: params.id, image_id: img.id },
        },
        create: { property_id: params.id, image_id: img.id },
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
    schools: {
      elementary: schools.elementary,
      juniorHigh: schools.juniorHigh,
    },
    stations: top3,
    message: enriched.length > 0
      ? `${enriched.length}件を自動取得しました`
      : "追加取得できる情報はありませんでした",
  });
}
