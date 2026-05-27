/** 王朝模式存档 — localStorage 多槽位 */

const SAVE_KEY = "nba_dynasty_saves_v1";
const MAX_SLOTS = 5;

const DynastySave = {
  listSlots() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getSlot(n) {
    const all = this.listSlots();
    return all[`slot_${n}`] || null;
  },

  buildMeta(state) {
    const t = state.league[state.userTeamId];
    const meta = TEAMS.find(x => x.id === state.userTeamId);
    return {
      teamId: state.userTeamId,
      teamName: `${meta.city}${meta.name}`,
      season: state.season,
      week: state.week,
      phase: state.phase,
      record: `${t.wins}-${t.losses}`,
      championships: state.championships || 0,
      savedAt: new Date().toISOString(),
    };
  },

  save(slot, state) {
    const all = this.listSlots();
    const payload = {
      meta: this.buildMeta(state),
      state: JSON.parse(JSON.stringify(state)),
    };
    payload.state.decisions = [];
    all[`slot_${slot}`] = payload;
    localStorage.setItem(SAVE_KEY, JSON.stringify(all));
    return payload.meta;
  },

  load(slot) {
    const data = this.getSlot(slot);
    if (!data?.state) return null;
    return data.state;
  },

  delete(slot) {
    const all = this.listSlots();
    delete all[`slot_${slot}`];
    localStorage.setItem(SAVE_KEY, JSON.stringify(all));
  },

  exportJson(state) {
    const payload = { meta: this.buildMeta(state), state: JSON.parse(JSON.stringify(state)) };
    payload.state.decisions = [];
    return JSON.stringify(payload, null, 2);
  },

  importJson(str) {
    const data = JSON.parse(str);
    if (!data.state?.league || !data.state?.userTeamId) throw new Error("无效存档格式");
    return data.state;
  },
};

window.DynastySave = DynastySave;
window.MAX_SLOTS = MAX_SLOTS;
