import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

// === 請在此處填入你從 Google Sheet 發布的兩個 CSV 連結 ===
const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
  const [phase, setPhase] = useState('init'); // init, comp_select, draft, analysis
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  // 依照首選/後選定義標準 1-2-2-2-2-1 蛇形選角順序 (0代表我方, 1代表敵方)
  const BLUE_ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; // 首選
  const RED_ORDER  = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0]; // 後選
  
  const currentTurn = ourPicks.length + enemyPicks.length;
  const draftOrder = isFirstPick ? BLUE_ORDER : RED_ORDER;

  // 進階 CSV 安全解析器（相容儲存格內包含逗號的狀況）
  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    
    // 正則表達式：只切分引號外部的逗號
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || "";
      });
      return obj;
    });
  };

  // 從雲端載入資料庫
  useEffect(() => {
    // 1. 載入英雄資料庫
    if (HERO_CSV_URL.includes('http')) {
      fetch(HERO_CSV_URL)
        .then(res => res.text())
        .then(text => {
          const formattedData = parseCSV(text).map(obj => {
            const rawCounters = obj.counters || "";
            return {
              id: obj.hero_id,
              name: obj.hero_name,
              role: obj.primary_roles ? obj.primary_roles.split(',')[0] : '其他',
              counters: rawCounters ? rawCounters.split(',').map(c => c.trim()) : [],
              trap: obj.is_trap?.toLowerCase() === 'true'
            };
          });
          setHERO_DB(formattedData);
        })
        .catch(err => console.error("英雄資料載入失敗:", err));
    }

    // 2. 載入戰術陣容資料庫
    if (TACTICS_CSV_URL.includes('http')) {
      fetch(TACTICS_CSV_URL)
        .then(res => res.text())
        .then(text => {
          const formattedTactics = parseCSV(text).map(obj => {
            const rawSynergy = obj.synergy_hero_ids || "";
            return {
              comp_id: obj.comp_id,
              comp_name: obj.comp_name,
              core_hero_id: obj.core_hero_id,
              synergy_hero_ids: rawSynergy ? rawSynergy.split(',').map(c => c.trim()) : []
            };
          });
          setTACTICS_DB(formattedTactics);
        })
        .catch(err => console.error("戰術資料載入失敗:", err));
    }
  }, []);

  // 處理選角點擊
  const handlePick = (hero) => {
    if (draftOrder[currentTurn] === 0) {
      setOurPicks([...ourPicks, hero]);
    } else {
      setEnemyPicks([...enemyPicks, hero]);
    }
    
    // 選滿 10 隻英雄，自動進入結算分析
    if (currentTurn + 1 === 10) {
      setPhase('analysis');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto selection:bg-blue-500/30">
      
      {/* 階段一：初始化選擇首/後選 */}
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8 tracking-wider">傳說對決 BP 教練系統</h1>
          <button 
            onClick={() => { setIsFirstPick(true); setPhase('comp_select'); }} 
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all p-4 rounded-xl mb-4 font-bold text-lg shadow-lg"
          >
            首選 (藍方先亮牌)
          </button>
          <button 
            onClick={() => { setIsFirstPick(false); setPhase('comp_select'); }} 
            className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all p-4 rounded-xl font-bold text-lg shadow-lg"
          >
            後選 (紅方拿兩隻)
          </button>
        </div>
      )}

      {/* 階段二：選擇本局想打的戰術陣容 */}
      {phase === 'comp_select' && (
        <div>
          <h2 className="text-center mb-6 font-bold text-xl text-yellow-400 tracking-wide">選擇本局核心戰術體系</h2>
          <div className="space-y-3">
            {TACTICS_DB.map(comp => (
              <button 
                key={comp.comp_id} 
                onClick={() => { setSelectedComp(comp); setPhase('draft'); }} 
                className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-blue-500 text-left font-bold text-lg transition-all active:scale-98"
              >
                {comp.comp_name}
              </button>
            ))}
            {TACTICS_DB.length === 0 && (
              <div className="text-center text-slate-400 bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-700">
                <p className="text-sm mb-2">💡 尚未偵測到雲端戰術資料</p>
                <p className="text-xs text-slate-500">請在代碼上方填入 <code>TACTICS_CSV_URL</code> 分頁連結後即可啟動陣容系統。</p>
                <button 
                  onClick={() => { setSelectedComp(null); setPhase('draft'); }} 
                  className="mt-4 bg-slate-700 text-xs px-4 py-2 rounded-lg font-bold"
                >
                  不選陣容，直接進入一般 BP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 階段三：實戰選角與智慧雙向加權推薦 */}
      {phase === 'draft' && currentTurn < 10 && (
        <div>
          {/* 狀態列 */}
          <div className="flex justify-between items-center mb-4 bg-slate-800/40 p-2 rounded-lg border border-slate-800 text-xs text-slate-400">
             <div>核心體系: <span className="text-yellow-400 font-bold">{selectedComp ? selectedComp.comp_name : "未指定"}</span></div>
             <div>進度: <span className="text-white font-mono">{currentTurn + 1}</span> / 10 手</div>
          </div>
          
          {/* 當前輪到誰提示 */}
          <h2 className={`text-center mb-5 font-bold text-xl tracking-wide px-4 py-2 rounded-xl bg-slate-950/40 border ${
            draftOrder[currentTurn] === 0 ? "text-blue-400 border-blue-500/20" : "text-red-400 border-red-500/20"
          }`}>
            {draftOrder[currentTurn] === 0 ? "🔵 輪到我方選擇" : "🔴 輪到敵方選擇"}
          </h2>

          {/* 英雄選單與智慧加權演算 */}
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {HERO_DB
              .filter(h => !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id))
              .map(h => {
                let score = 0; 
                let reasons = [];
                
                // 規則 A: 實戰陷阱過濾
                if (h.trap) { score -= 2000; }
                
                // 規則 B: 逆向反制敵方已經選過的英雄 (Counter 運算)
                enemyPicks.forEach(e => { 
                  if (h.counters && h.counters.includes(e.id)) { 
                    score += 150; 
                    reasons.push(`完剋: ${e.name}`); 
                  } 
                });
                
                // 規則 C: 順向搭配我方已選英雄或指定陣容 (Synergy 運算)
                if (draftOrder[currentTurn] === 0 && selectedComp) {
                   if (h.id === selectedComp.core_hero_id) {
                       score += 300; 
                       reasons.push('核心必選');
                   } else if (selectedComp.synergy_hero_ids.includes(h.id)) {
                       score += 100; 
                       reasons.push('陣容連動');
                   }
                }

                return { ...h, score, reasons };
              })
              // 依據總分高低進行即時戰術推薦排序
              .sort((a, b) => b.score - a.score)
              .map(h => (
                <button 
                  key={h.id} 
                  onClick={() => handlePick(h)} 
                  className={`p-3 rounded-xl text-left shadow transition-all duration-150 active:scale-95 border ${
                    h.score >= 300 ? 'bg-blue-950/70 border-blue-500 text-blue-200' : 
                    h.score > 0 ? 'bg-amber-950/60 border-amber-600/80 text-amber-100' : 
                    'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-base">{h.name}</span>
                    <span className="text-[10px] opacity-40 bg-black/30 px-1.5 py-0.5 rounded">{h.role}</span>
                  </div>
                  
                  {/* 動態推薦理由標籤顯示 */}
                  <div className="min-h-[18px] flex flex-wrap gap-1">
                    {h.reasons.length > 0 ? (
                      h.reasons.map((r, idx) => (
                        <span key={idx} className="text-[9px] font-medium bg-black/40 px-1.5 py-0.5 rounded text-yellow-400 border border-yellow-500/20">
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-500 italic">無特定戰術理由</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 階段四：BP 結束，雙方終極陣容分析面版 */}
      {phase === 'analysis' && (
        <div className="text-center pt-6">
          <h2 className="text-2xl font-bold text-green-400 mb-6 tracking-wide">⚔️ BP 推演完成 ⚔️</h2>
          
          <div className="flex justify-between gap-3 mb-8">
            {/* 我方最終產出 */}
            <div className="bg-blue-950/30 border border-blue-500/20 p-4 rounded-xl w-1/2 shadow-inner">
              <h3 className="font-bold text-blue-400 border-b border-blue-500/20 pb-2 mb-3 text-base">我方陣容</h3>
              <div className="space-y-2">
                {ourPicks.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm bg-slate-900/50 p-2 rounded border border-slate-800">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-[10px] text-slate-500">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 敵方最終產出 */}
            <div className="bg-red-950/20 border border-red-500/10 p-4 rounded-xl w-1/2 shadow-inner">
              <h3 className="font-bold text-red-400 border-b border-red-500/10 pb-2 mb-3 text-base">敵方陣容</h3>
              <div className="space-y-2">
                {enemyPicks.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm bg-slate-900/50 p-2 rounded border border-slate-800">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-[10px] text-slate-500">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 重新開始按鈕 */}
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCw size={20} /> 準備下一局推演
          </button>
        </div>
      )}
    </div>
  );
}
