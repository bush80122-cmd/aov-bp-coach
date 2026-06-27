import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle, ShieldAlert, BookOpen, Undo } from 'lucide-react';

// ... (省略重複的常量與 parseCSV 函數，保持完整覆蓋即可)
const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  const [phase, setPhase] = useState('init'); 
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  const [adjustReason, setAdjustReason] = useState(""); 
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  const BLUE_ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; 
  const RED_ORDER  = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0]; 
  const currentTurn = ourPicks.length + enemyPicks.length;
  const draftOrder = isFirstPick ? BLUE_ORDER : RED_ORDER;

  // CSV 解析與 useEffect (與前版相同，請保留)
  // ... (省略此處代碼以節省篇幅，請確保完整覆蓋時包含它們)

  // 【核心功能修正】點擊陣容中的英雄即可移除
  const removePick = (heroId, isOurSide) => {
    if (isOurSide) {
      setOurPicks(ourPicks.filter(p => p.id !== heroId));
    } else {
      setEnemyPicks(enemyPicks.filter(p => p.id !== heroId));
    }
    // 移除後若不滿10隻，狀態自動切回 draft
    if (phase === 'analysis') setPhase('draft');
  };

  // ... (其他邏輯與之前版本相同)
  
  // 在 Draft 階段的陣容展示區加入移除邏輯
  // 如下方代碼區塊所示：
  
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto flex flex-col selection:bg-blue-500/30">
      
      {/* Draft 選角介面 (修改後的陣容區塊) */}
      {phase === 'draft' && currentTurn < 10 && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          {/* ... */}
          <div className="flex gap-2 mb-4 shrink-0 items-start">
            <div className="flex-1 bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 min-h-[70px]">
              <h3 className="text-[11px] font-bold text-blue-400 mb-1.5 border-b border-blue-500/20 pb-1 flex justify-between">
                <span>我方陣容</span><span>{ourPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ourPicks.map(p => (
                  <button key={p.id} onClick={() => removePick(p.id, true)} className="text-[11px] bg-blue-900/60 text-blue-100 px-1.5 py-0.5 rounded border border-blue-700/50 hover:bg-red-900/50 hover:border-red-500 transition-colors">
                    {p.name} ✕
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 bg-red-950/20 border border-red-500/10 rounded-lg p-2 min-h-[70px]">
              <h3 className="text-[11px] font-bold text-red-400 mb-1.5 border-b border-red-500/10 pb-1 flex justify-between">
                <span>敵方陣容</span><span>{enemyPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {enemyPicks.map(p => (
                  <button key={p.id} onClick={() => removePick(p.id, false)} className="text-[11px] bg-red-900/50 text-red-100 px-1.5 py-0.5 rounded border border-red-800/50 hover:bg-red-700 transition-colors">
                    {p.name} ✕
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* ... 其餘代碼保持不變 */}
        </div>
      )}
      {/* ... (其餘渲染代碼) */}
    </div>
  );
}
