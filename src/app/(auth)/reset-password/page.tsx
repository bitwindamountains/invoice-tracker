import { AuthForm } from "@/components/auth-form";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const parameters = await searchParams;
  return (
    <AuthForm
      mode="reset"
      token={parameters.token}
      invalidLink={Boolean(parameters.error)}
    />
  );
}
