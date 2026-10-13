import { AuthForm } from "@/components/auth-form";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthForm mode="reset" invalidLink={Boolean((await searchParams).error)} />
  );
}
