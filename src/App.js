import React, { useState, useEffect, useMemo } from 'react';
import { Layers, RefreshCw, Ban, Target, Flame, Map, Shield, Zap, AlertTriangle, ChevronRight, X, ArrowLeft } from 'lucide-react';

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [phase, setPhase] = useState('init'); // init, ban, comp_select, draft, analysis
  const [isFirstPick, setIsFirstPick] = useState(null);
  const [bannedHeroes, setBannedHeroes] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  const [selectorMode, setSelectorMode] = useState(null);

  // 戰術體系資料庫
  const TACTICAL_COMPS = [
    { id: 'comp_rouie', name: '若伊營運陣', desc: '極致轉線與多打少', corePick: 'rouie', alternateCores: ['elandorr', 'fennik'], synergyHeroes: ['fennik', 'elandorr', 'tachi'], color: 'from-amber-500 to-orange-700', winRate: 100, matches: 2, resultDesc: '2勝0敗' },
    { id: 'comp_alice', name: '愛麗絲保排陣', desc: '護盾與沉默限制刺客', corePick: 'alice', alternateCores: ['telannas', 'krizzix'], synergyHeroes: ['telannas', 'krizzix', 'toro'], color: 'from-pink-500 to-rose-700', winRate: 100, matches: 2, resultDesc: '2勝0敗' },
    { id: 'comp_tank_counter', name: '重裝大坦反制', desc: '讓刺客進場砍不動前排', corePick: 'biron', alternateCores: ['cresht'], synergyHeroes: ['cresht', 'toro'], color: 'from-emerald-600 to-teal-800', winRate: 100, matches: 1, resultDesc: '1勝0敗' },
    { id: 'comp_teemee_farm', name: '提米農錢大核', desc: '提米被動刷錢養射手', corePick: 'teemee', alternateCores: ['capheny'], synergyHeroes: ['capheny'], color: 'from-yellow-500 to-amber-700', winRate: 100, matches: 1, resultDesc: '1勝0敗' },
    { id: 'comp_poke', name: '遠程消耗拉扯陣', desc: '長手消耗搭配機動拉扯', corePick: 'kahlii', alternateCores: ['nakroth'], synergyHeroes: ['nakroth', 'enzo'], color: 'from-blue-500 to-cyan-700', winRate: 100, matches: 1, resultDesc: '1勝0敗' },
    { id: 'comp_jinnar_dive', name: '金納進場爆發陣', desc: '對無拉扯陣容具毀滅性', corePick: 'jinnar', alternateCores: ['rikitor', 'wiro'], synergyHeroes: ['rikitor', 'wiro'], color: 'from-purple-500 to-violet-700', winRate: 50, matches: 2, resultDesc: '1勝1敗' },
  ];

  // 1. 自動從你的 Google Sheet 讀取資料
  useEffect(() => {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=366517811&single=true&output=csv";
    fetch(csvUrl)
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          let obj = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return {
            ...obj,
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

  // 2. 核心推薦邏輯
  const recommendations = useMemo(() => {
    if (phase !== 'draft' || selectorMode !== 'our') return [];
    
    const hasSupport = ourPicks.some(hero => hero.role === '輔助');
    const hasMid = ourPicks.some(hero => hero.role === '中路');
    const hasAdc = ourPicks.some(hero => hero.role === '射手');
    const hasJungle = ourPicks.some(hero => hero.role === '打野');

    return HERO_DB.filter(h => !bannedHeroes.some(b => b.id === h.id) && !ourPicks.some(p => p.id === h.id) && !enemyPicks.some(p => p.id === h.id))
      .map(hero => {
        let score = 0;
        let reasons = [];
        if (hero.trap) { score -= 2000; reasons.push('實戰證明：陷阱'); }
        if (hasSupport && hero.role === '輔助') { score -= 1500; reasons.push('已有輔助'); }
        else if (hasMid && hero.role === '中路') { score -= 1000; reasons.push('已有中路'); }
        else if (hasAdc && hero.role === '射手') { score -= 1000; reasons.push('已有射手'); }
        else if (hasJungle && hero.role === '打野') { score -= 1000; reasons.push('已有打野'); }
        
        if (ourPicks.length === 0 && selectedComp) {
            if (selectedComp.corePick === hero.id) { score += 500; reasons.push('100% 勝率核心'); }
            else if (selectedComp.alternateCores?.includes(hero.id)) { score += 400; reasons.push('高勝率組件'); }
        }
        enemyPicks.forEach(e => {
            if (hero.counters.includes(e.id)) { score += 250; reasons.push(`逆向完剋: ${e.name}`); }
        });
        return { ...hero, score, reasons };
      }).sort((a,b) => b.score - a.score).slice(0, 6);
  }, [ourPicks, enemyPicks, phase, selectorMode, bannedHeroes, selectedComp]);

  // 3. 戰術教練分析邏輯
  const tacticalAnalysis = useMemo(() => {
    if (phase !== 'analysis') return null;
    return {
      junglePath: "建議根據對面打野與凱撒路壓制力決定，若我方陣容後期強，前期藍開避戰。",
      focusLane: "依據射手經濟發育情況，優先集結強勢路取得破塔優勢。",
      defenseFocus: "嚴防對面強衝與隱身刺客。",
      comboTips: "前排先手騙招，後排輸出跟進。"
    };
  }, [phase]);

  // 4. 蛇形選角切換邏輯
  const handlePick = (hero) => {
    let newOur = [...ourPicks];
    let newEnemy = [...enemyPicks];
    if (selectorMode === 'our') newOur.push(hero); else newEnemy.push(hero);
    setOurPicks(newOur);
    setEnemyPicks(newEnemy);
    if (newOur.length + newEnemy.length === 10) setPhase('analysis');
    else setSelectorMode(prev => prev === 'our' ? 'enemy' : 'our');
  };

  const removePick = (team, index) => {
    if (team === 'our') setOurPicks(ourPicks.filter((_, i) => i !== index));
    else setEnemyPicks(enemyPicks.filter((_, i) => i !== index));
  };

  const resetGame = () => {
    setPhase('init'); setBannedHeroes([]); setOurPicks([]); setEnemyPicks([]); setSelectedComp(null);
  };

  // UI 渲染 (這裡簡單渲染，實際顯示邏輯參考前幾則的完整版)
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
       {phase === 'init' && (
         <div className="text-center pt-20">
            <h1 className="text-2xl font-bold mb-6">傳說對決BP教練系統</h1>
            <button onClick={() => { setIsFirstPick(true); setPhase('ban'); }} className="block w-full bg-blue-600 p-4 rounded-xl mb-4">藍方首選</button>
            <button onClick={() => { setIsFirstPick(false); setPhase('ban'); }} className="block w-full bg-red-600 p-4 rounded-xl">紅方後選</button>
         </div>
       )}
       {phase === 'ban' && (
         <div className="text-center">
            <h2 className="mb-4">禁用英雄 (點擊取消)</h2>
            <div className="grid grid-cols-4 gap-2">
                {HERO_DB.map(h => (
                    <button key={h.id} onClick={() => setBannedHeroes([...bannedHeroes, h])} className="bg-slate-800 p-2 text-xs">{h.name}</button>
                ))}
            </div>
            <button onClick={() => isFirstPick ? setPhase('comp_select') : setPhase('draft')} className="mt-6 bg-green-600 p-4 w-full">確認禁用並下一步</button>
         </div>
       )}
       {phase === 'draft' && (
         <div className="text-center">
             <h2 className="mb-4">{selectorMode === 'our' ? "我方選擇" : "敵方選擇"}</h2>
             <div className="grid grid-cols-3 gap-2">
                 {recommendations.map(r => <button key={r.id} onClick={() => handlePick(r)} className="bg-blue-800 p-2">{r.name}</button>)}
             </div>
         </div>
       )}
    </div>
  );
}
