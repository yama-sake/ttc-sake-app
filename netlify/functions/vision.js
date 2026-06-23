// Netlify Function: ラベル画像 → 銘柄情報
// 実処理は ../../lib/labelReader.js に集約（Vercel版と共通）。
//
// クライアントは /api/vision を呼ぶ。netlify.toml のリダイレクトで
// /api/vision → /.netlify/functions/vision に転送されるため、
// アプリ側のコード（fetch('/api/vision')）は変更不要。
//
// 必要な環境変数（Netlify の Site settings → Environment variables）:
//   GEMINI_API_KEY … Gemini API のキー（一段目）

import { readLabel } from '../../lib/labelReader.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { image } = JSON.parse(event.body || '{}');
    const result = await readLabel(image, {
      geminiKey: process.env.GEMINI_API_KEY,
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
