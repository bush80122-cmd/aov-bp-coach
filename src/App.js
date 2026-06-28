import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle, ShieldAlert, BookOpen } from 'lucide-react';

// === 英雄表與戰術陣容表 CSV 連結 ===
const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
  // 核心狀態機: init -> initial_comp -> ban -> adjust_comp (動態觸發) -> draft -> analysis
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

  const resetApp = () => {
    setPhase('init');
    setOurPicks([]);
    setEnemyPicks([]);
    setBannedHeroes([]);
    setSelectedComp(null);
    setAdjustReason("");
  };

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
    if (HERO_CSV_URL.includes('http')) {
      fetch(HERO_CSV_URL).then(res => res.text()).then(text => {
        const formattedData = parseCSV(text).map(obj => {
          const rolesArr = obj.primary_roles ? obj.primary_roles.split(',').map(r => r.trim()) : ['其他'];
          return {
            id: obj.hero_id,
            name: obj.hero_name,
            role: rolesArr[0], 
            roles: rolesArr,
            counters: obj.counters ? obj.counters.split(',').map(c => c.trim()) : [],
            trap: obj.is_trap?.toLowerCase() === 'true'
          };
        });
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
          must_ban: obj.must_ban_heroes ? obj.must_ban_heroes.split(',').map(c => c.trim()) : [],
          advantage_vs: obj.advantage_vs ? obj.advantage_vs.split(',').map(c => c.trim()) : [], 
          disadvantage_vs: obj.disadvantage_vs ? obj.disadvantage_vs.split(',').map(c => c.trim()) : [], 
          win_rate: obj.win_rate || obj['勝率'] || "",
          advantage_comp: obj.advantage_comp || "",
          disadvantage_comp: obj.disadvantage_comp || "",
          priority_lane: obj.priority_lane || "",
          tactical_reason: obj.tactical_reason || ""
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

  const finalEnemyComp = predictedEnemyComps.length > 0 ? predictedEnemyComps[0] : null;

  const handleBanComplete = () => {
    const isCoreBanned = bannedHeroes.some(b => b.id === selectedComp?.core_hero_id);
    if (isCoreBanned) {
      setAdjustReason(`核心英雄 [${HERO_DB.find(h=>h.id===selectedComp.core_hero_id)?.name}] 被禁用，請調整陣容！`);
      setPhase('adjust_comp');
    } else {
      setPhase('draft');
    }
  };

  const handlePick = (hero) => {
    let newOurPicks = [...ourPicks];
    let newEnemyPicks = [...enemyPicks];
    
    if (draftOrder[currentTurn] === 0) newOurPicks.push(hero);
    else newEnemyPicks.push(hero);
    
    setOurPicks(newOurPicks);
    setEnemyPicks(newEnemyPicks);
    
    const nextTurn = currentTurn + 1;
    if (nextTurn === 10) {
      setPhase('analysis');
      return;
    }

    if (draftOrder[currentTurn] === 1) { 
      if (!isFirstPick && nextTurn === 1) {
         setAdjustReason(`敵方首搶了 [${hero.name}]，請根據預測，決定我方針對體系！`);
         setPhase('adjust_comp');
         return;
      }
      if (selectedComp && hero.id === selectedComp.core_hero_id) {
         setAdjustReason(`糟糕！我方預定核心 [${hero.name}] 被敵方搶走，請立即轉陣！`);
         setPhase('adjust_comp');
         return;
      }
    }
  };

  // ✅ 新增的：點擊英雄取消選取功能
  const removePick = (heroId, isOurSide) => {
    if (isOurSide) {
      setOurPicks(ourPicks.filter(p => p.id !== heroId));
    } else {
      setEnemyPicks(enemyPicks.filter(p => p.id !== heroId));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 max-w-md mx-auto flex flex-col selection:bg-blue-500/30">
      
      {/* ================= 階段一：初始化 ================= */}
      {phase === 'init' && (
        <div className="text-center pt-20">
          <h1 className="text-2xl font-bold mb-8 tracking-wider">傳說對決 BP 決策系統</h1>
          <button onClick={() => { setIsFirstPick(true); setPhase('initial_comp'); }} className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all p-4 rounded-xl mb-4 font-bold text-lg shadow-lg">
            首選 (藍方先亮牌)
          </button>
          <button onClick={() => { setIsFirstPick(false); setPhase('initial_comp'); }} className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all p-4 rounded-xl font-bold text-lg shadow-lg">
            後選 (紅方拿兩隻)
          </button>
        </div>
      )}

      {/* ================= 階段二：初始陣容選擇 ================= */}
      {phase === 'initial_comp' && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          <h2 className="text-center mb-6 font-bold text-xl text-yellow-400 tracking-wide">Step 1: 選擇初始戰術體系</h2>
          <div className="space-y-3 overflow-y-auto flex-1 pb-4">
            {TACTICS_DB.map(comp => (
              <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('ban'); }} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-blue-500 text-left transition-all active:scale-98">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg">{comp.comp_name}</span>
                  {comp.win_rate && <span className="text-sm font-mono bg-slate-900 text-green-400 px-2 py-1 rounded border border-slate-600">勝率 {comp.win_rate}</span>}
                </div>
                {comp.must_ban.length > 0 && (
                  <div className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                    <ShieldAlert size={14}/> 懼怕/建議禁用: {comp.must_ban.map(id => HERO_DB.find(h=>h.id===id)?.name).join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= 階段三：智慧 Ban 角 ================= */}
      {phase === 'ban' && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          <div className="text-center mb-4 shrink-0">
            <h2 className="font-bold text-xl text-red-400 tracking-wide mb-1">Step 2: 禁用英雄 (Ban)</h2>
            <p className="text-xs text-slate-400">請點擊選擇雙方禁用的英雄 ({bannedHeroes.length}/6)</p>
            <div className="mt-2 bg-slate-800/80 p-2 rounded-lg text-xs text-left border border-slate-700 flex justify-between items-center">
               <span><span className="text-yellow-400 font-bold">🎯 我方陣容：</span>{selectedComp?.comp_name}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 flex-1 pb-4">
            {HERO_DB
              .sort((a, b) => {
                const aMust = selectedComp?.must_ban.includes(a.id) ? 1 : 0;
                const bMust = selectedComp?.must_ban.includes(b.id) ? 1 : 0;
                if (aMust !== bMust) return bMust - aMust;
                const aSys = (a.id === selectedComp?.core_hero_id || selectedComp?.synergy_hero_ids.includes(a.id)) ? 1 : 0;
                const bSys = (b.id === selectedComp?.core_hero_id || selectedComp?.synergy_hero_ids.includes(b.id)) ? 1 : 0;
                return aSys - bSys;
              })
              .map(h => {
                const isBanned = bannedHeroes.find(b => b.id === h.id);
                const isMustBan = selectedComp?.must_ban.includes(h.id);
                const isOurSystem = h.id === selectedComp?.core_hero_id || selectedComp?.synergy_hero_ids.includes(h.id);
                
                let borderColor = 'border-slate-700';
                let badge = null;
                if (isMustBan) { borderColor = 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'; badge = '極度懼怕'; }
                else if (!isOurSystem && !h.trap) { borderColor = 'border-amber-600/50'; badge = '強勢建議'; }

                return (
                  <button key={h.id} onClick={() => {
                      if (isBanned) setBannedHeroes(bannedHeroes.filter(b => b.id !== h.id));
                      else if (bannedHeroes.length < 6) setBannedHeroes([...bannedHeroes, h]);
                    }} 
                    className={`relative p-2 rounded-lg text-center transition-all border flex flex-col justify-center min-h-[60px] ${
                      isBanned ? 'bg-red-950/80 border-red-500 text-red-400 scale-95 opacity-50 grayscale' : `bg-slate-800 text-slate-200 hover:bg-slate-700 ${borderColor}`
                    }`}
                  >
                    <span className="font-bold text-sm">{h.name}</span>
                    {!isBanned && badge && <span className={`absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 rounded-full text-white ${isMustBan ? 'bg-red-600' : 'bg-amber-600'}`}>{badge}</span>}
                  </button>
                );
            })}
          </div>
          
          <button onClick={handleBanComplete} className="w-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all p-4 rounded-xl font-bold text-lg shadow-lg shrink-0 mt-2">
            完成 Ban 角並檢驗陣容
          </button>
        </div>
      )}

      {/* ================= 階段四：動態轉陣 (Adjust Comp) ================= */}
      {phase === 'adjust_comp' && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          <div className="text-center mb-4 shrink-0 bg-red-950/40 p-4 rounded-xl border border-red-500/30">
            <AlertTriangle className="mx-auto text-red-400 mb-2" size={32} />
            <h2 className="font-bold text-lg text-red-400 mb-1">戰術需重新評估</h2>
            <p className="text-xs text-red-200">{adjustReason}</p>
          </div>
          
          {predictedEnemyComps.length > 0 && (
            <div className="mb-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700 shrink-0">
              <div className="text-[11px] text-slate-400 mb-1">敵方高機率體系：</div>
              <div className="font-bold text-red-400">{predictedEnemyComps[0].comp_name}</div>
            </div>
          )}

          <h3 className="font-bold text-sm text-slate-300 mb-3 shrink-0">系統推薦轉移陣容：</h3>
          <div className="space-y-3 overflow-y-auto flex-1 pb-4">
            {TACTICS_DB
              .filter(comp => !bannedHeroes.some(b=>b.id===comp.core_hero_id) && !enemyPicks.some(e=>e.id===comp.core_hero_id))
              .map(comp => {
                let score = 0;
                let tags = [];
                if (finalEnemyComp && comp.advantage_vs.includes(finalEnemyComp.comp_id)) {
                  score += 200; tags.push('🛡️ 完剋敵方體系');
                }
                ourPicks.forEach(p => {
                  if (comp.core_hero_id === p.id) { score += 150; tags.push(`延續核心:${p.name}`); }
                  else if (comp.synergy_hero_ids.includes(p.id)) { score += 50; tags.push(`延續連動:${p.name}`); }
                });
                return { ...comp, score, tags };
              })
              .sort((a,b) => b.score - a.score)
              .map(comp => (
              <button key={comp.comp_id} onClick={() => { setSelectedComp(comp); setPhase('draft'); }} className={`w-full p-4 rounded-xl border text-left transition-all active:scale-98 ${comp.score > 0 ? 'bg-blue-950/40 border-blue-500/50' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg">{comp.comp_name}</span>
                  {comp.score > 0 && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">強烈推薦</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {comp.tags.map((t, i) => <span key={i} className="text-[10px] bg-black/40 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">{t}</span>)}
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setPhase('draft')} className="w-full bg-slate-700 hover:bg-slate-600 p-4 rounded-xl font-bold text-sm mt-2 shrink-0">堅持原陣容 (不更改)</button>
        </div>
      )}

      {/* ================= 階段五：Draft 選角 ================= */}
      {phase === 'draft' && currentTurn < 10 && (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          {bannedHeroes.length > 0 && (
            <div className="flex gap-1.5 mb-2 shrink-0 overflow-x-auto text-[10px] items-center bg-slate-950/50 p-1.5 rounded-lg border border-red-900/30">
              <span className="text-red-500 font-bold ml-1 shrink-0">禁用:</span>
              <div className="flex gap-1 whitespace-nowrap">
                {bannedHeroes.map(b => <span key={b.id} className="bg-red-950/80 text-slate-400 px-1.5 py-0.5 rounded border border-red-900/40">{b.name}</span>)}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-3 bg-slate-800/40 p-2 rounded-lg border border-slate-800 text-xs text-slate-400 shrink-0">
             <div>核心體系: <span className="text-yellow-400 font-bold">{selectedComp ? selectedComp.comp_name : "尚未指定"}</span></div>
             <div>進度: <span className="text-white font-mono">{currentTurn + 1}</span> / 10 手</div>
          </div>
          
          <h2 className={`text-center mb-3 font-bold text-lg tracking-wide px-4 py-2 rounded-xl bg-slate-950/40 border shrink-0 ${draftOrder[currentTurn] === 0 ? "text-blue-400 border-blue-500/20" : "text-red-400 border-red-500/20"}`}>
            {draftOrder[currentTurn] === 0 ? "🔵 輪到我方選擇" : "🔴 輪到敵方選擇"}
          </h2>

          <div className="flex gap-2 mb-4 shrink-0 items-start">
            <div className="flex-1 bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 min-h-[70px]">
              <h3 className="text-[11px] font-bold text-blue-400 mb-1.5 border-b border-blue-500/20 pb-1 flex justify-between">
                <span>我方陣容</span><span>{ourPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {/* ✅ 新增：可點擊移除的按鈕 */}
                {ourPicks.length === 0 ? <span className="text-[10px] text-slate-500">尚無選擇</span> : 
                  ourPicks.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => removePick(p.id, true)} 
                      className="text-[11px] bg-blue-900/60 text-blue-100 px-1.5 py-0.5 rounded border border-blue-700/50 hover:bg-red-900/80 hover:border-red-500 hover:text-red-200 transition-colors group flex items-center gap-1"
                    >
                      {p.name} <span className="opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                    </button>
                  ))
                }
              </div>
            </div>
            
            <div className="flex-1 bg-red-950/20 border border-red-500/10 rounded-lg p-2 min-h-[70px]">
              <h3 className="text-[11px] font-bold text-red-400 mb-1.5 border-b border-red-500/10 pb-1 flex justify-between">
                <span>敵方陣容</span><span>{enemyPicks.length}/5</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {/* ✅ 新增：可點擊移除的按鈕 */}
                {enemyPicks.length === 0 ? <span className="text-[10px] text-slate-500">尚無選擇</span> : 
                  enemyPicks.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => removePick(p.id, false)} 
                      className="text-[11px] bg-red-900/50 text-red-100 px-1.5 py-0.5 rounded border border-red-800/50 hover:bg-red-700 hover:border-red-400 transition-colors group flex items-center gap-1"
                    >
                      {p.name} <span className="opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                    </button>
                  ))
                }
              </div>
              
              {predictedEnemyComps.length > 0 && (
                <div className="pt-2 border-t border-red-900/50">
                  <div className="text-[10px] text-red-400/80 mb-1 font-bold">⚠️ 敵方體系預測：</div>
                  {predictedEnemyComps.slice(0, 1).map((pComp, idx) => (
                    <div key={idx} className="text-[10px] bg-black/40 text-red-200 px-1.5 py-1 rounded border border-red-900/50 mb-1">
                      <span className="font-bold text-red-300">{pComp.comp_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 pb-4">
            {HERO_DB
              .filter(h => !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id) && !bannedHeroes.find(b => b.id === h.id))
              .map(h => {
                let score = 0; let reasons = [];
                const currentTeamPicks = draftOrder[currentTurn] === 0 ? ourPicks : enemyPicks;
                const filledRoles = currentTeamPicks.map(p => p.roles[0]);
                
                if (h.trap) { score -= 2000; }

                const isRoleConflict = h.roles.every(r => filledRoles.includes(r));
                if (isRoleConflict && currentTeamPicks.length > 0) {
                    score -= 1000;
                    reasons.push('路線重疊');
                }
                
                if (draftOrder[currentTurn] === 0) {
                   if (selectedComp) {
                     if (h.id === selectedComp.core_hero_id) { score += 1000; reasons.push('核心必選'); } 
                     else if (selectedComp.synergy_hero_ids.includes(h.id)) { score += 500; reasons.push('陣容連動'); }
                   }
                }

                enemyPicks.forEach(e => { 
                  if (h.counters && h.counters.includes(e.id)) { score += 100; reasons.push(`完剋: ${e.name}`); } 
                });
                
                return { ...h, score, reasons };
              }).sort((a, b) => b.score - a.score)
              .map(h => (
                <button key={h.id} onClick={() => handlePick(h)} className={`p-3 rounded-xl text-left shadow transition-all duration-150 active:scale-95 border flex flex-col justify-between ${
                  h.score >= 500 ? 'bg-blue-950/70 border-blue-500 text-blue-200' : 
                  h.score > 0 ? 'bg-amber-950/60 border-amber-600/80 text-amber-100' : 
                  h.score < 0 ? 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-50 grayscale' : 
                  'bg-slate-800/80 border-slate-700/60'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base">{h.name}</span>
                    <span className="text-[10px] opacity-40 bg-black/30 px-1.5 py-0.5 rounded">{h.roles[0]}</span>
                  </div>
                  <div className="min-h-[18px] flex flex-wrap gap-1 mt-auto">
                    {h.reasons.length > 0 ? h.reasons.map((r, idx) => <span key={idx} className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                      r.includes('路線重疊') ? 'bg-red-900/30 text-red-500 border-red-900/50' :
                      r.includes('連動') || r.includes('核心') ? 'bg-blue-900/40 text-blue-300 border-blue-500/30' : 
                      'bg-black/40 text-yellow-400 border-yellow-500/20'
                    }`}>{r}</span>) : <span className="text-[9px] text-slate-500 italic">無特定戰術理由</span>}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ================= 階段六：分析結算 ================= */}
      {phase === 'analysis' && (
        <div className="text-center pt-4 pb-10 flex flex-col h-full">
          <h2 className="text-2xl font-bold text-green-400 mb-6 tracking-wide shrink-0">⚔️ BP 推演完成 ⚔️</h2>
          
          <div className="flex flex-col gap-4 mb-6 text-left shrink-0">
            <div className="bg-blue-950/30 border border-blue-500/20 p-4 rounded-xl shadow-inner">
              <h3 className="font-bold text-blue-400 border-b border-blue-500/20 pb-2 mb-4 text-lg flex items-center justify-between">
                <span>我方最終陣容</span>
                {selectedComp && <span className="text-sm bg-blue-900/50 text-yellow-400 px-3 py-1 rounded border border-blue-700/50">{selectedComp.comp_name}</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {ourPicks.map((p, i) => (
                  <div key={i} className="text-sm bg-slate-900/50 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-[10px] text-blue-400">{p.roles[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-950/20 border border-red-500/10 p-4 rounded-xl shadow-inner">
              <h3 className="font-bold text-red-400 border-b border-red-500/10 pb-2 mb-4 text-lg flex items-center justify-between">
                <span>敵方最終陣容</span>
                {finalEnemyComp ? <span className="text-sm bg-red-900/40 text-yellow-400 px-3 py-1 rounded border border-red-800/50">{finalEnemyComp.comp_name}</span> : <span className="text-sm bg-slate-800 text-slate-400 px-3 py-1 rounded border border-slate-700">未知體系</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {enemyPicks.map((p, i) => (
                  <div key={i} className="text-sm bg-slate-900/50 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-[10px] text-red-400">{p.roles[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 下半部：💡 教練賽前戰略分析面板 */}
          <div className="bg-slate-800/60 border border-yellow-500/30 p-4 rounded-xl text-left mb-8 shadow-lg">
            <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> 教練賽前戰略分析
            </h3>

            {/* Part 1: 陣容優缺點分析 */}
            <div className="mb-5">
              <h4 className="text-sm font-bold text-slate-300 border-b border-slate-600 pb-1 mb-3">1. 雙方陣容優劣勢</h4>
              <div className="flex flex-col gap-3">
                {/* 我方分析 */}
                <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30 text-xs">
                  <span className="font-bold text-blue-400 block mb-1.5">【我方】{selectedComp ? selectedComp.comp_name : '未定'}</span>
                  {selectedComp?.advantage_comp ? <div className="text-green-300 mb-1"><span className="font-bold mr-1">✅ 優勢：</span>{selectedComp.advantage_comp}</div> : null}
                  {selectedComp?.disadvantage_comp ? <div className="text-red-300"><span className="font-bold mr-1">⚠️ 劣勢：</span>{selectedComp.disadvantage_comp}</div> : null}
                </div>
                
                {/* 敵方分析 */}
                <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/30 text-xs">
                  <span className="font-bold text-red-400 block mb-1.5">【敵方】{finalEnemyComp ? finalEnemyComp.comp_name : '未知體系'}</span>
                  {finalEnemyComp?.advantage_comp ? <div className="text-green-300 mb-1"><span className="font-bold mr-1">✅ 優勢：</span>{finalEnemyComp.advantage_comp}</div> : null}
                  {finalEnemyComp?.disadvantage_comp ? <div className="text-red-300"><span className="font-bold mr-1">⚠️ 劣勢：</span>{finalEnemyComp.disadvantage_comp}</div> : null}
                </div>
              </div>
            </div>

            {/* Part 2: 開局及營運重點 */}
            {selectedComp && (selectedComp.priority_lane || selectedComp.tactical_reason) && (
              <div>
                <h4 className="text-sm font-bold text-slate-300 border-b border-slate-600 pb-1 mb-3">2. 開局與營運重點</h4>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-xs leading-relaxed">
                  {selectedComp.priority_lane && (
                    <div className="mb-2">
                      <span className="font-bold text-purple-400 block mb-0.5">📍 優先幫抓 / 投入資源：</span>
                      <span className="text-slate-200">{selectedComp.priority_lane}</span>
                    </div>
                  )}
                  {selectedComp.tactical_reason && (
                    <div>
                      <span className="font-bold text-amber-400 block mb-0.5">💡 戰術原因：</span>
                      <span className="text-slate-200">{selectedComp.tactical_reason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ✅ 更新的：使用 resetApp 取代 window.location.reload() 避免黑屏 */}
          <button onClick={resetApp} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-auto shrink-0">
            <RefreshCw size={20} /> 準備下一局推演
          </button>
        </div>
      )}
    </div>
  );
}
