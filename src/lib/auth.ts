import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "フェリアホーム管理画面",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const staff = await prisma.staff.findFirst({
          where: {
            email_work: credentials.email,
            is_active: true,
            is_locked: false,
          },
        });

        if (!staff || !staff.password_hash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, staff.password_hash);

        if (!isValid) {
          await prisma.staff.update({
            where: { id: staff.id },
            data: {
              failed_login_count: { increment: 1 },
              is_locked: staff.failed_login_count >= 4,
            },
          });
          return null;
        }

        await prisma.staff.update({
          where: { id: staff.id },
          data: {
            last_login_at: new Date(),
            login_count: { increment: 1 },
            failed_login_count: 0,
          },
        });

        return {
          id: staff.id,
          email: staff.email_work ?? "",
          name: staff.name,
          staffId: staff.id,
          permission: staff.permission,
          storeId: staff.store_id,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.staffId = user.staffId;
        token.permission = user.permission;
        token.storeId = user.storeId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.staffId = token.staffId as string;
      session.user.permission = token.permission as string;
      session.user.storeId = token.storeId as string | null;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
