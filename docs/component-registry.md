# Component Registry

Registry setup lives in `src/lib/ominity/registry.tsx`.

## Add a new block

1. Create a component in `src/components/cms`
2. Register it with `defineCmsComponent("key", Component)`
3. Ensure CMS sends matching component key

Example:

```tsx
defineCmsComponent("faq", FaqBlock)
```

## Nested rendering helpers

Inside a CMS block you can render nested values:

- `renderer.render(component.fields.someField)`
- `renderer.renderChildren(component)`

This keeps recursion centralized in `@ominity/next`.

## Missing component behavior

Configured through `cmsRendererOptions`:

- strict mode: throw when key is missing
- relaxed mode: render fallback warning block

