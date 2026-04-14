import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      staffId: string;
      permission: string;
      storeId: string | null;
    };
  }

  interface User {
    id: string;
    staffId: string;
    permission: string;
    storeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId: string;
    permission: string;
    storeId: string | null;
  }
}
