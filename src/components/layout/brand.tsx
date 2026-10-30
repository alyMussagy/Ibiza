import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" aria-label="IBIZA — início" className="brand">
      ibiza<span aria-hidden="true">✳</span>
    </Link>
  );
}
