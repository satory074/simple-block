# simple-block

Chrome extension (Manifest V3) that adds a one-click "ブロック" button to every post on x.com.
Blocks immediately with no confirmation, then shows a toast with "元に戻す" (undo) for 3 seconds.

## Constraints

- No build step, no dependencies, no background worker. The only network requests go to x.com.
- Keep it small and auditable (~250 lines total). UI strings are Japanese.
- Only `permissions: ["storage"]`. No `host_permissions` needed, because the requests are same-origin (see below).

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest. content script on `https://x.com/*` |
| `content.js` | Injects the button, calls the block API, toast/undo, daily counter |
| `content.css` | Button, collapsed-post, and toast styles |
| `README.md` | User-facing install/usage notes (Japanese) |

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

## DOM selectors

| Purpose | Selector | Notes |
|---|---|---|
| Post | `article[data-testid="tweet"]` | Home, replies, search, lists, profiles |
| Author | first `[data-testid="User-Name"]` → `a[href]` matching `^/[A-Za-z0-9_]{1,15}$` | For a repost, the reposter is in `socialContext`, outside User-Name, so the original author is picked |
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

Undo is awkward under this approach (it needs the profile page's "ブロック中" button).

## Rate limit

- X limits blocking to about 500 per day; going over has been reported to force a logout. Callers pause about 45s after a 429.
- `chrome.storage.local.sbDay = {date, count}` counts successful blocks per calendar day. Undo does not decrement it.
- From 400 on, the toast adds a warning. X's window is a rolling 24h, so the calendar day is only an approximation.

## Dev loop

1. Edit the files.
2. `chrome://extensions` → reload the extension (↻).
3. Reload the x.com tab.

No test suite. Run `node --check content.js` and validate `manifest.json` as JSON.

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
   - Undo within 3s restores them in place.
   - Waiting 3s keeps the block.
4. Error paths:
   - Blocking `*blocks/create.json*` in DevTools shows 通信エラー.
   - Setting `sbDay.count = 399` makes the next block show the warning.
5. Clicking the button never opens the post's detail page.

**Only block or unblock accounts the user explicitly names during testing.**
