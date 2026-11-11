// The site-header block imports next/image for mega-menu feature images.
// This site uses the simple variant, so a plain img is enough under Vite.
import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean };

export default function Image({ fill, style, ...rest }: Props) {
  return <img {...rest} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style} />;
}
