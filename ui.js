/** UI 渲染 */

const UI = {
  selectedTeam: null,
  engine: null,
  scheduleFilter: "all",

  init() {
    this.renderTicker();
    this.renderSnapshot();
    this.renderTeamPicker();
    this.renderSaveSlots("save-slots-start", true);
    this.bindStart();
    this.bindTabs();
    this.bindGameActions();
    this.bindSave();
    this.bindScheduleFilters();
  },

  bindScheduleFilters() {
    document.querySelectorAll("[data-sched-filter]").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll("[data-sched-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.scheduleFilter = btn.dataset.schedFilter;
        this.renderPlayoffSchedule();
      };
    });
  },

  renderTicker() {
    const text = LEAGUE_NEWS.concat(LEAGUE_NEWS).join("  ·  ");
    document.getElementById("start-ticker").innerHTML = `<span>${text}</span>`;
  },

  renderSnapshot() {
    const el = document.getElementById("league-snapshot");
    el.innerHTML = `
      <li>东部冠军：<strong>纽约尼克斯</strong>（横扫骑士，11连胜）</li>
      <li>西部决赛：<strong>雷霆 3-2 马刺</strong>（G6 5/28 马刺主场）</li>
      <li>总决赛：<strong>6月3日</strong>开打，西区冠军主场优先后</li>
      <li>雷霆 ${PLAYOFF_REAL.west.series.split(" ")[0]}${PLAYOFF_REAL.west.series.split(" ")[1]} · SGA 32分 G5</li>
      <li>文班亚马 G4 33分 · 马刺 103-82 扳平</li>
    `;
  },

  renderTeamPicker(conf = "all") {
    const box = document.getElementById("team-picker");
    box.innerHTML = "";
    TEAMS.filter(t => conf === "all" || t.conf === conf).forEach(t => {
      const div = document.createElement("div");
      div.className = "team-card" + (this.selectedTeam === t.id ? " selected" : "");
      div.dataset.id = t.id;
      div.innerHTML = `<div class="abbr">${t.id}</div><div class="name">${t.city} ${t.name}</div>`;
      div.onclick = () => {
        this.selectedTeam = t.id;
        document.querySelectorAll(".team-card").forEach(c => c.classList.remove("selected"));
        div.classList.add("selected");
        document.getElementById("btn-start-game").disabled = false;
      };
      box.appendChild(div);
    });
  },

  bindStart() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderTeamPicker(btn.dataset.conf);
      };
    });
    document.getElementById("btn-start-game").onclick = () => {
      if (!this.selectedTeam) return;
      this.engine = new GameEngine();
      this.engine.newGame(this.selectedTeam);
      document.getElementById("screen-start").classList.remove("active");
      document.getElementById("screen-game").classList.add("active");
      this.renderAll();
    };
  },

  bindTabs() {
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
      };
    });
  },

  bindGameActions() {
    document.getElementById("btn-sim-week").onclick = () => {
      this.engine.simWeek();
      this.renderAll();
    };
    document.getElementById("btn-broadcast-game").onclick = () => {
      const r = this.engine.simNextUserGame();
      this.showBroadcast(r.broadcast, r.scheduleGame);
      this.renderAll();
    };
    document.getElementById("btn-sim-playoffs").onclick = () => {
      this.engine.simPlayoffRound();
      this.renderAll();
    };
    document.getElementById("btn-train").onclick = () => {
      this.engine.trainTeam();
      this.renderAll();
    };
    document.getElementById("btn-rest").onclick = () => {
      this.engine.restStars();
      this.renderAll();
    };
    document.getElementById("btn-team-building").onclick = () => {
      this.engine.teamBuilding();
      this.renderAll();
    };
    document.getElementById("btn-propose-trade").onclick = () => this.doTrade();
    document.getElementById("dialog-close").onclick = () => document.getElementById("game-dialog").close();
    document.getElementById("broadcast-close").onclick = () => document.getElementById("broadcast-dialog").close();
  },

  bindSave() {
    document.getElementById("btn-save-game").onclick = () => {
      const slot = prompt("存到槽位 (1-5)", "1");
      if (!slot || !this.engine?.state) return;
      const meta = DynastySave.save(+slot, this.engine.state);
      this.showDialog(`已存档：${meta.teamName} ${meta.record} · 第${meta.season}季`);
      this.renderSaveSlots("save-slots-start", true);
    };
    document.getElementById("btn-load-menu").onclick = () => {
      this.renderSaveSlots("save-slots-ingame", false);
      document.getElementById("save-dialog").showModal();
    };
    document.getElementById("save-dialog-close").onclick = () => document.getElementById("save-dialog").close();
    document.getElementById("btn-export-save").onclick = () => {
      if (!this.engine?.state) return;
      const json = DynastySave.exportJson(this.engine.state);
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nba-dynasty-${Date.now()}.json`;
      a.click();
    };
    document.getElementById("import-save-file").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const state = DynastySave.importJson(reader.result);
          this.loadGameState(state);
          document.getElementById("save-dialog").close();
        } catch (err) {
          this.showDialog("导入失败：" + err.message);
        }
      };
      reader.readAsText(file);
    };
  },

  loadGameState(state) {
    this.engine = new GameEngine();
    this.engine.loadState(state);
    this.selectedTeam = state.userTeamId;
    document.getElementById("screen-start").classList.remove("active");
    document.getElementById("screen-game").classList.add("active");
    this.renderAll();
  },

  renderSaveSlots(containerId, onStartScreen) {
    const box = document.getElementById(containerId);
    if (!box) return;
    const slots = DynastySave.listSlots();
    box.innerHTML = "";
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const data = slots[`slot_${i}`];
      const div = document.createElement("div");
      div.className = "save-slot" + (data ? " filled" : "");
      if (data) {
        const m = data.meta;
        div.innerHTML = `
          <strong>槽位 ${i}</strong>
          <span>${m.teamName} · ${m.record}</span>
          <span class="save-meta">第${m.season}季 第${m.week}周 · 🏆${m.championships} · ${new Date(m.savedAt).toLocaleString("zh-CN")}</span>
          <div class="save-btns">
            <button class="btn-secondary btn-sm" data-action="load" data-slot="${i}">读档</button>
            ${onStartScreen ? "" : `<button class="btn-secondary btn-sm" data-action="save" data-slot="${i}">覆盖</button>`}
            <button class="btn-secondary btn-sm" data-action="del" data-slot="${i}">删除</button>
          </div>`;
      } else {
        div.innerHTML = `<strong>槽位 ${i}</strong><span class="save-meta">空</span>`;
      }
      box.appendChild(div);
    }
    box.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const slot = +btn.dataset.slot;
        if (btn.dataset.action === "load") {
          const state = DynastySave.load(slot);
          if (!state) return this.showDialog("空存档");
          this.loadGameState(state);
          document.getElementById("save-dialog")?.close();
        } else if (btn.dataset.action === "save" && this.engine?.state) {
          DynastySave.save(slot, this.engine.state);
          this.showDialog(`已保存到槽位 ${slot}`);
          this.renderSaveSlots(containerId, onStartScreen);
        } else if (btn.dataset.action === "del") {
          if (confirm("删除该存档？")) {
            DynastySave.delete(slot);
            this.renderSaveSlots(containerId, onStartScreen);
          }
        }
      };
    });
  },

  renderAll() {
    const s = this.engine.state;
    const t = this.engine.userTeam();
    const meta = TEAMS.find(x => x.id === s.userTeamId);

    document.getElementById("nav-team").textContent = `${meta.id} · ${meta.city}${meta.name}`;
    document.getElementById("nav-season").textContent = `${s.season}-${String(s.season + 1).slice(2)} | 第${s.week}周 | ${s.phase === "playoffs" ? "季后赛" : "常规赛/休赛期"} | ${s.day}`;
    document.getElementById("res-rings").textContent = s.championships || 0;
    document.getElementById("res-cash").textContent = t.cash.toFixed(1);
    document.getElementById("res-fans").textContent = Math.round(t.fans);
    document.getElementById("res-media").textContent = Math.round(t.media);

    document.getElementById("game-news").textContent = pick(LEAGUE_NEWS);

    this.renderDashboard();
    this.renderRoster();
    this.renderChemistry();
    this.renderFinance();
    this.renderTrades();
    this.renderFA();
    this.renderDraft();
    this.renderArena();
    this.renderStaff();
    this.renderPlayoffSchedule();
    this.renderLeague();
  },

  renderDashboard() {
    const s = this.engine.state;
    const t = this.engine.userTeam();
    const r = this.engine.teamRating(s.userTeamId);
    const cap = this.engine.capStatus(s.userTeamId);
    const st = this.engine.getStandings();
    const conf = TEAMS.find(x => x.id === s.userTeamId).conf;
    const list = conf === "East" ? st.east : st.west;
    const rank = list.findIndex(x => x.id === s.userTeamId) + 1;

    document.getElementById("dash-record").textContent = `${t.wins}-${t.losses}`;
    document.getElementById("dash-standing").textContent = `${conf === "East" ? "东部" : "西部"}第 ${rank} 名`;

    document.getElementById("dash-ratings").innerHTML = ["ovr", "off", "def", "chem"].map(k => {
      const labels = { ovr: "综合", off: "进攻", def: "防守", chem: "化学反应" };
      return `<div class="bar-row"><span>${labels[k]}</span><div class="bar"><div class="fill" style="width:${r[k]}%"></div></div><span>${r[k]}</span></div>`;
    }).join("");

    const pct = Math.min(100, (cap.payroll / CBA.secondApron) * 100);
    const capColor = cap.level === "secondApron" ? "var(--danger)" : cap.level === "tax" ? "var(--accent)" : "var(--success)";
    document.getElementById("dash-cap").innerHTML = `
      <p>总薪资 <strong>$${cap.payroll.toFixed(1)}M</strong> · ${this.capLabel(cap.level)}</p>
      <div class="cap-meter"><div class="fill" style="width:${pct}%;background:${capColor}"></div>
        <div class="line" style="left:${(CBA.salaryCap / CBA.secondApron) * 100}%"></div>
        <div class="line" style="left:${(CBA.luxuryTax / CBA.secondApron) * 100}%"></div>
        <div class="line" style="left:${(CBA.firstApron / CBA.secondApron) * 100}%"></div>
      </div>
      <p style="font-size:0.75rem;color:var(--muted)">帽线 | 税线 | 一围 | 二围</p>
    `;

    document.getElementById("dash-log").innerHTML = s.log.slice(0, 12).map(l =>
      `<p class="${typeof l === "object" ? l.cls : ""}">${typeof l === "object" ? l.msg : l}</p>`
    ).join("");

    document.getElementById("dash-decisions").innerHTML = s.decisions.length
      ? s.decisions.map((d, di) => `
        <div class="decision-card">
          <strong>${d.title}</strong>
          <div>${d.options.map((o, oi) => `<button class="btn-secondary" data-di="${di}" data-oi="${oi}">${o.label}</button>`).join("")}</div>
        </div>`).join("")
      : "<p style='color:var(--muted)'>暂无待办 — 继续模拟赛季</p>";

    document.querySelectorAll("#dash-decisions button").forEach(btn => {
      btn.onclick = () => {
        const d = s.decisions[+btn.dataset.di];
        d.options[+btn.dataset.oi].fn();
        this.renderAll();
      };
    });

    const inPo = s.phase === "playoffs";
    const poCard = document.getElementById("card-playoff-next");
    const poNext = document.getElementById("dash-playoff-next");
    if (inPo && s.playoffs) {
      this.engine.ensurePlayoffSchedules();
      const view = this.engine.getPlayoffScheduleView();
      const ug = view?.userNext;
      if (ug) {
        poCard.style.display = "block";
        const opp = ug.home === s.userTeamId ? ug.away : ug.home;
        const oppMeta = TEAMS.find(t => t.id === opp);
        poNext.innerHTML = `
          <p><strong>${ug.roundLabel} · 第 ${ug.gameNum} 场</strong></p>
          <p>${PlayoffSchedule.formatDateCN(ug.date)}</p>
          <p>${ug.home === s.userTeamId ? "🏠 主场" : "✈️ 客场"} vs ${oppMeta?.name}</p>
          <p style="font-size:0.8rem;color:var(--muted)">转播：${ug.tv || "区域直播"} · 2-2-1-1-1 赛制</p>`;
      } else {
        poCard.style.display = "none";
      }
    } else poCard.style.display = "none";

    document.getElementById("btn-sim-playoffs").style.display = inPo ? "block" : "none";
    document.getElementById("btn-sim-week").textContent = inPo ? "模拟季后赛一周" : "模拟下一周 (7场)";
    if (inPo) document.getElementById("btn-sim-week").onclick = () => {
      this.engine.simPlayoffRound();
      this.renderAll();
    };
    else document.getElementById("btn-sim-week").onclick = () => {
      this.engine.simWeek();
      this.renderAll();
    };
  },

  capLabel(level) {
    return {
      under: "帽下",
      overCap: "超帽",
      tax: "奢侈税",
      firstApron: "第一围裙",
      secondApron: "第二围裙",
    }[level] || level;
  },

  renderRoster() {
    const t = this.engine.userTeam();
    const tbody = document.querySelector("#roster-table tbody");
    tbody.innerHTML = t.roster.sort((a, b) => b.ovr - a.ovr).map(p => `
      <tr>
        <td><div class="player-cell"><div class="player-avatar">${p.pos}</div>${p.name}</div></td>
        <td>${p.pos}</td><td>${p.age}</td><td><strong>${p.ovr}</strong></td>
        <td>${p.off}</td><td>${p.def}</td><td>${p.morale}</td>
        <td style="font-size:0.75rem">${p.agent ? `${p.agent.name}<br><span style="color:var(--muted)">${p.agent.type}</span>` : "—"}</td>
        <td class="${p.injury ? "injury-badge" : "healthy"}">${p.injury ? `${p.injury.type} (${p.injury.weeks}周)` : "健康"}</td>
        <td>$${p.salary.toFixed(1)}</td><td>${p.yearsLeft}年</td>
        <td><button class="btn-secondary btn-sm release-btn" data-id="${p.id}">裁掉</button></td>
      </tr>`).join("");

    tbody.querySelectorAll(".release-btn").forEach(btn => {
      btn.onclick = () => {
        if (confirm("确定裁掉该球员？需支付50%剩余工资")) {
          this.engine.releasePlayer(btn.dataset.id);
          this.renderAll();
        }
      };
    });
  },

  renderFinance() {
    const cap = this.engine.capStatus(this.engine.state.userTeamId);
    const t = this.engine.userTeam();
    document.getElementById("finance-panel").innerHTML = `
      <div class="finance-item">
        <h4>2025-26 CBA 阈值</h4>
        <p>薪资帽：$${CBA.salaryCap}M</p>
        <p>奢侈税线：$${CBA.luxuryTax}M</p>
        <p>第一围裙：$${CBA.firstApron}M</p>
        <p>第二围裙：$${CBA.secondApron}M</p>
        <p>最低薪资线：$${CBA.minSalary}M</p>
      </div>
      <div class="finance-item">
        <h4>球队财务</h4>
        <p>球员总薪资：$${cap.payroll.toFixed(1)}M</p>
        <p>教练组：$${t.coach.salary}M/年</p>
        <p>现金储备：$${t.cash.toFixed(1)}M</p>
        <p>状态：<strong>${this.capLabel(cap.level)}</strong></p>
        ${cap.level === "secondApron" ? "<p style='color:var(--danger)'>⚠ 不可聚合交易、无MLE、不可送现金</p>" : ""}
        ${cap.level === "tax" ? `<p style='color:var(--accent)">预计奢侈税：$${((cap.payroll - CBA.luxuryTax) * 1.5).toFixed(1)}M</p>` : ""}
      </div>
      <div class="finance-item">
        <h4>中产特例 (MLE)</h4>
        <p>非税队：$${CBA.mleNonTax}M</p>
        <p>税队：$${CBA.mleTax}M</p>
        <p>空间队：$${CBA.mleRoom}M</p>
      </div>
    `;
  },

  tradeSelection: { mine: new Set(), theirs: new Set() },

  renderTrades() {
    const s = this.engine.state;
    const cap = this.engine.capStatus(s.userTeamId);
    document.getElementById("trade-hint").textContent = cap.level === "secondApron"
      ? "第二围裙限制：一对一交易，不可打包球员或送现金"
      : "交易需薪资基本匹配（差额 ≤ $5M）";

    const sel = document.getElementById("trade-partner");
    sel.innerHTML = TEAMS.filter(t => t.id !== s.userTeamId)
      .map(t => `<option value="${t.id}">${t.id} ${t.name}</option>`).join("");

    const partnerId = sel.value || TEAMS.find(t => t.id !== s.userTeamId).id;
    sel.onchange = () => { this.tradeSelection.theirs.clear(); this.renderTradePools(partnerId); };

    this.renderTradePools(partnerId);
  },

  renderTradePools(partnerId) {
    const me = this.engine.userTeam();
    const them = this.engine.getTeam(partnerId);
    const myBox = document.getElementById("trade-my-offer");
    const theirBox = document.getElementById("trade-their-offer");

    myBox.innerHTML = me.roster.map(p => this.tradeChip(p, "mine")).join("");
    theirBox.innerHTML = them.roster.map(p => this.tradeChip(p, "theirs")).join("");

    myBox.querySelectorAll(".trade-chip").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        this.tradeSelection.mine.has(id) ? this.tradeSelection.mine.delete(id) : this.tradeSelection.mine.add(id);
        el.classList.toggle("selected");
      };
    });
    theirBox.querySelectorAll(".trade-chip").forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        this.tradeSelection.theirs.has(id) ? this.tradeSelection.theirs.delete(id) : this.tradeSelection.theirs.add(id);
        el.classList.toggle("selected");
      };
    });
  },

  tradeChip(p, side) {
    const sel = this.tradeSelection[side].has(p.id) ? " selected" : "";
    return `<div class="trade-chip${sel}" data-id="${p.id}"><span>${p.name} (${p.ovr})</span><span>$${p.salary.toFixed(1)}M</span></div>`;
  },

  doTrade() {
    const partnerId = document.getElementById("trade-partner").value;
    const r = this.engine.proposeTrade(partnerId, [...this.tradeSelection.mine], [...this.tradeSelection.theirs]);
    this.showDialog(r.ok ? "交易成功！" : r.msg);
    this.tradeSelection.mine.clear();
    this.tradeSelection.theirs.clear();
    this.renderAll();
  },

  renderFA() {
    const box = document.getElementById("fa-list");
    box.innerHTML = this.engine.state.freeAgents.map(fa => `
      <div class="fa-card">
        <h4>${fa.name}</h4>
        <p>${fa.pos} · ${fa.age}岁 · OVR ${fa.ovr}</p>
        <p>期望：$${fa.ask}M/年起</p>
        <div class="slider-row">
          <label>报价 ($M/年)</label>
          <input type="range" min="${fa.ask - 5}" max="${fa.ask + 15}" value="${fa.ask}" id="sal-${fa.id}" />
          <span id="sal-val-${fa.id}">${fa.ask}</span>
        </div>
        <button class="btn-primary fa-sign" data-id="${fa.id}">签约 (2年)</button>
      </div>`).join("");

    box.querySelectorAll('input[type="range"]').forEach(inp => {
      inp.oninput = () => {
        document.getElementById(`sal-val-${inp.id.replace("sal-", "")}`).textContent = inp.value;
      };
    });
    box.querySelectorAll(".fa-sign").forEach(btn => {
      btn.onclick = () => {
        const sal = +document.getElementById(`sal-${btn.dataset.id}`).value;
        const r = this.engine.signFreeAgent(btn.dataset.id, 2, sal);
        this.showDialog(r.ok ? "签约成功！" : r.msg);
        this.renderAll();
      };
    });
  },

  renderDraft() {
    const t = this.engine.userTeam();
    const pick = t.picks[0];
    document.getElementById("draft-info").textContent = `你的 ${pick.year} 首轮签：约第 ${pick.pick} 顺位`;
    document.getElementById("draft-board").innerHTML = this.engine.state.draftProspects.map(p => `
      <div class="fa-card" style="margin-bottom:0.5rem">
        <h4>${p.name}</h4>
        <p>${p.pos} · 球探报告：${p.scout} · OVR ${p.ovr}</p>
        <button class="btn-secondary draft-pick" data-id="${p.id}">用首轮签选中</button>
      </div>`).join("");

    document.querySelectorAll(".draft-pick").forEach(btn => {
      btn.onclick = () => {
        this.engine.draftPlayer(btn.dataset.id);
        this.renderAll();
      };
    });
  },

  renderArena() {
    const t = this.engine.userTeam();
    document.getElementById("arena-panel").innerHTML = `
      <div class="finance-item">
        <h4>${TEAMS.find(x => x.id === this.engine.state.userTeamId).city} 球馆</h4>
        <p>容量：${t.arena.capacity.toLocaleString()} 座</p>
        <p>平均票价：$${t.arena.ticketPrice}</p>
        <p>升级次数：${t.arena.upgrades}</p>
        <p>预估主场单场上座收入：$${(t.arena.capacity * t.arena.ticketPrice * 0.001 * t.fans / 80).toFixed(2)}M</p>
      </div>
      <div class="finance-item">
        <h4>商业投资</h4>
        <button class="btn-secondary arena-up" data-type="seats">扩容 (+1500座) $15M</button><br><br>
        <button class="btn-secondary arena-up" data-type="luxury">Luxury Suite (+票价) $25M</button><br><br>
        <button class="btn-secondary arena-up" data-type="jumbotron">中心大屏 (+球迷) $10M</button>
      </div>
      <div class="finance-item">
        <h4>品牌与媒体</h4>
        <p>球迷满意度影响上座与 merch</p>
        <p>当前球迷：${Math.round(t.fans)}% · 媒体：${Math.round(t.media)}</p>
      </div>`;

    document.querySelectorAll(".arena-up").forEach(btn => {
      btn.onclick = () => {
        const r = this.engine.upgradeArena(btn.dataset.type);
        if (!r.ok) this.showDialog(r.msg);
        this.renderAll();
      };
    });
  },

  renderStaff() {
    const t = this.engine.userTeam();
    document.getElementById("staff-panel").innerHTML = `
      <div class="finance-item">
        <h4>现任主教练</h4>
        <p><strong>${t.coach.name}</strong> — ${t.coach.style}体系</p>
        <p>加成：进攻+${t.coach.bonus.off || 0} / 防守+${t.coach.bonus.def || 0}</p>
        <p>年薪：$${t.coach.salary}M</p>
      </div>
      <div class="finance-item">
        <h4>可聘请名帅</h4>
        ${COACHES.filter(c => c.name !== t.coach.name).map(c => `
          <p>${c.name} (${c.style}) — $${c.salary}M
          <button class="btn-secondary hire-coach" data-name="${c.name}">聘请</button></p>`).join("")}
      </div>`;

    document.querySelectorAll(".hire-coach").forEach(btn => {
      btn.onclick = () => {
        const c = COACHES.find(x => x.name === btn.dataset.name);
        const r = this.engine.hireCoach(c);
        if (!r.ok) this.showDialog(r.msg);
        this.renderAll();
      };
    });
  },

  renderChemistry() {
    const t = this.engine.userTeam();
    const roster = t.roster;
    const chemBonus = this.engine.chemistryBonus(this.engine.state.userTeamId);
    const panel = document.getElementById("chemistry-panel");
    if (!t.chemistry?.length) {
      panel.innerHTML = "<p>暂无化学反应数据</p>";
      return;
    }
    panel.innerHTML = `
      <p class="hint">球队化学加成：+${chemBonus} 战力 · 高默契组合额外加成</p>
      <div class="chem-grid">
        ${t.chemistry.map(c => {
          const a = roster.find(p => p.id === c.playerA);
          const b = roster.find(p => p.id === c.playerB);
          if (!a || !b) return "";
          const hot = c.level >= 80 ? " chem-hot" : "";
          return `<div class="chem-card${hot}">
            <h4>${c.label}</h4>
            <p>${a.name} + ${b.name}</p>
            <div class="bar-row"><div class="bar"><div class="fill" style="width:${c.level}%"></div></div><span>${c.level}</span></div>
            <p style="font-size:0.75rem;color:var(--muted)">默契≥70时 +${c.bonus} 战力</p>
          </div>`;
        }).join("")}
      </div>`;

    const agentLogs = this.engine.state.log
      .filter(l => (typeof l === "object" ? l.msg : l).includes("经纪人"))
      .slice(0, 8);
    document.getElementById("agent-feed").innerHTML = agentLogs.length
      ? agentLogs.map(l => `<p>${typeof l === "object" ? l.msg : l}</p>`).join("")
      : "<p style='color:var(--muted)'>暂无经纪人事件 — 继续推进赛季</p>";
  },

  renderPlayoffSchedule() {
    const s = this.engine?.state;
    const hint = document.getElementById("playoff-schedule-hint");
    const roundBox = document.getElementById("playoff-round-dates");
    const myBox = document.getElementById("my-series-schedule");
    const tbody = document.querySelector("#playoff-schedule-table tbody");

    if (!s || s.phase !== "playoffs" || !s.playoffs) {
      if (hint) hint.textContent = "常规赛结束后将生成完整季后赛赛程（七场四胜 · 2-2-1-1-1 主场）";
      if (roundBox) roundBox.innerHTML = "";
      if (myBox) myBox.innerHTML = "<p class='hint'>尚未进入季后赛</p>";
      if (tbody) tbody.innerHTML = "<tr><td colspan='8'>暂无赛程</td></tr>";
      return;
    }

    this.engine.ensurePlayoffSchedules();
    const po = s.playoffs;
    const view = this.engine.getPlayoffScheduleView();
    const uid = s.userTeamId;

    hint.textContent = `当前日历：${PlayoffSchedule.formatDateCN(s.day)} · 下一场联盟比赛日：${view.currentDate ? PlayoffSchedule.formatDateCN(view.currentDate) : "—"}`;

    roundBox.innerHTML = Object.entries(po.roundDates || {}).map(([k, d]) => {
      const active = po.roundIndex === { R1: 0, CSF: 1, CF: 2, FINALS: 3 }[k] ? " active" : "";
      return `<span class="round-date-chip${active}">${{ R1: "首轮", CSF: "半决赛", CF: "分区决赛", FINALS: "总决赛" }[k]}：${PlayoffSchedule.formatDateCN(d)}</span>`;
    }).join("");

    const series = view.userSeries;
    if (series && series.schedule) {
      const h = TEAMS.find(t => t.id === series.homeTeam);
      const a = TEAMS.find(t => t.id === series.awayTeam);
      const display = PlayoffSchedule.getSeriesScheduleDisplay(series);
      myBox.innerHTML = `
        <div class="my-series-box">
          <p><strong>${series.roundKey ? { R1: "首轮", CSF: "半决赛", CF: "分区决赛", FINALS: "总决赛" }[series.roundKey] : ""}</strong>
          ${h?.id} vs ${a?.id} · 大比分 <strong>${series.winsHome}-${series.winsAway}</strong></p>
          <div class="series-games-row">
            ${display.map(g => {
              const isUserHome = g.home === uid;
              const cls = g.played ? "played" : (view.userNext?.gameNum === g.gameNum ? "next" : "");
              const loc = g.home === uid ? "home" : "";
              return `<span class="game-pill ${cls} ${loc}" title="${PlayoffSchedule.formatDateCN(g.date)}">
                G${g.gameNum} ${g.played ? g.score : (isUserHome ? "主" : "客")}</span>`;
            }).join("")}
          </div>
        </div>`;
    } else {
      myBox.innerHTML = "<p class='hint'>你的球队未在本轮季后赛对阵中，或已被淘汰</p>";
    }

    let games = [...(po.masterSchedule || [])];
    const nextDate = view.currentDate;
    if (this.scheduleFilter === "user") {
      games = games.filter(g => g.home === uid || g.away === uid);
    } else if (this.scheduleFilter === "today") {
      games = games.filter(g => !g.played && g.date >= s.day);
      games = games.slice(0, 16);
    }

    const nextGlobal = (po.masterSchedule || []).find(g => !g.played);
    const isSameGame = (a, b) => a && b && a.date === b.date && a.gameNum === b.gameNum && a.home === b.home;

    tbody.innerHTML = games.map(g => {
      const isUser = g.home === uid || g.away === uid;
      const isNext = !g.played && isSameGame(g, nextGlobal);
      const userLoc = g.home === uid ? "主场" : g.away === uid ? "客场" : "—";
      const match = `${TEAMS.find(t => t.id === g.away)?.id} @ ${TEAMS.find(t => t.id === g.home)?.id}`;
      const status = g.played ? '<span class="status-badge done">已结束</span>'
        : isNext ? '<span class="status-badge next">下一场</span>'
        : '<span class="status-badge upcoming">未赛</span>';
      return `<tr class="${isUser ? "user-game" : ""} ${g.played ? "played" : ""} ${isNext ? "next-game" : ""}">
        <td>${PlayoffSchedule.formatDateCN(g.date)}</td>
        <td>${g.roundLabel}</td>
        <td>G${g.gameNum}</td>
        <td>${match}</td>
        <td>${isUser ? userLoc : (g.home === g.home ? "—" : "")}</td>
        <td>${g.tv || "—"}</td>
        <td>${g.score || "—"}</td>
        <td>${status}</td>
      </tr>`;
    }).join("") || "<tr><td colspan='8'>暂无比赛</td></tr>";
  },

  showBroadcast(b, scheduleGame) {
    if (!b) return;
    const extra = scheduleGame
      ? ` · ${scheduleGame.roundLabel} G${scheduleGame.gameNum} · ${PlayoffSchedule.formatDateCN(scheduleGame.date)}`
      : "";
    document.getElementById("broadcast-title").textContent =
      `${b.awayName} @ ${b.homeName} · 中文解说${extra}`;
    document.getElementById("broadcast-scoreboard").innerHTML = `
      <div class="sb-team"><span>${b.awayName}</span><strong>${b.totalA}</strong></div>
      <div class="sb-mid">FINAL</div>
      <div class="sb-team"><span>${b.homeName}</span><strong>${b.totalH}</strong></div>`;
    document.getElementById("broadcast-quarters").innerHTML = b.quarters.map(q =>
      `<span>Q${q.q}: ${q.away}-${q.home}</span>`
    ).join("");
    document.getElementById("broadcast-feed").innerHTML = b.lines
      .map((line, i) => `<p class="bc-line" style="animation-delay:${i * 0.05}s">${line}</p>`)
      .join("");
    document.getElementById("broadcast-dialog").showModal();
  },

  renderPlayoffBracket() {
    const po = this.engine.state.playoffs;
    const box = document.getElementById("playoff-bracket");
    const label = document.getElementById("playoff-round-label");
    if (!po) {
      label.textContent = "常规赛结束后生成完整 bracket";
      box.innerHTML = "<p class='hint'>尚未进入季后赛</p>";
      return;
    }
    const rName = po.roundIndex >= 3 ? "总决赛" : po.roundNames[po.roundIndex];
    label.textContent = `当前轮次：${rName}`;

    const renderSide = (conf, title) => {
      const c = conf.toLowerCase();
      const keys = ["R1", "CSF", "CF"];
      return `<div class="bracket-conf"><h4>${title}</h4>
        ${keys.map(k => {
          const list = po[c][k] || [];
          if (!list.length) return "";
          return `<div class="bracket-round"><h5>${{ R1: "首轮", CSF: "半决赛", CF: "分区决赛" }[k]}</h5>
            ${list.map(s => this.renderSeriesCell(s)).join("")}
          </div>`;
        }).join("")}
        ${po[c].champ ? `<p class="conf-champ">冠军：${TEAMS.find(t => t.id === po[c].champ)?.id}</p>` : ""}
      </div>`;
    };

    let html = `<div class="bracket-columns">${renderSide("east", "东部")}${renderSide("west", "西部")}</div>`;
    if (po.finals) {
      html += `<div class="bracket-finals"><h4>总决赛 · 七场四胜</h4>${this.renderSeriesCell(po.finals)}</div>`;
    }
    if (po.history?.length) {
      html += `<div class="bracket-history"><h4>系列赛结果</h4>${po.history.slice(-6).map(h =>
        `<p>${h.round}: ${TEAMS.find(t => t.id === h.winner)?.id} 胜 (${h.score})</p>`
      ).join("")}</div>`;
    }
    box.innerHTML = html;
  },

  renderSeriesCell(s) {
    const h = TEAMS.find(t => t.id === s.homeTeam);
    const a = TEAMS.find(t => t.id === s.awayTeam);
    const uid = this.engine.state.userTeamId;
    const highlight = s.homeTeam === uid || s.awayTeam === uid ? " user-series" : "";
    const done = s.done ? " done" : "";
    const last = s.games?.length ? s.games[s.games.length - 1].score : "";
    const next = PlayoffSchedule.getNextGame(s);
    const nextTxt = next
      ? `<span class="last-game">下场 G${next.gameNum} ${PlayoffSchedule.formatDateCN(next.date)}</span>`
      : (last ? `<span class="last-game">G${s.games.length}: ${last}</span>` : "<span class='last-game'>未开赛</span>");
    return `<div class="series-cell${highlight}${done}">
      <div class="seed-line ${s.winsHome >= 4 ? "winner" : ""}"><span>${h?.id}</span><strong>${s.winsHome}</strong></div>
      <div class="seed-line ${s.winsAway >= 4 ? "winner" : ""}"><span>${a?.id}</span><strong>${s.winsAway}</strong></div>
      ${nextTxt}
    </div>`;
  },

  renderLeague() {
    const st = this.engine.getStandings();
    const uid = this.engine.state.userTeamId;
    const renderTable = (list, title) => `
      <div><h4>${title}</h4>
      <table class="standings-table"><tbody>
        ${list.map((t, i) => `
          <tr class="${t.id === uid ? "user-team" : ""}">
            <td>${i + 1}</td><td>${t.id}</td><td>${t.wins}-${t.losses}</td>
            <td>${this.engine.teamRating(t.id).ovr}</td>
          </tr>`).join("")}
      </tbody></table></div>`;

    document.getElementById("league-standings").innerHTML =
      renderTable(st.east, "东部") + renderTable(st.west, "西部");

    this.renderPlayoffBracket();
    document.getElementById("playoff-real-note").innerHTML = `
      <div class="bracket-round">
        <p>东决：尼克斯 4-0 骑士 · 路径 4-2 老鹰 → 4-0 76人</p>
        <p>西决：${PLAYOFF_REAL.west.series} · ${PLAYOFF_REAL.west.game6}</p>
        <p>${PLAYOFF_REAL.west.note}</p>
      </div>
      <div class="bracket-round">
        <p>你的战绩：${this.engine.userTeam().wins}-${this.engine.userTeam().losses}</p>
        <p>${this.engine.isUserInPlayoffs() ? "✅ 季后赛席位" : "❌ 未进前八"}</p>
      </div>`;
  },

  showDialog(msg) {
    document.getElementById("dialog-content").textContent = msg;
    document.getElementById("game-dialog").showModal();
  },
};

window.UI = UI;
