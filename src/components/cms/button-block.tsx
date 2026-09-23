import type { VariantProps } from "class-variance-authority";
import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { Route } from "next";
import Link from "next/link";

import { asString } from "@/components/cms/helpers";
import { buttonVariants } from "@/components/ui/button";
import { cmsLinkResolver } from "@/lib/ominity/site";
import { cn } from "@/lib/utils";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

/** Maps the blueprint's `style` options onto the local shadcn button variants. */
const VARIANT_BY_STYLE: Readonly<Record<string, ButtonVariant>> = {
  primary: "default",
  secondary: "secondary",
  success: "default",
  danger: "default",
  warning: "default",
  info: "secondary",
  light: "outline",
  dark: "default",
};

/** Extra tone classes for the blueprint styles shadcn has no variant for. */
const TONE_BY_STYLE: Readonly<Record<string, string>> = {
  success: "bg-emerald-600 text-white shadow hover:bg-emerald-700",
  danger: "bg-red-600 text-white shadow hover:bg-red-700",
  warning: "bg-amber-500 text-white shadow hover:bg-amber-600",
  dark: "bg-slate-900 text-white shadow hover:bg-slate-800",
};

const SIZE_BY_BLUEPRINT_SIZE: Readonly<Record<string, ButtonSize>> = {
  small: "sm",
  medium: "default",
  large: "lg",
};

export function ButtonBlock({
                              component,
                              context,
                            }: CmsComponentRenderProps<StarterRenderContext>) {
  const label = asString(component.fields.label, "");
  const href = asString(component.fields.href, "");
  const target = asString(component.fields.target, "_self");
  const style = asString(component.fields.style, "primary");
  const size = asString(component.fields.size, "medium");
  const icon = asString(component.fields.icon, "");
  const iconPosition = asString(component.fields.icon_position, "left");
  const cssClass = asString(component.fields.css_class, "");

  if (label.length === 0 || href.length === 0) {
    return null;
  }

  const resolved = cmsLinkResolver.resolve(href, { locale: context.locale });
  const className = cn(
      buttonVariants({
        variant: VARIANT_BY_STYLE[style] ?? "default",
        size: SIZE_BY_BLUEPRINT_SIZE[size] ?? "default",
      }),
      TONE_BY_STYLE[style],
      icon.length > 0 ? "gap-2" : undefined,
      cssClass,
  );

  // `icon` holds an icon-font class name (the CMS ships Font Awesome names).
  const iconElement = icon.length > 0 ? <i className={icon} aria-hidden="true" /> : null;
  const content = (
      <>
        {iconPosition === "left" ? iconElement : null}
        {label}
        {iconPosition === "right" ? iconElement : null}
      </>
  );

  if (resolved.external || target !== "_self") {
    return (
        <a
            href={resolved.href}
            target={target}
            {...(target === "_blank" ? { rel: "noopener noreferrer" } : {})}
            className={className}
        >
          {content}
        </a>
    );
  }

  return (
      <Link href={resolved.href as Route} className={className}>
        {content}
      </Link>
  );
}
