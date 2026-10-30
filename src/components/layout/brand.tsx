import Link from "next/link";
import Image from "next/image";
export function Brand() {
  return (
    <Link href="/" aria-label="IBIZA — início" className="brand">
      <Image
        src="/brand/ibiza-oficial.png"
        alt="IBIZA"
        width={1774}
        height={887}
        className="brand-art"
        priority
      />
    </Link>
  );
}
