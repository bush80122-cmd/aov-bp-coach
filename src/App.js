import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert, BookOpen, Undo } from 'lucide-react';

const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [phase, setPhase] = useState('init'); 
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);

  const parseCSV = (text) => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      let obj = {};
      headers.forEach((h, i) => { obj[h] = values[i]?.replace(/^"|"$/g, '') || ""; });
      return obj;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res1, res2] = await Promise.all([fetch(HERO_CSV_URL), fetch(TACTICS_CSV_URL)]);
        const text1 = await res1.text();
        const text2 = await res2.text();
        
        setHERO_DB(parseCSV(text1).map(o => ({
          id: o.hero_id, name: o.hero_name, roles: o.primary_roles?.split(',') || ['其他'],
          counters: o.counters?.split(',') || [], trap: o.is_trap === 'true'
        })));
        
        setTACTICS_DB(parseCSV(text2).map(o => ({
          comp_id: o.comp_id, comp_name: o.comp_name, core_hero_id: o.core_hero_id,
          synergy_hero_ids: o.synergy_hero_ids?.split(',') || [],
          must_ban: o.must_ban_heroes?.split(',') || [],
          advantage_comp: o.advantage_comp || "", disadvantage_comp: o.disadvantage_comp || "",
          priority_lane: o.priority_lane || "", tactical_reason: o.tactical_reason || ""
        })));
        setIsLoading(false);
      } catch (e) {
        console.error("載入失敗", e);
      }
    };
    loadData();
  }, []);

  if (isLoading) return <div className="text-white p-10 text-center">正在同步教練資料庫...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">BP 教練系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('comp'); }} className="w-full bg-blue-600 p-4 rounded-xl mb-4">首選 (藍方)</button>
          <button onClick={() => { setIsFirstPick(false); setPhase('comp'); }} className="w-full bg-red-600 p-4 rounded-xl">後選 (紅方)</button>
        </div>
      )}

      {phase === 'comp' && (
        <div className="pt-10">
          <h2 className="text-center mb-4">請選擇戰術體系</h2>
          {TACTICS_DB.map(c => (
            <button key={c.comp_id} onClick={() => { setSelectedComp(c); setPhase('ban'); }} className="w-full p-4 mb-2 bg-slate-800 rounded border border-slate-700">
              {c.comp_name}
            </button>
          ))}
        </div>
      )}

      {phase === 'ban' && (
        <div className="pt-10">
          <h2 className="text-center mb-4">禁用 ({bannedHeroes.length}/6)</h2>
          <div className="grid grid-cols-3 gap-2">
            {HERO_DB.map(h => (
              <button key={h.id} onClick={() => {
                if (bannedHeroes.find(b => b.id === h.id)) setBannedHeroes(bannedHeroes.filter(b => b.id !== h.id));
                else if (bannedHeroes.length < 6) setBannedHeroes([...bannedHeroes, h]);
              }} className={`p-2 rounded ${bannedHeroes.find(b => b.id === h.id) ? 'bg-red-700' : 'bg-slate-800'}`}>
                {h.name}
              </button>
            ))}
          </div>
          <button onClick={() => setPhase('draft')} className="w-full mt-6 bg-blue-600 p-4 rounded-xl">開始選角</button>
        </div>
      )}

      {phase === 'draft' && (
        <div className="pt-10">
           <h2 className="text-center">選角中...</h2>
           <button onClick={() => setPhase('analysis')} className="w-full mt-10 bg-green-600 p-4 rounded-xl">完成選角</button>
        </div>
      )}

      {phase === 'analysis' && (
        <div className="pt-10">
            <h2 className="text-center text-2xl text-green-400">BP 完成</h2>
            <div className="mt-4 p-4 bg-slate-800 rounded-xl text-sm">
                <p><strong>優勢:</strong> {selectedComp?.advantage_comp}</p>
                <p className="text-red-300"><strong>劣勢:</strong> {selectedComp?.disadvantage_comp}</p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full mt-6 bg-blue-600 p-4 rounded-xl">重新開始</button>
        </div>
      )}
    </div>
  );
}
