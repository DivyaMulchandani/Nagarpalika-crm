import { useEffect, useState } from "react";
import { resolveDisplayUrl } from "../utils/fileUrl";

export default function StoredImage({ path, url, alt = "", className, style }) {
  const [src, setSrc] = useState(url || null);

  useEffect(() => {
    let active = true;
    resolveDisplayUrl({ url, path }).then((resolved) => {
      if (active) setSrc(resolved);
    });
    return () => { active = false; };
  }, [path, url]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} style={style} />;
}
