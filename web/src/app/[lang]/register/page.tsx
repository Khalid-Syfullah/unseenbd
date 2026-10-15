import { AuthPage, authMetadata, type AuthPageProps } from "@/components/account/AuthPage";

export const dynamic = "force-dynamic";

export function generateMetadata(props: Pick<AuthPageProps, "params">) {
  return authMetadata(props, "register");
}

export default function RegisterPage(props: AuthPageProps) {
  return AuthPage(props, "register");
}
