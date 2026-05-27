/** 游戏引擎 — 模拟、财务、交易 */

class GameEngine {
  constructor() {
    this.state = null;
  }

  newGame(teamId) {
    const teamMeta = TEAMS.find(t => t.id === teamId);
    const league = {};

    TEAMS.forEach(t => {
      const roster = buildRoster(t.id, t.prestige);
      const payroll = roster.reduce((s, p) => s + p.salary, 0);
      league[t.id] = {
        ...t,
        roster,
        chemistry: initTeamChemistry(roster),
        wins: t.record ? t.record[0] : rand(25, 55),
        losses: t.record ? t.record[1] : rand(27, 57),
        payroll,
        cash: rand(20, 80),
        fans: rand(55, 92),
        media: rand(40, 85),
        arena: { capacity: rand(18000, 21000), ticketPrice: rand(45, 120), upgrades: 0 },
        coach: { ...pick(COACHES) },
        hardCap: null,
        picks: [{ year: 2026, round: 1, pick: rand(1, 30) }, { year: 2027, round: 1, pick: rand(1, 30) }],
      };
    });

    // 重置 STAR_ROSTERS 深拷贝问题 — buildRoster mutates; re-init for next game handled in main

    this.state = {
      userTeamId: teamId,
      season: 2026,
      phase: "regular",
      week: 0,
      day: "2026-07-01",
      league,
      log: ["🎮 2026 offseason 开始 — 尼克斯与雷霆/马刺仍在总决赛舞台，而你将书写新的王朝篇章"],
      freeAgents: FREE_AGENTS_POOL.map(fa => ({ ...fa, id: `FA_${fa.name.replace(/\s/g, "")}` })),
      draftProspects: DRAFT_PROSPECTS.map((p, i) => ({ ...p, id: `DR_${i}` })),
      tradeOffer: { mine: [], theirs: [], partner: null },
      decisions: [],
      playoffs: null,
      championships: 0,
      dynastyName: `${teamMeta.city}${teamMeta.name}王朝`,
      lastBroadcast: null,
    };

    this.addDecision("选择休赛期策略", [
      { label: "争冠模式（奢侈税预警）", fn: () => this.setStrategy("win") },
      { label: "稳健发展", fn: () => this.setStrategy("build") },
      { label: "摆烂抢状元", fn: () => this.setStrategy("tank") },
    ]);

    return this.state;
  }

  setStrategy(mode) {
    const t = this.state.league[this.state.userTeamId];
    if (mode === "win") {
      t.fans += 5;
      this.log("🏆 老板批准争冠预算，球迷兴奋不已");
    } else if (mode === "tank") {
      t.fans -= 8;
      this.log("📉 重建计划公布，赛季票续费率下降");
    } else {
      this.log("⚖️ 保持财务灵活，稳步补强");
    }
    this.state.decisions = this.state.decisions.filter(d => d.title !== "选择休赛期策略");
  }

  loadState(state) {
    this.state = state;
    if (!this.state.decisions) this.state.decisions = [];
    Object.values(this.state.league).forEach(t => {
      if (!t.chemistry) t.chemistry = initTeamChemistry(t.roster);
      t.roster.forEach(p => {
        if (!p.agent) p.agent = { name: pick(AGENT_NAMES), type: pick(AGENT_TYPES) };
      });
    });
    if (this.state.phase === "playoffs") this.ensurePlayoffSchedules();
    return this.state;
  }

  getTeam(id) { return this.state.league[id]; }
  userTeam() { return this.getTeam(this.state.userTeamId); }

  chemistryBonus(teamId) {
    const t = this.getTeam(teamId);
    if (!t.chemistry?.length) return 0;
    const avg = t.chemistry.reduce((s, c) => s + c.level, 0) / t.chemistry.length;
    const bonusSum = t.chemistry.reduce((s, c) => s + (c.level > 70 ? c.bonus : 0), 0);
    return Math.round(avg / 25 + bonusSum / 2);
  }

  teamPayroll(teamId) {
    return this.getTeam(teamId).roster.reduce((s, p) => s + p.salary, 0);
  }

  capStatus(teamId) {
    const payroll = this.teamPayroll(teamId);
    let level = "under";
    if (payroll >= CBA.secondApron) level = "secondApron";
    else if (payroll >= CBA.firstApron) level = "firstApron";
    else if (payroll >= CBA.luxuryTax) level = "tax";
    else if (payroll >= CBA.salaryCap) level = "overCap";
    return { payroll, level };
  }

  teamRating(teamId) {
    const t = this.getTeam(teamId);
    const healthy = t.roster.filter(p => !p.injury);
    if (!healthy.length) return { ovr: 50, off: 50, def: 50, chem: 50 };
    const off = healthy.reduce((s, p) => s + p.off, 0) / healthy.length;
    const def = healthy.reduce((s, p) => s + p.def, 0) / healthy.length;
    const ovr = healthy.reduce((s, p) => s + p.ovr, 0) / healthy.length;
    const chem = healthy.reduce((s, p) => s + p.morale, 0) / healthy.length;
    const c = t.coach.bonus;
    const chemB = this.chemistryBonus(teamId);
    return {
      ovr: Math.round(ovr + (c.off + c.def) / 2 + chemB * 0.3),
      off: Math.round(off + (c.off || 0) + chemB * 0.2),
      def: Math.round(def + (c.def || 0) + chemB * 0.15),
      chem: Math.round(chem + (c.morale || 0) + chemB),
    };
  }

  /** 解说直播单场 */
  simGameBroadcast(homeId, awayId) {
    const broadcast = Broadcast.generate(this, homeId, awayId);
    Broadcast.applyResult(this, broadcast);
    this.state.lastBroadcast = broadcast;
    const userId = this.state.userTeamId;
    if (homeId === userId || awayId === userId) {
      const win = (homeId === userId && broadcast.homeWin) || (awayId === userId && !broadcast.homeWin);
      const us = this.userTeam();
      if (win) us.fans = Math.min(99, us.fans + rand(1, 3));
      else us.fans = Math.max(20, us.fans - rand(0, 2));
      this.maybeInjury(us);
      const opp = homeId === userId ? awayId : homeId;
      const oppName = TEAMS.find(t => t.id === opp).name;
      const ourScore = homeId === userId ? broadcast.totalH : broadcast.totalA;
      const oppScore = homeId === userId ? broadcast.totalA : broadcast.totalH;
      this.log(`${win ? "✅" : "❌"} 解说直播：${win ? "胜" : "负"} ${oppName} ${ourScore}-${oppScore}`, win ? "win" : "loss");
    }
    return broadcast;
  }

  simNextUserGame() {
    const userId = this.state.userTeamId;
    const s = this.state;
    if (s.phase === "playoffs" && s.playoffs) {
      const series = this.findUserSeries();
      const game = series ? PlayoffSchedule.getNextGame(series) : null;
      if (series && game && !series.done) {
        const b = this.simGameBroadcast(game.home, game.away);
        this.recordPlayoffGame(series, b, game);
        s.day = game.date;
        return { type: "playoff", broadcast: b, scheduleGame: game };
      }
    }
    const opp = this.scheduleMatchup(userId, s.week);
    const home = Math.random() > 0.5;
    const b = home
      ? this.simGameBroadcast(userId, opp)
      : this.simGameBroadcast(opp, userId);
    return { type: "regular", broadcast: b };
  }

  simGame(homeId, awayId) {
    const home = this.getTeam(homeId);
    const away = this.getTeam(awayId);
    const hr = this.teamRating(homeId);
    const ar = this.teamRating(awayId);
    const homeAdv = 3;
    const hScore = Math.max(85, Math.round(95 + (hr.ovr - 75) * 0.6 + homeAdv + rand(-12, 12)));
    const aScore = Math.max(85, Math.round(95 + (ar.ovr - 75) * 0.6 + rand(-12, 12)));
    const homeWin = hScore > aScore;
    if (homeWin) { home.wins++; away.losses++; } else { away.wins++; home.losses++; }

    if (homeId === this.state.userTeamId || awayId === this.state.userTeamId) {
      const us = homeId === this.state.userTeamId ? home : away;
      const opp = homeId === this.state.userTeamId ? away : home;
      const ourScore = homeId === this.state.userTeamId ? hScore : aScore;
      const oppScore = homeId === this.state.userTeamId ? aScore : hScore;
      const win = ourScore > oppScore;
      const loc = homeId === this.state.userTeamId ? "主场" : "客场";
      this.log(`${win ? "✅" : "❌"} ${loc} ${win ? "胜" : "负"} ${opp.name} ${ourScore}-${oppScore}`, win ? "win" : "loss");
      if (win) us.fans = Math.min(99, us.fans + rand(0, 2));
      else us.fans = Math.max(20, us.fans - rand(0, 1));
      this.maybeInjury(us);
    }
    return { homeScore: hScore, awayScore: aScore, homeWin };
  }

  maybeInjury(team) {
    if (Math.random() > 0.08) return;
    const candidates = team.roster.filter(p => !p.injury);
    if (!candidates.length) return;
    const p = pick(candidates);
    p.injury = { weeks: rand(1, 8), type: pick(["脚踝", "膝盖", "腹股沟", "手指"]) };
    if (team === this.userTeam()) {
      this.log(`🚑 ${p.name} 受伤 (${p.injury.type})，预计缺席 ${p.injury.weeks} 周`);
    }
  }

  scheduleMatchup(userId, week) {
    const teams = TEAMS.map(t => t.id).filter(id => id !== userId);
    return pick(teams);
  }

  simWeek() {
    const s = this.state;
    if (s.phase === "playoffs") return this.simPlayoffRound();

    s.week++;
    s.day = this.addDays(s.day, 7);
    const userId = s.userTeamId;

    for (let i = 0; i < 7; i++) {
      const opp = this.scheduleMatchup(userId, s.week);
      const home = Math.random() > 0.5;
      if (home) this.simGame(userId, opp);
      else this.simGame(opp, userId);
    }

    TEAMS.forEach(t => {
      if (t.id === userId) return;
      for (let g = 0; g < 7; g++) {
        const a = pick(TEAMS).id;
        let b = pick(TEAMS).id;
        while (b === a) b = pick(TEAMS).id;
        if (Math.random() > 0.5) this.simGame(a, b);
        else this.simGame(b, a);
      }
    });

    this.processInjuries();
    this.processFinance(userId);
    this.randomEvent();
    if (Math.random() < 0.22) this.triggerAgentEvent();
    this.checkStoryEvents();

    if (s.week >= 82 && s.phase !== "playoffs") {
      s.phase = "playoffs";
      this.initPlayoffs();
      this.log("🏁 常规赛结束！季后赛 bracket 已生成 — 前往「联盟」查看");
    }
    return s;
  }

  addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  processInjuries() {
    Object.values(this.state.league).forEach(t => {
      t.roster.forEach(p => {
        if (p.injury) {
          p.injury.weeks--;
          if (p.injury.weeks <= 0) {
            p.injury = null;
            if (t === this.userTeam()) this.log(`💪 ${p.name} 伤愈复出`);
          }
        }
      });
    });
  }

  processFinance(userId) {
    const t = this.getTeam(userId);
    const homeGames = 3;
    const revenue = homeGames * t.arena.capacity * t.arena.ticketPrice * 0.001 * (t.fans / 80);
    t.cash += revenue;
    const cap = this.capStatus(userId);
    if (cap.level === "tax") {
      const tax = (cap.payroll - CBA.luxuryTax) * 1.5;
      t.cash -= tax;
      if (tax > 0) this.log(`💸 奢侈税账单 -$${tax.toFixed(1)}M`);
    }
    if (cap.level === "secondApron") {
      this.log("⚠️ 已超过第二围裙！交易与中产特例受限");
    }
  }

  randomEvent() {
    if (Math.random() > 0.35) return;
    const ev = pick(EVENTS_RANDOM);
    const t = this.userTeam();
    if (ev.effect.media) t.media = Math.max(0, Math.min(100, t.media + ev.effect.media));
    if (ev.effect.fans) t.fans = Math.max(0, Math.min(100, t.fans + ev.effect.fans));
    if (ev.effect.cash) t.cash += ev.effect.cash;
    if (ev.effect.moraleAll) t.roster.forEach(p => p.morale = Math.min(99, p.morale + ev.effect.moraleAll));
    if (ev.effect.injury) this.maybeInjury(t);
    this.log(`📌 ${ev.text}`);
  }

  checkStoryEvents() {
    const hit = STORY_EVENTS.find(e => e.week === this.state.week);
    if (hit) this.log(hit.text);
  }

  trainTeam() {
    const t = this.userTeam();
    t.roster.forEach(p => {
      if (p.age < 26 && !p.injury) {
        const gain = rand(0, 1);
        p.ovr = Math.min(99, p.ovr + gain);
        p.off = Math.min(99, p.off + gain);
        p.def = Math.min(99, p.def + (gain ? rand(0, 1) : 0));
      }
    });
    t.cash -= 0.5;
    this.log("🏋️ 全队加练完成，年轻球员获得成长");
  }

  restStars() {
    const t = this.userTeam();
    const stars = [...t.roster].sort((a, b) => b.ovr - a.ovr).slice(0, 5);
    stars.forEach(p => { p.morale = Math.min(99, p.morale + 3); });
    this.log("😴 主力轮休，降低伤病风险");
  }

  signFreeAgent(faId, years, salary) {
    const fa = this.state.freeAgents.find(f => f.id === faId);
    if (!fa) return { ok: false, msg: "球员不存在" };
    const t = this.userTeam();
    const cap = this.capStatus(this.state.userTeamId);
    if (cap.level === "secondApron") return { ok: false, msg: "第二围裙球队无法使用中产特例签约" };
    if (t.roster.length >= 15) return { ok: false, msg: "阵容已满(15人)" };
    if (salary < fa.ask * 0.85) return { ok: false, msg: `${fa.name} 拒绝了报价（期望 ≥ $${fa.ask}M）` };
    if (this.teamPayroll(this.state.userTeamId) + salary > CBA.firstApron && years > 2) {
      return { ok: false, msg: "超过第一围裙，长期合同受限" };
    }

    const player = createPlayer({ ...fa, salary, years }, this.state.userTeamId);
    t.roster.push(player);
    this.state.freeAgents = this.state.freeAgents.filter(f => f.id !== faId);
    t.media += 2;
    this.log(`✍️ 签约 ${fa.name} — ${years}年 $${salary}M/年`);
    return { ok: true };
  }

  releasePlayer(playerId) {
    const t = this.userTeam();
    const idx = t.roster.findIndex(p => p.id === playerId);
    if (idx < 0) return;
    const p = t.roster[idx];
    t.roster.splice(idx, 1);
    t.cash -= p.salary * 0.5;
    t.fans -= 2;
    this.log(`👋 裁掉 ${p.name}，承担50%死工资`);
  }

  proposeTrade(partnerId, myIds, theirIds) {
    const me = this.userTeam();
    const them = this.getTeam(partnerId);
    const capMe = this.capStatus(this.state.userTeamId);
    if (capMe.level === "secondApron" && (myIds.length > 1 || theirIds.length > 1)) {
      return { ok: false, msg: "第二围裙球队不可聚合薪资交易" };
    }

    const myPlayers = myIds.map(id => me.roster.find(p => p.id === id)).filter(Boolean);
    const theirPlayers = theirIds.map(id => them.roster.find(p => p.id === id)).filter(Boolean);
    if (!myPlayers.length || !theirPlayers.length) return { ok: false, msg: "请选择球员" };

    const mySal = myPlayers.reduce((s, p) => s + p.salary, 0);
    const theirSal = theirPlayers.reduce((s, p) => s + p.salary, 0);
    if (Math.abs(mySal - theirSal) > 5) return { ok: false, msg: "薪资不匹配（差额需在 $5M 内）" };

    const myVal = myPlayers.reduce((s, p) => s + p.ovr, 0);
    const theirVal = theirPlayers.reduce((s, p) => s + p.ovr, 0);
    const accept = theirVal - myVal + rand(-5, 10) > 0;

    if (!accept) return { ok: false, msg: `${them.name} 拒绝了交易提案` };

    myPlayers.forEach(p => { p.teamId = partnerId; });
    theirPlayers.forEach(p => { p.teamId = this.state.userTeamId; });
    me.roster = me.roster.filter(p => !myIds.includes(p.id)).concat(theirPlayers);
    them.roster = them.roster.filter(p => !theirIds.includes(p.id)).concat(myPlayers);
    me.media += 3;
    this.log(`🔄 交易完成！送出 ${myPlayers.map(p => p.name).join("、")}，得到 ${theirPlayers.map(p => p.name).join("、")}`);
    return { ok: true };
  }

  draftPlayer(prospectId) {
    const p = this.state.draftProspects.find(x => x.id === prospectId);
    if (!p) return;
    const t = this.userTeam();
    const player = createPlayer({
      name: p.name, pos: p.pos, age: p.age,
      ovr: p.ovr, off: p.ovr - 2, def: p.ovr - 4,
      salary: 8, years: 4,
    }, this.state.userTeamId);
    t.roster.push(player);
    this.state.draftProspects = this.state.draftProspects.filter(x => x.id !== prospectId);
    this.log(`🎓 选秀选中 ${p.name}（${p.scout}）`);
  }

  upgradeArena(type) {
    const t = this.userTeam();
    const costs = { seats: 15, luxury: 25, jumbotron: 10 };
    const cost = costs[type];
    if (t.cash < cost) return { ok: false, msg: "现金不足" };
    t.cash -= cost;
    if (type === "seats") t.arena.capacity += 1500;
    if (type === "luxury") { t.arena.ticketPrice += 15; t.fans += 5; }
    if (type === "jumbotron") t.fans += 8;
    t.arena.upgrades++;
    this.log(`🏟️ 球馆升级：${type === "seats" ? "扩容" : type === "luxury" ? " luxury suite" : " 大屏"}完成`);
    return { ok: true };
  }

  hireCoach(coach) {
    const t = this.userTeam();
    if (t.cash < coach.salary) return { ok: false, msg: "无法承担教练薪资" };
    t.coach = { ...coach };
    t.cash -= coach.salary;
    this.log(`📋 聘请 ${coach.name}（${coach.style}体系）`);
    return { ok: true };
  }

  seedConference(conf) {
    const seeded = TEAMS.filter(t => t.conf === conf)
      .map(t => ({ id: t.id, w: this.getTeam(t.id).wins }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 8);
    const pairs = [[0, 7], [1, 6], [2, 5], [3, 4]];
    return pairs.map(([hi, lo]) => this.createSeries(seeded[hi].id, seeded[lo].id));
  }

  createSeries(t1, t2) {
    return {
      homeTeam: t1,
      awayTeam: t2,
      winsHome: 0,
      winsAway: 0,
      done: false,
      winner: null,
      games: [],
    };
  }

  initPlayoffs() {
    const start = this.addDays(this.state.day, 3);
    this.state.playoffs = {
      roundIndex: 0,
      roundNames: ["首轮", "半决赛", "分区决赛", "总决赛"],
      east: { R1: this.seedConference("East"), CSF: [], CF: [], champ: null },
      west: { R1: this.seedConference("West"), CSF: [], CF: [], champ: null },
      finals: null,
      history: [],
      currentDate: start,
      masterSchedule: [],
    };
    PlayoffSchedule.initAllSchedules(this.state.playoffs, start);
    this.state.day = start;
    this.log(`🏀 季后赛对阵出炉！首轮将于 ${PlayoffSchedule.formatDateCN(start)} 开打 — 查看「季后赛赛程」`);
  }

  currentRoundKey() {
    return ["R1", "CSF", "CF"][this.state.playoffs.roundIndex] || "FINALS";
  }

  getActiveSeries(conf) {
    const po = this.state.playoffs;
    if (!po) return [];
    if (po.roundIndex >= 3) return po.finals ? [po.finals] : [];
    const key = this.currentRoundKey();
    return po[conf.toLowerCase()]?.[key] || [];
  }

  findUserSeries() {
    const uid = this.state.userTeamId;
    const conf = TEAMS.find(t => t.id === uid).conf;
    const all = this.getActiveSeries(conf);
    if (this.state.playoffs.roundIndex >= 3 && this.state.playoffs.finals) {
      const f = this.state.playoffs.finals;
      if (f.homeTeam === uid || f.awayTeam === uid) return f;
    }
    return all.find(s => !s.done && (s.homeTeam === uid || s.awayTeam === uid));
  }

  applySeriesResult(series, gameHome, gameAway, homeWin, scoreStr) {
    const g = {
      home: gameHome,
      away: gameAway,
      score: scoreStr,
      winner: homeWin ? gameHome : gameAway,
      gameNum: series.games.length + 1,
    };
    series.games.push(g);
    if (homeWin) {
      if (gameHome === series.homeTeam) series.winsHome++;
      else series.winsAway++;
    } else {
      if (gameAway === series.homeTeam) series.winsHome++;
      else series.winsAway++;
    }
    if (series.winsHome >= 4) { series.done = true; series.winner = series.homeTeam; }
    if (series.winsAway >= 4) { series.done = true; series.winner = series.awayTeam; }
    const wName = TEAMS.find(t => t.id === series.winner)?.name;
    if (series.done) {
      this.log(`🏆 系列赛结束：${wName} 晋级 (${series.winsHome}-${series.winsAway})`);
      this.state.playoffs.history.push({
        round: series.roundKey || this.currentRoundKey(),
        winner: series.winner,
        score: `${series.winsHome}-${series.winsAway}`,
      });
      PlayoffSchedule.rebuildMaster(this.state.playoffs);
    }
  }

  recordPlayoffGame(series, broadcast, scheduleGame = null) {
    const scoreStr = `${broadcast.totalH}-${broadcast.totalA}`;
    if (scheduleGame) {
      PlayoffSchedule.markPlayed(series, scheduleGame, {
        homeScore: broadcast.totalH,
        awayScore: broadcast.totalA,
        homeWin: broadcast.homeWin,
      });
      scheduleGame.score = scoreStr;
    }
    this.applySeriesResult(series, broadcast.homeId, broadcast.awayId, broadcast.homeWin, scoreStr);
    const gn = scheduleGame?.gameNum || series.games.length;
    this.log(`📅 季后赛 G${gn}：${scoreStr}（${PlayoffSchedule.formatDateCN(scheduleGame?.date || this.state.day)}）`);
  }

  recordPlayoffGameResult(series, game, result) {
    PlayoffSchedule.markPlayed(series, game, result);
    game.score = `${result.homeScore}-${result.awayScore}`;
    this.applySeriesResult(series, game.home, game.away, result.homeWin, game.score);
    this.log(`📅 ${game.roundLabel} G${game.gameNum}：${game.score}`);
  }

  advanceConference(conf) {
    const po = this.state.playoffs;
    const key = this.currentRoundKey();
    const series = (po[conf][key] || []).filter(s => s.done);
    if (!series.length) return;
    const winners = series.map(s => s.winner);
    const nextKey = { R1: "CSF", CSF: "CF", CF: null }[key];
    if (!nextKey) {
      po[conf].champ = winners[0] || null;
      return;
    }
    po[conf][nextKey] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        const s = this.createSeries(winners[i], winners[i + 1]);
        PlayoffSchedule.attachNewSeries(s, nextKey, po);
        po[conf][nextKey].push(s);
      }
    }
    PlayoffSchedule.rebuildMaster(po);
  }

  checkConferenceChamps() {
    const po = this.state.playoffs;
    const key = this.currentRoundKey();
    if (key !== "CF") return;
    if (po.east.CF?.length === 1 && po.east.CF[0].done) po.east.champ = po.east.CF[0].winner;
    if (po.west.CF?.length === 1 && po.west.CF[0].done) po.west.champ = po.west.CF[0].winner;
    if (po.east.champ && po.west.champ && !po.finals) {
      po.roundIndex = 3;
      po.finals = this.createSeries(po.west.champ, po.east.champ);
      PlayoffSchedule.attachNewSeries(po.finals, "FINALS", po);
      const fd = po.roundDates.FINALS;
      this.log(`🔥 总决赛 ${PlayoffSchedule.formatDateCN(fd)} 开打：${TEAMS.find(t => t.id === po.west.champ).name} vs ${TEAMS.find(t => t.id === po.east.champ).name}`);
    }
  }

  simPlayoffRound() {
    const s = this.state;
    s.week++;
    const po = s.playoffs;
    const key = this.currentRoundKey();
    const uid = s.userTeamId;
    let lastDate = s.day;

    const active = PlayoffSchedule.getAllActiveSeries(po);
    active.forEach(series => {
      const game = PlayoffSchedule.getNextGame(series);
      if (!game) return;
      if (series.homeTeam === uid || series.awayTeam === uid) return;
      const r = this.simGame(game.home, game.away);
      this.recordPlayoffGameResult(series, game, r);
      lastDate = game.date;
    });

    s.day = lastDate;
    po.currentDate = PlayoffSchedule.getNextPlayoffDate(po);

    if (po.roundIndex >= 3 && po.finals?.done) {
      return this.endSeason(po.finals.winner);
    }

    const allDone = po.roundIndex >= 3
      ? po.finals?.done
      : ["east", "west"].every(c => (po[c][key] || []).every(x => x.done));

    if (allDone) {
      this.advanceConference("east");
      this.advanceConference("west");
      if (key === "CF") this.checkConferenceChamps();
      else if (po.roundIndex < 2) po.roundIndex++;
    }
    this.checkConferenceChamps();

    const userNext = PlayoffSchedule.getUpcomingUserGame(po, uid);
    if (userNext) {
      this.log(`📆 你的下一场：${userNext.roundLabel} G${userNext.gameNum} · ${PlayoffSchedule.formatDateCN(userNext.date)} · ${userNext.home === uid ? "主场" : "客场"} vs ${TEAMS.find(t => t.id === (userNext.home === uid ? userNext.away : userNext.home))?.name}`);
    }
    return s;
  }

  getPlayoffScheduleView() {
    const po = this.state?.playoffs;
    if (!po) return null;
    return {
      roundDates: po.roundDates,
      currentDate: po.currentDate,
      master: po.masterSchedule || [],
      userGames: PlayoffSchedule.getUserSchedule(po, this.state.userTeamId),
      userNext: PlayoffSchedule.getUpcomingUserGame(po, this.state.userTeamId),
      userSeries: this.findUserSeries(),
    };
  }

  ensurePlayoffSchedules() {
    const po = this.state?.playoffs;
    if (!po) return;
    const start = po.scheduleStart || po.roundDates?.R1 || this.state.day;
    po.scheduleStart = start;
    let needsRebuild = !po.masterSchedule?.length;
    if (!po.roundDates) {
      po.roundDates = {};
      Object.entries(PLAYOFF_ROUND_DAYS).forEach(([k, off]) => {
        po.roundDates[k] = PlayoffSchedule.addDays(start, off);
      });
      needsRebuild = true;
    }
    ["east", "west"].forEach(conf => {
      ["R1", "CSF", "CF"].forEach(k => {
        (po[conf][k] || []).forEach(series => {
          if (!series.schedule) {
            PlayoffSchedule.attachNewSeries(series, k, po);
            needsRebuild = true;
          }
        });
      });
    });
    if (po.finals && !po.finals.schedule) {
      PlayoffSchedule.attachNewSeries(po.finals, "FINALS", po);
      needsRebuild = true;
    }
    if (needsRebuild) PlayoffSchedule.rebuildMaster(po);
  }

  endSeason(championId) {
    const s = this.state;
    const champ = TEAMS.find(t => t.id === championId);
    if (championId === s.userTeamId) {
      s.championships++;
      this.log(`🏆🏆🏆 恭喜！夺得第 ${s.championships} 座总冠军！`);
    } else {
      this.log(`🏆 ${champ.name} 夺得总冠军，休赛期即将开始`);
    }
    s.phase = "regular";
    s.week = 0;
    s.season++;
    s.playoffs = null;
    Object.values(s.league).forEach(t => {
      t.wins = 0;
      t.losses = 0;
      if (!t.chemistry) t.chemistry = initTeamChemistry(t.roster);
    });
    this.addDecision(`${s.season - 1} 赛季总结`, [
      { label: "继续王朝征程", fn: () => { s.decisions = []; } },
    ]);
    return s;
  }

  triggerAgentEvent() {
    const t = this.userTeam();
    const stars = [...t.roster].filter(p => !p.injury).sort((a, b) => b.ovr - a.ovr);
    if (!stars.length) return;
    const p = pick(stars.slice(0, 6));
    const ev = pick(AGENT_EVENTS);
    const title = ev.title;
    const text = ev.text(p);

    const decisionTitle = `${title}：${p.name}`;
    this.addDecision(decisionTitle, [
      {
        label: "同意/agent友好",
        fn: () => this.resolveAgent(ev.effect, p, true),
      },
      {
        label: "拒绝/冷处理",
        fn: () => this.resolveAgent(ev.effect, p, false),
      },
    ]);
    this.log(`📞 经纪人事件：${text}`);
  }

  resolveAgent(effect, player, accept) {
    const t = this.userTeam();
    if (effect === "extension" && accept) {
      player.salary = +(player.salary * 1.15).toFixed(1);
      player.yearsLeft += 1;
      player.morale = Math.min(99, player.morale + 8);
      this.log(`✍️ 与 ${player.name} 续约，薪资涨至 $${player.salary}M`);
    } else if (effect === "extension" && !accept) {
      player.morale -= 12;
      this.log(`${player.name} 对管理层不满`);
    } else if (effect === "trade" && accept) {
      this.log(`🔄 将 ${player.name} 列入交易清单`);
      t.media -= 3;
    } else if (effect === "trade" && !accept) {
      player.morale = Math.min(99, player.morale + 5);
    } else if (effect === "media" && accept) {
      t.cash += 3;
      t.media += 5;
      player.morale -= 3;
    } else if (effect === "chem_down") {
      if (accept) {
        t.chemistry.forEach(c => { if (c.playerA === player.id || c.playerB === player.id) c.level -= 15; });
        player.morale += 5;
      } else player.morale -= 8;
    } else if (effect === "paycut" && accept) {
      player.salary = +(player.salary * 0.9).toFixed(1);
      player.morale += 10;
      t.chemistry.forEach(c => { if (c.playerA === player.id || c.playerB === player.id) c.level = Math.min(99, c.level + 10); });
      this.log(`${player.name} 降薪留队，化学反应提升`);
    }
    this.state.decisions = this.state.decisions.filter(d => !d.title.startsWith(title));
  }

  teamBuilding() {
    const t = this.userTeam();
    t.chemistry.forEach(c => {
      c.level = Math.min(99, c.level + rand(2, 6));
    });
    t.cash -= 1;
    this.log("🤝 球队团建完成，化学反应全面提升");
  }

  isUserInPlayoffs() {
    const userId = this.state.userTeamId;
    const conf = TEAMS.find(t => t.id === userId).conf;
    const top8 = TEAMS.filter(t => t.conf === conf)
      .sort((a, b) => this.getTeam(b.id).wins - this.getTeam(a.id).wins)
      .slice(0, 8).map(t => t.id);
    return top8.includes(userId);
  }

  getPlayoffOpponent() {
    const userId = this.state.userTeamId;
    const conf = TEAMS.find(t => t.id === userId).conf;
    const others = TEAMS.filter(t => t.conf === conf && t.id !== userId).map(t => t.id);
    return pick(others);
  }

  log(msg, cls = "") {
    this.state.log.unshift({ msg, cls, week: this.state.week });
    if (this.state.log.length > 80) this.state.log.pop();
  }

  addDecision(title, options) {
    this.state.decisions.push({ title, options });
  }

  getStandings() {
    const east = TEAMS.filter(t => t.conf === "East")
      .map(t => ({ ...t, ...this.getTeam(t.id) }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    const west = TEAMS.filter(t => t.conf === "West")
      .map(t => ({ ...t, ...this.getTeam(t.id) }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    return { east, west };
  }
}

window.GameEngine = GameEngine;
