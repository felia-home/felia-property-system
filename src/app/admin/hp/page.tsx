import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HpManagementPage() {
  const [featureCount, newsCount, bannerCount, selectionCount] = await Promise.all([
    prisma.feature.count({ where: { is_active: true } }),
    prisma.news.count({ where: { is_published: true } }),
    prisma.banner.count({ where: { is_active: true } }),
    prisma.property.count({ where: { is_felia_selection: true, is_deleted: false } }),
  ]);

  const metrics = [
    { label: "特集", value: featureCount, sub: "公開中", href: "/admin/hp/features", color: "#eaf3de", text: "#3b6d11" },
    { label: "お知らせ", value: newsCount, sub: "公開中", href: "/admin/hp/news", color: "#e6f1fb", text: "#185fa5" },
    { label: "Felia Selection", value: selectionCount, sub: "掲載中物件", href: "/admin/properties", color: "#faeeda", text: "#854f0b" },
    { label: "バナー", value: bannerCount, sub: "表示中", href: "/admin/hp/banners", color: "#f1efff", text: "#534ab7" },
  ];

  const sections = [
    { href: "/admin/hp/features", icon: "🗂", title: "特集管理", desc: "特集バナーの作成・並び替え" },
    { href: "/admin/hp/news", icon: "📰", title: "お知らせ", desc: "News記事の作成・公開管理" },
    { href: "/admin/hp/banners", icon: "🖼", title: "バナー", desc: "バナースロットの設定" },
    { href: "/admin/properties?flag=felia_selection", icon: "⭐", title: "Felia Selection", desc: "厳選物件フラグの管理" },
    { href: "/admin/properties?flag=open_house", icon: "🏠", title: "現地販売会", desc: "開催日時・フラグ管理" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">HP管理</h1>
        <p className="text-sm text-gray-500 mt-1">フェリアホームHPのコンテンツを管理します</p>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {metrics.map(m => (
          <Link key={m.label} href={m.href}
            className="rounded-xl p-4 hover:opacity-80 transition-opacity"
            style={{ background: m.color }}>
            <div className="text-xs font-bold mb-1" style={{ color: m.text }}>{m.label}</div>
            <div className="text-3xl font-bold" style={{ color: m.text }}>{m.value}</div>
            <div className="text-xs mt-1" style={{ color: m.text, opacity: 0.7 }}>{m.sub}</div>
          </Link>
        ))}
      </div>

      {/* クイックアクセス */}
      <div className="grid grid-cols-3 gap-3">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm hover:border-gray-200 transition-all">
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className="font-bold text-gray-800 mb-1">{s.title}</div>
            <div className="text-xs text-gray-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
