import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [phase, setPhase] = useState('init'); // init, comp_select, draft
  const [selectedComp, setSelectedComp] = useState(null);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  const draftOrder = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1];
  const currentTurn = ourPicks.length + enemyPicks.length;

  useEffect(() => {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=366517811&single=true&output=csv";
    fetch(csvUrl).then(res => res.text()).then(text => {
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).filter(line => line.length > 5).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return { ...obj, id: obj.hero_id, name: obj.hero_name, counters: obj.counters?.split(',').map(c => c.trim()) || [] };
      });
      setHERO_DB(data);
    });
  }, []);

  const handlePick = (hero) => {
    if (draftOrder[currentTurn] === 0) setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-md mx-auto">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">BP 教練系統</h1>
          <button onClick={() => setPhase('comp_select')} className="w-full bg-blue-600 p-4 rounded-xl mb-4">首選</button>
          <button onClick={() => setPhase('comp_select')} className="w-full bg-red-600 p-4 rounded-xl">後選</button>
        </div>
      )}

      {phase === 'comp_select' && (
        <div>
          <h2 className="text-center mb-4">選擇本次陣容體系</h2>
          {/* 你可以在這裡放入你的陣容選擇按鈕，目前先用範例 */}
          <button onClick={() => { setSelectedComp('消耗陣'); setPhase('draft'); }} className="w-full bg-slate-800 p-3 mb-2 rounded">消耗陣 (Poke)</button>
          <button onClick={() => { setSelectedComp('進場陣'); setPhase('draft'); }} className="w-full bg-slate-800 p-3 rounded">進場陣 (Dive)</button>
        </div>
      )}

      {phase === 'draft' && currentTurn < 10 ? (
        <div>
          <h2 className="text-center mb-2 font-bold text-yellow-400">目前陣容: {selectedComp}</h2>
          <div className="grid grid-cols-2 gap-3">
            {HERO_DB.filter(h => !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id)).map(h => {
              let score = 0; let reason = [];
              enemyPicks.forEach(e => { if (h.counters.includes(e.id)) { score += 150; reason.push(`完剋: ${e.name}`); } });
              return (
                <button key={h.id} onClick={() => handlePick(h)} className={`p-3 rounded-lg text-left ${score > 0 ? 'bg-amber-900 border border-amber-500' : 'bg-slate-800'}`}>
                  <div className="font-bold">{h.name}</div>
                  {reason.map(r => <div key={r} className="text-[10px] text-amber-300">{r}</div>)}
                </button>
              );
            })}
          </div>
        </div>
      ) : phase === 'draft' && (
        <button onClick={() => window.location.reload()} className="w-full bg-blue-600 p-4 mt-10 rounded">重新開始</button>
      )}
    </div>
  );
}
