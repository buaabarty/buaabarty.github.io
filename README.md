# buaabarty.github.io

Personal academic homepage, built with React, Vite and [Arc](https://uiarc.dev) components.

- Content: `src/content/publications.yml` (papers), `src/content/news.ts` (news), and the page files in `src/pages/`. Every visible string has an English and a Chinese version.
- Develop: `npm install`, then `npm run dev`.
- Build: `npm run build` writes the static site to `dist/`.
- Deploy: pushing to `main` runs `.github/workflows/pages.yml`, which builds and publishes to GitHub Pages.
