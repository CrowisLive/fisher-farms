#!/usr/bin/env python3
"""
Rebuild search-data.js from the site's HTML.

Run it from the project folder after editing any page:

    python3 tools/build-search-index.py

It walks every .html file, finds each block that has an id and a heading
(plus every FAQ <details>), and writes one search entry per block into
search-data.js. Standard library only - no installs, no build tools.
"""

import html
import json
import os
import re
import sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = ["index.html", "rates.html", "rules.html", "visit.html", "faq.html"]
OUT = os.path.join(ROOT, "search-data.js")

# Words people search for that do not appear in the copy. Keyed by block id.
SYNONYMS = {
    "targets":      ["price", "prices", "cost", "how much", "rates", "fees", "live action", "duck", "dove", "trap", "skeet"],
    "clubhouse":    ["ammo", "ammunition", "shells", "snacks", "drinks", "food", "buy", "shop", "check in"],
    "membership":   ["member", "join", "annual", "dues", "punch card", "discount"],
    "groups":       ["corporate", "party", "bachelor", "birthday", "fundraiser", "league", "lesson", "instructor", "event", "outing",
                     "pay", "payment", "card", "credit", "cash", "check", "deposit", "refund", "policy"],
    "four":         ["safety", "safe", "muzzle", "trigger", "loaded"],
    "house":        ["rules", "regulations", "dogs", "alcohol", "hulls", "spectator"],
    "ammunition":   ["shells", "shot", "gauge", "12", "20", "28", "410", "steel", "lead", "slug", "buckshot", "reload", "ammo"],
    "commands":     ["pull", "mark", "lost", "no bird", "cease fire", "terminology", "terms"],
    "waiver":       ["age", "minor", "kids", "children", "id", "sign", "liability", "insurance"],
    "hours":        ["open", "opening", "closed", "closing", "times", "schedule", "when", "holiday"],
    "weather":      ["rain", "lightning", "storm", "wind", "cold", "winter", "season", "dusk", "dark"],
    "location":     ["address", "directions", "map", "where", "parking", "drive", "find"],
    "contact":      ["phone", "email", "call", "book", "booking", "reservation"],
    "firstvisit":   ["what to bring", "wear", "shoes", "hat", "checklist", "prepare"],
    "disciplines":  ["sporting clays", "trap", "skeet", "5-stand", "five stand", "course", "field"],
    "first-time":   ["beginner", "new", "never", "first", "orientation", "lesson", "coach"],
    "photos":       ["pictures", "gallery", "images", "property"],

    # FAQ entries - only words the answer itself does not already contain
    "faq-age":            ["kids", "children", "minimum age", "how old", "teenager"],
    "faq-own-shells":     ["ammo", "ammunition", "bring my own"],
    "faq-gauge":          ["recoil", "kick", "which gauge"],
    "faq-membership-worth": ["cost", "value", "cheaper", "save"],
    "faq-reservation":    ["book", "booking", "appointment", "walk in", "walk-in"],
    "faq-rain":           ["cancel", "cancelled", "closed"],
    "faq-what-to-wear":   ["clothes", "clothing", "dress", "boots"],
    "faq-own-gun":        ["borrow", "bring", "shotgun"],
    "faq-semi-auto":      ["semi-auto", "semi automatic", "pump", "over under", "side by side", "what gun", "which shotgun", "auto"],
    "faq-spectators":     ["watch", "watching", "guest", "kids watching"],
    "faq-how-long":       ["time", "duration", "how long"],
    "faq-eye-ear":        ["glasses", "muffs", "plugs", "hearing", "protection"],
    "faq-payment":        ["venmo", "apple pay", "tap"],
}

BLOCK_TAGS = {"section", "div", "details", "article"}
HEADINGS = {"h1", "h2", "h3"}
SKIP_TAGS = {"script", "style", "svg", "nav", "header", "footer"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent", "text")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or {})
        self.children = []
        self.parent = parent
        self.text = ""


class Tree(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in self.VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root and node.parent is not None:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(Node("#text", {}, self.cur))
        self.cur.children[-1].text = data


def walk(node):
    yield node
    for c in node.children:
        for n in walk(c):
            yield n


def is_entry(node):
    """A block worth its own search result: has an id, and a heading or a summary."""
    if node.tag not in BLOCK_TAGS or "id" not in node.attrs:
        return False
    if node.tag == "details":
        return True
    for c in walk(node):
        if c is not node and c.tag in HEADINGS:
            return True
    return False


def heading_of(node):
    if node.tag == "details":
        for c in walk(node):
            if c.tag == "summary":
                return text_of(c, set())
    for c in walk(node):
        if c is not node and c.tag in HEADINGS:
            return text_of(c, set())
    return ""


def text_of(node, stop_ids):
    """All text under node, skipping nested blocks that get their own entry."""
    out = []

    def rec(n, top=False):
        if n.tag in SKIP_TAGS:
            return
        if not top and n.tag in BLOCK_TAGS and n.attrs.get("id") in stop_ids:
            return
        if n.tag == "#text":
            out.append(n.text)
            return
        for c in n.children:
            rec(c)
        if n.tag in ("p", "li", "h1", "h2", "h3", "td", "tr", "div", "section", "summary"):
            out.append(" ")

    rec(node, top=True)
    s = html.unescape("".join(out))
    s = re.sub(r"\s+", " ", s).strip()
    return s


def page_label(tree):
    for n in walk(tree.root):
        if n.tag == "body":
            return n.attrs.get("data-page", "Page")
    return "Page"


def build():
    entries = []
    for page in PAGES:
        path = os.path.join(ROOT, page)
        if not os.path.exists(path):
            print("  ! missing %s, skipping" % page, file=sys.stderr)
            continue
        tree = Tree()
        with open(path, encoding="utf-8") as fh:
            tree.feed(fh.read())
        label = page_label(tree)

        blocks = [n for n in walk(tree.root) if is_entry(n)]
        ids = {n.attrs["id"] for n in blocks}

        for b in blocks:
            bid = b.attrs["id"]
            title = heading_of(b)
            body = text_of(b, ids)
            if title and body.startswith(title):
                body = body[len(title):].strip()
            if not title or len(body) < 20:
                continue
            entries.append({
                "page": label,
                "url": "%s#%s" % (page, bid),
                "title": title,
                "text": body[:600],
                "tags": SYNONYMS.get(bid, []),
            })
        print("  %-12s %2d blocks" % (page, len([e for e in entries if e['url'].startswith(page)])))

    banner = ("/* Generated by tools/build-search-index.py - do not edit by hand.\n"
              "   Re-run that script after changing any page's copy. */\n")
    body = json.dumps(entries, indent=1, ensure_ascii=False)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(banner + "window.SITE_INDEX = " + body + ";\n")
    print("\n  -> search-data.js  (%d entries, %.1f KB)" % (len(entries), os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    print("Building search index...")
    build()
