/** NBA Dynasty GM — 数据层（2025-26 + 2026年5月新闻背景） */

const CBA = {
  salaryCap: 154.647,
  luxuryTax: 187.895,
  minSalary: 139.182,
  firstApron: 195.945,
  secondApron: 207.824,
  mleNonTax: 14.104,
  mleTax: 5.685,
  mleRoom: 8.781,
};

const LEAGUE_NEWS = [
  "🔥 尼克斯横扫骑士 130-93，自1999年以来首次打进总决赛！布伦森、唐斯领衔",
  "⚡ 西部决赛：雷霆 127-114 马刺，大比分 3-2，SGA 32分，距卫冕一步之遥",
  "🏀 总决赛将于6月3日开打：尼克斯 vs 雷霆/马刺胜者，MSG vs Paycom Center",
  "📊 常规赛战绩：雷霆 64-18 · 马刺 62-20 · 尼克斯 53-29（西区冠军享有主场优势）",
  "🌟 文班亚马 G4 砍 33 分，马刺 103-82 扳平系列赛；Game 6 周四在圣 Antonio",
  "💰 2025-26 薪资帽 $154.647M · 第二围裙 $207.824M 触发硬帽与选秀权冻结",
  "🔄 2026年2月5日交易截止日已过 — 季后赛阵容锁定，经营重心转向续约与选秀",
];

const PLAYOFF_REAL = {
  east: {
    champ: "NYK",
    finals: "尼克斯 4-0 骑士（东部决赛）",
    path: ["4-2 老鹰", "4-0 76人", "4-0 骑士"],
  },
  west: {
    series: "雷霆 3-2 马刺",
    game6: "5月28日 马刺主场",
    note: "胜者将于6月3日客战尼克斯（因常规赛战绩优于纽约）",
  },
};

const TEAMS = [
  { id: "ATL", name: "老鹰", conf: "East", city: "Atlanta", prestige: 45 },
  { id: "BOS", name: "凯尔特人", conf: "East", city: "Boston", prestige: 88 },
  { id: "BKN", name: "篮网", conf: "East", city: "Brooklyn", prestige: 40 },
  { id: "CHA", name: "黄蜂", conf: "East", city: "Charlotte", prestige: 35 },
  { id: "CHI", name: "公牛", conf: "East", city: "Chicago", prestige: 55 },
  { id: "CLE", name: "骑士", conf: "East", city: "Cleveland", prestige: 82 },
  { id: "DET", name: "活塞", conf: "East", city: "Detroit", prestige: 38 },
  { id: "IND", name: "步行者", conf: "East", city: "Indianapolis", prestige: 70 },
  { id: "MIA", name: "热火", conf: "East", city: "Miami", prestige: 72 },
  { id: "MIL", name: "雄鹿", conf: "East", city: "Milwaukee", prestige: 78 },
  { id: "NYK", name: "尼克斯", conf: "East", city: "New York", prestige: 85, record: [53, 29] },
  { id: "ORL", name: "魔术", conf: "East", city: "Orlando", prestige: 75 },
  { id: "PHI", name: "76人", conf: "East", city: "Philadelphia", prestige: 68 },
  { id: "TOR", name: "猛龙", conf: "East", city: "Toronto", prestige: 50 },
  { id: "WAS", name: "奇才", conf: "East", city: "Washington", prestige: 30 },
  { id: "DAL", name: "独行侠", conf: "West", city: "Dallas", prestige: 72 },
  { id: "DEN", name: "掘金", conf: "West", city: "Denver", prestige: 86 },
  { id: "GSW", name: "勇士", conf: "West", city: "Golden State", prestige: 80 },
  { id: "HOU", name: "火箭", conf: "West", city: "Houston", prestige: 65 },
  { id: "LAC", name: "快船", conf: "West", city: "LA Clippers", prestige: 76 },
  { id: "LAL", name: "湖人", conf: "West", city: "LA Lakers", prestige: 82 },
  { id: "MEM", name: "灰熊", conf: "West", city: "Memphis", prestige: 58 },
  { id: "MIN", name: "森林狼", conf: "West", city: "Minnesota", prestige: 77 },
  { id: "NOP", name: "鹈鹕", conf: "West", city: "New Orleans", prestige: 48 },
  { id: "OKC", name: "雷霆", conf: "West", city: "Oklahoma City", prestige: 95, record: [64, 18] },
  { id: "PHX", name: "太阳", conf: "West", city: "Phoenix", prestige: 62 },
  { id: "POR", name: "开拓者", conf: "West", city: "Portland", prestige: 42 },
  { id: "SAC", name: "国王", conf: "West", city: "Sacramento", prestige: 55 },
  { id: "SAS", name: "马刺", conf: "West", city: "San Antonio", prestige: 90, record: [62, 20] },
  { id: "UTA", name: "爵士", conf: "West", city: "Utah", prestige: 36 },
];

/** 明星球员模板 — 反映2026季后赛现实战力 */
const STAR_ROSTERS = {
  NYK: [
    { name: "Jalen Brunson", pos: "PG", age: 29, ovr: 92, off: 94, def: 72, salary: 36.7, years: 3 },
    { name: "Karl-Anthony Towns", pos: "C", age: 30, ovr: 88, off: 90, def: 68, salary: 53.1, years: 4 },
    { name: "Mikal Bridges", pos: "SF", age: 29, ovr: 82, off: 78, def: 86, salary: 23.3, years: 2 },
    { name: "OG Anunoby", pos: "PF", age: 28, ovr: 80, off: 76, def: 84, salary: 41.2, years: 4 },
    { name: "Josh Hart", pos: "SG", age: 30, ovr: 78, off: 74, def: 78, salary: 18.0, years: 2 },
    { name: "Miles McBride", pos: "SG", age: 25, ovr: 72, off: 74, def: 70, salary: 4.3, years: 1 },
    { name: "Precious Achiuwa", pos: "PF", age: 26, ovr: 74, off: 70, def: 78, salary: 6.1, years: 1 },
  ],
  OKC: [
    { name: "Shai Gilgeous-Alexander", pos: "PG", age: 28, ovr: 97, off: 98, def: 82, salary: 35.0, years: 3 },
    { name: "Chet Holmgren", pos: "C", age: 24, ovr: 86, off: 82, def: 90, salary: 10.4, years: 2 },
    { name: "Jalen Williams", pos: "SG", age: 24, ovr: 88, off: 88, def: 80, salary: 5.8, years: 2 },
    { name: "Alex Caruso", pos: "SG", age: 32, ovr: 78, off: 72, def: 88, salary: 9.8, years: 1 },
    { name: "Luguentz Dort", pos: "SF", age: 26, ovr: 76, off: 70, def: 86, salary: 18.2, years: 2 },
    { name: "Isaiah Hartenstein", pos: "C", age: 27, ovr: 80, off: 74, def: 84, salary: 14.0, years: 2 },
    { name: "Jared McCain", pos: "SG", age: 22, ovr: 74, off: 78, def: 68, salary: 4.0, years: 3 },
  ],
  SAS: [
    { name: "Victor Wembanyama", pos: "C", age: 22, ovr: 96, off: 92, def: 96, salary: 12.2, years: 3 },
    { name: "Stephon Castle", pos: "PG", age: 21, ovr: 82, off: 80, def: 78, salary: 8.5, years: 3 },
    { name: "De'Aaron Fox", pos: "PG", age: 28, ovr: 86, off: 88, def: 72, salary: 46.9, years: 3 },
    { name: "Devin Vassell", pos: "SF", age: 25, ovr: 80, off: 82, def: 74, salary: 27.0, years: 3 },
    { name: "Jeremy Sochan", pos: "PF", age: 23, ovr: 76, off: 72, def: 80, salary: 5.4, years: 2 },
    { name: "Keldon Johnson", pos: "SF", age: 26, ovr: 78, off: 80, def: 72, salary: 17.5, years: 2 },
  ],
  CLE: [
    { name: "Donovan Mitchell", pos: "SG", age: 29, ovr: 90, off: 94, def: 70, salary: 48.8, years: 2 },
    { name: "Evan Mobley", pos: "PF", age: 24, ovr: 88, off: 82, def: 92, salary: 38.9, years: 4 },
    { name: "Darius Garland", pos: "PG", age: 26, ovr: 84, off: 86, def: 68, salary: 39.4, years: 3 },
  ],
  BOS: [
    { name: "Jayson Tatum", pos: "SF", age: 28, ovr: 94, off: 94, def: 82, salary: 32.6, years: 4 },
    { name: "Jaylen Brown", pos: "SG", age: 29, ovr: 90, off: 90, def: 80, salary: 53.1, years: 4 },
  ],
  DEN: [
    { name: "Nikola Jokic", pos: "C", age: 31, ovr: 99, off: 98, def: 78, salary: 51.4, years: 3 },
    { name: "Jamal Murray", pos: "PG", age: 28, ovr: 86, off: 88, def: 72, salary: 36.0, years: 3 },
  ],
  LAL: [
    { name: "LeBron James", pos: "SF", age: 41, ovr: 85, off: 88, def: 70, salary: 52.6, years: 1 },
    { name: "Luka Doncic", pos: "PG", age: 27, ovr: 96, off: 98, def: 72, salary: 45.0, years: 4 },
  ],
};

const FIRST_NAMES = ["Marcus","Jaylen","Tyler","Brandon","Chris","Derek","Jordan","Kyle","Austin","Cameron","Devin","Evan","Gary","Isaiah","Jamal"];
const LAST_NAMES = ["Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson"];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

function genPlayer(teamId, tier = "role", starQueue = null) {
  if (starQueue && starQueue.length) {
    const s = starQueue.shift();
    return createPlayer(s, teamId);
  }
  const age = rand(19, 36);
  const ovrBase = tier === "star" ? rand(80, 92) : tier === "starter" ? rand(72, 82) : rand(65, 76);
  const pos = pick(["PG", "SG", "SF", "PF", "C"]);
  return createPlayer({
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    pos, age,
    ovr: ovrBase,
    off: ovrBase + rand(-4, 4),
    def: ovrBase + rand(-6, 4),
    salary: +(Math.max(1, (ovrBase - 60) * 0.35 + rand(1, 5))).toFixed(1),
    years: rand(1, 4),
  }, teamId);
}

const AGENT_NAMES = ["Rich Paul", "Scott Boras", "Bill Duffy", "Jeff Schwartz", "Aaron Goodwin", "Todd Ramasar"];
const AGENT_TYPES = ["greedy", "loyal", "media", "demanding"];

/** 知名双人组化学反应 */
const CHEMISTRY_PAIRS = [
  { names: ["Jalen Brunson", "Karl-Anthony Towns"], label: "纽约双星", bonus: 4 },
  { names: ["Shai Gilgeous-Alexander", "Chet Holmgren"], label: "雷霆双子", bonus: 5 },
  { names: ["Victor Wembanyama", "Stephon Castle"], label: "马刺未来", bonus: 4 },
  { names: ["Jayson Tatum", "Jaylen Brown"], label: "波士顿双探花", bonus: 3 },
  { names: ["Nikola Jokic", "Jamal Murray"], label: "丹佛双核", bonus: 5 },
  { names: ["LeBron James", "Luka Doncic"], label: "洛杉矶组合", bonus: 3 },
  { names: ["Donovan Mitchell", "Evan Mobley"], label: "骑士双塔", bonus: 3 },
];

const AGENT_EVENTS = [
  {
    id: "extension",
    title: "经纪人续约谈判",
    text: (p) => `${p.name} 的经纪人要求提前续约，年薪需上涨 15%`,
    effect: "extension",
  },
  {
    id: "trade_demand",
    title: "经纪人申请交易",
    text: (p) => `${p.name} 经纪人向媒体放风：球员对角色不满，希望离队`,
    effect: "trade",
  },
  {
    id: "media_tour",
    title: "商业活动邀请",
    text: (p) => `${p.name} 经纪人安排中国行活动，缺席下次训练`,
    effect: "media",
  },
  {
    id: "locker",
    title: "更衣室矛盾",
    text: (p) => `${p.name} 与队友发生争执，化学反应受损`,
    effect: "chem_down",
  },
  {
    id: "loyalty",
    title: "降薪留队",
    text: (p) => `${p.name} 经纪人表示愿为争冠降薪 10%`,
    effect: "paycut",
  },
];

function createPlayer(s, teamId) {
  return {
    id: `${teamId}_${s.name.replace(/\s/g, "")}_${rand(1000, 9999)}`,
    name: s.name,
    pos: s.pos,
    age: s.age,
    ovr: Math.min(99, Math.max(60, s.ovr)),
    off: Math.min(99, s.off),
    def: Math.min(99, s.def),
    salary: s.salary,
    yearsLeft: s.years,
    morale: rand(70, 95),
    injury: null,
    teamId,
    potential: rand(0, 15),
    agent: {
      name: pick(AGENT_NAMES),
      type: pick(AGENT_TYPES),
    },
  };
}

function initTeamChemistry(roster) {
  const links = [];
  CHEMISTRY_PAIRS.forEach(pair => {
    const a = roster.find(p => p.name === pair.names[0]);
    const b = roster.find(p => p.name === pair.names[1]);
    if (a && b) {
      links.push({
        id: `${a.id}_${b.id}`,
        playerA: a.id,
        playerB: b.id,
        label: pair.label,
        level: rand(65, 90),
        bonus: pair.bonus,
      });
    }
  });
  for (let i = 0; i < 2; i++) {
    const p1 = pick(roster);
    const p2 = pick(roster.filter(p => p.id !== p1.id));
    if (p1 && p2 && !links.find(l => l.playerA === p1.id || l.playerB === p2.id)) {
      links.push({
        id: `${p1.id}_${p2.id}`,
        playerA: p1.id,
        playerB: p2.id,
        label: "默契搭档",
        level: rand(50, 75),
        bonus: 2,
      });
    }
  }
  return links;
}

function buildRoster(teamId, prestige) {
  const roster = [];
  if (STAR_ROSTERS[teamId]) {
    const starQueue = STAR_ROSTERS[teamId].map(s => ({ ...s }));
    while (starQueue.length) roster.push(genPlayer(teamId, "star", starQueue));
  } else {
    const starCount = prestige >= 85 ? 2 : prestige >= 70 ? 1 : 0;
    for (let i = 0; i < starCount; i++) roster.push(genPlayer(teamId, "star"));
  }
  const startersNeeded = Math.max(0, 7 - roster.length);
  for (let i = 0; i < startersNeeded; i++) roster.push(genPlayer(teamId, "starter"));
  while (roster.length < 12) roster.push(genPlayer(teamId, "role"));
  return roster;
}

const FREE_AGENTS_POOL = [
  { name: "Paul George", pos: "SF", age: 36, ovr: 82, off: 84, def: 76, ask: 18 },
  { name: "Klay Thompson", pos: "SG", age: 36, ovr: 78, off: 82, def: 68, ask: 12 },
  { name: "Russell Westbrook", pos: "PG", age: 37, ovr: 76, off: 78, def: 70, ask: 5 },
  { name: "Buddy Hield", pos: "SG", age: 33, ovr: 77, off: 80, def: 64, ask: 9 },
  { name: "Clint Capela", pos: "C", age: 31, ovr: 75, off: 68, def: 82, ask: 8 },
  { name: "Gary Payton II", pos: "SG", age: 34, ovr: 74, off: 70, def: 80, ask: 4 },
  { name: "Dennis Schröder", pos: "PG", age: 32, ovr: 76, off: 78, def: 70, ask: 7 },
  { name: "Jordan Clarkson", pos: "SG", age: 34, ovr: 77, off: 82, def: 62, ask: 10 },
];

const DRAFT_PROSPECTS = [
  { name: "Cooper Flagg", pos: "SF", age: 19, ovr: 86, scout: "本届状元热门，全能锋线" },
  { name: "Dylan Harper", pos: "PG", age: 19, ovr: 84, scout: "组织核心，高球商" },
  { name: "VJ Edgecombe", pos: "SG", age: 19, ovr: 82, scout: "劲爆得分后卫" },
  { name: "Khaman Maluach", pos: "C", age: 19, ovr: 80, scout: "护框型中锋" },
  { name: "Tre Johnson", pos: "SG", age: 19, ovr: 79, scout: "投射娴熟" },
  { name: "Eric Reibe", pos: "C", age: 20, ovr: 78, scout: "空间型五号位" },
];

const COACHES = [
  { name: "Tom Thibodeau", style: "防守", bonus: { def: 4, off: 0 }, salary: 8 },
  { name: "Mark Daigneault", style: "发展", bonus: { def: 1, off: 2, dev: 2 }, salary: 4 },
  { name: "Gregg Popovich", style: "文化", bonus: { def: 2, off: 2, morale: 5 }, salary: 11 },
  { name: "Erik Spoelstra", style: "战术", bonus: { def: 3, off: 3 }, salary: 9 },
  { name: "Steve Kerr", style: "进攻", bonus: { def: 0, off: 5 }, salary: 10 },
];

const EVENTS_RANDOM = [
  { type: "media", text: "媒体质疑你的轮换安排", effect: { media: -3 } },
  { type: "fan", text: "球迷组织「赢球星期五」活动，球馆气氛火热", effect: { fans: 5, cash: 2 } },
  { type: "injury", text: "训练馆意外：一名轮换球员扭伤脚踝", effect: { injury: true } },
  { type: "sponsor", text: "赞助商追加营销投入", effect: { cash: 5 } },
  { type: "locker", text: "更衣室领袖发声支持管理层", effect: { moraleAll: 3 } },
  { type: "league", text: "联盟办公室赞赏你的社区项目", effect: { media: 4, fans: 2 } },
];

const STORY_EVENTS = [
  { week: 1, text: "📰 尼克斯11连胜挺进总决赛；你的球队能否在下赛季挑战他们？" },
  { week: 8, text: "📰 西部决赛G6将至：马刺主场背水一战，文班亚马能否拖入抢七？" },
  { week: 16, text: "📰 2026总决赛日程公布：6月3日开打，ABC/ESPN全程直播" },
  { week: 40, text: "📰 交易截止日提醒：2月5日前完成补强，否则只能签约被裁球员" },
  { week: 60, text: "📰 季后赛席位争夺白热化；奢侈税球队面临第二围裙压力" },
];
