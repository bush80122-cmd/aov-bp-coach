import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [phase, setPhase] = useState('init'); 
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  const [selectorMode, setSelectorMode] = useState('our');

  // 讀取 Google Sheet 資料
  useEffect(() => {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=366517811&single=true&output=csv";
    fetch(csvUrl)
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).filter(line => line.length > 5).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          let obj = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return {
            ...obj,
            id: obj.hero_id,
            name: obj.hero_name,
            counters: obj.counters ? obj.counters.split(',').map(c => c.trim()) : [],
            trap: obj.is_trap?.toLowerCase() === 'true'
          };
        });
        setHERO_DB(data);
      });
  }, []);

  const handlePick = (hero) => {
    if (selectorMode === 'our') setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    
    if (ourPicks.length + enemyPicks.length === 9) setPhase('analysis');
    else setSelectorMode(selectorMode === 'our' ? 'enemy' : 'our');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">傳說對決BP教練系統</h1>
          <button onClick={() => setPhase('ban')} className="w-full bg-blue-600 p-4 rounded-xl mb-4 font-bold">開始 BP</button>
        </div>
      )}

      {phase === 'ban' && (
        <div>
          <h2 className="text-center mb-4">禁用英雄</h2>
          <div className="grid grid-cols-4 gap-2">
            {HERO_DB.map(h => (
              <button key={h.id} onClick={() => setBannedHeroes([...bannedHeroes, h])} className={`p-2 text-xs rounded ${bannedHeroes.find(b => b.id === h.id) ? 'bg-red-900' : 'bg-slate-800'}`}>
                {h.name}
              </button>
            ))}
          </div>
          <button onClick={() => setPhase('draft')} className="mt-6 w-full bg-green-600 p-4 rounded-xl font-bold">確認禁用並下一步</button>
        </div>
      )}

      {phase === 'draft' && (
        <div>
          <h2 className="text-center mb-4 text-yellow-400 font-bold">{selectorMode === 'our' ? "我方選角推薦" : "敵方選角推薦"}</h2>
          <div className="grid grid-cols-2 gap-3">
            {HERO_DB
              .filter(h => !bannedHeroes.find(b => b.id === h.id) && !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id))
              .map(h => {
                let score = 0;
                let reason = "";
                enemyPicks.forEach(e => {
                  if (h.counters && h.counters.includes(e.id)) { score += 100; reason = `反制: ${e.name}`; }
                });
                return { ...h, score, reason };
              })
              .sort((a, b) => b.score - a.score)
              .map(h => (
                <button key={h.id} onClick={() => handlePick(h)} className={`p-3 rounded-lg text-left ${h.score > 0 ? 'bg-amber-900 border border-amber-500' : 'bg-slate-800'}`}>
                  <div className="font-bold">{h.name}</div>
                  {h.reason && <div className="text-xs text-amber-300">{h.reason}</div>}
                </button>
              ))}
          </div>
        </div>
      )}

      {phase === 'analysis' && (
        <div className="text-center pt-20">
          <h2 className="text-xl font-bold text-yellow-400 mb-6">BP 完成！</h2>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <RefreshCw /> 重新開始
          </button>
        </div>
      )}
    </div>
  );
}
