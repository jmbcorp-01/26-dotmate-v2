import type { MetadataRoute } from "next";
import { services } from "@/lib/services";

export const dynamic = "force-static";

const base = "https://dotmate.co.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/` },
    ...services.map((s) => ({ url: `${base}/services/${s.slug}/` })),
    { url: `${base}/diagnosis/` },
  ];
}
