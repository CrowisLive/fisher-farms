# Fisher Farms Shooting Ventures — website

Static site. No build step, no dependencies, no server. Every page is plain
HTML that opens by double-clicking it, and deploys to GitHub Pages exactly as
it sits.

## Files

    index.html          Home — hero, disciplines, first visit, photo slots
    rates.html          Target prices, rentals, memberships, groups, payment
    rules.html          Safety rules, ammunition limits, range commands, waivers
    visit.html          Hours, weather, directions, contact, what to bring
    faq.html            20 questions in five groups
    style.css           Every page's styling. Edit here once, all pages change.
    search.js           The search dropdown. No library.
    search-data.js      GENERATED — the search index. Do not hand-edit.
    images/             Put photographs here.
    tools/
      build-search-index.py   Regenerates search-data.js from the HTML.

## Editing copy

Open the `.html` file, change the words, save. Placeholders that must be
replaced before launch are marked in the source with `<!-- EDIT: ... -->`:

- Business name (appears in the header, footer and `<title>` of every page)
- Address, phone number, email
- All prices, hours and membership terms
- Photographs

**After changing any page's text, rebuild the search index:**

    python3 tools/build-search-index.py

Skip that and search will still work, but it will be searching the old words.

## Adding photographs

Drop image files into `images/`, then replace a placeholder block on the home
page. Each one currently looks like:

    <div class="photo-slot"><span>Photo 01</span><em>...</em></div>

Replace it with:

    <figure>
      <img src="images/course-station-7.jpg"
           alt="A shooter on station seven of the sporting course"
           width="1200" height="900" loading="lazy">
      <figcaption>Station 7, the pond crosser</figcaption>
    </figure>

Filenames must be lowercase with no spaces — `station-7.jpg`, not
`Station 7.JPG`. macOS ignores the difference; GitHub's servers do not, and
that mismatch is the most common reason an image works locally and 404s live.

Resize photos to about 1600px on the long edge and save as JPEG at ~75%
quality before committing. A folder of 6MB phone photos will make the site
crawl on a phone in a parking lot, which is where most people will read it.

The `alt` text matters: describe what is in the picture for someone who
cannot see it.

## Search

`search.js` filters `window.SITE_INDEX` — an array of one entry per page
section — as you type. Results show the page, the heading, and a snippet with
the matched words highlighted; Enter jumps straight to that section, and an
FAQ answer opens itself on arrival.

Press `/` anywhere on the site to jump to the search box.

Synonyms live in the `SYNONYMS` dictionary at the top of
`tools/build-search-index.py` — that is where to teach it words the copy
does not use ("ammo", "how much", "kids"). Add them there, then rerun the
script.

## Publishing

    git add .
    git commit -m "Describe what changed"
    git push

Live in under a minute. See the setup guide for first-time GitHub steps.

## Adding a page

1. Copy an existing page — `rates.html` is a good skeleton.
2. Change the `<title>`, the `<meta name="description">`, the `data-page`
   attribute on `<body>`, and the content.
3. Add a link to it in the `<nav>` and the footer of **all** pages.
4. Add the filename to the `PAGES` list in `tools/build-search-index.py`.
5. Rerun the index script.

Because there is no build step, the header and footer are copied into each
page. That is the trade: nothing to install, but a nav change is a five-file
find-and-replace. It stays a fair trade up to roughly ten pages.

## Custom domain

`tools/CNAME-when-dns-is-ready` holds the custom domain. Do NOT move it to the
project root until the DNS records are in place at the registrar.

Why: if a file named `CNAME` is in the repo root, GitHub Pages serves the site at
that domain and *redirects* the `username.github.io` URL to it. With DNS not yet
pointing at GitHub, that makes the site look broken at both addresses.

Order of operations:

1. Push and enable Pages. Confirm the site works at `crowislive.github.io/fisher-farms/`.
2. At the registrar, add a CNAME record for `www` -> `crowislive.github.io`, and four
   A records for the bare domain pointing at GitHub's Pages IPs (check GitHub's
   current docs for the addresses on the day you do it).
3. Wait for DNS to resolve, then:

       cp tools/CNAME-when-dns-is-ready CNAME
       git add CNAME && git commit -m "Add custom domain" && git push

4. In Settings -> Pages, confirm the custom domain, then tick Enforce HTTPS once
   the certificate finishes provisioning.
