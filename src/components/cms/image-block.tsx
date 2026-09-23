import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { asCssLength, asMedia, asString } from "@/components/cms/helpers";
import { cmsLinkResolver } from "@/lib/ominity/site";
import { cn } from "@/lib/utils";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

export function ImageBlock({
  component,
  context,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const media = asMedia(component.fields.src);
  if (!media) {
    return null;
  }

  const alt = asString(component.fields.alt, media.alt ?? "");
  const link = asString(component.fields.link, "");
  const linkTarget = asString(component.fields.link_target, "_self");
  const cssClass = asString(component.fields.css_class, "");
  const width = asCssLength(component.fields.width);
  const height = asCssLength(component.fields.height);

  const style: CSSProperties = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  // Ominity media can be served from the tenant domain or a CDN, so a plain
  // <img> avoids having to whitelist every possible host in next.config.ts.
  const image: ReactNode = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt={alt}
      {...(typeof media.width === "number" ? { width: media.width } : {})}
      {...(typeof media.height === "number" ? { height: media.height } : {})}
      className={cn("h-auto max-w-full", cssClass)}
      style={style}
      loading="lazy"
      decoding="async"
    />
  );

  if (link.length === 0) {
    return image;
  }

  const resolved = cmsLinkResolver.resolve(link, { locale: context.locale });

  if (resolved.external || linkTarget !== "_self") {
    return (
      <a
        href={resolved.href}
        target={linkTarget}
        {...(linkTarget === "_blank" ? { rel: "noopener noreferrer" } : {})}
      >
        {image}
      </a>
    );
  }

  return <Link href={resolved.href as Route}>{image}</Link>;
}
