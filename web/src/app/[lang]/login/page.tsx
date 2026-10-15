import { AuthPage, authMetadata, type AuthPageProps } from "@/components/account/AuthPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: Pick<AuthPageProps, "params">) {
  return authMetadata(props, "login");
}

export default function LoginPage(props: AuthPageProps) {
  return AuthPage(props, "login");
}
