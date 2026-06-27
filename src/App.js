import React, { useState, useEffect, useMemo } from 'react';
import { Ban, Target, Flame, Map, Shield, Zap, RefreshCw, X, ChevronRight, ArrowLeft, Layers } from 'lucide-react';

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [phase, setPhase] = useState('init'); 
  const [isFirstPick, setIsFirstPick] = useState(null);
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  const [selectorMode, setSelectorMode] = useState('our');

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
            roles: obj.primary_roles ? obj.primary_roles.split(',') : [],
            role: obj.primary_roles ? obj.primary_roles.split(',')[0] : '其他',
            counters: obj.counters ? obj.counters.split(',') : [],
            synergy: obj.synergy ? obj.synergy.split(',') : [],
            trap: obj.is_trap?.toLowerCase() === 'true'
          };
        });
        setHERO_DB(data);
      });
  }, []);

  const handleBan = (hero) => {
    if (bannedHeroes.some(b => b.id === hero.id)) setBannedHeroes(bannedHeroes.filter(b => b.id !== hero.id));
    else if (bannedHeroes.length < 6) setBannedHeroes([...bannedHeroes, hero]);
  };

  const handlePick = (hero) => {
    if (selectorMode === 'our') setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    
    if (ourPicks.length + enemyPicks.length === 9) setPhase('analysis');
    else setSelectorMode(selectorMode === 'our' ? 'enemy' : 'our');
  };

  const resetGame = () => {
    setPhase('init'); setBannedHeroes([]); setOurPicks([]); setEnemyPicks([]); setSelectorMode('our');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">傳說對決BP教練系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('ban'); }} className="w-full bg-blue-600 p-4 rounded-xl mb-4 font-bold">藍方首選</button>
          <button onClick={() => { setIsFirstPick(false); setPhase('ban'); }} className="w-full bg-red-600 p-4 rounded-xl font-bold">紅方後選</button>
        </div>
      )}

      {phase === 'ban' && (
        <div>
          <h2 className="text-center mb-4">禁用英雄 (點擊取消)</h2>
          <div className="grid grid-cols-4 gap-2">
            {HERO_DB.map(h => (
              <button key={h.id} onClick={() => handleBan(h)} className={`p-2 text-xs rounded ${bannedHeroes.find(b => b.id === h.id) ? 'bg-red-900' : 'bg-slate-800'}`}>
                {h.name}
              </button>
            ))}
          </div>
          <button onClick={() => setPhase('draft')} className="mt-6 w-full bg-green-600 p-4 rounded-xl font-bold">確認禁用並下一步</button>
        </div>
      )}

      {phase === 'draft' && (
        <div>
          <div className="flex justify-between mb-4">
            <div className={`p-2 ${selectorMode === 'our' ? 'bg-blue-800' : ''}`}>我方: {ourPicks.length}</div>
            <div className={`p-2 ${selectorMode === 'enemy' ? 'bg-red-800' : ''}`}>敵方: {enemyPicks.length}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {HERO_DB.filter(h => !bannedHeroes.find(b => b.id === h.id) && !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id)).map(h => (
              <button key={h.id} onClick={() => handlePick(h)} className="bg-slate-800 p-3 rounded-lg text-sm">
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'analysis' && (
        <div className="text-center">
          <h2 className="text-xl font-bold text-yellow-400 mb-6">BP 完成！分析完畢</h2>
          <button onClick={resetGame} className="w-full bg-blue-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <RefreshCw /> 準備下一局
          </button>
        </div>
      )}
    </div>
  );
}
