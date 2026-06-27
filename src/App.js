import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle, ShieldAlert, BookOpen, Undo } from 'lucide-react';

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
        id: obj.hero_id, name: obj.hero_name, roles: obj.primary_roles?.split(',').map(r=>r.trim()) || ['其他'],
        counters: obj.counters?.split(',').map(c=>c.trim()) || [], trap: obj.is_trap?.toLowerCase() === 'true'
      })));
    });
    fetch(TACTICS_CSV_URL).then(res => res.text()).then(text => {
      setTACTICS_DB(parseCSV(text).map(obj => ({
        comp_id: obj.comp_id, comp_name: obj.comp_name, core_hero_id: obj.core_hero_id,
        synergy_hero_ids: obj.synergy_hero_ids ? obj.synergy_hero_ids.split(',').map(c=>c.trim()) : [],
        must_ban: obj.must_ban_heroes ? obj.must_ban_heroes.split(',').map(c=>c.trim()) : [],
        advantage_comp: obj.advantage_comp || "", disadvantage_comp: obj.disadvantage_comp || "",
        win_rate: obj.win_rate || obj['勝率'] || "",
        priority_lane: obj.priority_lane || "", tactical_reason: obj.tactical_reason || ""
      })));
    });
  }, []);

  const predictedEnemyComps = useMemo(() => {
    if (enemyPicks.length === 0 || TACTICS_DB.length === 0) return [];
    return TACTICS_DB.map(comp => {
      let matchScore = 0;
      const hasCore = enemyPicks.find(e => e.id === comp.core_hero_id);
      if (hasCore) matchScore += 50;
      const pickedSynergies = enemyPicks.filter(e => comp.synergy_hero_ids.includes(e.id));
      if (pickedSynergies.length > 0) matchScore += (pickedSynergies.length * 20);
      return { ...comp, matchScore };
    }).filter(comp => comp.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
  }, [enemyPicks, TACTICS_DB]);

  const finalEnemyComp = predictedEnemyComps.length > 0 ? predictedEnemyComps[0] : null;

  const handlePick = (hero) => {
    const isOurTurn = draftOrder[currentTurn] === 0;
    if (isOurTurn) setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    
    if (currentTurn + 1 === 10) { setPhase('analysis'); return; }
    if (draftOrder[currentTurn] === 1) { // 剛剛是敵方選角
      if (!isFirstPick && (currentTurn + 1) === 1) { setAdjustReason(`敵方首搶了 [${hero.name}]，請根據預測調整！`); setPhase('adjust_comp'); }
      if (selectedComp && hero.id === selectedComp.core_hero_id) { setAdjustReason(`我方核心被搶，請立即轉陣！`); setPhase('adjust_comp'); }
    }
  };

  const removePick = (heroId, isOurSide) => {
    if (isOurSide) setOurPicks(ourPicks.filter(p => p.id !== heroId));
    else setEnemyPicks(enemyPicks.filter(p => p.id !== heroId));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto flex flex-col">
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8">傳說對決 BP 決策系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('initial_comp'); }} className="w-full bg-blue-600 p-4 rounded-xl mb-4">首選</button>
          <button onClick={() => { setIsFirstPick(false); setPhase('initial_comp'); }} className="w-full bg-red-600 p-4 rounded-xl">後選</button>
        </div>
      )}

      {phase === 'initial_comp' && (
        <div className="pt-10 flex-1 overflow-y-auto">
          <h2 className="text-xl mb-4 text-center">Step 1: 選擇初始陣容</h2>
          {TACTICS_DB.map(comp => (
            <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('ban'); }} className="w-full p-4 mb-2 bg-slate-800 rounded border border-slate-700 text-left">
              {comp.comp_name}
            </button>
          ))}
        </div>
      )}

      {phase === 'ban' && (
        <div className="pt-10 flex-1 overflow-y-auto">
          <h2 className="text-xl mb-4 text-center">禁用英雄 ({bannedHeroes.length}/6)</h2>
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
          <button onClick={() => { 
            if (bannedHeroes.some(b => b.id === selectedComp?.core_hero_id)) setPhase('adjust_comp'); 
            else setPhase('draft'); 
          }} className="w-full mt-6 bg-blue-600 p-4 rounded-xl">下一步</button>
        </div>
      )}

      {phase === 'adjust_comp' && (
        <div className="pt-10 flex-1 overflow-y-auto">
          <h2 className="text-red-400 text-center font-bold mb-4">{adjustReason}</h2>
          {TACTICS_DB.map(comp => (
             <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('draft'); }} className="w-full p-4 mb-2 bg-blue-900/30 border border-blue-500 rounded text-left">
               {comp.comp_name}
             </button>
          ))}
          <button onClick={() => setPhase('draft')} className="w-full bg-slate-700 p-4 rounded-xl mt-4">不更換陣容</button>
        </div>
      )}

      {phase === 'draft' && (
        <div className="pt-5 flex flex-col flex-1">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 bg-blue-900/20 p-2 rounded">
              {ourPicks.map(p => <span key={p.id} onClick={() => removePick(p.id, true)} className="mr-1 bg-blue-700 px-1 rounded text-xs">{p.name}✕</span>)}
            </div>
            <div className="flex-1 bg-red-900/20 p-2 rounded">
              {enemyPicks.map(p => <span key={p.id} onClick={() => removePick(p.id, false)} className="mr-1 bg-red-700 px-1 rounded text-xs">{p.name}✕</span>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto">
            {HERO_DB.filter(h => !ourPicks.find(p=>p.id===h.id) && !enemyPicks.find(e=>e.id===h.id) && !bannedHeroes.find(b=>b.id===h.id)).map(h => (
              <button key={h.id} onClick={() => handlePick(h)} className="p-3 bg-slate-800 rounded">{h.name}</button>
            ))}
          </div>
        </div>
      )}

      {phase === 'analysis' && (
        <div className="pt-10 text-center flex-1 overflow-y-auto">
            <h2 className="text-2xl text-green-400 mb-6">BP 完成</h2>
            <div className="bg-slate-800 p-4 rounded-xl mb-4 text-left text-sm">
                <h3 className="font-bold border-b border-slate-600 mb-2">陣容優劣勢</h3>
                <p>我方: {selectedComp?.advantage_comp}</p>
                <p className="text-red-300">我方劣勢: {selectedComp?.disadvantage_comp}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl mb-6 text-left text-sm">
                <h3 className="font-bold border-b border-slate-600 mb-2">開局建議</h3>
                <p>優先路: {selectedComp?.priority_lane}</p>
                <p>{selectedComp?.tactical_reason}</p>
            </div>
            <button onClick={() => {
                setPhase('init'); setOurPicks([]); setEnemyPicks([]); setBannedHeroes([]); setSelectedComp(null);
            }} className="w-full bg-blue-600 p-4 rounded-xl">準備下一局推演</button>
        </div>
      )}
    </div>
  );
}
