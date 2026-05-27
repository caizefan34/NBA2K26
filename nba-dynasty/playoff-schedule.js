/** 季后赛赛程 — 2-2-1-1-1 主场分布 + 日历 */

const PLAYOFF_ROUND_DAYS = { R1: 0, CSF: 18, CF: 36, FINALS: 54 };
const ROUND_LABELS = { R1: "首轮", CSF: "半决赛", CF: "分区决赛", FINALS: "总决赛" };
const GAME_INTERVAL_DAYS = 2;
const HOME_PATTERN = [1, 1, 0, 0, 1, 0, 1]; // 1 = 高种子主场

const PlayoffSchedule = {
  addDays(dateStr, days) {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  },

  formatDateCN(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const w = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 (周${w})`;
  },

  buildSeriesSchedule(series, roundKey, roundStartDate, meta = {}) {
    const homes = HOME_PATTERN.map(h => (h ? series.homeTeam : series.awayTeam));
    const schedule = [];
    let dayOff = 0;
    for (let i = 0; i < 7; i++) {
      const date = this.addDays(roundStartDate, dayOff);
      dayOff += GAME_INTERVAL_DAYS;
      const home = homes[i];
      const away = home === series.homeTeam ? series.awayTeam : series.homeTeam;
      schedule.push({
        gameNum: i + 1,
        date,
        home,
        away,
        played: false,
        score: null,
        winner: null,
        roundKey,
        roundLabel: ROUND_LABELS[roundKey] || roundKey,
        tv: i === 0 || i === 4 || i === 6 ? "ESPN/ABC" : i === 2 ? "TNT" : null,
        ...meta,
      });
    }
    series.schedule = schedule;
    series.roundKey = roundKey;
    series.nextGameIndex = 0;
    return series;
  },

  attachRound(po, conf, roundKey, startDate) {
    const list = po[conf][roundKey] || [];
    list.forEach((series, idx) => {
      this.buildSeriesSchedule(series, roundKey, startDate, {
        conf,
        seriesLabel: `${ROUND_LABELS[roundKey]} ${TEAMS.find(t => t.id === series.homeTeam)?.id} vs ${TEAMS.find(t => t.id === series.awayTeam)?.id}`,
      });
    });
  },

  initAllSchedules(po, seasonStartDate) {
    po.scheduleStart = seasonStartDate;
    po.currentDate = seasonStartDate;
    po.roundDates = {};
    Object.entries(PLAYOFF_ROUND_DAYS).forEach(([k, off]) => {
      po.roundDates[k] = this.addDays(seasonStartDate, off);
    });
    ["east", "west"].forEach(conf => {
      this.attachRound(po, conf, "R1", po.roundDates.R1);
    });
    this.rebuildMaster(po);
  },

  attachNewSeries(series, roundKey, po) {
    const start = po.roundDates[roundKey] || po.scheduleStart;
    this.buildSeriesSchedule(series, roundKey, start, {
      conf: TEAMS.find(t => t.id === series.homeTeam)?.conf === "East" ? "east" : "west",
    });
    this.rebuildMaster(po);
  },

  rebuildMaster(po) {
    const all = [];
    const pushSeries = (list, roundKey) => {
      (list || []).forEach(series => {
        (series.schedule || []).forEach(g => {
          all.push({ ...g, seriesId: `${series.homeTeam}_${series.awayTeam}_${roundKey}` });
        });
      });
    };
    ["east", "west"].forEach(conf => {
      ["R1", "CSF", "CF"].forEach(k => pushSeries(po[conf][k], k));
    });
    if (po.finals) pushSeries([po.finals], "FINALS");
    all.sort((a, b) => a.date.localeCompare(b.date) || a.gameNum - b.gameNum);
    po.masterSchedule = all;
  },

  getNextGame(series) {
    if (!series?.schedule || series.done) return null;
    return series.schedule.find(g => !g.played) || null;
  },

  getRequiredWins(series) {
    const w1 = series.winsHome;
    const w2 = series.winsAway;
    if (w1 >= 4 || w2 >= 4) return 0;
    return 4 - Math.max(w1, w2);
  },

  markPlayed(series, game, result) {
    game.played = true;
    game.score = `${result.homeScore}-${result.awayScore}`;
    game.winner = result.homeWin ? game.home : game.away;
    series.nextGameIndex = (series.nextGameIndex || 0) + 1;
  },

  /** 本轮应打的比赛（每个系列赛下一场，日期 = 当前 po.currentDate 或最早未赛日） */
  getGamesOnDate(po, date) {
    const active = this.getAllActiveSeries(po);
    const games = [];
    active.forEach(series => {
      const next = this.getNextGame(series);
      if (next && next.date === date) games.push({ series, game: next });
    });
    return games;
  },

  getAllActiveSeries(po) {
    const out = [];
    const add = list => (list || []).filter(s => !s.done).forEach(s => out.push(s));
    if (po.roundIndex >= 3 && po.finals) {
      if (!po.finals.done) out.push(po.finals);
      return out;
    }
    const key = ["R1", "CSF", "CF"][po.roundIndex];
    ["east", "west"].forEach(c => add(po[c][key]));
    return out;
  },

  getNextPlayoffDate(po) {
    for (const g of po.masterSchedule || []) {
      if (!g.played) return g.date;
    }
    return null;
  },

  getUserSchedule(po, userId) {
    return (po.masterSchedule || []).filter(g => g.home === userId || g.away === userId);
  },

  getUpcomingUserGame(po, userId) {
    return this.getUserSchedule(po, userId).find(g => !g.played);
  },

  getSeriesScheduleDisplay(series) {
    if (!series?.schedule) return [];
    return series.schedule.filter(g => {
      if (g.played) return true;
      const maxW = Math.max(series.winsHome, series.winsAway);
      const minW = Math.min(series.winsHome, series.winsAway);
      if (maxW >= 4) return false;
      const gamesLeft = 7 - g.gameNum + 1;
      return minW + gamesLeft >= 4;
    });
  },
};

window.PlayoffSchedule = PlayoffSchedule;
window.PLAYOFF_ROUND_DAYS = PLAYOFF_ROUND_DAYS;
