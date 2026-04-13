import Link from "next/link";

export default function HpManagementPage() {
  const sections = [
    {
      href: "/admin/hp/features",
      icon: "🗂️",
      title: "特集管理",
      desc: "トップページの特集バナーを作成・編集・並び替えします",
      color: "bg-purple-50 border-purple-200",
    },
    {
      href: "/admin/hp/news",
      icon: "📰",
      title: "お知らせ管理",
      desc: "News・新着物件のお知らせ記事を作成・公開管理します",
      color: "bg-blue-50 border-blue-200",
    },
    {
      href: "/admin/hp/banners",
      icon: "🖼️",
      title: "バナー管理",
      desc: "トップページのバナー（2カラム2行）を設定します",
      color: "bg-green-50 border-green-200",
    },
    {
      href: "/admin/properties?flag=felia_selection",
      icon: "⭐",
      title: "厳選物件（Felia Selection）",
      desc: "物件一覧からFelia Selectionフラグを設定します",
      color: "bg-yellow-50 border-yellow-200",
    },
    {
      href: "/admin/properties?flag=open_house",
      icon: "🏠",
      title: "現地販売会",
      desc: "物件一覧から現地販売会フラグと開催日時を設定します",
      color: "bg-orange-50 border-orange-200",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">HP管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          フェリアホームHPのコンテンツを管理します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className={`block rounded-2xl border-2 p-6 hover:shadow-md transition-shadow ${s.color}`}>
            <div className="text-3xl mb-3">{s.icon}</div>
            <div className="font-bold text-gray-800 text-lg mb-1">{s.title}</div>
            <div className="text-sm text-gray-600">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
