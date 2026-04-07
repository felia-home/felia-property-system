import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/properties/check-duplicate
// 抽出された物件情報から重複の可能性がある既存物件を検索する
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reins_number,
      city,
      town,
      address,
      price,
      area_land_m2,
      area_build_m2,
      area_exclusive_m2,
      station_name1,
      station_walk1,
    } = body as Record<string, unknown>;

    // レインズ番号が一致 → 単体で重複確定
    if (reins_number && typeof reins_number === "string" && reins_number.trim()) {
      const reinsMatch = await prisma.property.findFirst({
        where: { reins_number: reins_number.trim() },
        select: {
          id: true, property_number: true, title: true,
          city: true, town: true, address: true,
          price: true, rooms: true, status: true,
          area_land_m2: true, area_build_m2: true, area_exclusive_m2: true,
        },
      });
      if (reinsMatch) {
        return NextResponse.json({
          isDuplicate: true,
          reason: "reins_number",
          matches: [reinsMatch],
        });
      }
    }

    // 2つ以上の条件一致で重複とみなす
    // まず広めにORで候補を取得し、一致スコアで絞る
    const orConditions: Record<string, unknown>[] = [];

    // 条件1: 所在地一致（市区町村 + 町名丁目 + 番地）
    if (city && town) {
      orConditions.push({
        city: String(city),
        town: String(town),
        ...(address ? { address: String(address) } : {}),
      });
    }

    // 条件2: 価格一致
    if (price && Number(price) > 0) {
      orConditions.push({ price: Number(price) });
    }

    // 条件3: 面積一致（土地 or 建物 or 専有）
    const area = Number(area_land_m2) || Number(area_build_m2) || Number(area_exclusive_m2);
    if (area > 0) {
      const areaConditions: Record<string, unknown>[] = [];
      if (Number(area_land_m2) > 0) areaConditions.push({ area_land_m2: Number(area_land_m2) });
      if (Number(area_build_m2) > 0) areaConditions.push({ area_build_m2: Number(area_build_m2) });
      if (Number(area_exclusive_m2) > 0) areaConditions.push({ area_exclusive_m2: Number(area_exclusive_m2) });
      if (areaConditions.length > 0) {
        orConditions.push({ OR: areaConditions });
      }
    }

    // 条件4: 最寄駅 + 徒歩分数一致
    if (station_name1 && station_walk1) {
      orConditions.push({
        station_name1: String(station_name1),
        station_walk1: Number(station_walk1),
      });
    }

    if (orConditions.length < 2) {
      // 比較条件が1つ以下なら重複判定不可
      return NextResponse.json({ isDuplicate: false, matches: [] });
    }

    const candidates = await prisma.property.findMany({
      where: { OR: orConditions },
      select: {
        id: true, property_number: true, title: true,
        city: true, town: true, address: true,
        price: true, rooms: true, status: true,
        area_land_m2: true, area_build_m2: true, area_exclusive_m2: true,
        station_name1: true, station_walk1: true,
        reins_number: true,
      },
      take: 10,
    });

    // 各候補のスコアリング（2点以上で重複）
    const matches = candidates.filter(c => {
      let score = 0;
      // 所在地一致
      if (city && town && c.city === String(city) && c.town === String(town)) {
        if (!address || c.address === String(address)) score++;
      }
      // 価格一致
      if (price && Number(price) > 0 && c.price === Number(price)) score++;
      // 面積一致
      if (Number(area_land_m2) > 0 && c.area_land_m2 === Number(area_land_m2)) score++;
      else if (Number(area_build_m2) > 0 && c.area_build_m2 === Number(area_build_m2)) score++;
      else if (Number(area_exclusive_m2) > 0 && c.area_exclusive_m2 === Number(area_exclusive_m2)) score++;
      // 最寄駅 + 徒歩一致
      if (station_name1 && station_walk1 &&
          c.station_name1 === String(station_name1) &&
          c.station_walk1 === Number(station_walk1)) score++;
      return score >= 2;
    });

    return NextResponse.json({
      isDuplicate: matches.length > 0,
      reason: matches.length > 0 ? "multi_field" : null,
      matches: matches.map(m => ({
        id: m.id,
        property_number: m.property_number,
        title: m.title,
        city: m.city,
        town: m.town,
        address: m.address,
        price: m.price,
        rooms: m.rooms,
        status: m.status,
        area_land_m2: m.area_land_m2,
        area_build_m2: m.area_build_m2,
        area_exclusive_m2: m.area_exclusive_m2,
      })),
    });
  } catch (error) {
    console.error("POST /api/properties/check-duplicate error:", error);
    return NextResponse.json({ error: "重複チェックに失敗しました" }, { status: 500 });
  }
}
