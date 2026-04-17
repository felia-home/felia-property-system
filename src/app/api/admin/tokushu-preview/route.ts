import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  type TokushuConditions,
  type SortType,
  buildWhereFromConditions,
  buildOrderByFromSortType,
} from '@/lib/tokushuConditions';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  try {
    const body = await req.json();
    const conditions: TokushuConditions = body.conditions ?? {};
    const sortType: SortType = body.sort_type ?? 'newest';
    const displayLimit: number = Math.min(body.display_limit ?? 20, 100);

    const where = buildWhereFromConditions(conditions);
    const orderBy = buildOrderByFromSortType(sortType);

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy,
        take: displayLimit,
        select: {
          id: true,
          city: true,
          town: true,
          address: true,
          price: true,
          property_type: true,
          images: {
            take: 1,
            orderBy: { order: 'asc' },
            select: { url: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      properties: properties.map(p => ({
        id: p.id,
        name: [p.city, p.town, p.address].filter(Boolean).join(' '),
        price: p.price,
        property_type: p.property_type,
        address: [p.city, p.town].filter(Boolean).join(' '),
        thumbnail: p.images[0]?.url ?? null,
      })),
    });
  } catch (error) {
    console.error('tokushu-preview error:', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}
