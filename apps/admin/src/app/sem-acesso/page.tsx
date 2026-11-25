import { LockKeyhole } from "lucide-react";
export const metadata = { title: "Sem acesso" };
export default function NoAccess() {
  return <main id="main" className="shell category-page"><LockKeyhole size={38} color="#ed3153" aria-hidden="true" /><h1>Acesso reservado.</h1><p className="lead">Esta conta não tem permissão para administrar o IBIZA.</p></main>;
}
