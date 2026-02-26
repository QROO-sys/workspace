import { redirect } from "next/navigation";

// Menu is deprecated — everything is managed via Resources now.
export default function OwnerMenuRedirect() {
  redirect("/owner/resources");
}
