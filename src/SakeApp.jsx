import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings, Home, Clipboard, User, ChevronLeft, Search, Trophy } from 'lucide-react';
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
const SakeApp = () => {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [mode, setMode] = useState(null);
  const [sakes, setSakes] = useState([]);
  const [selectedSake, setSelectedSake] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editingReportKey, setEditingReportKey] = useState(null);

  // 管理者画面への隠しアクセス（徳利5回タップ）
  const tokkuriTapCount = useRef(0);
  const tokkuriTapTimer = useRef(null);

  useEffect(() => {
    loadSakes();
    loadUserNameLocal();
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
        setSakes(Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
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
    <div className="screen home-screen">
      <div className="header">
        <h2>SAKE BOOK</h2>
        <Settings size={24} className="settings-icon" onClick={() => setShowNameInput(true)} />
      </div>
      {userName && (
        <div className="user-greeting">
          <p>ようこそ、<strong>{userName}</strong>さん</p>
        </div>
      )}
      <div className="mode-selection">
        <div className="sake-icon-circle" onClick={handleTokkuriTap} style={{ cursor: 'pointer' }}>
          <TokkuriSVG width={80} height={80} color="#2c3e50" />
        </div>
        <h3>ご利用モードの選択</h3>
        <button
          className="mode-btn participant-btn"
          onClick={() => {
            if (!userName) { setShowNameInput(true); }
            else { setMode('participant'); setCurrentScreen('sakeList'); }
          }}
        >参加者の方はこちら</button>
      </div>
    </div>
  );

  // ===== 管理者画面 =====
  const VISION_API_KEY = "AIzaSyAhPGRB5-rQR56BrI-b8QQYK6DD-cpzXO8";

  const AdminScreen = () => {
    const [frontImage, setFrontImage] = useState(null);
    const [backImage, setBackImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showSakeList, setShowSakeList] = useState(false);
    const [adminSakes, setAdminSakes] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingSake, setEditingSake] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (showSakeList) loadAdminSakes();
    }, [showSakeList]);

    const loadAdminSakes = async () => {
      const data = await dbGet('sakes');
      setAdminSakes(data ? Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : []);
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
        const base64Data = frontImage.split(',')[1];
        const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: base64Data },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
              }]
            })
          }
        );
        const data = await response.json();
        const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
        const lines = [...new Set(text.split('\n').map(l => l.trim()).filter(l => l.length > 0))];
        const categoryKeywords = ['純米大吟醸','純米吟醸','特別純米','純米酒','大吟醸','吟醸','特別本醸造','本醸造','普通酒'];
        let detectedCategory = '';
        for (const line of lines) {
          for (const cat of categoryKeywords) {
            if (line.includes(cat) && !detectedCategory) detectedCategory = cat;
          }
        }
        setAnalysisResult({ name: '', category: detectedCategory, brewery: '', lines });
      } catch (error) {
        console.error('Vision API error:', error);
        alert('❌ 解析に失敗しました。手動で入力してください。');
        setAnalysisResult({ name: '', category: '', brewery: '', lines: [] });
      }
      setAnalyzing(false);
    };

    const saveSakeEntry = async () => {
      if (!analysisResult.name.trim()) { alert('銘柄名を入力してください'); return; }
      if (!analysisResult.category) { alert('カテゴリーを選択してください'); return; }
      setSaving(true);
      const newSake = {
        id: Date.now().toString(),
        name: analysisResult.name.trim(),
        category: analysisResult.category,
        brewery: analysisResult.brewery.trim(),
        frontImage,
        backImage,
        rating: 0,
        reportCount: 0,
        createdAt: new Date().toISOString()
      };
      await saveSake(newSake);
      alert('✅ 登録が完了しました！\n\n📝 銘柄: ' + newSake.name + '\n🏷️ カテゴリー: ' + newSake.category + '\n🏭 蔵元: ' + newSake.brewery);
      setAnalysisResult(null); setFrontImage(null); setBackImage(null);
      setSaving(false);
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
      await saveSake(editingSake);
      await loadAdminSakes();
      await loadSakes();
      setEditingSake(null);
      alert('✅ 更新しました');
    };

    const categoryOptions = ['純米大吟醸','純米吟醸','特別純米','純米酒','大吟醸','吟醸','特別本醸造','本醸造','普通酒','その他','不明'];

    return (
      <div className="screen admin-screen">
        <div className="header">
          <ChevronLeft size={24} onClick={() => setCurrentScreen('home')} />
          <h2>【管理者】銘柄登録</h2>
          <div style={{width:24}} />
        </div>
        {!showSakeList ? (
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
              </div>
            ) : (
              <div className="confirmation-section">
                <h3>✅ 読み取り結果から選んでください</h3>
                <p className="confirmation-note">テキストをタップすると入力欄にセットされます</p>
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
                    <label>蔵元（都道府県）</label>
                    <input type="text" value={analysisResult.brewery} onChange={(e) => setAnalysisResult({...analysisResult, brewery: e.target.value})} placeholder="上のテキストをタップ or 直接入力" />
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
                    <div className="form-group"><label>蔵元（都道府県）</label><input type="text" value={editingSake.brewery} onChange={(e) => setEditingSake({...editingSake, brewery: e.target.value})} /></div>
                  </div>
                  <div className="modal-buttons">
                    <button className="modal-btn save-btn" onClick={updateSakeEntry}>更新</button>
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
    const filteredSakes = filterCategory === 'all' ? sakes
      : filterCategory === 'その他' ? sakes.filter(s => !knownCats.includes(s.category))
      : sakes.filter(s => s.category === filterCategory);

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
            <p className="sake-meta">{selectedSake?.category} / {selectedSake?.brewery}</p>
            {selectedSake?.rating > 0 && (
              <div className="sake-rating-large">⭐ {selectedSake.rating.toFixed(1)}点<span className="report-count">（{reports.length}件の評価）</span></div>
            )}
          </div>
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
                            <div className="eval-bar-container"><div className="eval-bar" style={{width:((e.v-1)/(e.m-1)*100)+'%'}}></div></div>
                            <span className="eval-value">{e.v}/{e.m}</span>
                          </div>
                        ))}
                        <div className="eval-row">
                          <span className="eval-label">余韻:</span>
                          <div className="eval-bar-container"><div className="eval-bar" style={{width:((report.finish-1)/(3-1)*100)+'%'}}></div></div>
                          <span className="eval-value">{getFinishLabel(report.finish)}</span>
                        </div>
                      </div>
                      <div className="report-attributes">
                        <span className="attr-badge">{report.clarity}</span>
                        <span className="attr-badge">{report.temperature}</span>
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
      editingReport || { sweetness:3, aroma:3, body:3, acidity:3, finish:2, clarity:'透明', temperature:'冷', score:85, notes:'' }
    );

    const submitReport = async () => {
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
          <p className="sake-meta">{selectedSake?.category} {selectedSake?.brewery}</p>
          <div className="evaluation-section">
            <h4>味の構成</h4>
            {[
              {key:'sweetness',label:'甘辛度',l:'甘',r:'辛',max:5},
              {key:'aroma',label:'香りの強さ',l:'穏やか',r:'華やか',max:5},
              {key:'body',label:'濃淡',l:'淡麗',r:'濃厚',max:5},
              {key:'acidity',label:'酸味',l:'弱い',r:'強い',max:5},
              {key:'finish',label:'余韻（後味）',l:'短い',r:'長い',max:3}
            ].map(s => (
              <div key={s.key} className="slider-group">
                <label><span>{s.label}</span><span className="range-label">1-{s.max}</span></label>
                <div className="slider-labels"><span>{s.l}</span><span>{s.r}</span></div>
                <input type="range" min="1" max={s.max} value={formData[s.key]} onChange={e => setFormData({...formData, [s.key]: parseInt(e.target.value)})} className="custom-slider" />
              </div>
            ))}
          </div>
          <div className="state-section">
            <h4>状態・温度</h4>
            <div className="option-group">
              <p className="option-label">にごりの状態</p>
              <div className="button-group">
                {['透明','うっすら濁り','白濁','その他'].map(o => (
                  <button key={o} className={'option-btn ' + (formData.clarity === o ? 'active' : '')} onClick={() => setFormData({...formData, clarity: o})}>{o}</button>
                ))}
              </div>
            </div>
            <div className="option-group">
              <p className="option-label">最適な温度帯</p>
              <div className="button-group">
                {['冷','常温','燗'].map(o => (
                  <button key={o} className={'option-btn ' + (formData.temperature === o ? 'active' : '')} onClick={() => setFormData({...formData, temperature: o})}>{o}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="score-section">
            <h4>推し度 (0-100)</h4>
            <div className="score-input-wrapper">
              <input type="number" min="0" max="100" value={formData.score} onChange={e => setFormData({...formData, score: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})} className="score-input" />
              <span className="score-unit">点</span>
            </div>
            <p className="score-note">※銘柄の一般的な評価ではなく、あなた自身の好みにどれだけフィットしたかをお答えください。</p>
          </div>
          <div className="notes-section">
            <h4>テイスティングメモ</h4>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="若い果実（桃・梨）、膨らみなど、料理名など、自由にどうぞ。" rows="4" />
          </div>
          <button className="submit-btn" onClick={submitReport}>{editingReportKey ? '✏️ 評価を更新する' : '✏️ 評価を送信する'}</button>
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
            <div className="community-tabs">
              <button className={'community-tab ' + (activeTab === 'ranking' ? 'active' : '')} onClick={() => setActiveTab('ranking')}>🏆 人気ランキング</button>
              <button className={'community-tab ' + (activeTab === 'participants' ? 'active' : '')} onClick={() => setActiveTab('participants')}>👥 参加者ランキング</button>
            </div>
            {activeTab === 'ranking' && (
              <div className="ranking-list">
                {sakeRanking.map((sake, idx) => {
                  const sd = sakes.find(s => s.id === sake.sakeId);
                  const rank = getRank(sakeRanking, idx, 'avg');
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
            )}
            {activeTab === 'participants' && (
              <div className="ranking-list">
                {pRanking.map((p, idx) => {
                  const rank = getRank(pRanking, idx, 'count');
                  const realRank = rank - 1;
                  return (
                    <div key={p.name} className={'ranking-card' + (realRank < 3 ? ' medal' : '')} style={realRank < 3 ? {borderLeft:'4px solid '+medalColors[realRank]} : {}}>
                      <div className="ranking-pos">{realRank < 3 ? <span style={{fontSize:24}}>{medals[realRank]}</span> : <span className="ranking-num">{rank}</span>}</div>
                      <div className="participant-avatar">{p.name.charAt(0)}</div>
                      <div className="ranking-info"><h4>{p.name}</h4><p>{p.count}件の評価 ・ 平均 {p.avg}点</p></div>
                      <div className="ranking-score"><span className="ranking-score-val">{p.count}</span><span className="ranking-score-unit">件</span></div>
                    </div>
                  );
                })}
              </div>
            )}
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
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'admin' && <AdminScreen />}
      {currentScreen === 'sakeList' && <SakeListScreen />}
      {currentScreen === 'sakeDetail' && <SakeDetailScreen />}
      {currentScreen === 'tastingForm' && <TastingFormScreen />}
      {currentScreen === 'mypage' && <MyPageScreen />}
      {currentScreen === 'community' && <CommunityScreen />}
      {showNameInput && <NameInputModal />}
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
.sake-app{font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;height:100vh;overflow:hidden}
.splash-screen{background:#1a4d7a !important;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center}
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
.screen{height:100vh;overflow-y:auto;background:linear-gradient(135deg,#f5f0e8 0%,#fde8d9 100%)}
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
.submit-btn{width:100%;padding:18px;background:linear-gradient(135deg,#3d4f7d 0%,#2d3e5e 100%);color:white;border:none;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;margin:20px 0}
.option-group{margin-bottom:24px}
.option-label{font-size:14px;font-weight:500;color:#555;margin-bottom:12px}
.button-group{display:flex;flex-wrap:wrap;gap:8px}
.option-btn{padding:10px 20px;border:2px solid #e0e0e0;background:white;border-radius:20px;font-size:14px;color:#666;cursor:pointer}
.option-btn.active{background:#3d4f7d;color:white;border-color:#3d4f7d}
.score-input-wrapper{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.score-input{flex:1;padding:16px;border:2px solid #e0e0e0;border-radius:12px;font-size:32px;font-weight:700;color:#ff9800;text-align:center}
.score-unit{font-size:20px;font-weight:600;color:#ff9800}
.score-note{font-size:12px;color:#888;line-height:1.6}
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
