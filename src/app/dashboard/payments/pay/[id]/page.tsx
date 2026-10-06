import { redirect } from "next/navigation";

export default function PayRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/payments/${params.id}`);
}
