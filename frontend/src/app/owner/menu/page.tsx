import { redirect } from "next/navigation";

export default function OwnerMenuRedirect() {
  redirect("/owner/resources");
}
