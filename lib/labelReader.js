// ラベル画像 → 銘柄情報を読み取る共通ロジック
//
// Vercel（api/vision.js）と Netlify（netlify/functions/vision.js）の
// 両方からこのモジュールを呼ぶ。ホストに依存しない純粋な処理だけを置く。
//
// Gemini（「読む目」）でラベルを理解し、銘柄名・特定名称・蔵元をJSON抽出する。
// 読み取れなかった場合はエラーを返し、アプリ側で手入力に切り替える。

export const CATEGORIES = [
  '純米大吟醸', '純米吟醸', '特別純米', '純米酒',
  '大吟醸', '吟醸', '特別本醸造', '本醸造', '普通酒', 'その他', '不明',
];

// ===== Gemini で読み取る =====
async function readWithGemini(imageBase64, apiKey) {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    'これは日本酒の瓶のラベル写真です。ラベルを読み取り、次の情報を日本語で抽出してください。',
    '- name: 銘柄名（商品名）のみ。蔵元名・特定名称・説明文・英字ロゴは含めない。例「若緑」「上川大雪」「千代寿」。',
    '- category: 特定名称。必ず次のいずれかから選ぶ → ' + CATEGORIES.join(' / ') + '。判別できなければ「不明」。',
    '- brewery: 蔵元名（分かれば都道府県も）。読み取れなければ空文字。',
    '- reading_lines: ラベルから読み取れた主要なテキスト行の配列（人が手修正で使うため、銘柄候補になりそうな行を優先）。',
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


// ===== 公開関数: ホスト側のハンドラから呼ぶ =====
// imageBase64: data URLのプレフィックスを除いたbase64文字列
// keys: { geminiKey }
export async function readLabel(imageBase64, { geminiKey } = {}) {
  if (!imageBase64) throw new Error('image is required');
  if (!geminiKey) {
    throw new Error('APIキー未設定です。GEMINI_API_KEY を環境変数に設定してください。');
  }

  // Gemini で読み取る。失敗した場合はそのままエラーを投げ、
  // アプリ側で「読み取れませんでした → 手入力」として扱う。
  return await readWithGemini(imageBase64, geminiKey);
}
