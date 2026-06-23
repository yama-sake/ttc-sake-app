import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings, Home, Clipboard, User, ChevronLeft, Search, Trophy, Wine, BookOpen, ExternalLink, ArrowRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, child, onValue } from 'firebase/database';



// ===== Firebase設定 =====
const firebaseConfig = {
  apiKey: "AIzaSyAhPGRB5-rQR56BrI-b8QQYK6DD-cpzXO8",
  authDomain: "ttc-sake-app.firebaseapp.com",
  databaseURL: "https://ttc-sake-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ttc-sake-app",
  storageBucket: "ttc-sake-app.firebasestorage.app",
  messagingSenderId: "311700112558",
  appId: "1:311700112558:web:a3f13541a39f286362193f"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// ===== 合言葉設定 =====
// 変更したい場合はこの値を書き換えて再デプロイしてください
const SECRET_PASSWORD = 'sake2026';
const PASSWORD_STORAGE_KEY = 'sakeApp_authenticated';

// ===== 蔵元プロフィール =====
// 銘柄名または蔵元欄に matchKeys のいずれかが含まれると、銘柄詳細に蔵元カードが表示される
const KURAMOTO_PROFILES = [
  {
    id: 'nakano',
    matchKeys: ['若緑', '中納酒造'],
    name: '中納酒造',
    location: '石川県輪島市町野町',
    founded: '嘉永2年（1849年）創業',
    story: '代表銘柄「若緑」。2024年の能登半島地震で蔵が被災し、いま再興への道を歩んでいる。この一杯が、蔵の明日につながる。',
    links: [
      { label: '🔥 再興プロジェクト', url: 'https://x.gd/LbtlI' },
    ],
  },
  {
    id: 'chiyokotobuki',
    matchKeys: ['千代寿', '千代壽'],
    name: '千代寿虎屋',
    location: '山形県寒河江市',
    founded: '1922年創業（1700年創業・霞城壽の分家）',
    story: '霊峰月山の雪解け水と山形県産米だけで醸す約700石の蔵。「豊国耕作者の会」を組織し、田植えから米作りに関わる。酒蔵見学・英語サイトあり。',
    links: [
      { label: '🏠 蔵元サイト', url: 'https://chiyokotobuki.com/' },
      { label: '🛒 オンラインショップ', url: 'https://chiyokoto.official.ec/' },
    ],
  },
  {
    id: 'kamikawataisetsu',
    matchKeys: ['上川大雪'],
    name: '上川大雪酒造',
    location: '北海道上川郡上川町（緑丘蔵）',
    founded: '2017年・戦後の北海道で初の新設蔵',
    story: '三重県の休眠蔵の酒造免許を、前例のない管轄越え移転で北海道へ。全量純米造り。「地方創生蔵」として帯広・函館にも蔵を展開する。',
    links: [
      { label: '🏠 蔵元サイト', url: 'https://kamikawa-taisetsu.co.jp/' },
    ],
  },
];

const findKuramoto = (sake) => {
  if (!sake) return null;
  const hay = `${sake.name || ''} ${sake.brewery || ''}`;
  return KURAMOTO_PROFILES.find(p => p.matchKeys.some(k => hay.includes(k))) || null;
};

// ===== Firebase操作ヘルパー =====
const dbGet = async (path) => {
  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? snapshot.val() : null;
};

const dbSet = async (path, value) => {
  await set(ref(database, path), value);
};

const dbRemove = async (path) => {
  await remove(ref(database, path));
};

// ===== メインアプリ =====
// ===== 都道府県（地方別）・酒米 マスタ =====
const PREFECTURES_BY_REGION = {
  '北海道・東北': ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県'],
  '関東': ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県'],
  '中部': ['新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県'],
  '近畿': ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県'],
  '中国': ['鳥取県','島根県','岡山県','広島県','山口県'],
  '四国': ['徳島県','香川県','愛媛県','高知県'],
  '九州・沖縄': ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'],
};
const ALL_PREFECTURES = Object.values(PREFECTURES_BY_REGION).flat();
const SAKE_RICE_OPTIONS = ['山田錦','五百万石','美山錦','雄町','愛山','出羽燦々','八反錦','亀の尾','秋田酒こまち','吟風','彗星','百万石乃白','越淡麗','ひとごこち','山田穂','渡船','きたしずく','風さやか','玉栄','強力'];
const RICE_OTHER = 'その他';
const RICE_UNKNOWN = '不明';

const PrefectureSelect = ({ value, onChange }) => (
  <select value={value || ''} onChange={onChange}>
    <option value="">選択してください</option>
    {Object.entries(PREFECTURES_BY_REGION).map(([region, prefs]) => (
      <optgroup key={region} label={region}>
        {prefs.map(p => <option key={p} value={p}>{p}</option>)}
      </optgroup>
    ))}
  </select>
);

const RiceField = ({ value, onChange }) => {
  const v = value || '';
  const selVal = (SAKE_RICE_OPTIONS.includes(v) || v === RICE_OTHER || v === RICE_UNKNOWN) ? v : '';
  return (
    <>
      <select value={selVal} onChange={(e) => onChange(e.target.value)} style={{ marginBottom: 8 }}>
        <option value="">リストから選ぶ…</option>
        {SAKE_RICE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        <option value={RICE_OTHER}>{RICE_OTHER}</option>
        <option value={RICE_UNKNOWN}>{RICE_UNKNOWN}</option>
      </select>
      <input type="text" value={v} onChange={(e) => onChange(e.target.value)} placeholder="酒米を手入力（後から調べて入力もOK）" />
    </>
  );
};

const SakeApp = () => {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState(null);
  const [sakes, setSakes] = useState([]);
  const [selectedSake, setSelectedSake] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterRice, setFilterRice] = useState('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editingReportKey, setEditingReportKey] = useState(null);

  // 管理者画面への隠しアクセス（徳利5回タップ）
  const tokkuriTapCount = useRef(0);
  const tokkuriTapTimer = useRef(null);

  useEffect(() => {
    loadSakes();
    loadUserNameLocal();
    // 認証済みかチェック
    if (localStorage.getItem(PASSWORD_STORAGE_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 名前はlocalStorageに保存（端末ごと）
  const loadUserNameLocal = () => {
    const name = localStorage.getItem('sakeApp_userName');
    if (name) setUserName(name);
  };

  const saveUserNameLocal = (name) => {
    localStorage.setItem('sakeApp_userName', name);
    setUserName(name);
    setShowNameInput(false);
  };

  // 銘柄一覧をFirebaseから読み込み
  const loadSakes = async () => {
    try {
      const data = await dbGet('sakes');
      if (data) {
        setSakes(Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setSakes([]);
      }
    } catch (error) {
      console.error('銘柄読み込みエラー:', error);
    }
  };

  const saveSake = async (sake) => {
    await dbSet(`sakes/${sake.id}`, sake);
    await loadSakes();
  };

  const saveReport = async (sakeId, report) => {
    const key = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await dbSet(`reports/${sakeId}/${key}`, { ...report, key });
    return key;
  };

  const loadReports = async (sakeId) => {
    const data = await dbGet(`reports/${sakeId}`);
    return data ? Object.values(data) : [];
  };

  const loadAllReports = async () => {
    const data = await dbGet('reports');
    if (!data) return [];
    const allReports = [];
    Object.values(data).forEach(sakeReports => {
      Object.values(sakeReports).forEach(report => {
        allReports.push(report);
      });
    });
    return allReports;
  };

  // 徳利タップカウント
  const handleTokkuriTap = () => {
    tokkuriTapCount.current += 1;
    if (tokkuriTapTimer.current) clearTimeout(tokkuriTapTimer.current);
    tokkuriTapTimer.current = setTimeout(() => {
      tokkuriTapCount.current = 0;
    }, 2000);
    if (tokkuriTapCount.current >= 5) {
      tokkuriTapCount.current = 0;
      setMode('admin');
      setCurrentScreen('admin');
    }
  };

  // ===== 星評価コンポーネント =====
  const StarRating = ({ value, maxStars, onChange, label, leftLabel, rightLabel }) => {
    return (
      <div className="star-rating-group">
        <div className="star-rating-header">
          <label>{label}</label>
          <span className="star-count">{value}/{maxStars}</span>
        </div>
        <div className="slider-labels">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
        <div className="star-rating-container">
          {[...Array(maxStars)].map((_, i) => (
            <button
              key={i}
              type="button"
              className={`star-btn ${i < value ? 'active' : ''}`}
              onClick={() => onChange(i + 1)}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ===== 蔵元カード =====
  const KuramotoCard = ({ sake }) => {
    const k = findKuramoto(sake);
    if (!k) return null;
    return (
      <div className="kuramoto-card">
        <span className="kuramoto-label">蔵元</span>
        <h4 className="kuramoto-name">{k.name}</h4>
        <p className="kuramoto-meta">{k.location}　{k.founded}</p>
        <p className="kuramoto-story">{k.story}</p>
        <div className="kuramoto-links">
          {k.links.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="kuramoto-link-btn">{l.label}</a>
          ))}
        </div>
      </div>
    );
  };

  // ===== 徳利SVG =====
  const TokkuriSVG = ({ width = 100, height = 100, color = "#2c3e50" }) => (
    <svg width={width} height={height} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M85 20 Q85 18 87 18 L113 18 Q115 18 115 20 L115 55 Q115 58 113 58 L87 58 Q85 58 85 55 Z" fill={color}/>
      <ellipse cx="100" cy="65" rx="18" ry="8" fill={color}/>
      <path d="M82 65 Q75 75 68 95 Q60 120 60 145 Q60 165 75 175 Q85 182 100 182 Q115 182 125 175 Q140 165 140 145 Q140 120 132 95 Q125 75 118 65 Z" fill={color}/>
      <ellipse cx="100" cy="182" rx="40" ry="6" fill={color}/>
      <ellipse cx="155" cy="150" rx="20" ry="6" fill={color}/>
      <path d="M135 150 L135 165 Q135 168 137 168 L173 168 Q175 168 175 165 L175 150 Z" fill={color}/>
      <ellipse cx="155" cy="168" rx="20" ry="5" fill={color}/>
    </svg>
  );

  // ===== 合言葉認証画面 =====
  const PasswordScreen = () => {
    const [inputPassword, setInputPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const handleSubmit = () => {
      if (inputPassword.trim() === SECRET_PASSWORD) {
        localStorage.setItem(PASSWORD_STORAGE_KEY, 'true');
        setIsAuthenticated(true);
        setCurrentScreen('eventEntrance');
      } else {
        setErrorMessage('合言葉が違います');
        setIsShaking(true);
        setInputPassword('');
        setTimeout(() => setIsShaking(false), 500);
      }
    };

    return (
      <div className="screen splash-screen">
        <div className="splash-content">
          <div className="sake-logo">
            <div className="logo-circle">
              <div className="tokkuri-container">
                <TokkuriSVG width={120} height={120} color="#2c3e50" />
              </div>
              <div className="logo-text">日本酒</div>
              <div className="logo-dots"><span></span><span></span><span></span></div>
            </div>
          </div>
          <h1 className="app-title">SAKE BOOK</h1>
          <p className="app-subtitle">MEMORIES IN EVERY DROP</p>
        </div>
        <div className={'password-box ' + (isShaking ? 'shake' : '')}>
          <p className="password-label">合言葉を入力してください</p>
          <input
            type="password"
            className="password-input"
            value={inputPassword}
            onChange={(e) => { setInputPassword(e.target.value); setErrorMessage(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="合言葉"
            autoFocus
          />
          {errorMessage && <p className="password-error">{errorMessage}</p>}
          <button className="splash-start-btn" onClick={handleSubmit}>入る</button>
          <button onClick={() => setCurrentScreen('home')} style={{ marginTop: 12, background: 'none', border: 'none', color: '#888', fontSize: 14, cursor: 'pointer' }}>← トップへ戻る</button>
        </div>
      </div>
    );
  };

  // ===== スプラッシュ画面 =====
  const SplashScreen = () => (
    <div className="screen splash-screen">
      <div className="splash-content">
        <div className="sake-logo">
          <div className="logo-circle">
            <div className="tokkuri-container">
              <TokkuriSVG width={120} height={120} color="#2c3e50" />
            </div>
            <div className="logo-text">日本酒</div>
            <div className="logo-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
        <h1 className="app-title">SAKE BOOK</h1>
        <p className="app-subtitle">MEMORIES IN EVERY DROP</p>
      </div>
      <button className="splash-start-btn" onClick={() => setCurrentScreen('home')}>はじめる</button>
    </div>
  );

  // ===== 名前入力モーダル =====
  const NameInputModal = () => {
    const [tempName, setTempName] = useState('');
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>👤 お名前を入力してください</h3>
          <p className="modal-text">テイスティングレポートに表示されます</p>
          <div className="form-group">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="例: 田中"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && tempName.trim()) saveUserNameLocal(tempName.trim()); }}
            />
          </div>
          <button
            className="modal-btn save-btn"
            onClick={() => { if (tempName.trim()) saveUserNameLocal(tempName.trim()); }}
            disabled={!tempName.trim()}
          >保存</button>
        </div>
      </div>
    );
  };

  // ===== ホーム画面 =====
  const HomeScreen = () => (
    <div className="screen splash-screen">
      <Settings size={20} className="menu-settings" onClick={() => setShowNameInput(true)} />
      <div className="splash-content">
        <div className="sake-logo">
          <div className="logo-circle">
            <div className="tokkuri-container">
              <TokkuriSVG width={100} height={100} color="#2c3e50" />
            </div>
            <div className="logo-text">日本酒</div>
            <div className="logo-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
        <h1 className="app-title">SAKE BOOK</h1>
        <p className="app-subtitle">MEMORIES IN EVERY DROP</p>
      </div>
      <div className="menu-buttons">
        <button className="splash-start-btn menu-btn-full" onClick={() => setCurrentScreen(isAuthenticated ? 'eventEntrance' : 'password')}>🍶 イベント会場へ</button>
        <button className="splash-start-btn menu-btn-full" onClick={() => setCurrentScreen('mybook')}>📖 酒メモリへ</button>
        <a className="menu-site-link" href="https://tokyotc.com/sake/" target="_blank" rel="noopener noreferrer">オフィシャルサイト →</a>
      </div>
    </div>
  );

  // ===== イベント会場 入口（参加者 / 管理者の選択） =====
  const EventEntranceScreen = () => (
    <div className="screen home-screen event-entrance">
      <div className="header">
        <ChevronLeft size={24} onClick={() => setCurrentScreen('home')} />
        <h2>イベント会場</h2>
        <div style={{width:24}} />
      </div>
      {userName && (
        <div className="user-greeting"><p>ようこそ、<strong>{userName}</strong>さん</p></div>
      )}
      <div className="mode-selection">
        <div className="sake-icon-circle">
          <TokkuriSVG width={80} height={80} color="#2c3e50" />
        </div>
        <h3>ご利用区分の選択</h3>
        <button
          className="mode-btn btn-navy"
          onClick={() => {
            if (!userName) { setShowNameInput(true); }
            else { setMode('participant'); setCurrentScreen('sakeList'); }
          }}
        >参加者はこちら</button>
        <button
          className="mode-btn btn-outline-muted"
          style={{ marginTop: 12 }}
          onClick={handleTokkuriTap}
        >管理者画面へ</button>
        <button
          className="guide-link-btn"
          onClick={() => setShowGuide(true)}
        >📖 使い方ガイド</button>
      </div>
    </div>
  );

  // ===== マイ・酒メモリ（入口のみ・準備中） =====
  const MyBookScreen = () => (
    <div className="screen home-screen">
      <div className="header">
        <ChevronLeft size={24} onClick={() => setCurrentScreen('home')} />
        <h2>マイ・酒メモリ</h2>
        <div style={{width:24}} />
      </div>
      <div className="mode-selection" style={{ textAlign: 'center' }}>
        <div className="sake-icon-circle">
          <TokkuriSVG width={80} height={80} color="#2c3e50" />
        </div>
        <h3>準備中です</h3>
        <p style={{ color: '#888', lineHeight: 1.9, marginTop: 12 }}>
          自分専用の酒メモリ（プライベートで飲んだお酒の記録）は<br/>現在準備中です。近日公開予定です。
        </p>
      </div>
    </div>
  );

  // ===== 管理者画面 =====
  // 注意: Vision APIキーはVercelの環境変数 VISION_API_KEY で管理する（コードに直書きしない）
  const AdminScreen = () => {
    const [frontImage, setFrontImage] = useState(null);
    const [backImage, setBackImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showSakeList, setShowSakeList] = useState(false);
    const [showReportsManagement, setShowReportsManagement] = useState(false);
    const [allReports, setAllReports] = useState([]);
    const [adminSakes, setAdminSakes] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingSake, setEditingSake] = useState(null);
    const [eventNo, setEventNo] = useState(() => localStorage.getItem('lastEventNo') || '');
    const [saving, setSaving] = useState(false);
    const [savingMsg, setSavingMsg] = useState('登録しています...');
    const submitGuardRef = useRef(false);

    useEffect(() => {
      if (showSakeList) loadAdminSakes();
      if (showReportsManagement) loadAllReportsForAdmin();
    }, [showSakeList, showReportsManagement]);

    const loadAdminSakes = async () => {
      const data = await dbGet('sakes');
      setAdminSakes(data ? Object.values(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []);
    };

    const loadAllReportsForAdmin = async () => {
      const data = await dbGet('reports');
      if (!data) { setAllReports([]); return; }
      const reports = [];
      Object.keys(data).forEach(sakeId => {
        Object.keys(data[sakeId]).forEach(key => {
          reports.push({ ...data[sakeId][key], sakeId, key });
        });
      });
      setAllReports(reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    };

    const deleteReportAsAdmin = async (sakeId, reportKey) => {
      await dbRemove(`reports/${sakeId}/${reportKey}`);
      const sake = sakes.find(s => s.id === sakeId);
      if (sake) {
        const remaining = await loadReports(sakeId);
        if (remaining.length > 0) {
          const avg = remaining.reduce((s, r) => s + r.score, 0) / remaining.length;
          await saveSake({ ...sake, rating: avg, reportCount: remaining.length });
        } else {
          await saveSake({ ...sake, rating: 0, reportCount: 0 });
        }
      }
      await loadAllReportsForAdmin();
      await loadSakes();
      setDeleteConfirm(null);
      alert('✅ 評価を削除しました');
    };

    const compressImage = (base64Image, maxWidth = 800) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = base64Image;
      });
    };

    const handleImageUpload = async (type, event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const compressed = await compressImage(e.target.result);
          if (type === 'front') { setFrontImage(compressed); setAnalysisResult(null); }
          else setBackImage(compressed);
        };
        reader.readAsDataURL(file);
      }
    };

    const analyzeSake = async () => {
      if (!frontImage) { alert('表ラベルの写真を撮影してください'); return; }
      setAnalyzing(true);
      try {
        // サーバー（Gemini優先・Visionフォールバック）が返す整形済みレスポンス: { name, category, brewery, lines, source }
        const callVision = async (dataUrl) => {
          const res = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl.split(',')[1] })
          });
          const d = await res.json();
          if (d.error) throw new Error(d.error);
          return d;
        };
        const data = await callVision(frontImage);
        // 都道府県・酒米は裏ラベルに記載が多いため、表＋裏の行テキストをまとめて走査
        let lines = Array.isArray(data.lines) ? [...data.lines] : [];
        if (backImage) {
          try {
            const back = await callVision(backImage);
            if (Array.isArray(back.lines)) lines = [...lines, ...back.lines];
          } catch (e) { /* 裏面の読み取り失敗は無視して続行 */ }
        }
        lines = [...new Set(lines.map(l => (l || '').trim()).filter(Boolean))];
        const validCats = ['純米大吟醸','純米吟醸','特別純米','純米酒','大吟醸','吟醸','特別本醸造','本醸造','普通酒','その他','不明'];
        // ▼あなたの機能を維持：行テキストから都道府県・酒米を自動検出
        let detectedPref = '';
        for (const line of lines) { for (const p of ALL_PREFECTURES) { if (line.includes(p) && !detectedPref) detectedPref = p; } }
        let detectedRice = '';
        for (const line of lines) { for (const r of SAKE_RICE_OPTIONS) { if (line.includes(r) && !detectedRice) detectedRice = r; } }
        setAnalysisResult({
          name: (data.name || '').trim(),
          category: validCats.includes(data.category) ? data.category : '',
          brewery: (data.brewery || '').trim(),
          prefecture: detectedPref,
          sakeRice: detectedRice,
          lines,
          source: data.source || '',
        });
      } catch (error) {
        console.error('ラベル読み取りエラー:', error);
        alert('❌ 自動読み取りに失敗しました。お手数ですが手動で入力してください。');
        setAnalysisResult({ name: '', category: '', brewery: '', prefecture: '', sakeRice: '', lines: [] });
      }
      setAnalyzing(false);
    };

    const saveSakeEntry = async () => {
      if (!analysisResult.name.trim()) { alert('銘柄名を入力してください'); return; }
      if (!analysisResult.category) { alert('カテゴリーを選択してください'); return; }
      if (submitGuardRef.current) return;
      submitGuardRef.current = true;
      setSavingMsg('登録しています...');
      setSaving(true);
      try {
      const newSake = {
        id: Date.now().toString(),
        name: analysisResult.name.trim(),
        category: analysisResult.category,
        brewery: analysisResult.brewery.trim(),
        prefecture: (analysisResult.prefecture || '').trim(),
        sakeRice: analysisResult.sakeRice || '',
        frontImage,
        backImage,
        rating: 0,
        reportCount: 0,
        eventNo: eventNo !== '' ? Number(eventNo) : null,
        createdAt: new Date().toISOString()
      };
      await saveSake(newSake);
      if (eventNo !== '') localStorage.setItem('lastEventNo', eventNo);
      alert('✅ 登録が完了しました！\n\n📝 銘柄: ' + newSake.name + '\n🏷️ カテゴリー: ' + newSake.category + '\n🏭 蔵元: ' + newSake.brewery + (newSake.prefecture ? '\n📍 都道府県: ' + newSake.prefecture : '') + (newSake.sakeRice ? '\n🌾 酒米: ' + newSake.sakeRice : ''));
      setAnalysisResult(null); setFrontImage(null); setBackImage(null);
      } catch (e) {
        console.error('登録エラー:', e);
        alert('❌ 登録に失敗しました。もう一度お試しください。');
      } finally {
        setSaving(false);
        submitGuardRef.current = false;
      }
    };

    const deleteSakeEntry = async (sakeId) => {
      await dbRemove(`sakes/${sakeId}`);
      await dbRemove(`reports/${sakeId}`);
      setDeleteConfirm(null);
      await loadAdminSakes();
      await loadSakes();
    };

    const updateSakeEntry = async () => {
      if (!editingSake) return;
      if (submitGuardRef.current) return;
      submitGuardRef.current = true;
      setSavingMsg('更新しています...');
      setSaving(true);
      try {
        await saveSake(editingSake);
        await loadAdminSakes();
        await loadSakes();
        setEditingSake(null);
        alert('✅ 更新しました');
      } catch (e) {
        console.error('更新エラー:', e);
        alert('❌ 更新に失敗しました。もう一度お試しください。');
      } finally {
        setSaving(false);
        submitGuardRef.current = false;
      }
    };

    const categoryOptions = ['純米大吟醸','純米吟醸','特別純米','純米酒','大吟醸','吟醸','特別本醸造','本醸造','普通酒','その他','不明'];

    return (
      <div className="screen admin-screen">
        <div className="header">
          <ChevronLeft size={24} onClick={() => setCurrentScreen('home')} />
          <h2>【管理者】銘柄登録</h2>
          <div style={{width:24}} />
        </div>
        {!showSakeList && !showReportsManagement ? (
          <div className="admin-content">
            {!analysisResult ? (
              <div>
                <div className="scan-instruction">
                  <h3>日本酒のラベルを撮影</h3>
                  <p>ラベルから銘柄情報を自動読み取りします</p>
                </div>
                <div className="label-upload-section">
                  <div className="upload-box">
                    <input type="file" accept="image/*" id="front-upload" onChange={(e) => handleImageUpload('front', e)} style={{display:'none'}} />
                    <label htmlFor="front-upload" className="upload-label">
                      {frontImage ? <img src={frontImage} alt="Front" className="uploaded-image" /> : <div className="camera-placeholder"><Camera size={48} /></div>}
                    </label>
                    <p>表ラベル</p>
                  </div>
                  <div className="upload-box">
                    <input type="file" accept="image/*" id="back-upload" onChange={(e) => handleImageUpload('back', e)} style={{display:'none'}} />
                    <label htmlFor="back-upload" className="upload-label">
                      {backImage ? <img src={backImage} alt="Back" className="uploaded-image" /> : <div className="camera-placeholder"><Camera size={48} /></div>}
                    </label>
                    <p>裏ラベル（任意）</p>
                  </div>
                </div>
                <button className="analyze-btn" onClick={analyzeSake} disabled={analyzing || !frontImage}>
                  {analyzing ? '読み取り中...' : '📸 ラベルを読み取る'}
                </button>
                {analyzing && <div className="progress-indicator"><div className="spinner"></div><p>ラベルを解析中...</p></div>}
                <button className="manage-btn" onClick={() => setShowSakeList(true)}>📋 登録済み銘柄を管理</button>
                <button className="manage-btn" onClick={() => setShowReportsManagement(true)} style={{marginTop:'12px'}}>📝 全評価を管理</button>
              </div>
            ) : (
              <div className="confirmation-section">
                <h3>✅ 読み取り結果を確認してください</h3>
                <p className="confirmation-note">
                  {analysisResult.source === 'gemini'
                    ? 'AIがラベルを読み取りました。内容を確認・修正して登録してください。'
                    : analysisResult.source === 'vision'
                      ? '文字を読み取りました。下のテキストをタップして銘柄名・蔵元にセットしてください。'
                      : 'テキストをタップすると入力欄にセットされます'}
                </p>
                {analysisResult.lines && analysisResult.lines.length > 0 && (
                  <div className="ocr-lines-box">
                    <p className="ocr-lines-label">📋 読み取ったテキスト（タップして使用）</p>
                    <div className="ocr-lines-list">
                      {analysisResult.lines.map((line, i) => (
                        <div key={i} className="ocr-line-row">
                          <span className="ocr-line-text">{line}</span>
                          <div className="ocr-line-btns">
                            <button className="ocr-use-btn" onClick={() => setAnalysisResult({...analysisResult, name: line})}>銘柄名</button>
                            <button className="ocr-use-btn" onClick={() => setAnalysisResult({...analysisResult, brewery: line})}>蔵元</button>
                            <button className="ocr-use-btn" onClick={() => { const p = ALL_PREFECTURES.find(pp => line.includes(pp)); setAnalysisResult({...analysisResult, prefecture: p || analysisResult.prefecture}); }}>都道府県</button>
                            <button className="ocr-use-btn" onClick={() => { const r = SAKE_RICE_OPTIONS.find(rr => line.includes(rr)); setAnalysisResult({...analysisResult, sakeRice: r || line}); }}>酒米</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="result-form">
                  <div className="form-group">
                    <label>銘柄名 *</label>
                    <input type="text" value={analysisResult.name} onChange={(e) => setAnalysisResult({...analysisResult, name: e.target.value})} placeholder="上のテキストをタップ or 直接入力" />
                  </div>
                  <div className="form-group">
                    <label>特定名称酒 *</label>
                    <select value={analysisResult.category} onChange={(e) => setAnalysisResult({...analysisResult, category: e.target.value})}>
                      <option value="">選択してください</option>
                      {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>蔵元</label>
                    <input type="text" value={analysisResult.brewery} onChange={(e) => setAnalysisResult({...analysisResult, brewery: e.target.value})} placeholder="上のテキストをタップ or 直接入力" />
                  </div>
                  <div className="form-group">
                    <label>都道府県</label>
                    <PrefectureSelect value={analysisResult.prefecture} onChange={(e) => setAnalysisResult({...analysisResult, prefecture: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>酒米</label>
                    <RiceField value={analysisResult.sakeRice} onChange={(val) => setAnalysisResult({...analysisResult, sakeRice: val})} />
                  </div>
                  <div className="form-group">
                    <label>イベント回</label>
                    <input type="number" inputMode="numeric" min="1" value={eventNo} onChange={(e) => setEventNo(e.target.value.replace(/[^0-9]/g, ''))} placeholder="例：5（前回の値を記憶します）" />
                  </div>
                </div>
                <div className="confirmation-buttons">
                  <button className="save-btn" onClick={saveSakeEntry} disabled={saving}>
                    {saving ? '登録中...' : '💾 この内容で登録'}
                  </button>
                  <button className="cancel-btn" onClick={() => { setAnalysisResult(null); setFrontImage(null); setBackImage(null); }}>❌ キャンセル</button>
                </div>
              </div>
            )}
          </div>
        ) : showReportsManagement ? (
          <div className="admin-content">
            <div className="admin-list-header">
              <h3>全評価管理（{allReports.length}件）</h3>
              <button className="back-to-scan-btn" onClick={() => setShowReportsManagement(false)}>← 戻る</button>
            </div>
            <div className="admin-sake-list">
              {allReports.length === 0 ? (
                <div className="empty-list"><p>まだ評価が投稿されていません</p></div>
              ) : allReports.map((report, idx) => (
                <div key={idx} className="admin-report-card">
                  <div className="admin-report-header">
                    <div>
                      <h4>{report.sakeName}</h4>
                      <p className="admin-report-meta">{report.userName} - {new Date(report.timestamp).toLocaleString('ja-JP')}</p>
                    </div>
                    <div className="admin-report-score">{report.score}点</div>
                  </div>
                  {report.notes && <p className="admin-report-notes">{report.notes}</p>}
                  <button className="delete-btn-small" onClick={() => setDeleteConfirm({type: 'report', sakeId: report.sakeId, key: report.key, name: `${report.sakeName}の評価（${report.userName}）`})}>🗑️ 削除</button>
                </div>
              ))}
            </div>
            {deleteConfirm && deleteConfirm.type === 'report' && (
              <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>⚠️ 削除の確認</h3>
                  <p className="modal-text"><strong>{deleteConfirm.name}</strong></p>
                  <p className="modal-warning">この評価を削除してもよろしいですか？</p>
                  <div className="modal-buttons">
                    <button className="modal-btn delete-confirm-btn" onClick={() => deleteReportAsAdmin(deleteConfirm.sakeId, deleteConfirm.key)}>削除する</button>
                    <button className="modal-btn cancel-confirm-btn" onClick={() => setDeleteConfirm(null)}>キャンセル</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-content">
            <div className="admin-list-header">
              <h3>登録済み銘柄一覧</h3>
              <button className="back-to-scan-btn" onClick={() => setShowSakeList(false)}>← 戻る</button>
            </div>
            <div className="admin-sake-list">
              {adminSakes.length === 0 ? (
                <div className="empty-list"><p>まだ銘柄が登録されていません</p></div>
              ) : adminSakes.map(sake => (
                <div key={sake.id} className="admin-sake-card">
                  <div className="admin-sake-info">
                    <h4>{sake.name}</h4>
                    <p>{sake.category}</p>
                    <p>{sake.brewery}</p>
                    {(sake.prefecture || sake.sakeRice) && <p style={{fontSize:'12px',color:'#888'}}>{[sake.prefecture, sake.sakeRice].filter(Boolean).join(' / ')}</p>}
                  </div>
                  <div className="admin-sake-actions">
                    <button className="edit-btn-small" onClick={() => setEditingSake({...sake})}>✏️ 編集</button>
                    <button className="delete-btn-small" onClick={() => setDeleteConfirm({id: sake.id, name: sake.name})}>🗑️ 削除</button>
                  </div>
                </div>
              ))}
            </div>
            {editingSake && (
              <div className="modal-overlay" onClick={() => setEditingSake(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>✏️ 銘柄情報の編集</h3>
                  <div className="result-form">
                    <div className="form-group"><label>銘柄名</label><input type="text" value={editingSake.name} onChange={(e) => setEditingSake({...editingSake, name: e.target.value})} /></div>
                    <div className="form-group"><label>特定名称酒</label>
                      <select value={editingSake.category} onChange={(e) => setEditingSake({...editingSake, category: e.target.value})}>
                        <option value="">選択してください</option>
                        {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>蔵元</label><input type="text" value={editingSake.brewery || ''} onChange={(e) => setEditingSake({...editingSake, brewery: e.target.value})} /></div>
                    <div className="form-group"><label>都道府県</label><PrefectureSelect value={editingSake.prefecture} onChange={(e) => setEditingSake({...editingSake, prefecture: e.target.value})} /></div>
                    <div className="form-group"><label>酒米</label><RiceField value={editingSake.sakeRice} onChange={(val) => setEditingSake({...editingSake, sakeRice: val})} /></div>
                    <div className="form-group"><label>イベント回</label><input type="number" inputMode="numeric" min="1" value={editingSake.eventNo ?? ''} onChange={(e) => setEditingSake({...editingSake, eventNo: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, ''))})} placeholder="例：5" /></div>
                  </div>
                  <div className="modal-buttons">
                    <button className="modal-btn save-btn" onClick={updateSakeEntry} disabled={saving}>{saving ? '更新中...' : '更新'}</button>
                    <button className="modal-btn cancel-confirm-btn" onClick={() => setEditingSake(null)}>キャンセル</button>
                  </div>
                </div>
              </div>
            )}
            {deleteConfirm && (
              <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>⚠️ 削除の確認</h3>
                  <p className="modal-text"><strong>{deleteConfirm.name}</strong><br/>この銘柄を削除してもよろしいですか？</p>
                  <p className="modal-warning">※関連する評価レポートも削除されます。</p>
                  <div className="modal-buttons">
                    <button className="modal-btn delete-confirm-btn" onClick={() => deleteSakeEntry(deleteConfirm.id)}>削除する</button>
                    <button className="modal-btn cancel-confirm-btn" onClick={() => setDeleteConfirm(null)}>キャンセル</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {saving && (
          <div className="submitting-overlay">
            <div className="spinner"></div>
            <p>{savingMsg}</p>
          </div>
        )}
        <BottomNav screen="admin" />
      </div>
    );
  };

  // ===== 銘柄一覧 =====
  const SakeListScreen = () => {
    const categories = [
      {id:'all',name:'すべて'},{id:'純米大吟醸',name:'純米大吟醸'},{id:'純米吟醸',name:'純米吟醸'},
      {id:'特別純米',name:'特別純米'},{id:'純米酒',name:'純米酒'},{id:'大吟醸',name:'大吟醸'},
      {id:'吟醸',name:'吟醸'},{id:'特別本醸造',name:'特別本醸造'},{id:'本醸造',name:'本醸造'},
      {id:'普通酒',name:'普通酒'},{id:'その他',name:'その他'},{id:'不明',name:'不明'}
    ];
    const knownCats = ['純米大吟醸','純米吟醸','特別本醸造','大吟醸','吟醸','純米酒','特別純米','本醸造','普通酒','その他','不明'];
    const regionOf = (pref) => {
      for (const [region, prefs] of Object.entries(PREFECTURES_BY_REGION)) {
        if (prefs.includes(pref)) return region;
      }
      return '';
    };
    const matchesCategory = (s) => filterCategory === 'all' ? true
      : filterCategory === 'その他' ? !knownCats.includes(s.category)
      : s.category === filterCategory;
    const filteredSakes = sakes.filter(s =>
      matchesCategory(s)
      && (filterRegion === 'all' || regionOf(s.prefecture) === filterRegion)
      && (filterRice === 'all' || (s.sakeRice || '') === filterRice)
      && (filterEvent === 'all' || s.eventNo === filterEvent)
    );
    const presentRegions = Object.keys(PREFECTURES_BY_REGION).filter(r => sakes.some(s => regionOf(s.prefecture) === r));
    const presentEvents = [...new Set(sakes.map(s => s.eventNo).filter(v => v != null && v !== ''))].sort((a, b) => a - b);
    const riceOrder = [...SAKE_RICE_OPTIONS, RICE_OTHER, RICE_UNKNOWN];
    const presentRices = [...new Set(sakes.map(s => s.sakeRice).filter(Boolean))]
      .sort((a, b) => {
        const ia = riceOrder.indexOf(a), ib = riceOrder.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
      });

    return (
      <div className="screen sake-list-screen">
        <div className="header">
          <ChevronLeft size={24} onClick={() => setCurrentScreen('home')} />
          <h2>銘柄を選択</h2>
          <Search size={24} style={{opacity:0}} />
        </div>
        <div className="category-tabs">
          {categories.map(cat => (
            <button key={cat.id} className={'category-tab ' + (filterCategory === cat.id ? 'active' : '')} onClick={() => setFilterCategory(cat.id)}>{cat.name}</button>
          ))}
        </div>
        {presentRegions.length > 0 && (
          <div className="category-tabs">
            <button className={'category-tab ' + (filterRegion === 'all' ? 'active' : '')} onClick={() => setFilterRegion('all')}>地域：すべて</button>
            {presentRegions.map(r => (
              <button key={r} className={'category-tab ' + (filterRegion === r ? 'active' : '')} onClick={() => setFilterRegion(r)}>{r}</button>
            ))}
          </div>
        )}
        {presentRices.length > 0 && (
          <div className="category-tabs">
            <button className={'category-tab ' + (filterRice === 'all' ? 'active' : '')} onClick={() => setFilterRice('all')}>酒米：すべて</button>
            {presentRices.map(r => (
              <button key={r} className={'category-tab ' + (filterRice === r ? 'active' : '')} onClick={() => setFilterRice(r)}>{r}</button>
            ))}
          </div>
        )}
        {presentEvents.length > 0 && (
          <div className="category-tabs">
            <button className={'category-tab ' + (filterEvent === 'all' ? 'active' : '')} onClick={() => setFilterEvent('all')}>回：すべて</button>
            {presentEvents.map(n => (
              <button key={n} className={'category-tab ' + (filterEvent === n ? 'active' : '')} onClick={() => setFilterEvent(n)}>第{n}回</button>
            ))}
          </div>
        )}
        <div className="sake-list">
          {filteredSakes.length === 0 ? (
            <div className="no-reports" style={{marginTop:40}}><p>まだ銘柄が登録されていません</p></div>
          ) : filteredSakes.map(sake => (
            <div key={sake.id} className="sake-card" onClick={() => { setSelectedSake(sake); setCurrentScreen('sakeDetail'); }}>
              <div className="sake-images-container">
                <div className="sake-image">
                  {sake.frontImage ? <img src={sake.frontImage} alt={sake.name + ' 表'} /> : <div className="placeholder-image"></div>}
                  <span className="image-label">表</span>
                </div>
                {sake.backImage && (
                  <div className="sake-image">
                    <img src={sake.backImage} alt={sake.name + ' 裏'} />
                    <span className="image-label">裏</span>
                  </div>
                )}
              </div>
              <div className="sake-info">
                <span className="sake-category">{sake.category}</span>
                {sake.reportCount > 0 && <span className="report-badge">評価済み</span>}
                <h3>{sake.name}</h3>
                <p>{sake.brewery}</p>
                {(sake.prefecture || sake.sakeRice) && <p style={{fontSize:'12px',color:'#999',margin:'2px 0 0'}}>{[sake.prefecture, sake.sakeRice].filter(Boolean).join(' / ')}</p>}
                {sake.rating > 0 && <div className="sake-rating">⭐ {sake.rating.toFixed(1)}</div>}
              </div>
              <ChevronLeft size={20} style={{transform:'rotate(180deg)', flexShrink:0}} />
            </div>
          ))}
        </div>
        <BottomNav screen="sakeList" />
      </div>
    );
  };

  // ===== 銘柄詳細 =====
  const SakeDetailScreen = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (selectedSake?.id) {
        setLoading(true);
        loadReports(selectedSake.id).then(r => { setReports(r); setLoading(false); });
      }
    }, [selectedSake?.id]);

    const getFinishLabel = (v) => v === 1 ? '短い' : v === 2 ? '中程度' : '長い';

    return (
      <div className="screen sake-detail-screen">
        <div className="header">
          <ChevronLeft size={24} onClick={() => setCurrentScreen('sakeList')} />
          <h2>酒の詳細</h2>
          <div style={{width:24}} />
        </div>
        <div className="detail-content">
          <div className="sake-detail-header">
            <div className="sake-preview-container">
              {selectedSake?.frontImage && <div className="sake-preview-small"><img src={selectedSake.frontImage} alt="表" /></div>}
              {selectedSake?.backImage && <div className="sake-preview-small"><img src={selectedSake.backImage} alt="裏" /></div>}
            </div>
            <h3 className="sake-name">{selectedSake?.name}</h3>
            <p className="sake-meta">{selectedSake?.category} / {selectedSake?.brewery}{selectedSake?.prefecture ? '（' + selectedSake.prefecture + '）' : ''}</p>
            {selectedSake?.sakeRice && <p className="sake-meta">🌾 酒米: {selectedSake.sakeRice}</p>}
            {selectedSake?.rating > 0 && (
              <div className="sake-rating-large">⭐ {selectedSake.rating.toFixed(1)}点<span className="report-count">（{reports.length}件の評価）</span></div>
            )}
          </div>
          <KuramotoCard sake={selectedSake} />
          <div className="reports-section">
            <h4>📝 みんなの評価</h4>
            {loading ? <div className="loading-reports">読み込み中...</div>
              : reports.length === 0 ? (
                <div className="no-reports">
                  <p>まだ評価がありません</p>
                  <button className="add-report-btn" onClick={() => setCurrentScreen('tastingForm')}>最初の評価を投稿する</button>
                </div>
              ) : (
                <div className="reports-list">
                  {reports.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((report, i) => (
                    <div key={i} className="report-detail-card">
                      <div className="report-detail-header">
                        <div className="user-avatar-small">{report.userName?.charAt(0) || 'U'}</div>
                        <div className="report-user-info">
                          <strong>{report.userName}</strong>
                          <span className="report-date">{new Date(report.timestamp).toLocaleDateString('ja-JP')}</span>
                        </div>
                        <div className="report-score-badge">{report.score}点</div>
                      </div>
                      <div className="report-evaluations">
                        {[{l:'甘辛度',v:report.sweetness,m:5},{l:'香り',v:report.aroma,m:5},{l:'濃淡',v:report.body,m:5},{l:'酸味',v:report.acidity,m:5}].map(e => (
                          <div key={e.l} className="eval-row">
                            <span className="eval-label">{e.l}:</span>
                            <div className="eval-stars">
                              {[...Array(e.m)].map((_, i) => (
                                <span key={i} className={i < e.v ? 'star-filled' : 'star-empty'}>⭐</span>
                              ))}
                            </div>
                            <span className="eval-value">{e.v}/{e.m}</span>
                          </div>
                        ))}
                        <div className="eval-row">
                          <span className="eval-label">余韻:</span>
                          <div className="eval-stars">
                            {[...Array(3)].map((_, i) => (
                              <span key={i} className={i < report.finish ? 'star-filled' : 'star-empty'}>⭐</span>
                            ))}
                          </div>
                          <span className="eval-value">{getFinishLabel(report.finish)}</span>
                        </div>
                      </div>
                      <div className="report-attributes">
                        {report.clarity && <span className="attr-badge">{report.clarity}</span>}
                        {report.temperature && <span className="attr-badge">{report.temperature}</span>}
                      </div>
                      {report.notes && <div className="report-notes"><p>{report.notes}</p></div>}
                    </div>
                  ))}
                </div>
              )}
          </div>
          <button className="floating-add-report-btn" onClick={() => setCurrentScreen('tastingForm')}>✏️ 評価を追加</button>
        </div>
      </div>
    );
  };

  // ===== テイスティングフォーム =====
  const TastingFormScreen = () => {
    const [formData, setFormData] = useState(
      editingReport || { sweetness:0, aroma:0, body:0, acidity:0, finish:0, clarity:'', temperature:'', score:0, notes:'' }
    );
    const [submitting, setSubmitting] = useState(false);
    const submitGuardRef = useRef(false);

    const submitReport = async () => {
      if (submitGuardRef.current) return;
      submitGuardRef.current = true;
      setSubmitting(true);
      try {
        if (editingReportKey) {
          await dbRemove(`reports/${selectedSake.id}/${editingReportKey}`);
        }
        const report = {
          ...formData,
          sakeId: selectedSake.id,
          sakeName: selectedSake.name,
          userName: userName || 'ゲスト',
          timestamp: new Date().toISOString()
        };
        await saveReport(selectedSake.id, report);
        const reports = await loadReports(selectedSake.id);
        const avg = reports.reduce((s, r) => s + r.score, 0) / reports.length;
        await saveSake({ ...selectedSake, rating: avg, reportCount: reports.length });
        setEditingReport(null);
        setEditingReportKey(null);
        alert(editingReportKey ? '評価を更新しました！' : '評価を送信しました！');
        setCurrentScreen(editingReportKey ? 'mypage' : 'sakeDetail');
      } catch (error) {
        console.error('Submit error:', error);
        alert('❌ 送信に失敗しました。もう一度お試しください。');
      } finally {
        setSubmitting(false);
        submitGuardRef.current = false;
      }
    };

    return (
      <div className="screen tasting-form-screen">
        <div className="header">
          <ChevronLeft size={24} onClick={() => { setEditingReport(null); setEditingReportKey(null); setCurrentScreen(editingReportKey ? 'mypage' : 'sakeDetail'); }} />
          <h2>{editingReportKey ? '評価を編集' : '酒の記憶'}</h2>
          <div style={{width:24}} />
        </div>
        <div className="form-content">
          <div className="sake-preview-container">
            {selectedSake?.frontImage && (
              <div className="sake-preview">
                <img src={selectedSake.frontImage} alt="表ラベル" />
                <span className="preview-label">表ラベル</span>
              </div>
            )}
            {selectedSake?.backImage && (
              <div className="sake-preview">
                <img src={selectedSake.backImage} alt="裏ラベル" />
                <span className="preview-label">裏ラベル</span>
              </div>
            )}
          </div>
          <h3 className="sake-name">{selectedSake?.name}</h3>
          <p className="sake-meta">{selectedSake?.category} {selectedSake?.brewery}{selectedSake?.prefecture ? '（' + selectedSake.prefecture + '）' : ''}{selectedSake?.sakeRice ? ' / 🌾' + selectedSake.sakeRice : ''}</p>
          <div className="evaluation-section">
            <h4>味の構成</h4>
            <p className="section-note">各項目、星をタップして選んでください。</p>
            <StarRating value={formData.sweetness} maxStars={5} onChange={v => setFormData({...formData, sweetness: v})} label="甘辛度" leftLabel="甘" rightLabel="辛" />
            <StarRating value={formData.aroma} maxStars={5} onChange={v => setFormData({...formData, aroma: v})} label="香りの強さ" leftLabel="穏やか" rightLabel="華やか" />
            <StarRating value={formData.body} maxStars={5} onChange={v => setFormData({...formData, body: v})} label="濃淡" leftLabel="淡麗" rightLabel="濃厚" />
            <StarRating value={formData.acidity} maxStars={5} onChange={v => setFormData({...formData, acidity: v})} label="酸味" leftLabel="弱い" rightLabel="強い" />
            <StarRating value={formData.finish} maxStars={3} onChange={v => setFormData({...formData, finish: v})} label="余韻（後味）" leftLabel="短い" rightLabel="長い" />
          </div>
          <div className="state-section">
            <h4>状態・温度</h4>
            <p className="section-note">それぞれ選択してください。</p>
            <div className="option-group">
              <p className="option-label">にごりの状態</p>
              <div className="button-group">
                {['透明','うっすら濁り','白濁','その他'].map(o => (
                  <button key={o} type="button" className={'option-btn ' + (formData.clarity === o ? 'active' : '')} onClick={() => setFormData({...formData, clarity: o})}>{o}</button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <p className="option-label">最適な温度帯</p>
              <div className="button-group">
                {['冷','常温','燗'].map(o => (
                  <button key={o} type="button" className={'option-btn ' + (formData.temperature === o ? 'active' : '')} onClick={() => setFormData({...formData, temperature: o})}>{o}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="score-section">
            <h4>推し度 (0-100)</h4>
            <div className="score-input-wrapper">
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.score === 0 ? '' : formData.score} 
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  const num = val === '' ? 0 : Math.min(100, Math.max(0, parseInt(val)));
                  setFormData({...formData, score: num});
                }}
                onBlur={e => {
                  if (e.target.value === '') setFormData({...formData, score: 0});
                }}
                placeholder="0"
                className="score-input" 
              />
              <span className="score-unit">点</span>
            </div>
            <p className="score-note">純粋な“あなたの推し度”を点数にしてください（100点満点中）。銘柄の一般的な評価ではなく、あなたの好みへのフィット度でOKです。</p>
          </div>
          <div className="notes-section">
            <h4>テイスティングメモ</h4>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="若い果実（桃・梨）、膨らみなど、料理名など、自由にどうぞ。" rows="4" />
          </div>
          <button className="submit-btn" onClick={submitReport} disabled={submitting}>
            {submitting ? '送信中...' : (editingReportKey ? '✏️ 評価を更新する' : '✏️ 評価を送信する')}
          </button>
          {submitting && (
            <div className="submitting-overlay">
              <div className="spinner"></div>
              <p>評価を送信しています...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== マイページ =====
  const MyPageScreen = () => {
    const [myReports, setMyReports] = useState([]);
    const [deleteConfirmReport, setDeleteConfirmReport] = useState(null);

    useEffect(() => { loadMyReports(); }, []);

    const loadMyReports = async () => {
      const allReports = await loadAllReports();
      const filtered = allReports
        .filter(r => r && r.userName === userName)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setMyReports(filtered);
    };

    const handleEditReport = (report) => {
      const sake = sakes.find(s => s.id === report.sakeId);
      if (sake) {
        setSelectedSake(sake);
        setEditingReport(report);
        setEditingReportKey(report.key);
        setCurrentScreen('tastingForm');
      } else {
        alert('この銘柄が見つかりません');
      }
    };

    const handleDeleteReport = async (report) => {
      await dbRemove(`reports/${report.sakeId}/${report.key}`);
      const sake = sakes.find(s => s.id === report.sakeId);
      if (sake) {
        const remaining = await loadReports(report.sakeId);
        if (remaining.length > 0) {
          const avg = remaining.reduce((s, r) => s + r.score, 0) / remaining.length;
          await saveSake({ ...sake, rating: avg, reportCount: remaining.length });
        } else {
          await saveSake({ ...sake, rating: 0, reportCount: 0 });
        }
      }
      await loadMyReports();
      await loadSakes();
      setDeleteConfirmReport(null);
      alert('✅ 評価を削除しました');
    };

    return (
      <div className="screen mypage-screen">
        <div className="header dark"><h2>マイページ</h2></div>
        <div className="mypage-content">
          <div className="user-profile">
            <div className="user-avatar-large">{userName?.charAt(0) || 'U'}</div>
            <h3>{userName || 'ゲスト'}</h3>
            <p className="user-stats">{myReports.length}件の評価</p>
            <button className="edit-name-btn" onClick={() => setShowNameInput(true)}>名前を変更</button>
          </div>
          <div className="my-reports-section">
            <h4>📝 あなたの評価</h4>
            {myReports.length === 0 ? (
              <div className="no-reports"><p>まだ評価を投稿していません</p></div>
            ) : (
              <div className="my-reports-list">
                {myReports.map((report, i) => (
                  <div key={i} className="my-report-card">
                    <div className="my-report-header">
                      <h4>{report.sakeName}</h4>
                      <span className="my-report-score">{report.score}点</span>
                    </div>
                    <p className="my-report-date">{new Date(report.timestamp).toLocaleDateString('ja-JP', {year:'numeric',month:'long',day:'numeric'})}</p>
                    {report.notes && <p className="my-report-notes">{report.notes}</p>}
                    <div className="my-report-actions">
                      <button className="edit-report-btn" onClick={() => handleEditReport(report)}>✏️ 編集</button>
                      <button className="delete-report-btn" onClick={() => setDeleteConfirmReport(report)}>🗑️ 削除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <BottomNav screen="mypage" />
        {deleteConfirmReport && (
          <div className="modal-overlay" onClick={() => setDeleteConfirmReport(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>⚠️ 削除の確認</h3>
              <p className="modal-text"><strong>{deleteConfirmReport.sakeName}</strong>の評価（{deleteConfirmReport.score}点）</p>
              <p className="modal-warning">この評価を削除してもよろしいですか？</p>
              <div className="modal-buttons">
                <button className="modal-btn delete-confirm-btn" onClick={() => handleDeleteReport(deleteConfirmReport)}>削除する</button>
                <button className="modal-btn cancel-confirm-btn" onClick={() => setDeleteConfirmReport(null)}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== みんなの記録 =====
  const CommunityScreen = () => {
    const [allReports, setAllReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ranking');
    const [filterEventNo, setFilterEventNo] = useState('all');

    useEffect(() => {
      (async () => { setLoading(true); setAllReports(await loadAllReports()); setLoading(false); })();
    }, []);

    const totalReports = allReports.length;
    const totalParticipants = [...new Set(allReports.map(r => r.userName))].length;
    const overallAvg = totalReports > 0 ? (allReports.reduce((s, r) => s + (r.score||0), 0) / totalReports).toFixed(1) : '-';

    const sakeMap = {};
    allReports.forEach(r => {
      if (!sakeMap[r.sakeId]) sakeMap[r.sakeId] = { name: r.sakeName, scores: [], sakeId: r.sakeId };
      sakeMap[r.sakeId].scores.push(r.score || 0);
    });
    const sakeRanking = Object.values(sakeMap)
      .map(s => ({...s, avg: s.scores.reduce((a,b) => a+b, 0) / s.scores.length, count: s.scores.length}))
      .sort((a,b) => b.avg - a.avg);
    const presentEventsC = [...new Set(sakes.map(s => s.eventNo).filter(v => v != null && v !== ''))].sort((a, b) => a - b);
    const filteredRanking = filterEventNo === 'all' ? sakeRanking : sakeRanking.filter(sake => { const sd = sakes.find(s => s.id === sake.sakeId); return sd && sd.eventNo === filterEventNo; });

    const pMap = {};
    allReports.forEach(r => {
      const n = r.userName || 'ゲスト';
      if (!pMap[n]) pMap[n] = { name: n, count: 0, total: 0 };
      pMap[n].count++; pMap[n].total += (r.score || 0);
    });
    const pRanking = Object.values(pMap)
      .map(p => ({...p, avg: (p.total / p.count).toFixed(1)}))
      .sort((a,b) => b.count - a.count);

    const medals = ['🥇','🥈','🥉'];
    const medalColors = ['#FFD700','#C0C0C0','#CD7F32'];

    const getRank = (arr, idx, key) => {
      let rank = 1;
      for (let i = 0; i < idx; i++) {
        if (arr[i][key] !== arr[idx][key]) rank = i + 2;
      }
      if (idx > 0 && arr[idx-1][key] === arr[idx][key]) {
        for (let i = idx - 1; i >= 0; i--) {
          if (arr[i][key] === arr[idx][key]) rank = i + 1;
          else break;
        }
      }
      return rank;
    };

    return (
      <div className="screen community-screen">
        <div className="header"><h2>みんなの記録</h2></div>
        {loading ? (
          <div className="community-loading"><div className="spinner"></div><p>データを読み込み中...</p></div>
        ) : totalReports === 0 ? (
          <div className="community-empty">
            <TokkuriSVG width={60} height={60} color="#ccc" />
            <p style={{marginTop:16,color:'#999',fontSize:16}}>まだ記録がありません</p>
            <p style={{color:'#bbb',fontSize:13}}>銘柄を評価すると、ここに統計が表示されます</p>
          </div>
        ) : (
          <div className="community-content">
            <div className="stats-row">
              <div className="stat-card"><div className="stat-icon">🍶</div><div className="stat-value">{sakeRanking.length}</div><div className="stat-label">銘柄数</div></div>
              <div className="stat-card"><div className="stat-icon">📝</div><div className="stat-value">{totalReports}</div><div className="stat-label">評価数</div></div>
              <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-value">{totalParticipants}</div><div className="stat-label">参加者</div></div>
              <div className="stat-card"><div className="stat-icon">⭐</div><div className="stat-value">{overallAvg}</div><div className="stat-label">平均点</div></div>
            </div>
            <h3 className="ranking-heading">🏆 人気ランキング</h3>
            {presentEventsC.length > 0 && (
              <div className="category-tabs">
                <button className={'category-tab ' + (filterEventNo === 'all' ? 'active' : '')} onClick={() => setFilterEventNo('all')}>回：すべて</button>
                {presentEventsC.map(n => (
                  <button key={n} className={'category-tab ' + (filterEventNo === n ? 'active' : '')} onClick={() => setFilterEventNo(n)}>第{n}回</button>
                ))}
              </div>
            )}
            <div className="ranking-list">
              {filteredRanking.map((sake, idx) => {
                const sd = sakes.find(s => s.id === sake.sakeId);
                const rank = getRank(filteredRanking, idx, 'avg');
                const realRank = rank - 1;
                return (
                  <div key={sake.sakeId} className={'ranking-card' + (realRank < 3 ? ' medal' : '')} style={realRank < 3 ? {borderLeft:'4px solid '+medalColors[realRank]} : {}} onClick={() => { if(sd){ setSelectedSake(sd); setCurrentScreen('sakeDetail'); } }}>
                    <div className="ranking-pos">{realRank < 3 ? <span style={{fontSize:24}}>{medals[realRank]}</span> : <span className="ranking-num">{rank}</span>}</div>
                    <div className="ranking-img">{sd?.frontImage ? <img src={sd.frontImage} alt={sake.name} /> : <span>🍶</span>}</div>
                    <div className="ranking-info"><h4>{sake.name}</h4><p>{sake.count}件の評価</p></div>
                    <div className="ranking-score"><span className="ranking-score-val">{sake.avg.toFixed(1)}</span><span className="ranking-score-unit">点</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <BottomNav screen="community" />
      </div>
    );
  };

  // ===== ボトムナビ =====
  const BottomNav = ({ screen }) => (
    <div className="bottom-nav">
      <div className={'nav-item ' + (screen === 'home' ? 'active' : '')} onClick={() => setCurrentScreen('home')}><Home size={24} /><span>ホーム</span></div>
      <div className={'nav-item ' + (screen === 'sakeList' ? 'active' : '')} onClick={() => setCurrentScreen('sakeList')}><Clipboard size={24} /><span>銘柄選択</span></div>
      <div className={'nav-item ' + (screen === 'community' ? 'active' : '')} onClick={() => setCurrentScreen('community')}><Trophy size={24} /><span>みんなの記録</span></div>
      <div className={'nav-item ' + (screen === 'mypage' ? 'active' : '')} onClick={() => setCurrentScreen('mypage')}><User size={24} /><span>マイページ</span></div>
    </div>
  );

  // ===== レンダリング =====
  return (
    <div className="sake-app">
      {currentScreen === 'password' && <PasswordScreen />}
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'mybook' && <MyBookScreen />}
      {isAuthenticated && currentScreen === 'eventEntrance' && <EventEntranceScreen />}
      {isAuthenticated && currentScreen === 'admin' && <AdminScreen />}
      {isAuthenticated && currentScreen === 'sakeList' && <SakeListScreen />}
      {isAuthenticated && currentScreen === 'sakeDetail' && <SakeDetailScreen />}
      {isAuthenticated && currentScreen === 'tastingForm' && <TastingFormScreen />}
      {isAuthenticated && currentScreen === 'mypage' && <MyPageScreen />}
      {isAuthenticated && currentScreen === 'community' && <CommunityScreen />}
      {showNameInput && <NameInputModal />}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content guide-modal" onClick={e => e.stopPropagation()}>
            <h3>📖 使い方ガイド</h3>
            <ol className="guide-steps">
              <li><strong>「参加者はこちら」</strong>から、会場の酒リストへ進みます。</li>
              <li>飲んだお酒を選び、<strong>星</strong>（甘辛度・香りなど）と<strong>推し度の点数</strong>をつけて送信します。</li>
              <li><strong>「みんなの記録」</strong>で、人気ランキングをみんなで楽しめます。</li>
              <li>一度送信した評価は、画面下の「マイページ」を開き、該当のお酒の「✏️ 編集」ボタンから修正できます（削除も同じ場所からできます）。</li>
            </ol>
            <p className="guide-note">※お名前は最初に一度だけ設定します。</p>
            <button className="modal-btn save-btn" onClick={() => setShowGuide(false)}>とじる</button>
          </div>
        </div>
      )}
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
.sake-app{font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;height:100vh;overflow:hidden}
.kuramoto-card{margin:0 16px 16px;background:#1a4d7a;border-radius:16px;padding:20px;color:#f5f0e8;box-shadow:0 4px 16px rgba(26,77,122,0.25);text-align:left}
.kuramoto-label{display:inline-block;font-size:11px;letter-spacing:3px;border:1px solid rgba(245,240,232,0.5);border-radius:4px;padding:2px 8px;margin-bottom:10px;color:rgba(245,240,232,0.85)}
.kuramoto-name{font-size:20px;font-weight:600;letter-spacing:2px;margin-bottom:4px}
.kuramoto-meta{font-size:12px;color:rgba(245,240,232,0.75);margin-bottom:10px}
.kuramoto-story{font-size:13px;line-height:1.8;margin-bottom:14px}
.kuramoto-links{display:flex;flex-wrap:wrap;gap:10px}
.kuramoto-link-btn{display:inline-block;padding:10px 18px;background:rgba(245,240,232,0.95);color:#1a4d7a;border-radius:24px;font-size:13px;font-weight:600;text-decoration:none}
.kuramoto-link-btn:active{transform:scale(0.97)}
.splash-screen{background:#16365c !important;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center}
.splash-screen::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background-image:radial-gradient(circle at 25% 25%,rgba(255,255,255,0.05) 2%,transparent 2%),radial-gradient(circle at 75% 75%,rgba(255,255,255,0.05) 2%,transparent 2%);background-size:60px 60px;opacity:0.5}
.splash-content{text-align:center;margin-bottom:60px;position:relative;z-index:1}
.sake-logo{margin-bottom:40px}
.logo-circle{width:280px;height:280px;background:#f5f0e8;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;position:relative}
.logo-text{font-size:56px;font-weight:700;color:#1a4d7a;letter-spacing:8px}
.tokkuri-container{margin-bottom:20px;display:flex;align-items:center;justify-content:center}
.logo-dots{display:flex;gap:12px;margin-top:20px;justify-content:center}
.logo-dots span{width:12px;height:12px;background:#9db4c8;border-radius:50%}
.app-title{font-size:48px;font-weight:300;color:white;letter-spacing:12px;margin-bottom:8px;font-family:'Times New Roman',serif}
.app-subtitle{font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:4px;font-family:'Times New Roman',serif}
.splash-start-btn{padding:16px 48px;background:rgba(255,255,255,0.9);color:#1a4d7a;border:none;border-radius:50px;font-size:18px;font-weight:600;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 16px rgba(0,0,0,0.2);position:relative;z-index:1}
.splash-start-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.3)}
        .menu-buttons{display:flex;flex-direction:column;gap:14px;align-items:center;width:100%;max-width:340px;padding:0 24px;position:relative;z-index:1}
        .menu-btn-full{width:100%;padding:16px}
        .menu-site-link{margin-top:6px;color:rgba(255,255,255,0.85);font-size:14px;text-decoration:underline;text-underline-offset:3px;letter-spacing:1px}
        .menu-settings{position:absolute;top:16px;left:16px;color:rgba(255,255,255,0.7);z-index:5;cursor:pointer}
.password-box{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:16px;padding:0 32px;width:100%;max-width:360px}
.password-label{color:rgba(255,255,255,0.9);font-size:14px;letter-spacing:3px;margin-bottom:4px}
.password-input{width:100%;padding:14px 20px;background:rgba(255,255,255,0.95);border:none;border-radius:12px;font-size:16px;color:#1a4d7a;text-align:center;letter-spacing:4px;outline:none;box-shadow:0 4px 16px rgba(0,0,0,0.15)}
.password-input::placeholder{color:#9db4c8;letter-spacing:2px}
.password-input:focus{box-shadow:0 4px 20px rgba(0,0,0,0.25)}
.password-error{color:#ffd1d1;font-size:13px;margin-top:-4px;letter-spacing:1px}
.password-box.shake{animation:shake 0.4s ease-in-out}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
.screen{height:100vh;overflow-y:auto;background:linear-gradient(135deg,#f5f0e8 0%,#fde8d9 100%)}
        .home-top{background-color:#16365c !important;background-image:radial-gradient(circle at 25% 25%,rgba(255,255,255,0.05) 2%,transparent 2%),radial-gradient(circle at 75% 75%,rgba(255,255,255,0.05) 2%,transparent 2%) !important;background-size:60px 60px}
        .home-top .header h2{color:#efe3c8;font-family:Georgia,'Times New Roman',serif;font-weight:400;letter-spacing:4px}
        .home-top .settings-icon{color:rgba(239,227,200,0.85)}
        .home-top .mode-selection h3{color:rgba(239,227,200,0.85)}
        .event-link{display:inline-block;margin-top:28px;color:rgba(239,227,200,0.85);font-size:14px;text-decoration:underline;text-underline-offset:4px;letter-spacing:1px;cursor:pointer}
        .event-link:hover{color:#fff}
        .home-top .sake-icon-circle{background:#f3ead6;border:2px solid #c9a96a}
        .home-tagline{text-align:center;color:rgba(239,227,200,0.6);font-size:13px;letter-spacing:2px;margin:4px 0 0}
        .btn-gold{background:#c9a96a;color:#3a2c12}
        .btn-outline-cream{background:transparent !important;color:#efe3c8;border:1.5px solid rgba(239,227,200,0.5) !important;box-shadow:none}
        .btn-navy{background:#16365c;color:#efe3c8}
        .btn-outline-muted{background:transparent !important;color:#9a8f7a;border:1.5px solid #cabfa3 !important;box-shadow:none;padding:13px !important;font-size:15px !important}
        .event-entrance{background:#f3ece0 !important}
        .event-entrance .header h2{color:#16365c}
        .event-entrance .mode-selection h3{color:#5a6b7a}
        .event-entrance .sake-icon-circle{background:#fbf6ec;border:2px solid #c9a96a}
.header{display:flex;justify-content:space-between;align-items:center;padding:20px;background:transparent}
.header h2{font-size:20px;font-weight:500;color:#5a5a5a;letter-spacing:2px;flex:1;text-align:center}
.header svg{cursor:pointer}
.settings-icon{color:#8a8a8a;cursor:pointer}
.user-greeting{text-align:center;padding:10px 20px;background:rgba(255,255,255,0.9);margin:0 20px 20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.user-greeting p{font-size:16px;color:#555}
.user-greeting strong{color:#1a4d7a;font-size:18px}
.edit-name-btn{margin-top:16px;padding:10px 24px;background:#f5f5f5;color:#666;border:2px solid #e0e0e0;border-radius:20px;font-size:14px;cursor:pointer}
.mode-selection{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;min-height:calc(100vh - 80px)}
.sake-icon-circle{width:180px;height:180px;background:rgba(255,255,255,0.8);border-radius:50%;margin-bottom:40px;box-shadow:0 8px 32px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center}
.mode-selection h3{font-size:22px;font-weight:500;color:#5a5a5a;margin-bottom:40px}
.mode-btn{width:100%;max-width:400px;padding:20px;margin:10px 0;border:none;border-radius:50px;font-size:18px;font-weight:500;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 16px rgba(0,0,0,0.1)}
.participant-btn{background:linear-gradient(135deg,#a8d0e6 0%,#87bdd8 100%);color:#2d4a5a}
.participant-btn:hover{transform:translateY(-2px)}
.admin-screen{background:#fafaf8}
.admin-screen .header{background:white;border-bottom:1px solid #e8e8e8}
.admin-content{padding:20px;padding-bottom:100px}
.scan-instruction{text-align:center;margin-bottom:30px}
.scan-instruction h3{font-size:20px;font-weight:500;color:#333;margin-bottom:12px}
.scan-instruction p{color:#888;font-size:14px}
.label-upload-section{display:flex;gap:20px;justify-content:center;margin-bottom:30px}
.upload-box{flex:1;max-width:160px;text-align:center}
.upload-label{display:block;width:160px;height:220px;border-radius:12px;overflow:hidden;cursor:pointer;transition:all 0.3s}
.camera-placeholder{width:100%;height:100%;background:linear-gradient(135deg,#e8f4f8 0%,#d4e8f0 100%);display:flex;align-items:center;justify-content:center;color:#7fb3d5;border:3px solid #a8d0e6}
.uploaded-image{width:100%;height:100%;object-fit:cover}
.upload-box p{margin-top:12px;color:#555;font-size:14px}
.analyze-btn{width:100%;padding:18px;background:linear-gradient(135deg,#7f9fb8 0%,#6d8ca6 100%);color:white;border:none;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s;margin-bottom:16px}
.analyze-btn:hover:not(:disabled){transform:translateY(-2px)}
.analyze-btn:disabled{opacity:0.5;cursor:not-allowed}
.progress-indicator{text-align:center;margin-top:20px;padding:20px;background:#f0f8ff;border-radius:12px}
.spinner{width:40px;height:40px;margin:0 auto 16px;border:4px solid #e3f2fd;border-top:4px solid #2196f3;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.progress-indicator p{color:#1976d2;font-size:14px}
.manage-btn{width:100%;padding:14px;background:white;color:#666;border:2px solid #e0e0e0;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer}
.confirmation-section{padding:20px 0}
.confirmation-section h3{font-size:18px;color:#2e7d32;margin-bottom:8px;text-align:center}
.confirmation-note{text-align:center;color:#666;font-size:13px;margin-bottom:24px}
.result-form{background:white;border-radius:16px;padding:20px;margin-bottom:20px}
.form-group{margin-bottom:20px}
.form-group label{display:block;font-size:14px;font-weight:600;color:#555;margin-bottom:8px}
.form-group input,.form-group select{width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px}
.confirmation-buttons{display:flex;flex-direction:column;gap:12px}
.save-btn{width:100%;padding:16px;background:linear-gradient(135deg,#4caf50 0%,#45a049 100%);color:white;border:none;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer}
.cancel-btn{width:100%;padding:14px;background:white;color:#e53935;border:2px solid #e53935;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer}
.admin-list-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.admin-list-header h3{font-size:18px}
.back-to-scan-btn{padding:8px 16px;background:#f5f5f5;border:none;border-radius:20px;font-size:13px;cursor:pointer}
.admin-sake-list{display:flex;flex-direction:column;gap:12px}
.admin-sake-card{background:white;border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center}
.admin-sake-info h4{font-size:16px;margin-bottom:4px}
.admin-sake-info p{font-size:13px;color:#888;margin-bottom:2px}
.admin-sake-actions{display:flex;gap:8px}
.edit-btn-small{padding:8px 16px;background:#e3f2fd;color:#1976d2;border:1px solid #1976d2;border-radius:20px;font-size:13px;cursor:pointer}
.delete-btn-small{padding:8px 16px;background:#ffebee;color:#e53935;border:1px solid #e53935;border-radius:20px;font-size:13px;cursor:pointer}
.empty-list{text-align:center;padding:40px 20px;color:#999}
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-content{background:white;border-radius:16px;padding:24px;max-width:400px;width:90%}
.modal-content h3{font-size:20px;color:#e53935;margin-bottom:16px;text-align:center}
.modal-text{font-size:15px;text-align:center;margin-bottom:12px}
.modal-warning{font-size:13px;color:#ff5722;text-align:center;margin-bottom:24px;background:#ffebee;padding:8px;border-radius:8px}
.modal-buttons{display:flex;flex-direction:column;gap:12px}
.modal-btn{width:100%;padding:14px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
.delete-confirm-btn{background:#e53935;color:white}
.cancel-confirm-btn{background:#f5f5f5;color:#666}
.sake-list-screen .header{background:white;border-bottom:1px solid #e8e8e8}
.category-tabs{display:flex;gap:8px;padding:16px;overflow-x:auto;background:white}
.category-tab{padding:10px 20px;border:none;border-radius:20px;background:#f5f5f5;color:#666;font-size:14px;cursor:pointer;white-space:nowrap}
.category-tab.active{background:linear-gradient(135deg,#a8d0e6 0%,#87bdd8 100%);color:#2d4a5a;font-weight:600}
        .guide-link-btn{margin-top:18px;background:none;border:none;color:#16365c;font-size:14px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
        .guide-modal{text-align:left}
        .guide-modal h3{margin-bottom:14px;text-align:center}
        .guide-steps{margin:0 0 14px;padding-left:1.3em;display:flex;flex-direction:column;gap:10px}
        .guide-steps li{font-size:14px;color:#444;line-height:1.7}
        .guide-note{font-size:12px;color:#888;line-height:1.6;margin-bottom:16px}
.sake-list{padding:16px;padding-bottom:80px}
.sake-card{background:white;border-radius:16px;padding:16px;margin-bottom:16px;display:flex;gap:16px;align-items:center;cursor:pointer}
.sake-images-container{display:flex;gap:8px}
.sake-image{width:70px;height:105px;border-radius:8px;overflow:hidden;position:relative}
.sake-image img{width:100%;height:100%;object-fit:cover}
.placeholder-image{width:100%;height:100%;background:linear-gradient(135deg,#e8f4e8 0%,#d4e8d4 100%)}
.image-label{position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.7);color:white;font-size:10px;padding:2px 6px;border-radius:4px}
.sake-info{flex:1}
.sake-category{display:inline-block;padding:4px 12px;background:#e3f2fd;color:#1976d2;border-radius:12px;font-size:12px;margin-bottom:8px}
.report-badge{display:inline-block;padding:4px 12px;background:#c8e6c9;color:#2e7d32;border-radius:12px;font-size:12px;margin-left:8px}
.sake-info h3{font-size:16px;font-weight:600;color:#333;margin-bottom:4px}
.sake-info p{font-size:13px;color:#999}
.sake-rating{margin-top:8px;color:#ff9800;font-size:14px;font-weight:600}
.sake-detail-screen{background:#fafafa;padding-bottom:80px}
.detail-content{padding:20px}
.sake-detail-header{background:white;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center}
.sake-preview-container{display:flex;gap:16px;justify-content:center;margin-bottom:20px}
.sake-preview-small{width:100px;height:150px;border-radius:12px;overflow:hidden;background:#f5f5f5}
.sake-preview-small img{width:100%;height:100%;object-fit:cover}
.sake-preview{width:140px;height:200px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#e8f4e8 0%,#d4e8d4 100%);position:relative}
.sake-preview img{width:100%;height:100%;object-fit:cover}
.preview-label{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;font-size:11px;padding:4px 12px;border-radius:12px}
.sake-name{text-align:center;font-size:20px;font-weight:600;color:#333;margin-bottom:8px}
.sake-meta{text-align:center;color:#888;font-size:14px;margin-bottom:30px}
.sake-rating-large{font-size:24px;color:#ff9800;font-weight:700;margin-top:16px}
.report-count{font-size:14px;color:#888;font-weight:400;margin-left:8px}
.reports-section{margin-top:24px}
.reports-section h4{font-size:18px;color:#333;margin-bottom:16px}
.loading-reports{text-align:center;padding:40px;color:#999}
.no-reports{text-align:center;padding:40px 20px;background:white;border-radius:16px}
.no-reports p{color:#999;margin-bottom:20px}
.add-report-btn{padding:12px 24px;background:linear-gradient(135deg,#7fb3d5 0%,#6d8ca6 100%);color:white;border:none;border-radius:24px;font-size:14px;font-weight:600;cursor:pointer}
.reports-list{display:flex;flex-direction:column;gap:16px}
.report-detail-card{background:white;border-radius:16px;padding:20px}
.report-detail-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.user-avatar-small{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#7fb3d5 0%,#6d8ca6 100%);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px}
.report-user-info{flex:1;display:flex;flex-direction:column}
.report-user-info strong{font-size:15px}
.report-date{font-size:12px;color:#999}
.report-score-badge{background:#ff9800;color:white;padding:6px 16px;border-radius:20px;font-weight:700;font-size:16px}
.report-evaluations{margin-bottom:16px}
.eval-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.eval-label{font-size:13px;color:#666;min-width:80px}
.eval-bar-container{flex:1;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden}
.eval-bar{height:100%;background:linear-gradient(90deg,#ff9800 0%,#ff6b35 100%);border-radius:4px}
.eval-value{font-size:13px;color:#333;font-weight:600;min-width:50px;text-align:right}
.report-attributes{display:flex;gap:8px;margin-bottom:12px}
.attr-badge{padding:6px 12px;background:#e3f2fd;color:#1976d2;border-radius:12px;font-size:12px}
.report-notes{background:#f9f9f9;padding:12px;border-radius:8px;border-left:3px solid #ff9800}
.report-notes p{font-size:14px;color:#555;line-height:1.6}
.floating-add-report-btn{display:block;width:calc(100% - 0px);margin-top:20px;padding:16px;background:linear-gradient(135deg,#4caf50 0%,#45a049 100%);color:white;border:none;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer}
.tasting-form-screen{padding-bottom:80px}
.form-content{padding:20px}
.evaluation-section,.state-section,.score-section,.notes-section{background:white;border-radius:16px;padding:20px;margin-bottom:20px}
.evaluation-section h4,.state-section h4,.score-section h4,.notes-section h4{font-size:16px;font-weight:600;color:#555;margin-bottom:20px}
.slider-group{margin-bottom:24px}
.slider-group label{display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;font-weight:500;color:#555}
.range-label{color:#ff9800;font-size:12px}
.slider-labels{display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:8px}
.custom-slider{width:100%;height:8px;-webkit-appearance:none;appearance:none;background:#e0e0e0;border-radius:4px;outline:none}
.custom-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;background:#ff9800;border-radius:50%;cursor:pointer}
.custom-slider::-moz-range-thumb{width:24px;height:24px;background:#ff9800;border-radius:50%;cursor:pointer;border:none}
.star-rating-group{margin-bottom:24px}
.star-rating-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.star-rating-header label{font-size:14px;font-weight:500;color:#555}
.star-count{color:#ff9800;font-size:14px;font-weight:600}
.star-rating-container{display:flex;gap:8px;justify-content:center;margin-top:12px}
.star-btn{background:none;border:none;font-size:36px;cursor:pointer;padding:4px;filter:grayscale(100%);opacity:0.3;transition:all 0.2s}
.star-btn.active{filter:grayscale(0%);opacity:1;transform:scale(1.1)}
.star-btn:hover{transform:scale(1.15)}
.submitting-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000}
.submitting-overlay p{color:white;font-size:16px;margin-top:16px}
.admin-report-card{background:white;border-radius:12px;padding:16px;margin-bottom:12px}
.admin-report-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.admin-report-header h4{font-size:15px;margin:0 0 4px 0}
.admin-report-meta{font-size:12px;color:#888;margin:0}
.admin-report-score{background:#ff9800;color:white;padding:6px 12px;border-radius:12px;font-weight:600;font-size:14px;flex-shrink:0}
.admin-report-notes{font-size:13px;color:#666;margin:8px 0 12px 0;line-height:1.5}
.eval-stars{display:flex;gap:2px;flex:1}
.star-filled{font-size:18px;filter:grayscale(0%);opacity:1}
.star-empty{font-size:18px;filter:grayscale(100%);opacity:0.3}
.submit-btn{width:100%;padding:18px;background:linear-gradient(135deg,#3d4f7d 0%,#2d3e5e 100%);color:white;border:none;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;margin:20px 0}
.option-group{margin-bottom:24px}
.option-label{font-size:14px;font-weight:500;color:#555;margin-bottom:12px}
.button-group{display:flex;flex-wrap:wrap;gap:8px}
.option-btn{padding:10px 20px;border:2px solid #e0e0e0;background:white;border-radius:20px;font-size:14px;color:#666;cursor:pointer}
.option-btn.active{background:#3d4f7d;color:white;border-color:#3d4f7d}
.score-input-wrapper{display:flex;align-items:center;gap:8px;margin-bottom:12px;justify-content:center}
.score-input{width:120px;padding:16px;border:2px solid #e0e0e0;border-radius:12px;font-size:32px;font-weight:700;color:#ff9800;text-align:center}
.score-unit{font-size:20px;font-weight:600;color:#ff9800}
.score-note{font-size:12px;color:#888;line-height:1.6}
        .section-note{font-size:13px;color:#888;line-height:1.6;margin:-6px 0 14px}
.notes-section textarea{width:100%;padding:16px;border:2px solid #e0e0e0;border-radius:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:120px}
.mypage-screen{background:#fafafa}
.mypage-content{padding:20px;padding-bottom:80px}
.user-profile{background:white;border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px}
.user-avatar-large{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#7fb3d5 0%,#6d8ca6 100%);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:36px;margin:0 auto 16px}
.user-profile h3{font-size:24px;color:#333;margin-bottom:8px}
.user-stats{font-size:14px;color:#888}
.my-reports-section h4{font-size:18px;color:#333;margin-bottom:16px}
.my-reports-list{display:flex;flex-direction:column;gap:12px}
.my-report-card{background:white;border-radius:12px;padding:16px}
.my-report-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.my-report-header h4{font-size:16px;margin:0}
.my-report-score{background:#ff9800;color:white;padding:4px 12px;border-radius:12px;font-weight:600;font-size:14px}
.my-report-date{font-size:12px;color:#999;margin-bottom:8px}
.my-report-notes{font-size:14px;color:#666;line-height:1.6;margin-top:8px}
.my-report-actions{display:flex;gap:8px;margin-top:12px}
.edit-report-btn{flex:1;padding:8px 16px;background:#e3f2fd;color:#1976d2;border:1px solid #1976d2;border-radius:20px;font-size:13px;cursor:pointer}
.delete-report-btn{flex:1;padding:8px 16px;background:#ffebee;color:#e53935;border:1px solid #e53935;border-radius:20px;font-size:13px;cursor:pointer}
.header.dark{background:#2c3e50;color:white}
.header.dark h2{color:white}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:white;display:flex;justify-content:space-around;padding:12px 0;box-shadow:0 -2px 8px rgba(0,0,0,0.1);z-index:100}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;color:#999;font-size:11px;cursor:pointer;padding:4px 16px}
.nav-item.active{color:#7fb3d5}
.community-screen{background:#fafafa}
.community-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px}
.community-loading p{color:#999;margin-top:16px}
.community-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center}
.community-content{padding:20px;padding-bottom:100px}
.stats-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.stat-card{background:white;border-radius:16px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.05)}
.stat-icon{font-size:24px;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;color:#333;margin-bottom:4px}
.stat-label{font-size:12px;color:#999}
.community-tabs{display:flex;gap:8px;margin-bottom:20px}
.community-tab{flex:1;padding:12px;border:none;border-radius:12px;background:#f0f0f0;color:#888;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s}
.community-tab.active{background:linear-gradient(135deg,#1a4d7a 0%,#2d6a9f 100%);color:white;font-weight:600}
.ranking-heading{font-size:16px;font-weight:600;color:#444;margin:8px 0 14px}
        .ranking-list{display:flex;flex-direction:column;gap:12px}
.ranking-card{background:white;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s;border-left:4px solid transparent}
.ranking-card.medal{box-shadow:0 2px 12px rgba(0,0,0,0.08)}
.ranking-pos{width:36px;text-align:center;flex-shrink:0}
.ranking-num{font-size:16px;font-weight:700;color:#bbb}
.ranking-img{width:48px;height:48px;border-radius:10px;overflow:hidden;background:#f5f5f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:24px}
.ranking-img img{width:100%;height:100%;object-fit:cover}
.ranking-info{flex:1;min-width:0}
.ranking-info h4{font-size:15px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ranking-info p{font-size:12px;color:#999;margin-top:2px}
.ranking-score{text-align:right;flex-shrink:0}
.ranking-score-val{font-size:22px;font-weight:700;color:#ff9800}
.ranking-score-unit{font-size:12px;color:#999;margin-left:2px}
.participant-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7fb3d5 0%,#6d8ca6 100%);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;flex-shrink:0}
.ocr-lines-box{background:#f0f8ff;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #b3d9f5}
.ocr-lines-label{font-size:13px;font-weight:600;color:#1976d2;margin-bottom:12px}
.ocr-lines-list{display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto}
.ocr-line-row{display:flex;justify-content:space-between;align-items:center;gap:8px;background:white;padding:8px 12px;border-radius:8px;border:1px solid #e0e0e0}
.ocr-line-text{font-size:14px;color:#333;flex:1;word-break:break-all}
.ocr-line-btns{display:flex;gap:6px;flex-shrink:0}
.ocr-use-btn{padding:4px 10px;background:#e3f2fd;color:#1976d2;border:1px solid #1976d2;border-radius:12px;font-size:11px;cursor:pointer;white-space:nowrap}
.ocr-use-btn:active{background:#1976d2;color:white}
      `}</style>
    </div>
  );
};

export default SakeApp;
