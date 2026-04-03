import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 既存HPから取得したスタッフ情報（写真URL・紹介文込み）
// ※ スキーマのフィールド名: photo_url / bio(=hp_profile) / catchphrase(=hp_catch) / published_hp(=hp_show)
const STAFF_DATA = [
  {
    name: "北原 啓輔",
    name_kana: "キタハラ ケイスケ",
    position: "代表取締役",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/kitahara.jpg",
    bio: "フェリアホーム代表。お客様の幸せを住まいで実現するため、東京都心・城南・城西エリアの不動産売買に特化したサービスを提供しています。",
    published_hp: true,
  },
  {
    name: "伊藤 貴洋",
    name_kana: "イトウ タカヒロ",
    position: "営業部 係長",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/t.ito.jpg",
    bio: "丁寧な説明をモットーに、お客様一人ひとりに寄り添った提案を心がけています。不動産売買仲介の全業務を一貫してサポートいたします。",
    published_hp: true,
  },
  {
    name: "長田 光平",
    name_kana: "ナガタ コウヘイ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/k.nagata.jpg",
    published_hp: true,
  },
  {
    name: "表 来希",
    name_kana: "オモテ ライキ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/r.omote.jpg",
    published_hp: true,
  },
  {
    name: "齋藤 大空",
    name_kana: "サイトウ タク",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/t.saito.jpg",
    published_hp: true,
  },
  {
    name: "安井 孝輔",
    name_kana: "ヤスイ コウスケ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/k.yasui.jpg",
    published_hp: true,
  },
  {
    name: "中田 真矢",
    name_kana: "ナカダ マサヤ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/m.nakada.jpg",
    published_hp: true,
  },
  {
    name: "加藤 遼太朗",
    name_kana: "カトウ リョウタロウ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/r.kato.jpg",
    published_hp: true,
  },
  {
    name: "松本 祐輔",
    name_kana: "マツモト ユウスケ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/y.matsumoto.jpg",
    published_hp: true,
  },
  {
    name: "波多 隆二",
    name_kana: "ハタ リュウジ",
    position: "営業部 部長",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/hata.jpg",
    published_hp: true,
  },
  {
    name: "中塚 雅人",
    name_kana: "ナカツカ マサト",
    position: "営業部 次長",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/nakatsuka.jpg",
    published_hp: true,
  },
  {
    name: "渡邉 圭介",
    name_kana: "ワタナベ ケイスケ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/k.watanabe.jpg",
    published_hp: true,
  },
  {
    name: "阿部 楠央",
    name_kana: "アベ ナオ",
    position: "営業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/n.abe.png",
    published_hp: true,
  },
  {
    name: "星 俊彦",
    name_kana: "ホシ トシヒコ",
    position: "コンサルティング事業部 部長",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/hoshi.jpg",
    bio: "「全てはお客様の為に」をモットーに、不動産売買から資産活用まで幅広くサポートします。",
    published_hp: true,
  },
  {
    name: "松 大輔",
    name_kana: "マツ ダイスケ",
    position: "コンサルティング事業部",
    photo_url: "https://img.hs.aws.multi-use.net/adm1/felia/images/staff/d.matsu.jpg",
    published_hp: true,
  },
];

async function main() {
  console.log("スタッフ写真・紹介文を格納中...\n");

  let updated = 0;
  let notFound = 0;

  for (const data of STAFF_DATA) {
    const staff = await prisma.staff.findFirst({
      where: { name: data.name },
    });

    if (!staff) {
      console.log(`⚠️  見つかりません: ${data.name}`);
      notFound++;
      continue;
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        photo_url: data.photo_url,
        bio: data.bio ?? staff.bio,
        published_hp: data.published_hp,
        name_kana: data.name_kana ?? staff.name_kana,
        position: data.position ?? staff.position,
      },
    });

    console.log(`✅ 更新: ${data.name} (${data.position})`);
    updated++;
  }

  console.log(`\n完了: ${updated}件更新, ${notFound}件未発見`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
