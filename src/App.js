import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
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

  const parseCSV = (text) => {
    if (!text) return [];
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
    fetch(HERO_CSV_URL).then(res => res.text()).then(text => {
      setHERO_DB(parseCSV(text).map(obj => ({
        id: obj.hero_id, name: obj.hero_name, roles: obj.primary_roles?.split(',') || ['其他'],
        counters: obj.counters?.split(',') || [], trap: obj.is_trap === 'true'
      })));
    });
    fetch(TACTICS_CSV_URL).then(res => res.text()).then(text => {
      setTACTICS_DB(parseCSV(text).map(obj => ({
        ...obj, must_ban: obj.must_ban_heroes?.split(',') || [],
        advantage: obj.advantage_vs?.split(',') || [], disadvantage: obj.disadvantage_vs?.split(',') || []
      })));
    });
  }, []);

  // 使用安全導航符號 ?. 來防止 selectedComp 為 null 時崩潰
  const handlePick = (hero) => {
    if (draftOrder[currentTurn] === 0) setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    if (currentTurn + 1 === 10) setPhase('analysis');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">BP 教練系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('ban'); }} className="w-full bg-blue-600 p-4 rounded-xl mb-4">首選</button>
          <button onClick={() => { setIsFirstPick(false); setPhase('ban'); }} className="w-full bg-red-600 p-4 rounded-xl">後選</button>
        </div>
      )}

      {phase === 'ban' && (
        <div className="pt-10">
          <h2 className="text-xl mb-4 text-center">禁用英雄 ({bannedHeroes.length}/6)</h2>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {HERO_DB.map(h => (
              <button key={h.id} onClick={() => {
                if (bannedHeroes.find(b => b.id === h.id)) setBannedHeroes(bannedHeroes.filter(b => b.id !== h.id));
                else if (bannedHeroes.length < 6) setBannedHeroes([...bannedHeroes, h]);
              }} className={`p-2 rounded ${bannedHeroes.find(b => b.id === h.id) ? 'bg-red-700' : 'bg-slate-800'}`}>
                {h.name}
              </button>
            ))}
          </div>
          <button onClick={() => isFirstPick ? setPhase('comp_select') : setPhase('draft')} className="w-full bg-blue-600 p-4 rounded-xl">下一步</button>
        </div>
      )}

      {phase === 'comp_select' && (
        <div className="pt-10">
          <h2 className="text-xl mb-4 text-center">選擇陣容</h2>
          {TACTICS_DB.map(comp => (
            <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('draft'); }} className="block w-full p-4 mb-2 bg-slate-800 rounded text-left">
              {comp.comp_name}
              {selectedComp?.must_ban && <div className="text-xs text-red-400">需 BAN: {selectedComp.must_ban.join(',')}</div>}
            </button>
          ))}
        </div>
      )}

      {phase === 'draft' && (
        <div className="pt-10 text-center">
            <h2 className="text-xl">選角進行中...</h2>
            {/* 這裡補上你的選角 UI 邏輯 */}
            <button onClick={() => setPhase('analysis')} className="mt-10 bg-green-600 p-4 rounded-xl">測試結束</button>
        </div>
      )}

      {phase === 'analysis' && (
        <div className="pt-10 text-center">
            <h2 className="text-2xl">BP 完成</h2>
            <button onClick={() => window.location.reload()} className="mt-10 bg-blue-600 p-4 rounded-xl">重新開始</button>
        </div>
      )}
    </div>
  );
}
