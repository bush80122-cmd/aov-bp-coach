// 請替換原本的 phase === 'draft' 區塊
{phase === 'draft' && (
  <div>
    <h2 className="text-center mb-4 text-yellow-400 font-bold">
      {selectorMode === 'our' ? "我方選角推薦" : "敵方選角推薦"}
    </h2>
    
    <div className="space-y-3">
      {HERO_DB
        .filter(h => !bannedHeroes.find(b => b.id === h.id) && !ourPicks.find(p => p.id === h.id) && !enemyPicks.find(e => e.id === h.id))
        .map(h => {
          let score = 0;
          let reasons = [];
          
          // 1. 反制權重 (Counter Score)
          enemyPicks.forEach(e => {
            if (h.counters && h.counters.includes(e.id)) {
              score += 150;
              reasons.push(`剋制對面: ${e.name}`);
            }
          });

          // 2. 體系權重 (Synergy Score)
          ourPicks.forEach(o => {
            if (h.synergy && h.synergy.includes(o.id)) {
              score += 100;
              reasons.push(`與 ${o.name} 連動強`);
            }
          });

          // 3. 路線補強權重
          if (ourPicks.length < 5 && h.role === '打野' && !ourPicks.find(p => p.role === '打野')) {
             score += 50; reasons.push("補足打野位");
          }

          return { ...h, score, reasons };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // 只顯示前 5 隻最推薦的
        .map(h => (
          <button 
            key={h.id} 
            onClick={() => handlePick(h)} 
            className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-left hover:border-blue-400 transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">{h.name}</span>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded">{h.role}</span>
            </div>
            {h.reasons.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {h.reasons.map((r, i) => (
                  <span key={i} className="text-[10px] text-amber-300 bg-amber-900/30 px-2 py-1 rounded border border-amber-900/50">
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-[10px] text-slate-500 italic">無特定推薦理由，建議根據版本強度選擇</div>
            )}
          </button>
        ))}
    </div>
  </div>
)}
