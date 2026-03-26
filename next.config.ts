import type { NextConfig } from "next";

/**
 * フェリアホーム 物件情報管理システム — Next.js 設定
 *
 * ポート: 3001（開発時。既存プロジェクトの 3000 と衝突しない）
 * basePath: なし（サブドメイン admin.felia-home.co.jp で独立運用）
 */
const nextConfig: NextConfig = {
  // 管理画面システムは外部に画像配信しないため画像最適化は最小限
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },

  // TypeScript の strict チェック
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint を build 時にも実行
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 環境変数（クライアント側に公開するもののみ NEXT_PUBLIC_ プレフィックス）
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // リダイレクト: / → /admin
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ];
  },

  // セキュリティヘッダー（管理画面のため厳格に設定）
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
