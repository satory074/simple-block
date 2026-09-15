# Simple Block for X

X (x.com) の各投稿に「ブロック」ボタンを追加する Chrome 拡張です。
標準の「… → ブロック → 確認」を **1クリック** にします。

- Chrome ウェブストア: https://chromewebstore.google.com/detail/gncjbcfkebfbdbhgfcdpmakngcdfejea
- 紹介ページ: https://satory074.github.io/simple-block/

## ご注意

- Simple Block は X Corp. とは無関係の非公式ツールです。
- ログイン中のあなたのアカウントで、Web 版 X が使う非公開の内部 API を呼び出します。X の判断でアカウントが制限・凍結される可能性はゼロではありません（2025年11月には、別の非公式拡張の利用者が一時的に一斉凍結されました）。
- **ブロックすると相互のフォローが外れます。「元に戻す」でブロックを解除しても、フォローは戻りません。**
- 短時間に続けてブロックすると、X に制限されることがあります。1日400件を超えると警告し、X から制限の応答があった場合や、短時間に続けてブロックした場合は、しばらくブロックを止めます。
- X の仕様変更で、予告なく動かなくなることがあります。
- 無償・現状のまま提供し、動作や X の仕様変更への対応は保証しません（[MIT ライセンス](LICENSE)）。
- 不具合や凍結の報告は [GitHub Issues](https://github.com/satory074/simple-block/issues) へお寄せください。重大な問題を確認したら、このページとストアの説明文の冒頭でお知らせし、必要に応じて配布を止めます。
- この拡張機能を売却・譲渡することはありません。

## インストール

[Chrome ウェブストア](https://chromewebstore.google.com/detail/gncjbcfkebfbdbhgfcdpmakngcdfejea)で「Chrome に追加」を押してください。
公式版のストア ID は `gncjbcfkebfbdbhgfcdpmakngcdfejea` だけです。同じ名前でも ID が違うものは作者と無関係です。

### 手動で読み込む（中身を確認したい方・開発者向け）

1. [ZIP をダウンロード](https://github.com/satory074/simple-block/archive/refs/heads/main.zip)して展開する（`git clone` でも可）
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON にする
4. 「パッケージ化されていない拡張機能を読み込む」を押し、展開した `simple-block-main`（clone なら `simple-block`）フォルダを選ぶ
5. x.com のタブを再読み込みする

手動で読み込んだ場合は自動更新されません。ファイルを置き換えたら `chrome://extensions` でこの拡張の再読み込みボタン（↻）を押し、x.com のタブも再読み込みしてください。

## 使い方

- 投稿の右上（「…」の左）にある **ブロック** ボタンを押すと、確認なしですぐにブロックします
- ボタンにマウスを乗せると、ブロック対象の `@ユーザー名` が表示されます（リポストの場合は元の投稿者）
- ブロックした人の投稿は、X 標準のブロックと同じように画面から消えます
- 画面下のトーストの **元に戻す** を3秒以内に押すと、ブロックを解除して投稿を元に戻します（トーストにマウスを乗せている間は消えません）

## プライバシー

データ収集や、x.com 以外への通信はありません。料金もかかりません。詳しくは[プライバシーポリシー](https://satory074.github.io/simple-block/privacy.html)をご覧ください。

## ライセンス

[MIT](LICENSE)
