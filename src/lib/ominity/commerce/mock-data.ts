import type {
  StarterCommerceCategoryRecord,
  StarterCommerceProductRecord,
} from "./types";

export const MOCK_COMMERCE_CATEGORIES: ReadonlyArray<StarterCommerceCategoryRecord> = [
  {
    id: "cat-office",
    numericId: 10,
    name: "Office",
    description: "Products designed for a modern office setup.",
    productsCount: 2,
    fullSlug: "office",
    routes: {
      en: {
        resource: "route",
        name: "category",
        locale: "en",
        parameters: {
          slug: "office",
        },
      },
      nl: {
        resource: "route",
        name: "category",
        locale: "nl",
        parameters: {
          slug: "kantoor",
        },
      },
    },
  },
  {
    id: "cat-office-chairs",
    numericId: 11,
    name: "Office Chairs",
    description: "Ergonomic chairs for daily use.",
    productsCount: 2,
    fullSlug: "office/chairs",
    routes: {
      en: {
        resource: "route",
        name: "category",
        locale: "en",
        parameters: {
          slug: "office/chairs",
        },
      },
      nl: {
        resource: "route",
        name: "category",
        locale: "nl",
        parameters: {
          slug: "kantoor/stoelen",
        },
      },
    },
  },
];

export const MOCK_COMMERCE_PRODUCTS: ReadonlyArray<StarterCommerceProductRecord> = [
  {
    id: "product-sku-001",
    numericId: 1001,
    sku: "SKU-001",
    title: "Starter Ergonomic Chair",
    price: 299,
    currency: "EUR",
    shortDescription: "Comfortable ergonomic chair for daily use.",
    description:
      "Starter Ergonomic Chair combines breathable mesh, lumbar support, and adjustable height for long work sessions.",
    coverImage: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80",
    stock: 24,
    categoryId: 11,
    categorySlugs: {
      en: "office/chairs",
      nl: "kantoor/stoelen",
    },
    routes: {
      en: {
        resource: "route",
        name: "product",
        locale: "en",
        parameters: {
          sku: "SKU-001",
          slug: "starter-ergonomic-chair",
        },
      },
      nl: {
        resource: "route",
        name: "product",
        locale: "nl",
        parameters: {
          sku: "SKU-001",
          slug: "starter-ergonomische-stoel",
        },
      },
    },
  },
  {
    id: "product-sku-002",
    numericId: 1002,
    sku: "SKU-002",
    title: "Starter Standing Desk",
    price: 699,
    currency: "EUR",
    shortDescription: "Electric standing desk with memory presets.",
    description:
      "Starter Standing Desk offers smooth height transitions, quiet motors, and programmable presets for healthier workflows.",
    coverImage: "https://images.unsplash.com/photo-1593476550610-87baa860004a?auto=format&fit=crop&w=1200&q=80",
    stock: 12,
    categoryId: 11,
    categorySlugs: {
      en: "office/chairs",
      nl: "kantoor/stoelen",
    },
    routes: {
      en: {
        resource: "route",
        name: "product",
        locale: "en",
        parameters: {
          sku: "SKU-002",
          slug: "starter-standing-desk",
        },
      },
      nl: {
        resource: "route",
        name: "product",
        locale: "nl",
        parameters: {
          sku: "SKU-002",
          slug: "starter-sta-bureau",
        },
      },
    },
  },
];
