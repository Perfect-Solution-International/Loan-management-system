import { redirect } from "next/navigation";

export default function StaffRedirectPage() {
  redirect("/settings?tab=staff");
}
