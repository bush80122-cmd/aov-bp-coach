import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

// === 英雄表與戰術陣容表 CSV 連結 ===
const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
  const [phase, setPhase] = useState('init'); 
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  const BLUE_ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; 
  const RED_ORDER  = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0]; 
  
  const currentTurn = ourPicks.length + enemyPicks.length;
  const draftOrder = isFirstPick ? BLUE_ORDER : RED_ORDER;

  const parseCSV = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      let obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  };

  useEffect(() => {
    if (HERO_CSV_URL.includes('http')) {
      fetch(HERO_CSV_URL).then(res => res.text()).then(text => {
        const formattedData = parseCSV(text).map(obj => ({
          id: obj.hero_id,
          name: obj.hero_name,
          role: obj.primary_roles ? obj.primary_roles.split(',')[0] : '其他',
          counters: obj.counters ? obj.counters.split(',').map(c => c.trim()) : [],
          trap: obj.is_trap?.toLowerCase() === 'true'
        }));
        setHERO_DB(formattedData);
      }).catch(err => console.error(err));
    }

    if (TACTICS_CSV_URL.includes('http')) {
      fetch(TACTICS_CSV_URL).then(res => res.text()).then(text => {
        const formattedTactics = parseCSV(text).map(obj => ({
          comp_id: obj.comp_id,
          comp_name: obj.comp_name,
          core_hero_id: obj.core_hero_id,
          synergy_hero_ids: obj.synergy_hero_ids ? obj.synergy_hero_ids.split(',').map(c => c.trim()) : [],
          win_rate: obj.win_rate || obj['勝率'] || "",
          advantage: obj.advantage || obj['優點'] || "",
          disadvantage: obj.disadvantage || obj['缺點'] || ""
        }));
        setTACTICS_DB(formattedTactics);
      }).catch(err => console.error(err));
    }
  }, []);

  const predictedEnemyComps = useMemo(() => {
    if (enemyPicks.length === 0 || TACTICS_DB.length === 0) return [];
    return TACTICS_DB.map(comp => {
      let matchScore = 0;
      let matchReasons = [];
      const hasCore = enemyPicks.find(e => e.id === comp.core_hero_id);
      if (hasCore) { matchScore += 50; matchReasons.push(`核心:${hasCore.name}`); }
      const pickedSynergies = enemyPicks.filter(e => comp.synergy_hero_ids.includes(e.id));
      if (pickedSynergies.length > 0) { matchScore += (pickedSynergies.length * 20); matchReasons.push(`連動:${pickedSynergies.map(p => p.name).join(',')}`); }
      return { ...comp, matchScore, matchReasons };
    }).filter(comp => comp.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
  }, [enemyPicks, TACTICS_DB]);

  const handlePick = (hero) => {
    if (draftOrder[currentTurn] === 0) setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    if (currentTurn + 1 === 10) setPhase('analysis');
  };

  const finalEnemyComp = predictedEnemyComps.length > 0 ? predictedEnemyComps[0] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto selection:bg-blue-500/30 flex flex-col">
      
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8 tracking-wider">傳說對決 BP 教練系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('comp_select'); }} className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all p-4 rounded-xl mb-4 font-bold text-lg shadow-lg">
            首選 (藍方先亮牌)
          </button>
          <button onClick={() => { setIsFirstPick(false); setPhase('comp_select'); }} className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all p-4 rounded-xl font-bold text-lg shadow-lg">
            後選 (紅方拿兩隻)
          </button>
        </div>
      )}

      {phase === 'comp_select' && (
        <div>
          <h2 className="text-center mb-6 font-bold text-xl text-yellow-400 tracking-wide">選擇本局核心戰術體系</h2>
          <div className="space-y-3">
            {TACTICS_DB.map(comp => (
              <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('draft'); }} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-blue-500 text-left transition-all active:scale-98">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{comp.comp_name}</span>
                  {comp.win_rate && <span className="text-sm font-mono bg-slate-900 text-green-400 px-2 py-1 rounded border border-slate-600">勝率 {comp.win_rate}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'draft' && currentTurn < 10 && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          <div className="flex justify-between items-center mb-3 bg-slate-800/40 p-2 rounded-lg border border-slate-800 text-xs text-slate-400 shrink-0">
             <div>核心體系: <span className="text-yellow-400 font-bold">{selectedComp ? selectedComp.comp_name : "未指定"}</span></div>
             <div>進度: <span className="text-white font-mono">{currentTurn + 1}</span> / 10 手</div>
          </div>
          
          <h2 className={`text-center mb-3 font-bold text-lg tracking-wide px-4 py-2 rounded-xl bg-slate-950/40 border shrink-0 ${draftOrder[currentTurn] === 0 ? "text-blue-400 border-blue-500/20" : "text-red-400 border-red-500/20"}`}>
            {draftOrder[currentTurn] === 0 ? "🔵 輪到我方選擇" : "🔴 輪到敵方選擇"}
          </h2>

          <div className="flex gap-2 mb-4 shrink-0 items-start">
            <div className="flex-1 bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 min-h-[60px]">
              <h3 className="text-[11px] font-bold text-blue-400 mb-1.5 border-b border-blue-500/20 pb-1 flex justify-between">
                <span>我方陣容</span><span>{ourPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ourPicks.length === 0 ? <span className="text-[10px] text-slate-500">尚無選擇</span> : 
                  ourPicks.map(p => <span key={p.id} className="text-[11px] bg-blue-900/60 text-blue-100 px-1.5 py-0.5 rounded border border-blue-700/50">{p.name}</span>)
                }
              </div>
            </div>
            
            <div className="flex-1 bg-red-950/20 border border-red-500/10 rounded-lg p-2 min-h-[60px]">
              <h3 className="text-[11px] font-bold text-red-400 mb-1.5 border-b border-red-500/10 pb-1 flex justify-between">
                <span>敵方陣容</span><span>{enemyPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {enemyPicks.length === 0 ? <span className="text-[10px] text-slate-500">尚無選擇</span> : 
                  enemyPicks.map(p => <span key={p.id} className="text-[11px] bg-red-900/50 text-red-100 px-1.5 py-0.5 rounded border border-red-800/50">{p.name}</span>)
                }
              </div>
              
              {predictedEnemyComps.length > 0 && (
                <div className="pt-2 border-t border-red-900/50">
                  <div className="text-[10px] text-red-400/80 mb-1 font-bold">⚠️ 敵方體系預測：</div>
                  {predictedEnemyComps.slice(0, 2).map((pComp, idx) => (
                    <div key={idx} className="text-[10px] bg-black/40 text-red-200 px-1.5 py-1 rounded border border-red-900/50 mb-1">
                      <span className="font-bold text-red-300">{pComp.comp_name}</span>
                      <div className="text-[9px] text-slate-400 mt-0.5">[{pComp.matchReasons.join(' + ')}]</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 pb-4">
            {HERO_DB
              .filter(h => !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id))
              .map(h => {
                let score = 0; let reasons = [];
                
                // 過濾陷阱
                if (h.trap) { score -= 2000; }
                
                // 優先級一：我方陣容體系 (大幅提高權重)
                if (draftOrder[currentTurn] === 0 && selectedComp) {
                   if (h.id === selectedComp.core_hero_id) { 
                       score += 1000; 
                       reasons.push('核心必選'); 
                   } 
                   else if (selectedComp.synergy_hero_ids.includes(h.id)) { 
                       score += 500; 
                       reasons.push('陣容連動'); 
                   }
                }

                // 優先級二：反制敵方 (權重低於陣容連動，作為輔助決策)
                enemyPicks.forEach(e => { 
                  if (h.counters && h.counters.includes(e.id)) { 
                      score += 100; 
                      reasons.push(`完剋: ${e.name}`); 
                  } 
                });
                
                return { ...h, score, reasons };
              }).sort((a, b) => b.score - a.score)
              .map(h => (
                <button key={h.id} onClick={() => handlePick(h)} className={`p-3 rounded-xl text-left shadow transition-all duration-150 active:scale-95 border ${
                  h.score >= 500 ? 'bg-blue-950/70 border-blue-500 text-blue-200' : // 陣容連動與核心以藍色顯示
                  h.score > 0 ? 'bg-amber-950/60 border-amber-600/80 text-amber-100' : // 純 Counter 以橘色顯示
                  'bg-slate-800/80 border-slate-700/60'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-base">{h.name}</span>
                    <span className="text-[10px] opacity-40 bg-black/30 px-1.5 py-0.5 rounded">{h.role}</span>
                  </div>
                  <div className="min-h-[18px] flex flex-wrap gap-1">
                    {h.reasons.length > 0 ? h.reasons.map((r, idx) => <span key={idx} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                      r.includes('連動') || r.includes('核心') ? 'bg-blue-900/40 text-blue-300 border-blue-500/30' : 'bg-black/40 text-yellow-400 border-yellow-500/20'
                    }`}>{r}</span>) : <span className="text-[9px] text-slate-500 italic">無特定戰術理由</span>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 結算面版 */}
      {phase === 'analysis' && (
        <div className="text-center pt-4 pb-10">
          <h2 className="text-2xl font-bold text-green-400 mb-6 tracking-wide">⚔️ BP 推演完成 ⚔️</h2>
          
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8 text-left">
            <div className="bg-blue-950/30 border border-blue-500/20 p-4 rounded-xl flex-1 shadow-inner">
              <h3 className="font-bold text-blue-400 border-b border-blue-500/20 pb-2 mb-3 text-lg flex items-center justify-between">
                <span>我方陣容</span>
                {selectedComp && <span className="text-sm bg-blue-900/50 text-yellow-400 px-2 py-1 rounded border border-blue-700/50">{selectedComp.comp_name}</span>}
              </h3>
              
              {selectedComp && (selectedComp.advantage || selectedComp.disadvantage) && (
                <div className="mb-4 space-y-2">
                  {selectedComp.advantage && <div className="text-[11px] leading-relaxed bg-green-950/40 text-green-300 p-2 rounded border border-green-800/50"><span className="font-bold block mb-0.5">✅ 陣容優勢：</span>{selectedComp.advantage}</div>}
                  {selectedComp.disadvantage && <div className="text-[11px] leading-relaxed bg-red-950/40 text-red-300 p-2 rounded border border-red-800/50"><span className="font-bold block mb-0.5">⚠️ 陣容劣勢：</span>{selectedComp.disadvantage}</div>}
                </div>
              )}

              <div className="space-y-2">
                {ourPicks.map((p, i) => <div key={i} className="flex justify-between items-center text-sm bg-slate-900/50 p-2.5 rounded border border-slate-800"><span className="font-bold">{p.name}</span><span className="text-[10px] text-slate-500">{p.role}</span></div>)}
              </div>
            </div>
            
            <div className="bg-red-950/20 border border-red-500/10 p-4 rounded-xl flex-1 shadow-inner">
              <h3 className="font-bold text-red-400 border-b border-red-500/10 pb-2 mb-3 text-lg flex items-center justify-between">
                <span>敵方陣容</span>
                {finalEnemyComp ? <span className="text-sm bg-red-900/40 text-yellow-400 px-2 py-1 rounded border border-red-800/50">{finalEnemyComp.comp_name}</span> : <span className="text-sm bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">未知體系</span>}
              </h3>

              {finalEnemyComp && (finalEnemyComp.advantage || finalEnemyComp.disadvantage) && (
                <div className="mb-4 space-y-2">
                  {finalEnemyComp.advantage && <div className="text-[11px] leading-relaxed bg-green-950/40 text-green-300 p-2 rounded border border-green-800/50"><span className="font-bold block mb-0.5">✅ 陣容優勢：</span>{finalEnemyComp.advantage}</div>}
                  {finalEnemyComp.disadvantage && <div className="text-[11px] leading-relaxed bg-red-950/40 text-red-300 p-2 rounded border border-red-800/50"><span className="font-bold block mb-0.5">⚠️ 陣容劣勢：</span>{finalEnemyComp.disadvantage}</div>}
                </div>
              )}

              <div className="space-y-2">
                {enemyPicks.map((p, i) => <div key={i} className="flex justify-between items-center text-sm bg-slate-900/50 p-2.5 rounded border border-slate-800"><span className="font-bold">{p.name}</span><span className="text-[10px] text-slate-500">{p.role}</span></div>)}
              </div>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <RefreshCw size={20} /> 準備下一局推演
          </button>
        </div>
      )}
    </div>
  );
}
