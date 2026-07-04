# assets/

## targets.mind の生成手順

1. **MindAR コンパイラ**を開く  
   https://hiukim.github.io/mind-ar-js-doc/tools/compile

2. 観光イラストマップの画像（JPG / PNG、推奨 1000px 以上）をアップロード

3. **[Start]** をクリックして処理完了を待つ  
   ※ 特徴点（模様・文字・イラスト）が多いほど認識精度が上がります  
   ※ 空白が多い画像は認識しにくいため、マップ全体が写った画像を使用してください

4. 処理完了後 **[Export]** → `targets.mind` をダウンロード

5. このフォルダ（`assets/`）に配置する

## スポット座標の調整

`js/data.js` の `SPOTS` オブジェクトで各スポットの配置位置を調整できます。

座標系は MindAR アンカーのローカル空間（画像中心が原点、横幅 = 1.0 unit）です。

```js
const SPOTS = {
  '鏡湖':    { x: -0.22, y:  0.25 },  // 左上エリア
  '鎮守の森': { x:  0.06, y: -0.10 },  // 中央右寄り
  '八雲神社': { x:  0.28, y:  0.20 },  // 右上エリア
};
```

A3 縦置き（297×420 mm）の場合、Y の範囲は約 ±0.71 です。

## 動作環境

- **HTTPS または localhost** 上でホストする必要があります  
  （iOS Safari / Chrome は HTTP ではカメラアクセスを拒否します）
- 推奨ブラウザ: iOS Safari 15+, Chrome for Android 90+
