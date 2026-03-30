import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 会社の初期データ
  const company = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "株式会社フェリアホーム",
      name_kana: "かぶしきがいしゃふぇりあほーむ",
      license_number: "東京都知事(X)第XXXXX号",
      license_expiry: new Date("2027-03-31"),
      phone: "03-0000-0000",
      address: "東京都目黒区自由が丘2-1-1",
      representative: "代表取締役 田中 太郎",
    },
  });

  console.log(`会社を登録しました: ${company.name}`);

  // 店舗の初期データ
  const stores = [
    {
      id: "store-jog",
      name: "自由が丘店",
      store_code: "JOG",
      address: "東京都目黒区自由が丘2-1-1",
      phone: "03-0000-0001",
    },
    {
      id: "store-nkm",
      name: "中目黒店",
      store_code: "NKM",
      address: "東京都目黒区上目黒3-1-1",
      phone: "03-0000-0002",
    },
  ];

  for (const s of stores) {
    const store = await prisma.store.upsert({
      where: { store_code: s.store_code },
      update: {},
      create: {
        id: s.id,
        company_id: company.id,
        name: s.name,
        store_code: s.store_code,
        address: s.address,
        phone: s.phone,
        is_active: true,
      },
    });
    console.log(`店舗を登録しました: ${store.name} (${store.store_code})`);
  }

  console.log("\nシードデータの登録が完了しました。");
  console.log("次のステップ:");
  console.log("  1. /admin/settings で会社情報・免許番号を正しい内容に更新してください");
  console.log("  2. /admin/staff/new でスタッフを登録してください");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
