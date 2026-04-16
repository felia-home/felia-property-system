import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 内装・住宅写真のクエリキーワード（ランダムに選択）
const INTERIOR_QUERIES = [
  'living room interior',
  'bedroom interior',
  'kitchen interior modern',
  'dining room interior',
  'bathroom interior',
  'japanese room interior',
  'cozy living room',
  'modern bedroom',
  'apartment interior',
  'home interior bright',
  'scandinavian interior',
  'minimalist room',
  'wood interior room',
  'bright apartment room',
  'elegant living room',
]

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return NextResponse.json(
      { error: 'UNSPLASH_ACCESS_KEY が設定されていません' },
      { status: 500 }
    )
  }

  // ランダムにクエリを選択（毎回違う写真が出るようにpage=ランダムも付加）
  const query = INTERIOR_QUERIES[Math.floor(Math.random() * INTERIOR_QUERIES.length)]
  const page = Math.floor(Math.random() * 10) + 1

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}&orientation=landscape`

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    })

    if (!res.ok) {
      console.error('Unsplash API error:', res.status, res.statusText)
      return NextResponse.json(
        { error: 'Unsplash APIエラーが発生しました' },
        { status: 502 }
      )
    }

    const data = await res.json() as {
      results?: {
        urls: { regular: string; thumb: string; small: string }
        user: { name: string }
        links: { html: string }
      }[]
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: '写真が見つかりませんでした' }, { status: 404 })
    }

    // ランダムに1枚選択
    const photo = data.results[Math.floor(Math.random() * data.results.length)]

    return NextResponse.json({
      url: photo.urls.regular,        // 通常サイズ（1080px幅）
      thumb: photo.urls.thumb,        // サムネイル
      small: photo.urls.small,        // 小サイズ
      photographer: photo.user.name,  // 撮影者名（帰属表示用）
      unsplash_url: photo.links.html, // Unsplashページ（帰属表示用）
      query,                          // 使用したクエリ（デバッグ用）
    })
  } catch (error) {
    console.error('Unsplash fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
