import { redirect } from "next/navigation";

export default function ProfilePage({ params }: { params: { username: string } }) {
  redirect(`/team/${params.username}`);
}
