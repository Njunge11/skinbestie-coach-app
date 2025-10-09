import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getAdminByEmail } from './db/queries';
import { verifyPassword } from './password';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Get admin from database
        const admin = await getAdminByEmail(email);

        // Check if admin exists and password is set
        if (!admin || !admin.passwordSet || !admin.passwordHash) {
          return null;
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, admin.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        // Return user object (will be stored in JWT)
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
