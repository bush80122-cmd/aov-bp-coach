import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

// === 英雄表與戰術陣容表 CSV 連結 ===
const HERO_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?output=csv";
const TACTICS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT49yfhDIRZnOdWJOon74-hvLdd4OErtt6T0OH7laKE2DKWEe4gCPxyg-S450uEJs1k3gAOnlBN6EJM/pub?gid=1330847132&single=true&output=csv"; 

export default function App() {
  const [HERO_DB, setHERO_DB] = useState([]);
  const [TACTICS_DB, setTACTICS_DB] = useState([]);
  
  const [phase, setPhase] = useState('init'); // init, comp_select, draft, analysis
  const [isFirstPick, setIsFirstPick] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  
  const [ourPicks, setOurPicks] = useState([]);
  const [enemyPicks, setEnemyPicks] = useState([]);
  
  // 依照首選/後選定義標準 1-2-2-2-2-1 蛇形選角順序 (0代表我方, 1代表敵方)
  const BLUE_ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]; // 首選
  const RED_ORDER  = [1, 0, 0, 1, 1, 0, 0, 1, 1, 0]; // 後選
  
  const currentTurn = ourPicks.length + enemyPicks.length;
  const draftOrder = isFirstPick ? BLUE_ORDER : RED_ORDER;

  // 進階 CSV 安全解析器
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

  // 載入資料庫
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
          win_rate: obj.win_rate || obj['勝率'] || "" 
        }));
        setTACTICS_DB(formattedTactics);
      }).catch(err => console.error(err));
    }
  }, []);

  // === 敵方陣容預測特徵比對邏輯 ===
  const predictedEnemyComps = useMemo(() => {
    if (enemyPicks.length === 0 || TACTICS_DB.length === 0) return [];
    
    return TACTICS_DB.map(comp => {
      let matchScore = 0;
      let matchReasons = [];
      
      // 1. 檢查核心是否出現
      const hasCore = enemyPicks.find(e => e.id === comp.core_hero_id);
      if (hasCore) {
        matchScore += 50;
        matchReasons.push(`核心:${hasCore.name}`);
      }
      
      // 2. 檢查連動特徵是否出現
      const pickedSynergies = enemyPicks.filter(e => comp.synergy_hero_ids.includes(e.id));
      if (pickedSynergies.length > 0) {
        matchScore += (pickedSynergies.length * 20);
        matchReasons.push(`連動:${pickedSynergies.map(p => p.name).join(',')}`);
      }
      
      return { ...comp, matchScore, matchReasons };
    })
    .filter(comp => comp.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 2); // 擷取可能性最高的前兩名
  }, [enemyPicks, TACTICS_DB]);

  const handlePick = (hero) => {
    if (draftOrder[currentTurn] === 0) setOurPicks([...ourPicks, hero]);
    else setEnemyPicks([...enemyPicks, hero]);
    if (currentTurn + 1 === 10) setPhase('analysis');
  };

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
            {
