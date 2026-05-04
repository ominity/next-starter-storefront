import type {
  CmsChannel,
  CmsClient,
  CmsGetChannelInput,
  CmsGetLocalesInput,
  CmsGetMenusInput,
  CmsGetPageByPathInput,
  CmsGetRoutesInput,
  CmsFieldValue,
  CmsLocale,
  CmsMenu,
  CmsPage,
  CmsRoute,
} from "@ominity/next/cms";
import type { FormRendererProps } from "@ominity/next/forms";

type OminityForm = FormRendererProps["form"];

const normalizePath = (path: string): string => {
  if (!path || path === "/") {
    return "/";
  }

  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
};

const MOCK_FORM: OminityForm = {
  resource: "form",
  id: 10,
  name: "contact",
  title: "Contact form",
  description: "Starter contact form",
  submissions: 0,
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  _embedded: {
    form_fields: [
      {
        resource: "form_field",
        id: 100,
        formId: 10,
        type: "text",
        name: "name",
        label: "Name",
        isLabelVisible: true,
        placeholder: "Jane Doe",
        helper: "",
        defaultValue: null,
        width: "50%",
        isInline: true,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: true,
          minLength: 2,
          maxLength: 100,
          rules: [],
          message: "Please enter your name.",
        },
        options: [],
        order: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        resource: "form_field",
        id: 101,
        formId: 10,
        type: "email",
        name: "email",
        label: "Email",
        isLabelVisible: true,
        placeholder: "jane@example.com",
        helper: "",
        defaultValue: null,
        width: "50%",
        isInline: true,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: true,
          minLength: null,
          maxLength: null,
          rules: [],
          message: "Please enter a valid email address.",
        },
        options: [],
        order: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        resource: "form_field",
        id: 102,
        formId: 10,
        type: "textarea",
        name: "message",
        label: "Message",
        isLabelVisible: true,
        placeholder: "How can we help?",
        helper: "",
        defaultValue: null,
        width: null,
        isInline: false,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: true,
          minLength: 5,
          maxLength: 1000,
          rules: [],
          message: "Please enter a message.",
        },
        options: [],
        order: 3,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        resource: "form_field",
        id: 103,
        formId: 10,
        type: "metadata",
        name: "metadata",
        label: "Metadata",
        isLabelVisible: false,
        placeholder: "",
        helper: "",
        defaultValue: null,
        width: null,
        isInline: false,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: false,
          minLength: null,
          maxLength: null,
          rules: [],
          message: "",
        },
        options: ["page_url", "locale", "user_agent"],
        order: 4,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        resource: "form_field",
        id: 104,
        formId: 10,
        type: "honeypot",
        name: "website",
        label: "Website",
        isLabelVisible: false,
        placeholder: "",
        helper: "",
        defaultValue: null,
        width: null,
        isInline: false,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: false,
          minLength: null,
          maxLength: null,
          rules: [],
          message: "",
        },
        options: [],
        order: 5,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        resource: "form_field",
        id: 105,
        formId: 10,
        type: "button",
        name: "submit",
        label: "Send message",
        isLabelVisible: false,
        placeholder: "",
        helper: "",
        defaultValue: "submit",
        width: null,
        isInline: false,
        css: {
          classes: null,
          id: null,
          style: null,
        },
        validation: {
          isRequired: false,
          minLength: null,
          maxLength: null,
          rules: [],
          message: "",
        },
        options: [],
        order: 6,
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
};

const createHeroComponent = (locale: string) => ({
  id: `hero-${locale}`,
  key: "hero",
  type: "hero",
  fields: {
    title: locale === "nl" ? "Bouw met Ominity" : "Build with Ominity",
    subtitle:
      locale === "nl"
        ? "Een productieklare starter met App Router, ISR en component-registratie."
        : "A production-ready starter with App Router, ISR, and component registry.",
    call_to_action: {
      id: `cta-${locale}`,
      key: "button_link",
      type: "button_link",
      fields: {
        label: locale === "nl" ? "Contacteer ons" : "Contact us",
        target: {
          resource: "route",
          name: "page",
          locale,
          parameters: {
            slug: locale === "nl" ? "contacteer-ons" : "contact",
          },
        },
      },
      children: [],
    },
  },
  children: [
    {
      id: `hero-child-${locale}`,
      key: "rich_text",
      type: "rich_text",
      fields: {
        html:
          locale === "nl"
            ? "<p>Server Components renderen de pagina. Alleen interactieve blokken worden client-side gehydrateerd.</p>"
            : "<p>Server Components render the page. Only interactive blocks hydrate on the client.</p>",
      },
      children: [],
    },
  ],
});

const createSliderComponent = (locale: string) => ({
  id: `slider-${locale}`,
  key: "slider",
  type: "slider",
  fields: {
    title: locale === "nl" ? "Waarom deze starter" : "Why this starter",
    items:
      locale === "nl"
        ? [
          "Sterk getypeerde CMS-modellen",
          "Generieke rendering engine",
          "Flexibele routing per project",
          "Vormmodule met shadcn-koppeling",
        ]
        : [
          "Strongly typed CMS models",
          "Generic rendering engine",
          "Flexible routing per project",
          "Forms module with shadcn integration",
        ],
  },
  children: [],
});

const createFormComponent = (locale: string) => ({
  id: `form-${locale}`,
  key: "form_block",
  type: "form_block",
  fields: {
    title: locale === "nl" ? "Neem contact op" : "Get in touch",
    description:
      locale === "nl"
        ? "Dit is een werkend voorbeeldformulier vanuit @ominity/next/forms."
        : "This is a working example form powered by @ominity/next/forms.",
    form: MOCK_FORM as unknown as CmsFieldValue,
  },
  children: [],
});

const HOME_TRANSLATIONS = {
  en: "/",
  nl: "/welkom",
} as const;

const CONTACT_TRANSLATIONS = {
  en: "/contact",
  nl: "/contacteer-ons",
} as const;

const MOCK_PAGES: ReadonlyArray<CmsPage> = [
  {
    id: "page-home",
    locale: "en",
    path: HOME_TRANSLATIONS.en,
    slug: "",
    canonicalPath: HOME_TRANSLATIONS.en,
    title: "Ominity Starter",
    description: "Production-ready Next.js starter for Ominity.",
    status: "published",
    components: [
      createHeroComponent("en"),
      createSliderComponent("en"),
    ],
    translations: [
      { locale: "en", path: HOME_TRANSLATIONS.en, slug: "", canonical: true },
      { locale: "nl", path: HOME_TRANSLATIONS.nl, slug: "welkom" },
    ],
    seo: {
      title: "Ominity Starter",
      description: "Production-ready Next.js starter for Ominity.",
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
      },
    },
  },
  {
    id: "page-home",
    locale: "nl",
    path: HOME_TRANSLATIONS.nl,
    slug: "welkom",
    canonicalPath: HOME_TRANSLATIONS.nl,
    title: "Ominity Starter",
    description: "Productieklare Next.js starter voor Ominity.",
    status: "published",
    components: [
      createHeroComponent("nl"),
      createSliderComponent("nl"),
    ],
    translations: [
      { locale: "en", path: HOME_TRANSLATIONS.en, slug: "" },
      { locale: "nl", path: HOME_TRANSLATIONS.nl, slug: "welkom", canonical: true },
    ],
    seo: {
      title: "Ominity Starter",
      description: "Productieklare Next.js starter voor Ominity.",
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        type: "website",
      },
    },
  },
  {
    id: "page-contact",
    locale: "en",
    path: CONTACT_TRANSLATIONS.en,
    slug: "contact",
    canonicalPath: CONTACT_TRANSLATIONS.en,
    title: "Contact",
    description: "Contact the Ominity team.",
    status: "published",
    components: [createFormComponent("en")],
    translations: [
      { locale: "en", path: CONTACT_TRANSLATIONS.en, slug: "contact", canonical: true },
      { locale: "nl", path: CONTACT_TRANSLATIONS.nl, slug: "contacteer-ons" },
    ],
    seo: {
      title: "Contact",
      description: "Contact the Ominity team.",
      robots: {
        index: true,
        follow: true,
      },
    },
  },
  {
    id: "page-contact",
    locale: "nl",
    path: CONTACT_TRANSLATIONS.nl,
    slug: "contacteer-ons",
    canonicalPath: CONTACT_TRANSLATIONS.nl,
    title: "Contact",
    description: "Neem contact op met het Ominity-team.",
    status: "published",
    components: [createFormComponent("nl")],
    translations: [
      { locale: "en", path: CONTACT_TRANSLATIONS.en, slug: "contact" },
      {
        locale: "nl",
        path: CONTACT_TRANSLATIONS.nl,
        slug: "contacteer-ons",
        canonical: true,
      },
    ],
    seo: {
      title: "Contact",
      description: "Neem contact op met het Ominity-team.",
      robots: {
        index: true,
        follow: true,
      },
    },
  },
];

export const MOCK_ROUTES: ReadonlyArray<CmsRoute> = [
  {
    id: "route-home-en",
    pageId: "page-home",
    locale: "en",
    path: HOME_TRANSLATIONS.en,
    slug: "",
    canonicalPath: HOME_TRANSLATIONS.en,
    translations: {
      en: HOME_TRANSLATIONS.en,
      nl: HOME_TRANSLATIONS.nl,
    },
  },
  {
    id: "route-home-nl",
    pageId: "page-home",
    locale: "nl",
    path: HOME_TRANSLATIONS.nl,
    slug: "welkom",
    canonicalPath: HOME_TRANSLATIONS.nl,
    translations: {
      en: HOME_TRANSLATIONS.en,
      nl: HOME_TRANSLATIONS.nl,
    },
  },
  {
    id: "route-contact-en",
    pageId: "page-contact",
    locale: "en",
    path: CONTACT_TRANSLATIONS.en,
    slug: "contact",
    canonicalPath: CONTACT_TRANSLATIONS.en,
    translations: {
      en: CONTACT_TRANSLATIONS.en,
      nl: CONTACT_TRANSLATIONS.nl,
    },
  },
  {
    id: "route-contact-nl",
    pageId: "page-contact",
    locale: "nl",
    path: CONTACT_TRANSLATIONS.nl,
    slug: "contacteer-ons",
    canonicalPath: CONTACT_TRANSLATIONS.nl,
    translations: {
      en: CONTACT_TRANSLATIONS.en,
      nl: CONTACT_TRANSLATIONS.nl,
    },
  },
];

const MOCK_MENUS: ReadonlyArray<CmsMenu> = [
  {
    id: "menu-main-en",
    key: "main",
    locale: "en",
    items: [
      {
        id: "menu-home-en",
        title: "Home",
        path: HOME_TRANSLATIONS.en,
        locale: "en",
        children: [],
      },
      {
        id: "menu-contact-en",
        title: "Contact",
        path: CONTACT_TRANSLATIONS.en,
        locale: "en",
        children: [],
      },
    ],
  },
  {
    id: "menu-main-nl",
    key: "main",
    locale: "nl",
    items: [
      {
        id: "menu-home-nl",
        title: "Welkom",
        path: HOME_TRANSLATIONS.nl,
        locale: "nl",
        children: [],
      },
      {
        id: "menu-contact-nl",
        title: "Contact",
        path: CONTACT_TRANSLATIONS.nl,
        locale: "nl",
        children: [],
      },
    ],
  },
];

export const MOCK_LOCALES: ReadonlyArray<CmsLocale> = [
  { code: "en", language: "en", label: "English", default: true },
  { code: "nl", language: "nl", label: "Nederlands" },
];

export const MOCK_CHANNEL: CmsChannel = {
  id: "channel-starter",
  identifier: "starter",
  name: "Starter Channel",
  defaultLanguageCode: "en",
  languages: [
    {
      id: "language-en",
      code: "en",
      name: "English",
      default: true,
      active: true,
    },
    {
      id: "language-nl",
      code: "nl",
      name: "Nederlands",
      active: true,
    },
  ],
  countries: [
    {
      code: "BE",
      name: "Belgium",
      language: "nl",
      enabled: true,
    },
  ],
};

const findPageByPath = (path: string, locale: string): CmsPage | null => {
  const normalizedPath = normalizePath(path);

  const exact = MOCK_PAGES.find(
    (page) => page.locale === locale && normalizePath(page.path) === normalizedPath,
  );

  if (exact) {
    return exact;
  }

  const translated = MOCK_PAGES.find(
    (page) => page.locale === locale
      && page.translations.some((translation) => normalizePath(translation.path) === normalizedPath),
  );

  if (translated) {
    return translated;
  }

  return null;
};

export const mockCmsClient: CmsClient = {
  sdkChannelId: "channel-starter",
  async getPageByPath(input: CmsGetPageByPathInput) {
    const locale = input.locale ?? "en";
    return findPageByPath(input.path, locale);
  },
  async getRoutes(_input?: CmsGetRoutesInput) {
    return MOCK_ROUTES;
  },
  async getMenus(input?: CmsGetMenusInput) {
    const key = input?.key;
    const locale = input?.locale;

    return MOCK_MENUS.filter((menu) => {
      if (key && menu.key !== key) {
        return false;
      }

      if (locale && menu.locale !== locale) {
        return false;
      }

      return true;
    });
  },
  async getLocales(_input?: CmsGetLocalesInput) {
    return MOCK_LOCALES;
  },
  async getChannel(_input?: CmsGetChannelInput) {
    return MOCK_CHANNEL;
  },
};

export const mockForms = {
  contact: MOCK_FORM,
} as const;
