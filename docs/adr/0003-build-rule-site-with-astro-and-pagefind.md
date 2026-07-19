# Build the rule site with Astro and Pagefind

The rule documentation site uses Astro build-time content collections for schema-validated plain Markdown and static page generation, with Pagefind indexing the generated HTML for client-side search. This keeps deployment static on Cloudflare Pages at `pint-anz.0v.com.au` and search independent of hosted infrastructure while accepting framework and generated-index dependencies in the documentation build. The generated `*.pages.dev` address redirects to the canonical hostname to avoid duplicate indexing.
