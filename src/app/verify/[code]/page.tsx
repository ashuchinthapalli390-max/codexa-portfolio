import { redirect } from "next/navigation";

export default function VerifyCodePage({ params }: { params: { code: string } }) {
  redirect(`/verify?code=${encodeURIComponent(params.code)}`);
}
