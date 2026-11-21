# simple-block

Chrome extension (Manifest V3) that adds a one-click "ブロック" button to every post on x.com.
Blocks immediately with no confirmation, then shows a toast with "元に戻す" (undo) for 3 seconds. The timer pauses while the pointer or focus is on the toast. 3 seconds is the user's choice (2026-09-12, reaffirmed 2026-09-16); don't lengthen it without asking.

## Constraints

- No build step, no dependencies, no background worker. The only network requests go to x.com.
- Keep it small and auditable (~250 lines total). UI strings are Japanese.
- Only `permissions: ["storage"]`. No `host_permissions` needed, because the requests are same-origin (see below).

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest. content script on `https://x.com/*` |
| `content.js` | Injects the button, calls the block API, toast/undo, rate guard, daily counter |
| `content.css` | Button, collapsed-post, and toast styles |
| `icons/icon{16,48,128}.png` | Extension icons: a red "no" sign in `#f4212e`. The 128px icon is 96px of artwork with 16px padding, per CWS guidelines |
| `README.md` | User-facing notice, install and usage notes (Japanese) |
| `LICENSE` | MIT |
| `docs/index.html` | GitHub Pages landing page (not part of the extension). Has the og:image meta and the backlink bar |
| `docs/og-image.png` | 1200×630 OG image for the landing page |
| `docs/privacy.html` | Privacy policy (JA + EN), including the CWS Limited Use statement. Its URL goes in the Chrome Web Store listing. Keep it in sync if the extension starts handling new data |
| `docs/sitemap.xml` | Hand-written sitemap listing both pages above. Add any new `docs/*.html` here |
| `scripts/seo-check.mjs` | Copy of `basecamp/scripts/seo-check.mjs`. **Don't edit it here**; re-copy from basecamp. Not part of the extension |
| `.github/workflows/seo-check.yml` | Runs seo-check on `docs/` for PRs and pushes to main. It does not deploy |

The ~250-line budget covers only the extension files above `docs/` (not `scripts/` or `.github/`). Nothing under `docs/` is loaded by Chrome. Don't add files whose names start with `_`, because Chrome refuses to load an unpacked extension that contains them.

## Listing on satory074.com/apps

- The public repo has the topic `featured-app`, and its `homepage` is `https://satory074.github.io/simple-block/`.
- basecamp's daily `update-apps-feed` job picks it up.
- Pages serves `main:/docs`.
- The card description is the repo description, and the thumbnail is the landing page's `og:image`.
- The card links straight to the Chrome Web Store listing, not the landing page. basecamp's `URL_OVERRIDES` in `scripts/update-apps-feed.ts` does this, and `homepage` stays the landing page so the thumbnail keeps working. Update that entry if the item ID ever changes.
- The landing page must keep the fixed backlink bar. The spec is in `basecamp/docs/app-backlink.md`.

## Search engines (SEO)

- Both pages have `<link rel="canonical">` equal to `og:url`: `https://satory074.github.io/simple-block/` and `https://satory074.github.io/simple-block/privacy.html` (the privacy URL is the one registered in the store, so keep the `.html` form). Both use `og-image.png`.
- One JSON-LD block per page, describing only what the page shows:
  - `index.html`: `@graph` of `WebSite` (`#website`) and `SoftwareApplication` (`#app`; `url` = the store listing, `applicationCategory` `BrowserApplication`, `operatingSystem` `Chrome`, `offers` price 0 JPY because the page says it is free, MIT `license`).
  - `privacy.html`: `WebPage` (`dateModified` = the 最終更新日 on the page; update both together), `isPartOf` → `#website`.
  - `author` is always `{"@type":"Person","@id":"https://satory074.com/#person",...}` (defined on satory074.com).
  - **Never add `aggregateRating` or `review`.** Google shows SoftwareApplication rich results only with ratings, and made-up ratings are spam. Without them, no rich result is expected.
- Check: `node scripts/seo-check.mjs docs https://satory074.github.io/simple-block/ --require-backlink`. Pages is legacy (`main:/docs`), so GitHub deploys on its own and this check cannot block it. Treat a red check on a PR as "don't merge".

## Chrome Web Store

- Published. Item ID `gncjbcfkebfbdbhgfcdpmakngcdfejea`, listing `https://chromewebstore.google.com/detail/gncjbcfkebfbdbhgfcdpmakngcdfejea`. README and the landing page point there first; the ZIP/unpacked install is the secondary path "for auditing / developers".
- The store name is "Simple Block for X". Plain "Simple Block" is too close to an existing listing called "x-simple-block". Never use X's logo in the icon or store images, and never imply the extension is official.
- Package only the extension files. `docs/`, `CLAUDE.md`, `README.md`, `LICENSE`, and `.git` stay out:
  `zip -X -r simple-block-<ver>.zip manifest.json content.js content.css icons/icon16.png icons/icon48.png icons/icon128.png`
- Bump `version` in `manifest.json` on every upload. The store rejects a version it has already seen.
- Release procedure:
  1. Bump the version and commit.
  2. Tag `v<ver>` and build the ZIP with the command above.
  3. Run `gh release create v<ver> simple-block-<ver>.zip`. Put its `shasum -a 256` and the changes in the notes.
  4. Upload that same ZIP to the store.

  The store re-signs the package, so users compare file contents, not the CRX hash.
- If "Verified CRX uploads" is turned on in the dashboard, uploads must be a CRX signed with the private key instead of the ZIP. Keep the key offline and out of the repo.
- The privacy practices form declares **Authentication information**, because the extension reads `ct0` and sends it only to x.com. Its privacy policy URL is `https://satory074.github.io/simple-block/privacy.html`. The support URL is GitHub Issues.

## Risk notice (ご注意)

The same notice appears in three places: the top of README, the landing page's ご注意 section, and the top and bottom of the store description. Keep all three in sync. It states:
- The extension is unofficial and not affiliated with X Corp.
- It calls X's internal API with the user's session, so account restriction is possible. Cite the Nov 2025 OldTweetDeck mass suspension.
- Blocking removes mutual follows, and undo does not restore them.
- The rate guard exists.
- It may break without notice when X changes.
- It is free and provided as-is, with no warranty (MIT).
- Report problems on GitHub Issues. Serious problems are announced at the top of README and the store description, and distribution may stop.
- The extension will never be sold or transferred.

Wording rules:
- Write no liability clause of our own. The user chose "no warranty + specific risks" and leaves the rest to MIT.
- Never write 「一切」, 「いかなる場合も」, 「法令に反しない限り」, or 「利用をもって同意とみなす」, and never claim it is 「安全」 or 「凍結されない」. Under 消費者契約法 8条, blanket exclusions are void, even 「故意・重過失を除き一切」. The Mobage terms ruling (2020) enjoined such clauses.
- If users report suspensions, do both on the same day, like OldTweetDeck did:
  - Put a notice at the top of README, the landing page, and the store description.
  - Ship a "safe mode" release that disables blocking and shows the notice. Unpublishing does not stop installed copies.

## Never add

These are what caused past backlash (BlueBlocker, shared block lists, インプレゾンビ language filters, Megablock), or they would make the extension a supply-chain risk:
- Block lists, or sharing, syncing or importing them.
- "Block everyone who liked/follows X".
- Auto-blocking by attributes such as language, country, or a paid badge.
- Generating or spoofing `x-client-transaction-id`, or any other bot-detection bypass. X's Jan 2026 terms treat bypassing controls as misuse.
- Analytics, remote config or remote code, or wider permissions.
- Selling or transferring the extension.

## Block mechanism

The official X API block endpoint (`POST /2/users/:id/blocking`) is Enterprise-only, so we call the internal web endpoint instead. This is the same request x.com's own web client sends.

- Block: `POST https://x.com/i/api/1.1/blocks/create.json`, body `screen_name=<handle>`. The response is the user object; keep its `id_str`.
- Unblock (undo): `POST https://x.com/i/api/1.1/blocks/destroy.json`, body `user_id=<id_str>` (falls back to `screen_name`).
- Headers:
  - `authorization: Bearer <public web-app bearer>`
  - `x-csrf-token: <ct0 cookie>`
  - `x-twitter-auth-type: OAuth2Session`
  - `x-twitter-active-user: yes`
  - `credentials: 'include'`
- The content script runs in the ISOLATED world:
  - Content-script fetches run on behalf of the page origin, so the x.com cookies are sent.
  - `ct0` is not HttpOnly, so `document.cookie` can read it.
  - `chrome.storage` is only available in ISOLATED.
- No `x-client-transaction-id` is sent. As of 2025–2026 these extensions call `blocks/*` without it:
  - [make-x-great-again](https://github.com/foru17/make-x-great-again)
  - [feedsieve](https://github.com/realchendahuang/feedsieve)
  - [Twitter-Block-With-Love](https://github.com/E011011101001/Twitter-Block-With-Love)

  X does enforce the transaction id on some GraphQL reads. That is why we send `screen_name`: getting the numeric id would need `UserByScreenName` GraphQL.
- This makes our request distinguishable from x.com's own.
  - In Nov 2025 X mass-suspended OldTweetDeck users for "Inauthentic Behavior" and lifted it the next day. That extension used the TweetDeck/X Pro bearer at high volume.
  - That is the main account risk for this extension, which is why the notice and the rate guard exist.

## DOM selectors

| Purpose | Selector | Notes |
|---|---|---|
| Post | `article[data-testid="tweet"]` | Home, replies, search, lists, profiles |
| Author | first `[data-testid="User-Name"]` → `a[href]` matching `^/[A-Za-z0-9_]{1,15}$`, **and** the first `[data-testid^="UserAvatar-Container-"]` in the article must end with the same handle (case-insensitive) | For a repost, the reposter is in `socialContext`, outside User-Name, so the original author is picked. If the two disagree, `authorOf()` returns null and the post gets no button (fail closed), so a DOM change can't make us block the wrong person |
| Button anchor | `[data-testid="caret"]` | The button is inserted before it. A quoted post has no caret, so it gets no button |
| Own handle | `a[data-testid="AppTabBar_Profile_Link"]` | Looked up lazily; the sidebar may render after the first posts |

`scan()` runs on a rAF-throttled `MutationObserver`.
- It re-derives `data-sb-user` on every pass, because X's virtualized list recycles nodes.
- It checks for an existing `.sb-btn` instead of a "processed" flag, so the button comes back after React re-renders.
- Blocked authors' posts disappear, like X's native block.
  - What gets `.sb-hidden` (`display:none`) is the `cellInnerDiv`'s **first child** (falling back to the `article`). The cell itself is never touched.
  - Once the page renders, X's virtualized list re-measures the now-0px cell and moves the following posts up. Verified 2026-09-12: the next cell went from `translateY(528px)` to `translateY(0px)`.
  - Control Panel for Twitter uses the same approach: `$item.firstElementChild.classList.toggle('HiddenTweet', …)`.
- Testing gotcha: in a background tab (`document.visibilityState === 'hidden'`), X doesn't re-layout at all, because nothing renders, so no ResizeObserver or rAF runs.
  - A gap therefore *looks* like it remains.
  - Bring the tab to the front first (e.g. take a screenshot), then measure.

## Fallback plan (if the API breaks)

Symptom: a toast like `ブロックに失敗しました（HTTP 4xx）` on every click. Likely causes: X starts requiring `x-client-transaction-id` on `blocks/*`, or rotates the bearer.

Fallback is DOM automation:
1. click `[data-testid="caret"]`
2. click `[role="menuitem"][data-testid="block"]`
3. click `[data-testid="confirmationSheetConfirm"]`

Undo is awkward under this approach (it needs the profile page's "ブロック中" button). It is also the switch to make if users report suspensions, because the request would then be x.com's own.

## Rate limit

- X publishes no block limit. About 500 per day is the commonly reported figure. Going over, or blocking in fast bursts (error 226, "looks automated"), has been reported to force a logout.
- Rate guard (`waitMs()`):
  - After a 429, blocking pauses for `WINDOW_MS` (60s).
  - At most `BURST` (10) block attempts are allowed per rolling `WINDOW_MS`.
  - Attempts are counted before the response arrives, so rapid clicks can't slip past.
  - While paused, a click shows 「連続ブロックを一時停止しています。あと N 秒…」 and sends nothing.
- `chrome.storage.local.sbDay = {date, count}` counts successful blocks per calendar day. Undo does not decrement it.
- From 400 on, the toast adds a warning. X's window is a rolling 24h, so the calendar day is only an approximation.

## Dev loop

1. Edit the files.
2. `chrome://extensions` → reload the extension (↻).
3. Reload the x.com tab.

No test suite for the extension. Run `node --check content.js` and validate `manifest.json` as JSON. For `docs/`, run the seo-check command above.

## Manual verification checklist

1. The button appears on:
   - Home (おすすめ / フォロー中)
   - A post's replies
   - Search → 最新
   - A list
   - Another user's profile

   It does not appear on your own posts or inside quoted posts.
2. On a repost, the tooltip shows the original author.
3. Block a test account:
   - The toast appears, and that author's posts disappear with no gap left behind, including ones loaded later.
   - Undo within 3s restores them in place, and the toast says follows are not restored.
   - Hovering the toast keeps it.
   - Waiting 3s keeps the block.
4. Error paths:
   - Blocking `*blocks/create.json*` in DevTools shows 通信エラー.
   - Setting `sbDay.count = 399` makes the next block show the warning.
   - The rate guard can't be exercised safely against X. Review `waitMs()` instead.
5. Clicking the button never opens the post's detail page.

**Only block or unblock accounts the user explicitly names during testing.**
