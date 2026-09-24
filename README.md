# powers-technology.systems

Personal portfolio of Manuel Powers: case studies in infrastructure, security, and automation, plus an in-page terminal.

Live at **https://powers-technology.systems/**

## Stack

- **Hand-written HTML, CSS, and vanilla JavaScript.** No framework, no build step, no package manager.
- **GitHub Pages** serves the `main` branch from the repo root. [`.nojekyll`](.nojekyll) turns off the Jekyll build so files are served as-is.
- **Custom domain** via [`CNAME`](CNAME), with DNS on Cloudflare.
- **Self-hosted font:** JetBrains Mono (Latin subset, variable weight, 40 KB), [SIL OFL 1.1](assets/fonts/OFL.txt). Body text uses the system UI font.
- **No third-party requests:** no analytics, trackers, cookies, or CDNs.

## Layout

```
index.html                 home page: hero, about, terminal, work, repos, stack, certs, contact
404.html                   served by Pages for any missing path (root-absolute URLs only)
work/*.html                one page per case study
assets/css/site.css        the only stylesheet
assets/js/terminal.js      in-page shell; reads every answer from the page's own HTML
assets/js/notfound.js      echoes the requested path on the 404 page
assets/fonts/              JetBrains Mono woff2 and its license
assets/img/headshot.jpg    600x600 photo in the About section
assets/img/og-card.png     1200x630 social preview (source: tools/og-card.html)
favicon.svg                "MP" monogram
robots.txt, sitemap.xml    crawler hints
tools/serve.ps1            zero-dependency local preview server
.github/workflows/         CI checks (no deploys)
```

## Preview locally (Windows)

No installs needed. From the repo root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Then open http://localhost:8080/. Press Ctrl+C to stop. `-Port 9000` picks another port. `-ExecutionPolicy Bypass` applies to that one process only; it doesn't change the machine's policy.

Any static server works too, for example `python -m http.server 8080` if Python is installed. Opening the files straight from disk (`file://`) mostly works, but the 404 page and the font need a server.

## CI

[`.github/workflows/checks.yml`](.github/workflows/checks.yml) runs on every push and pull request:

| Job | Tool | What it catches |
|---|---|---|
| HTML validation | [W3C Nu HTML Checker](https://validator.github.io/validator/) (`vnu.jar`) | Invalid markup in every `.html` file |
| Link check | [lychee](https://github.com/lycheeverse/lychee) | Broken internal links, missing `#fragments`, dead external links |

The workflow never deploys; Pages publishes from `main` on its own. It runs with a read-only token, actions are pinned to commit SHAs (updated by Dependabot), and the validator is pinned by version and SHA-512.

## Security

A Content Security Policy is set with a `<meta>` tag on every page:

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'
```

There are no inline scripts, inline styles, or `style` attributes, so nothing needs `'unsafe-inline'`. The terminal builds its output with `textContent`, never `innerHTML`.

GitHub Pages can't set response headers, and a few directives only work as headers: `frame-ancestors`, plus headers like `X-Content-Type-Options`. If the Cloudflare record is ever switched to proxied, add them with a Response Header Transform Rule.

## Common edits

**Replace the headshot.** Overwrite `assets/img/headshot.jpg` with a square photo (600x600, ideally under 80 KB). The About section shows it beside the text on wide screens and above it on narrow ones.

**Add a case study.**
1. Copy a page in `work/` and update its `<title>`, description, canonical URL, and Open Graph tags.
2. Add a card to the `#work` list in `index.html`. The terminal's `projects` command picks it up automatically.
3. Add the URL to `sitemap.xml` and update the "Next" links in `work/`.

**Regenerate the social preview.** With the preview server running:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --user-data-dir="$env:TEMP\og-edge" --screenshot="$PWD\assets\img\og-card.png" http://localhost:8080/tools/og-card.html
```

**Update the footer year.** It's static text in each page's footer.

## License

Site content © Powers Technology Group. JetBrains Mono is under the SIL Open Font License 1.1.
