import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HpManagementPage() {
  const [featureCount, newsCount, bannerCount, selectionCount] = await Promise.all([
    prisma.feature.count({ where: { is_active: true } }).catch(() => 0),
    prisma.news.count({ where: { is_published: true } }).catch(() => 0),
    prisma.banner.count({ where: { is_active: true } }).catch(() => 0),
    prisma.property.count({ where: { is_felia_selection: true, is_deleted: false } }).catch(() => 0),
  ]);

  const metrics = [
    { label: "特集", value: featureCount, sub: "公開中", href: "/admin/hp/features", bg: "#eaf3de", color: "#3b6d11" },
    { label: "お知らせ", value: newsCount, sub: "公開中", href: "/admin/hp/news", bg: "#e6f1fb", color: "#185fa5" },
    { label: "Felia Selection", value: selectionCount, sub: "掲載中物件", href: "/admin/properties", bg: "#faeeda", color: "#854f0b" },
    { label: "バナー", value: bannerCount, sub: "表示中", href: "/admin/hp/banners", bg: "#f0eeff", color: "#534ab7" },
  ];

  const sections = [
    { href: "/admin/hp/features", icon: "🗂", title: "特集管理", desc: "特集バナーの作成・並び替え" },
    { href: "/admin/hp/news", icon: "📰", title: "お知らせ管理", desc: "News記事の作成・公開管理" },
    { href: "/admin/hp/banners", icon: "🖼", title: "バナー管理", desc: "バナースロットの設定" },
    { href: "/admin/properties?flag=felia_selection", icon: "⭐", title: "Felia Selection", desc: "厳選物件フラグの管理" },
    { href: "/admin/properties?flag=open_house", icon: "🏠", title: "現地販売会", desc: "開催日時・フラグ管理" },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>HP管理</h1>
        <p style={{ fontSize: "14px", color: "#888", marginTop: "4px" }}>フェリアホームHPのコンテンツを管理します</p>
      </div>

      {/* メトリクスカード */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
        {metrics.map(m => (
          <Link key={m.label} href={m.href} style={{ textDecoration: "none" }}>
            <div style={{ background: m.bg, borderRadius: "16px", padding: "20px", cursor: "pointer" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: m.color, marginBottom: "6px" }}>{m.label}</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: "12px", color: m.color, opacity: 0.7, marginTop: "4px" }}>{m.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* クイックアクセス */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {sections.map(s => (
          <Link key={s.href + s.title} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #f0f0f0", borderRadius: "16px", padding: "20px", cursor: "pointer" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>{s.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>{s.title}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
