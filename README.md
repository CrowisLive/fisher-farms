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

The domain is `fisherfarmsshootingventures.com`, registered at Spaceship.
`tools/CNAME-when-dns-is-ready` holds the www hostname.

**Claim the domain on GitHub BEFORE pointing DNS at it.** If DNS points at
GitHub Pages while no repository claims the name, someone else can publish a
site on it. GitHub's own docs are explicit about this order.

1. Put the CNAME file in the repo root and push. That is what claims the
   domain on GitHub's side:

       cp tools/CNAME-when-dns-is-ready CNAME
       git add CNAME && git commit -m "Claim custom domain" && git push

   (Equivalently: Settings -> Pages -> Custom domain -> Save. GitHub then
   commits the CNAME file for you, so `git pull` before your next push.)

2. At Spaceship, open the domain's DNS records and add:

       CNAME   www   crowislive.github.io
       A       @     185.199.108.153
       A       @     185.199.109.153
       A       @     185.199.110.153
       A       @     185.199.111.153

   Optionally the IPv6 equivalents:

       AAAA    @     2606:50c0:8000::153
       AAAA    @     2606:50c0:8001::153
       AAAA    @     2606:50c0:8002::153
       AAAA    @     2606:50c0:8003::153

   Remove any parking or forwarding records Spaceship added for the apex,
   or they will fight the A records.

3. Wait for DNS to propagate - minutes to a day. Check with:

       dig +short www.fisherfarmsshootingventures.com
       dig +short fisherfarmsshootingventures.com

4. In Settings -> Pages, wait for the domain check to go green, then tick
   **Enforce HTTPS**. The certificate can take up to an hour after DNS
   resolves; the tickbox stays greyed out until it is ready.

Between step 1 and step 3 the github.io URL redirects to the custom domain,
which will not resolve yet. That gap is expected and short.

Verify GitHub's IP addresses against their current docs on the day you set
this up rather than trusting this file:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
