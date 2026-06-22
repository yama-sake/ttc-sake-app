// Netlify Function: ラベル画像 → Cloud Vision OCR の「生レスポンス」をそのまま返す
//
// 目的: 香織さん版(main)の SakeApp.jsx を 1行も変えずに Netlify で動かすための「配線」。
//   main の analyzeSake は d.responses[0].fullTextAnnotation.text を読むため、
//   ここでは Vision API の生レスポンス(data)をそのまま返す（main の api/vision.js と同一契約）。
//   ※ Gemini化や整形はしない（それは小西さんが後で別途乗せ直す）。
//
// クライアントは /api/vision を呼ぶ。netlify.toml のリダイレクトで
//   /api/vision → /.netlify/functions/vision に転送される（アプリ側のコードは変更不要）。
//
// 必要な環境変数（Netlify: Site settings → Environment variables）:
//   VISION_API_KEY … Cloud Vision のキー

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { image } = JSON.parse(event.body || '{}');
    const apiKey = process.env.VISION_API_KEY;

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    );

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
