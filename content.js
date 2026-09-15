(() => {
  'use strict';

  const API = 'https://x.com/i/api/1.1/blocks/';
  // X の Web クライアントが全ユーザー共通で使う公開 bearer（秘密情報ではない）
  const BEARER =
    'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  const HANDLE_RE = /^\/([A-Za-z0-9_]{1,15})$/;
  const AVATAR = 'UserAvatar-Container-';
  const UNDO_MS = 3000;
  const WARN_AT = 400; // X のブロック上限は約500件/日
  // 短時間の連続ブロックは X に自動化と判定されやすい。WINDOW_MS あたり BURST 件までにし、429 のあとは WINDOW_MS 止める
  const WINDOW_MS = 60000;
  const BURST = 10;

  const blocked = new Set(); // このページでブロックした handle（小文字）
  const recent = []; // 直近 WINDOW_MS 内にブロックを試みた時刻
  let pausedUntil = 0;

  const ct0 = () => document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/)?.[1];

  // action: 'create' | 'destroy'
  async function blocksApi(action, params) {
    const csrf = ct0();
    if (!csrf) return { ok: false, status: 0 };
    try {
      const res = await fetch(`${API}${action}.json`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          authorization: BEARER,
          'x-csrf-token': csrf,
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-active-user': 'yes',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: -1 };
    }
  }

  function errorMessage(status, label) {
    if (status === 0) return 'ログイン情報が見つかりません。再ログインしてください';
    if (status === 401 || status === 403) return `認証エラー（HTTP ${status}）。ページを再読み込みしてください`;
    if (status === 429) return '上限に達しました。1分ほど待ってからお試しください';
    if (status === -1) return '通信エラーが発生しました';
    return `${label}に失敗しました（HTTP ${status}）。修正版をお待ちください（GitHub Issues）`;
  }

  // 次のブロックまでに待つミリ秒（0 以下なら今すぐ可）
  function waitMs() {
    const now = Date.now();
    while (recent.length && now - recent[0] >= WINDOW_MS) recent.shift();
    const burstEnd = recent.length >= BURST ? recent[0] + WINDOW_MS : 0;
    return Math.max(pausedUntil, burstEnd) - now;
  }

  let myHandle = null;
  function me() {
    if (!myHandle) {
      const href = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href');
      myHandle = href?.match(HANDLE_RE)?.[1].toLowerCase() ?? null;
    }
    return myHandle;
  }

  // 最初の User-Name が投稿者本人。リポストした人は socialContext 側にあるので拾わない。
  // DOM が変わって別人を拾わないよう、最初のアバター（UserAvatar-Container-<handle>）と一致したときだけ採用する
  function authorOf(article) {
    const name = article.querySelector('[data-testid="User-Name"]');
    const avatar = article.querySelector(`[data-testid^="${AVATAR}"]`)?.dataset.testid.slice(AVATAR.length);
    if (!name || !avatar) return null;
    for (const a of name.querySelectorAll('a[href^="/"]')) {
      const m = a.getAttribute('href').match(HANDLE_RE);
      if (m) return m[1].toLowerCase() === avatar.toLowerCase() ? m[1] : null;
    }
    return null;
  }

  // セル（cellInnerDiv）自体ではなく中身を消す。X の仮想リストが 0px になったセルを測り直し、
  // 下のポストが詰まる（Control Panel for Twitter と同じ方式）
  const hideTargetOf = (art) => art.closest('[data-testid="cellInnerDiv"]')?.firstElementChild ?? art;

  function setHidden(key, on) {
    for (const art of document.querySelectorAll(`article[data-sb-user="${key}"]`)) {
      hideTargetOf(art).classList.toggle('sb-hidden', on);
    }
  }

  async function bumpCounter() {
    try {
      const today = new Date().toLocaleDateString('sv');
      const { sbDay } = await chrome.storage.local.get('sbDay');
      const count = (sbDay?.date === today ? sbDay.count : 0) + 1;
      await chrome.storage.local.set({ sbDay: { date: today, count } });
      return count;
    } catch {
      return 0; // 拡張の再読み込み後などで storage が使えなくてもブロックは成功扱い
    }
  }

  let toastTimer;
  function toast(message, onUndo) {
    document.querySelector('.sb-toast')?.remove();
    clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.className = 'sb-toast';
    el.setAttribute('role', 'status');
    el.append(message);
    if (onUndo) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '元に戻す';
      b.addEventListener('click', () => {
        el.remove();
        clearTimeout(toastTimer);
        onUndo();
      });
      el.append(b);
    }
    // マウスを乗せている間・フォーカス中は消さない（元に戻すを押し損ねないように）
    const stop = () => clearTimeout(toastTimer);
    const start = () => {
      stop();
      if (el.isConnected) toastTimer = setTimeout(() => el.remove(), UNDO_MS);
    };
    el.addEventListener('mouseenter', stop);
    el.addEventListener('focusin', stop);
    el.addEventListener('mouseleave', start);
    el.addEventListener('focusout', start);
    document.body.append(el);
    start();
  }

  async function undo(user, id) {
    const res = await blocksApi('destroy', id ? { user_id: id } : { screen_name: user });
    if (!res.ok) {
      toast(errorMessage(res.status, 'ブロック解除'));
      return;
    }
    const key = user.toLowerCase();
    blocked.delete(key);
    setHidden(key, false);
    toast(`@${user} のブロックを解除しました（フォロー関係は元に戻りません）`);
  }

  async function onClick(e) {
    // X の投稿クリック（詳細ページへの遷移）を発火させない
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    const art = btn.closest('article[data-testid="tweet"]');
    const user = art && authorOf(art);
    if (!user || user.toLowerCase() === me()) return;

    const wait = waitMs();
    if (wait > 0) {
      toast(`連続ブロックを一時停止しています。あと ${Math.ceil(wait / 1000)} 秒お待ちください`);
      return;
    }

    recent.push(Date.now()); // 応答前に数える（連打で上限をすり抜けないように）
    btn.disabled = true;
    const res = await blocksApi('create', { screen_name: user });
    btn.disabled = false;
    if (!res.ok) {
      if (res.status === 429) pausedUntil = Date.now() + WINDOW_MS;
      toast(errorMessage(res.status, 'ブロック'));
      return;
    }

    const key = user.toLowerCase();
    blocked.add(key);
    setHidden(key, true);
    const count = await bumpCounter();
    const warn = count >= WARN_AT ? `（本日 ${count} 件目・上限 約500件に注意）` : '';
    const id = res.data?.id_str;
    toast(`@${user} をブロックしました${warn}`, () => undo(user, id));
  }

  function makeButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sb-btn';
    btn.textContent = 'ブロック';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function scan() {
    const self = me();
    for (const art of document.querySelectorAll('article[data-testid="tweet"]')) {
      const user = authorOf(art);
      if (!user) continue;
      const key = user.toLowerCase();
      // 仮想リストで DOM が使い回されるため、毎回付け直す
      art.dataset.sbUser = key;
      hideTargetOf(art).classList.toggle('sb-hidden', blocked.has(key));

      let btn = art.querySelector('.sb-btn');
      if (key === self) {
        btn?.remove();
        continue;
      }
      if (!btn) {
        const caret = art.querySelector('[data-testid="caret"]');
        if (!caret) continue;
        btn = makeButton();
        caret.parentElement.insertBefore(btn, caret);
      }
      const label = `@${user} をブロック`;
      if (btn.title !== label) {
        btn.title = label;
        btn.setAttribute('aria-label', label);
      }
    }
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
