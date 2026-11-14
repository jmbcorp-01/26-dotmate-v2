import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { site } from "@/lib/site";
import { projects } from "@/lib/portfolio";

export const dynamic = "force-static";

// 배포(빌드) 시점을 최종 수정일로 씁니다.
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${site.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    ...services.map((s) => page(`/services/${s.slug}/`, 0.9)),
    page("/diagnosis/", 0.8),
    page("/portfolio/", 0.7),
    ...projects.map((p) => page(`/portfolio/${p.slug}/`, 0.6)),
    page("/privacy/", 0.2, "yearly"),
  ];
}
