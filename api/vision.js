// ラベル画像 → 銘柄情報を読み取るサーバー関数
//
// 一段目: Gemini（「読む目」）でラベルを理解し、銘柄名・特定名称・蔵元をJSON抽出
// 二段目: Geminiが使えない／失敗した場合は、従来の Cloud Vision OCR にフォールバック
//
// 必要な環境変数（Vercel の Settings → Environment Variables）:
//   GEMINI_API_KEY … Gemini API のキー（一段目で使用）
//   VISION_API_KEY … Cloud Vision のキー（フォールバックで使用。任意）

const CATEGORIES = [
  '純米大吟醸', '純米吟醸', '特別純米', '純米酒',
  '大吟醸', '吟醸', '特別本醸造', '本醸造', '普通酒', 'その他', '不明',
];

// ===== 一段目: Gemini で読み取る =====
async function readWithGemini(imageBase64, apiKey) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    'これは日本酒の瓶のラベル写真です。ラベルを読み取り、次の情報を日本語で抽出してください。',
    '- name: 銘柄名（商品名）のみ。蔵元名・特定名称・説明文・英字ロゴは含めない。例「若緑」「上川大雪」「千代寿」。',
    '- category: 特定名称。必ず次のいずれかから選ぶ → ' + CATEGORIES.join(' / ') + '。判別できなければ「不明」。',
    '- brewery: 蔵元名（分かれば都道府県も）。読み取れなければ空文字。',
    '- reading_lines: ラベルから読み取れた主要なテキスト行の配列（人が手修正で使うため、銘柄候補になりそうな行を优先）。',
    '縦書き・筆文字・崩し字も丁寧に読むこと。確信が持てない項目は空文字にし、推測で創作しないこと。',
  ].join('\n');

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          category: { type: 'STRING', enum: CATEGORIES },
          brewery: { type: 'STRING' },
          reading_lines: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['name', 'category', 'brewery'],
      },
      temperature: 0,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('Gemini応答のJSON解析に失敗: ' + text.slice(0, 200));
  }

  const category = CATEGORIES.includes(parsed.category) ? parsed.category : '';
  const lines = Array.isArray(parsed.reading_lines)
    ? [...new Set(parsed.reading_lines.map((l) => String(l).trim()).filter(Boolean))]
    : [];

  return {
    name: (parsed.name || '').trim(),
    category,
    brewery: (parsed.brewery || '').trim(),
    lines,
    source: 'gemini',
  };
}

// ===== 二段目: Cloud Vision OCR でテキストだけ拾う（フォールバック）=====
async function readWithVision(imageBase64, apiKey) {
  const resp = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
    }
  );
  const data = await resp.json();
  const text = data?.responses?.[0]?.fullTextAnnotation?.text || '';
  const lines = [...new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))];

  // OCRの行から特定名称だけは推定しておく（銘柄名は人が選ぶ前提）
  let category = '';
  for (const line of lines) {
    for (const cat of CATEGORIES) {
      if (cat !== '不明' && cat !== 'その他' && line.includes(cat) && !category) category = cat;
    }
  }

  return { name: '', category, brewery: '', lines, source: 'vision' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required' });

    const geminiKey = process.env.GEMINI_API_KEY;
    const visionKey = process.env.VISION_API_KEY;

    // 一段目: Gemini
    if (geminiKey) {
      try {
        const result = await readWithGemini(image, geminiKey);
        return res.status(200).json(result);
      } catch (e) {
        console.error('[vision] Gemini失敗、Visionにフォールバック:', e.message);
        // 二段目へ続く
      }
    }

    // 二段目: Cloud Vision OCR
    if (visionKey) {
      const result = await readWithVision(image, visionKey);
      return res.status(200).json(result);
    }

    return res.status(500).json({
      error: 'APIキー未設定です。GEMINI_API_KEY または VISION_API_KEY を環境変数に設定してください。',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
