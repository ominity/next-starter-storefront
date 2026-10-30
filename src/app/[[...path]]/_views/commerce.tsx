import { CommerceCartPage } from "@/components/commerce/cart-page";
import { CommerceCategoryPage } from "@/components/commerce/category-page";
import { CommerceCheckoutPage } from "@/components/commerce/checkout-page";
import { CommercePaymentPage } from "@/components/commerce/payment-page";
import { CommerceProductPage } from "@/components/commerce/product-page";
import { CommerceProductsPage, PRODUCT_SORTS, type ProductsQuery } from "@/components/commerce/products-page";
import { CommerceWishlistPage } from "@/components/commerce/wishlist-page";
import { config } from "@/lib/ominity/config";
import { ominity } from "@/lib/ominity/sdk";
import { getChannel, getRouting } from "@/lib/ominity/site";

import type { PageViews } from "./types";

const PAGE_SIZE = 24;

function pageNumber(value: string | undefined): number {
  return Number(value ?? 1) || 1;
}

export const commerceViews = {
  product: {
    metadata: ({ product, canonicalPath }) => ({
      title: product.title,
      description: product.shortDescription ?? undefined,
      openGraph: { url: new URL(canonicalPath, config.siteUrl).toString(), ...(product.coverImage ? { images: [product.coverImage] } : {}) },
    }),
    render: ({ page, paths }) => (
      <CommerceProductPage product={page.product} canonicalPath={page.canonicalPath} paths={paths} guestCheckout={config.checkoutAllowGuest} />
    ),
  },
  category: {
    metadata: ({ category }) => ({ title: category.name, description: category.description || undefined }),
    async render({ page, param }) {
      const products = await ominity(page.locale).commerce.products.list({
        filter: { category: String(page.category.id) },
        include: "offers",
        page: pageNumber(await param("page")),
        limit: PAGE_SIZE,
      });
      return <CommerceCategoryPage category={page.category} products={products} locale={page.locale} canonicalPath={page.canonicalPath} />;
    },
  },
  products: {
    title: "Products",
    indexed: true,
    async render({ page, param }) {
      const sort = (await param("sort")) ?? "";
      const query: ProductsQuery = {
        q: (await param("q")) ?? "",
        category: (await param("category")) ?? "",
        sort: sort in PRODUCT_SORTS ? sort as ProductsQuery["sort"] : "",
      };
      const sdk = ominity(page.locale);
      const [products, categories] = await Promise.all([
        sdk.commerce.products.list({
          include: "offers",
          page: pageNumber(await param("page")),
          limit: PAGE_SIZE,
          ...(query.sort ? { sort: query.sort } : {}),
          filter: {
            ...(query.q ? { search: { query: query.q } } : {}),
            ...(query.category ? { category: query.category } : {}),
          },
        }),
        sdk.commerce.categories.list({ limit: 100 }),
      ]);
      return <CommerceProductsPage products={products} categories={categories.items} query={query} locale={page.locale} path={page.canonicalPath} />;
    },
  },
  cart: {
    title: "Cart",
    render: ({ paths }) => <CommerceCartPage paths={paths} guestCheckout={config.checkoutAllowGuest} />,
  },
  wishlist: {
    title: "Wishlist",
    render: async ({ page, paths }) => <CommerceWishlistPage paths={paths} locale={page.locale} routing={await getRouting()} />,
  },
  checkout: {
    title: "Checkout",
    async render({ paths }) {
      const channel = await getChannel();
      return (
        <CommerceCheckoutPage
          countries={channel.countries}
          {...(channel.defaultCountry ? { defaultCountry: channel.defaultCountry } : {})}
          paths={paths}
          guestCheckout={config.checkoutAllowGuest}
        />
      );
    },
  },
  payment: {
    title: "Payment",
    async render({ paths, param }) {
      const orderId = await param("order");
      return <CommercePaymentPage paths={paths} {...(orderId ? { orderId } : {})} />;
    },
  },
} satisfies Partial<PageViews>;
