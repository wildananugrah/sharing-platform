import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from "next-auth";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and Password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("User not found or no password set");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: process.env.NODE_ENV === "production"
    ? {
      sessionToken: {
        name: `__Secure-next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "Lax",
          path: "/",
          secure: true,
        },
      },
    }
    : {
      sessionToken: {
        name: `next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "Lax",
          path: "/",
          secure: false, // ✅ allow over HTTP
        },
      },
    },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign in, add user ID to token
      if (user) {
        token.sub = user.id;
      }

      // On update trigger or periodically, refresh user data
      if (trigger === 'update' || !token.name) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          });

          if (dbUser) {
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
          }
        } catch (error) {
          console.error("Error fetching user data in JWT callback:", error);
        }
      }

      return token;
    },
    async signIn({ account, profile }) {
      // Handle Google OAuth account linking
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if user with this email already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true }
          });

          if (existingUser) {
            // Check if Google account is already linked
            const googleAccountExists = existingUser.accounts.some(
              acc => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
            );

            if (!googleAccountExists) {
              // Link the Google account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | null,
                },
              });

              console.log('Successfully linked Google account to existing user:', existingUser.email);
            }
          }
        } catch (error) {
          console.error('Error linking Google account:', error);
          // Don't block sign in if linking fails
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // Fetch fresh user data from database to ensure name and role are up-to-date
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              UserExtension: {
                select: {
                  role: true,
                },
              },
            },
          });

          if (user) {
            session.user.name = user.name;
            session.user.email = user.email;
            session.user.image = user.image;
            session.user.role = user.UserExtension?.role || 'client';
          }
        } catch (error) {
          console.error("Error fetching user data in session callback:", error);
        }
      }
      return session;
    },
  },
  events: {
    async createUser(message) {
      try {
        await prisma.userExtension.create({
          data: {
            userId: message.user.id,
            name: message.user.name,
            email: message.user.email,
            emailVerified: null,
            image: message.user.image,
          },
        });
      } catch (error) {
        console.error("Failed to create UserExtension:", error);
      }
    },
    async signOut(message) {
      // Log signout event for debugging
      console.log("User signed out:", message);
    },
  }
};
