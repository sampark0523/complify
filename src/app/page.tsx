import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { SignInPage } from "@/components/SignInPage";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return session ? <Dashboard session={session} /> : <SignInPage />;
}
