import { redirect } from "next/navigation";
import { adminUrl } from "@/features/admin/url";
export default function LegacyAdmin() { redirect(adminUrl("/auditoria")); }
