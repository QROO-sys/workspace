import { redirect } from "next/navigation";

export default function LegacyTablePage({ params }: { params: { tableId: string } }) {
  redirect(`/d/${params.tableId}`);
}
