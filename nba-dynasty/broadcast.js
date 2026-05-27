/** 中文解说 — 单场逐回合回放 */

const Broadcast = {
  templates: {
    open: [
      "现场球迷已座无虚席，{arena} 今日气氛拉满！",
      "双方首发登场，{away} 客场挑战 {home}。",
      "裁判一声哨响，比赛正式开始！",
    ],
    score: [
      "{player} 中距离得手！{team} {scoreHome}-{scoreAway}",
      "{player} 三分穿心！{team} 扩大优势 {scoreHome}-{scoreAway}",
      "{player} 强硬突破2+1！比分来到 {scoreHome}-{scoreAway}",
      "{player} 空接暴扣！全场沸腾！{scoreHome}-{scoreAway}",
      "{player} 急停跳投命中，{team} 稳住局面 {scoreHome}-{scoreAway}",
    ],
    defense: [
      "{player} 送出钉板大帽！防守强度拉满！",
      "{player} 抢断反击，{team} 发动快攻！",
      "双方陷入防守大战，本节得分偏低。",
    ],
    clutch: [
      "关键时刻！{player} 挺身而出！",
      "最后两分钟，{team} 叫出暂停布置战术。",
      "{player} 大心脏三分！比分 {scoreHome}-{scoreAway}！",
    ],
    endQ: [
      "第一节结束，比分 {scoreHome}-{scoreAway}。",
      "半场结束！{home} {hHalf}-{aHalf} {away}。",
      "三节打完，悬念仍存！{scoreHome}-{scoreAway}。",
    ],
    final: [
      "比赛结束！最终比分 {home} {scoreHome} - {scoreAway} {away}。",
      "今日最佳球员：{mvp}，{mvpStats}。",
      "{winner} 拿下宝贵一胜！",
    ],
  },

  fill(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  },

  pickStarters(team) {
    return [...team.roster]
      .filter(p => !p.injury)
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 5);
  },

  simQuarter(home, away, hr, ar, qNum) {
    const lines = [];
    let hQ = 0, aQ = 0;
    const possessions = rand(22, 28);

    for (let i = 0; i < possessions; i++) {
      const homeBall = Math.random() < 0.52;
      const atk = homeBall ? home : away;
      const def = homeBall ? away : home;
      const atkR = homeBall ? hr : ar;
      const star = pick(this.pickStarters(atk));
      const pMake = 0.38 + (atkR.off - 75) * 0.004 + (homeBall ? 0.02 : 0);

      if (Math.random() < pMake) {
        const pts = Math.random() < 0.35 ? 3 : 2;
        if (homeBall) hQ += pts; else aQ += pts;
        if (Math.random() < 0.4 || qNum === 4) {
          const vars = {
            player: star.name,
            team: TEAMS.find(t => t.id === atk.id)?.name || atk.id,
            scoreHome: hQ,
            scoreAway: aQ,
          };
          const pool = qNum === 4 && i > possessions - 6 ? this.templates.clutch : this.templates.score;
          lines.push(this.fill(pick(pool), vars));
        }
      } else if (Math.random() < 0.12) {
        lines.push(this.fill(pick(this.templates.defense), {
          player: pick(this.pickStarters(def)).name,
          team: TEAMS.find(t => t.id === def.id)?.name,
        }));
      }
    }
    return { hQ, aQ, lines };
  },

  generate(engine, homeId, awayId) {
    const home = engine.getTeam(homeId);
    const away = engine.getTeam(awayId);
    const hr = engine.teamRating(homeId);
    const ar = engine.teamRating(awayId);
    const homeMeta = TEAMS.find(t => t.id === homeId);
    const awayMeta = TEAMS.find(t => t.id === awayId);

    const lines = [];
    lines.push(this.fill(pick(this.templates.open), {
      arena: homeMeta.city,
      home: homeMeta.name,
      away: awayMeta.name,
    }));

    const quarters = [];
    let totalH = 0, totalA = 0;
    const boxScore = {};

    for (let q = 1; q <= 4; q++) {
      const { hQ, aQ, lines: qLines } = this.simQuarter(home, away, hr, ar, q);
      totalH += hQ;
      totalA += aQ;
      quarters.push({ q, home: hQ, away: aQ });
      lines.push(...qLines.slice(0, 4));
      if (q === 2) {
        lines.push(this.fill(pick(this.templates.endQ), {
          scoreHome: totalH, scoreAway: totalA,
          home: homeMeta.name, away: awayMeta.name,
          hHalf: totalH, aHalf: totalA,
        }));
      }
    }

    const homeAdv = 3;
    totalH = Math.max(88, totalH + Math.round(homeAdv / 4));
    totalA = Math.max(88, totalA);
    if (totalH === totalA) totalH += rand(1, 4);

    const homeWin = totalH > totalA;
    const winner = homeWin ? homeMeta.name : awayMeta.name;

    const allStars = [...this.pickStarters(home), ...this.pickStarters(away)];
    const mvp = pick(allStars);
    const mvpPts = rand(22, 38);
    const mvpReb = rand(4, 12);
    const mvpAst = rand(3, 10);

    lines.push(this.fill(pick(this.templates.final), {
      home: homeMeta.name,
      away: awayMeta.name,
      scoreHome: totalH,
      scoreAway: totalA,
      mvp: mvp.name,
      mvpStats: `${mvpPts}分${mvpReb}篮板${mvpAst}助攻`,
      winner,
    }));

    return {
      homeId, awayId,
      homeName: homeMeta.name,
      awayName: awayMeta.name,
      quarters,
      totalH, totalA,
      homeWin,
      lines,
      mvp: { name: mvp.name, pts: mvpPts, reb: mvpReb, ast: mvpAst },
      boxScore,
    };
  },

  applyResult(engine, result) {
    const { homeId, awayId, totalH, totalA, homeWin } = result;
    const home = engine.getTeam(homeId);
    const away = engine.getTeam(awayId);
    if (homeWin) { home.wins++; away.losses++; } else { away.wins++; home.losses++; }
    return { homeScore: totalH, awayScore: totalA, homeWin };
  },
};

window.Broadcast = Broadcast;
