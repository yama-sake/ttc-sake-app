// Vercel Serverless Function: ラベル画像 → 銘柄情報
// 実処理は ../lib/labelReader.js に集約（Netlify版と共通）。
//
// 必要な環境変数（Vercel の Settings → Environment Variables）:
//   GEMINI_API_KEY … Gemini API のキー（一段目）

import { readLabel } from '../lib/labelReader.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { image } = req.body;
    const result = await readLabel(image, {
      geminiKey: process.env.GEMINI_API_KEY,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
