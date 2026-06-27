import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
  // 階段：init, comp_select, ban_phase, draft, analysis
  const [phase, setPhase] = useState('init'); 
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  const BLUE_ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; 
  const RED_ORDER  = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0]; 
  
  const currentTurn = ourPicks.length + enemyPicks.length;
  const draftOrder = isFirstPick ? BLUE_ORDER : RED_ORDER;

  // CSV 解析器 (略過，與前次相同，請保留完整邏輯)
  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      let obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  };

  useEffect(() => {
    // 讀取邏輯 (省略細節，請保持與前次一致)
    fetch(HERO_CSV_URL).then(res => res.text()).then(text => {
      const data = parseCSV(text).map(obj => ({
        id: obj.hero_id, name: obj.hero_name, roles: obj.primary_roles?.split(',') || ['其他'],
        counters: obj.counters?.split(',') || [], trap: obj.is_trap === 'true'
      }));
      setHERO_DB(data);
    });
    fetch(TACTICS_CSV_URL).then(res => res.text()).then(text => {
      const data = parseCSV(text).map(obj => ({
        ...obj, must_ban: obj.must_ban_heroes?.split(',') || [],
        advantage: obj.advantage_vs?.split(',') || [], disadvantage: obj.disadvantage_vs?.split(',') || []
      }));
      setTACTICS_DB(data);
    });
  }, []);

  // 戰術推薦權重邏輯
  const getHeroScore = (h, isOurTurn, currentTeam, enemyTeam) => {
    let score = 0;
    if (selectedComp) {
      if (h.id === selectedComp.core_hero_id) score += 1000;
      else if (selectedComp.synergy_hero_ids?.includes(h.id)) score += 500;
    }
    enemyTeam.forEach(e => { if (h.counters.includes(e.id)) score += 100; });
    return score;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-md mx-auto">
      {/* 流程優化：根據藍紅方跳轉對應頁面 */}
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">BP 教練系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('comp_select'); }} className="w-full bg-blue-600 p-4 rounded-xl mb-4">首選 (先選陣容)</button>
          <button onClick={() => { setIsFirstPick(false); setPhase('draft'); }} className="w-full bg-red-600 p-4 rounded-xl">後選 (看對方首搶)</button>
        </div>
      )}

      {/* 陣容選擇與 Ban 角提示 */}
      {phase === 'comp_select' && (
        <div className="pt-10">
          <h2 className="text-xl mb-4">建議禁用: {selectedComp?.must_ban.join(', ')}</h2>
          {TACTICS_DB.map(comp => (
             <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('ban_phase'); }} className="block w-full p-4 mb-2 bg-slate-800 rounded">
               {comp.comp_name}
             </button>
          ))}
        </div>
      )}

      {/* Draft 階段：動態調整邏輯 */}
      {phase === 'draft' && (
        <div>
          {/* 顯示推薦 Ban 角與敵方陣容偵測邏輯 */}
          {/* 在此處加入動態推薦英雄，並依據分路權重減分 (Role Conflict Logic) */}
        </div>
      )}
    </div>
  );
}
