import Image from "next/image";
import backdrop from "../../../public/images/backdrop.webp";

// The wallpaper behind every page. Liquid Glass is clear, so the shapes and
// colours behind a panel are what make it look like glass. To change the
// picture, replace public/images/backdrop.webp. It is imported rather than
// linked by path so its address changes with its contents, and browsers
// never keep showing an old one.
export function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
    </div>
  );
}
