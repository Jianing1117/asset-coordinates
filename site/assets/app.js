/* 慢复利资产坐标 · 页面骨架、图表与「我的规则」
   内容与文案在 markets.js；数据在 data/*.json，由 scripts/update-data.mjs 生成。 */
const App = (() => {
  const D = document, H = D.documentElement;
  H.classList.add("js");
  const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const LA = "https://www.longarcsociety.com";
  const NAV = [["index.html", "OVERVIEW", "总览"], ["cn.html", "A-SHARES", "A 股"], ["us.html", "US STOCKS", "美股"], ["bond.html", "BONDS", "债券"], ["gold.html", "GOLD", "黄金"], ["btc.html", "CRYPTO", "加密资产"], ["checkup.html", "MY RULES", "我的规则与体检"]];
  const MK = {
    cn: { name: "A 股", en: "A-SHARES", c: "sky", dc: "#1570A2", sw: "var(--sky)" },
    us: { name: "美股", en: "US STOCKS", c: "pink", dc: "#D98091", sw: "var(--pink)" },
    bond: { name: "债券", en: "BONDS", c: "lilac", dc: "#6C4385", sw: "var(--lilac)" },
    gold: { name: "黄金", en: "GOLD", c: "mint", dc: "#2DA283", sw: "var(--mint)" },
    btc: { name: "加密资产", en: "CRYPTO", c: "butter", dc: "#CBAF57", sw: "var(--butter)" },
  };
  const ORDER = ["cn", "us", "bond", "gold", "btc"];
  const TIERS = ["低位区", "偏低", "中性", "偏高", "高位区"];

  // ───── 小工具 ─────
  const $ = (s, r = D) => r.querySelector(s);
  const dot = (d) => (d ? d.replace(/-/g, ".") : "");
  const sign = (x, n = 2) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(n);
  const neg = (x, n = 1) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(n);
  const num = (x) => Math.round(x).toLocaleString("en-US");
  const load = (name) => fetch(`data/${name}.json`, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(name); return r.json(); });
  const old = (t, limit = 6) => (t.stale || t.ageDays > limit ? `<span class="old">数据停在 ${dot(t.asOf)}</span>` : "");
  const tierWord = (pct, lo, mid, hi) => (pct >= 80 ? hi : pct <= 20 ? lo : mid);

  // ───── 页眉、页脚 ─────
  const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 140" class="la" role="img" aria-label="慢复利资产坐标 回到总览"><path fill="#171717" d="M8.2 0H30.2V120H66.4V140H8.2Z M157 0H186.8L209.6 140H187.6L183.6 112.2V112.6H158.6L154.6 140H134.2ZM181 93.6 171.2 24.4H170.8L161.2 93.6Z"/><circle cx="105.8" cy="123" r="17"/></svg>`;
  function frame(active, inner, { home = false } = {}) {
    const nav = NAV.map(([h, en]) => `<a class="n${h === active ? " on" : ""}" href="${h}">${en}</a>`).join("");
    const head = home ? `<a href="index.html"><img class="wm" src="assets/la-wordmark-left.svg" alt="慢复利 Long Arc"></a>` : `<a href="index.html">${MARK}</a>`;
    return `<header class="hd">${head}<nav class="nav">${nav}<a class="menu" href="#" data-menu>MENU</a></nav></header>
<div class="wrap">${inner}</div>
<footer class="ftr"><div class="ftr-in"><div class="ftr-a">${home ? `<p class="voice" style="font-size:20px">因上努力，果上随缘。</p>` : `<a href="index.html"><img class="wm" src="assets/la-wordmark-left.svg" alt="慢复利 Long Arc"></a>`}</div>
<div class="ftr-r"><nav class="ftr-l"><a class="lb lk" href="${LA}" target="_blank" rel="noopener">LONG ARC</a><a class="lb lk" href="${LA}/assets/invest" target="_blank" rel="noopener">INVESTING</a><a class="lb lk" href="${LA}/works" target="_blank" rel="noopener">WORKS</a></nav>
<nav class="ftr-z"><a href="index.html#how">怎么读这个站</a><a href="checkup.html">我的规则与体检</a><a href="${LA}/privacy" target="_blank" rel="noopener">隐私与免责</a><span class="lb g">© 2026</span></nav></div></div>
<p class="s ftr-n">本站只陈述各类资产所处的位置与历史数据，讲方法与流程，不推荐具体产品，不预测涨跌，不构成投资建议。任何投资决定请独立判断、自担风险。</p></footer>`;
  }
  function mount(active, c, inner, opts) {
    D.body.dataset.c = c;
    const page = $(".page"); page.dataset.c = c;
    page.innerHTML = frame(active, inner, opts);
    const panel = D.createElement("div"); panel.className = "mmp"; panel.dataset.panel = "";
    panel.innerHTML = `<header class="hd"><a href="index.html">${MARK}</a><nav class="nav"><a class="menu" style="color:var(--ink)" href="#" data-menu>CLOSE</a></nav></header><div class="wrap mm" style="padding-top:28px;padding-bottom:56px">${NAV.map(([h, , zh], i) => `<a href="${h}"><span class="lb">0${i + 1}</span>${zh}</a>`).join("")}</div>`;
    D.body.appendChild(panel);
    D.querySelectorAll("[data-menu]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); panel.classList.toggle("open"); }));
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.08 });
    D.querySelectorAll(".rv").forEach((e) => io.observe(e));
    setTimeout(() => D.querySelectorAll(".rv").forEach((e) => e.classList.add("in")), 1600);
  }
  const posBar = (score, tier, cls = "") => `<div class="pos ${cls}" role="img" aria-label="位置分 ${score}，${TIERS[tier]}">${TIERS.map((_, i) => `<i${i === tier ? ' class="on"' : ""}></i>`).join("")}<b style="left:${Math.max(0.5, Math.min(99.5, score))}%"></b></div>`;

  // ───── 我的规则（只存在浏览器里）─────
  const PRESETS = {
    steady: { name: "稳健", w: { cn: 10, us: 10, bond: 60, gold: 10, btc: 0 } },
    balanced: { name: "均衡", w: { cn: 20, us: 25, bond: 35, gold: 10, btc: 2 } },
    growth: { name: "进取", w: { cn: 30, us: 35, bond: 15, gold: 10, btc: 5 } },
  };
  function getProfile() {
    try { const p = JSON.parse(localStorage.getItem("lac-profile")); if (p && p.w) return { ...p, mine: true }; } catch (e) {}
    return { preset: "balanced", w: { ...PRESETS.balanced.w }, mine: false };
  }
  function saveProfile(p) { try { localStorage.setItem("lac-profile", JSON.stringify({ preset: p.preset, w: p.w })); } catch (e) {} }
  const w1 = (x) => (Math.round(x * 10) / 10).toString();
  const profName = (p) => (p.mine ? (p.preset === "custom" ? "你填的比例" : `你选的「${PRESETS[p.preset].name}」`) : "「均衡」示例");
  /* 规则：只在两端动一小步。
     both     A 股：低位上调，高位下调，中间不动
     up       美股、黄金：位置分常年偏高、分不出好坏，所以不调到基准以下；偏高时只管新钱
     duration 债券：比例不变，只给期限的倾向
     tobase   比特币：偏冷时补到基准，不额外加码；高位下调
     单次调整不超过基准的两成，也不超过 5 个百分点；几个股票市场合计上调也不超过 5 个百分点。 */
  const MODE = { cn: "both", us: "up", bond: "duration", gold: "up", btc: "tobase" };
  const CAP = 5, REL = 0.2;
  const step = (b) => Math.min(CAP, b * REL);
  function plan(prof, by) {
    const out = {};
    ORDER.forEach((k) => {
      const b = +prof.w[k] || 0, x = by[k] || {}, st = (x.rule && x.rule.state) || "mid", tier = x.tier ?? 2, mode = MODE[k];
      let w = b, act = "hold";
      if (mode === "both") { if (st === "low") { w = b + step(b); act = "up"; } else if (st === "high") { w = b - step(b); act = "down"; } }
      else if (mode === "up") {
        const ld = x.rule && x.rule.ladder;
        if (ld && ld.level > 0) { w = b + (step(b) * ld.level) / ld.rungs.length; act = "ladder"; out[k] = { base: b, w, act, ld }; return; }
        if (st === "low") { w = b + step(b); act = "up"; } else if (tier >= 3) act = "newmoney";
      }
      else if (mode === "duration") act = tier >= 3 ? "short" : tier <= 1 ? "long" : "hold";
      else if (mode === "tobase") { if (st === "low") act = "fill"; else if (st === "high") { w = b - step(b); act = "down"; } }
      out[k] = { base: b, w, act };
    });
    const up = ["cn", "us"].reduce((a, k) => a + Math.max(0, out[k].w - out[k].base), 0);
    if (up > CAP) ["cn", "us"].forEach((k) => { if (out[k].w > out[k].base) out[k].w = out[k].base + ((out[k].w - out[k].base) * CAP) / up; });
    return out;
  }
  const ACT = { up: "上调", down: "下调", hold: "不动", newmoney: "只管新钱", short: "期限放短", long: "期限拉长", fill: "补到基准", ladder: "按阶梯加仓" };
  const actText = (r) => ({
    up: `规则仓位上调到 ${w1(r.w)}%。新增资金优先放在这里，分批买入，不一次到位。`,
    down: `规则仓位下调到 ${w1(r.w)}%。暂停加仓，超出的部分分批移到现金类，不清仓。`,
    hold: "不动。照常定投，按年再平衡。",
    newmoney: "保持基准，不低配。新增资金先放到别处；涨到高出基准的部分，再平衡时卖回基准。",
    short: "比例不变，期限放短。新买入的以短债和中短债为主。",
    long: "比例不变，可以把期限拉长，锁定较高的收益率。",
    fill: "低于基准就补到基准，不额外加码。",
    ladder: r.ld ? `这一轮最深跌到距高点 ${neg(r.ld.deepest)}%，回撤阶梯到了第 ${r.ld.level} 档，共 ${r.ld.rungs.length} 档。规则仓位上调到 ${w1(r.w)}%，钱从现金类出，分几次买入。指数收复前高后，回到基准。` : "",
  }[r.act]);

  // ───── 图表 ─────
  const INK = "#171717", NOTE = "#77787A", STONE = "#D5D5D2", GRID = "#EFEFED", GREY = "#A9AAAB";
  const charts = [];
  addEventListener("resize", () => charts.forEach((c) => c.resize()));
  const pairs = (s) => s.d.map((d, i) => [d, s.v[i]]);
  const ddOf = (s) => { let hi = -Infinity; return { d: s.d, v: s.v.map((v) => { hi = Math.max(hi, v); return +(100 * (v / hi - 1)).toFixed(2); }) }; };
  const quant = (s, p) => { const a = [...s.v].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const yearsAgo = (d, y) => { const t = new Date(d); t.setUTCFullYear(t.getUTCFullYear() - y); return t.toISOString().slice(0, 10); };

  /* figure：标题写结论，下面一行口径，左下写来源。
     opt.series: [{name, s, color, width, dash, end}]；第一条是要讲的那条，其余默认陈列灰。
     opt.bands: [{from, to, color}] 纵向区间淡底；opt.lines: [{y, label}] 水平参考线；opt.dd: 在下方加一格回撤。 */
  function figure(host, opt) {
    const id = "c" + Math.random().toString(36).slice(2, 8);
    const legend = (opt.series.length > 1 || opt.bands) ? `<div class="lg">${opt.series.map((x) => `<span><i style="background:${x.color}"></i>${x.name}</span>`).join("")}${(opt.bands || []).filter((b) => b.label).map((b) => `<span><i class="bk" style="background:${b.color}"></i>${b.label}</span>`).join("")}${opt.dd ? `<span><i style="background:${GREY}"></i>自高点回撤</span>` : ""}</div>` : "";
    const tabs = opt.ranges ? `<div class="tabs sm" data-r>${opt.ranges.map(([l, y]) => `<a data-y="${y}"${y === (opt.def ?? 0) ? ' class="on"' : ""}>${l}</a>`).join("")}</div>` : "";
    const sw = opt.switch ? `<div class="tabs sm zh" data-sw>${opt.switch.map(([l], i) => `<a data-i="${i}"${i === 0 ? ' class="on"' : ""}>${l}</a>`).join("")}</div>` : "";
    const el = D.createElement("div"); el.className = "figure rv";
    el.innerHTML = `<div class="fig-h"><div><div class="h3" data-title>${opt.title}</div><p class="s cap-l">${opt.note || ""}</p></div><div style="display:flex;gap:28px;flex-wrap:wrap">${sw}${tabs}</div></div>${legend}<div class="chart ${opt.size || ""}" id="${id}"></div><p class="src">${opt.source || ""}</p>`;
    host.appendChild(el);
    const ch = echarts.init($("#" + id, el), null, { renderer: "canvas" });
    charts.push(ch);
    let cur = opt, range = opt.def ?? 0;
    const build = () => {
      const o = cur, lastDate = o.series[0].s.d[o.series[0].s.d.length - 1];
      const min = range ? yearsAgo(lastDate, range) : null;
      const axisLabel = { color: NOTE, fontSize: 12, fontFamily: "General Sans, MiSans, PingFang SC, sans-serif" };
      const grids = o.dd ? [{ left: 8, right: 64, top: 12, height: "58%", containLabel: true }, { left: 8, right: 64, top: "74%", bottom: 8, containLabel: true }] : [{ left: 8, right: 64, top: 12, bottom: 8, containLabel: true }];
      const xAxis = grids.map((_, i) => ({ type: "time", gridIndex: i, min, axisLine: { lineStyle: { color: i === grids.length - 1 ? INK : "transparent" } }, axisTick: { show: false }, axisLabel: { ...axisLabel, show: i === grids.length - 1, hideOverlap: true }, splitLine: { show: false } }));
      const yFmt = o.fmt || ((v) => v);
      const yAxis = [{ type: o.log ? "log" : "value", scale: true, gridIndex: 0, min: o.min ?? (o.log ? (v) => v.min * 0.92 : undefined), max: o.max ?? (o.log ? (v) => v.max * 1.08 : undefined), axisLabel: { ...axisLabel, formatter: o.log ? (v) => Number((+v).toPrecision(2)).toLocaleString("en-US") : yFmt }, splitLine: { lineStyle: { color: GRID } }, axisLine: { show: false }, axisTick: { show: false } }];
      if (o.dd) yAxis.push({ type: "value", gridIndex: 1, max: 0, min: (v) => Math.floor(v.min / 20) * 20, axisLabel: { ...axisLabel, formatter: (v) => v + "%" }, splitLine: { lineStyle: { color: GRID } }, splitNumber: 3 });
      const series = o.series.map((x, i) => ({
        name: x.name, type: "line", data: min ? pairs(x.s).filter((p) => p[0] >= min) : pairs(x.s), showSymbol: false, sampling: "lttb", connectNulls: true,
        lineStyle: { width: x.width || (i === 0 ? 2 : 1.4), color: x.color, type: x.dash ? "dashed" : "solid" }, itemStyle: { color: x.color }, z: 10 - i,
        endLabel: x.end === false ? { show: false } : { show: i === 0 || x.end, formatter: (p) => (o.endFmt || yFmt)(p.value[1]), color: INK, fontSize: 12.5, fontFamily: axisLabel.fontFamily, distance: 6 },
        emphasis: { disabled: true }, animation: !calm, animationDuration: 1200, animationEasing: "cubicInOut",
        ...(i === 0 ? {
          markArea: o.bands ? { silent: true, itemStyle: { opacity: 1 }, data: o.bands.map((b) => [{ yAxis: b.from, itemStyle: { color: b.color } }, { yAxis: b.to }]) } : undefined,
          markLine: o.lines ? { silent: true, symbol: "none", lineStyle: { color: GREY, type: "dashed", width: 1 }, label: { color: NOTE, fontSize: 12, position: "insideStartTop", formatter: (p) => p.data.label }, data: o.lines.map((l) => ({ yAxis: l.y, label: l.label })) } : undefined,
        } : {}),
      }));
      if (o.dd) series.push({ name: "自高点回撤", type: "line", xAxisIndex: 1, yAxisIndex: 1, data: pairs(ddOf(o.dd)), showSymbol: false, sampling: "lttb", lineStyle: { width: 1.2, color: GREY }, itemStyle: { color: GREY }, areaStyle: { color: GREY, opacity: 0.12 }, emphasis: { disabled: true }, animation: !calm, animationDuration: 1200 });
      ch.setOption({
        grid: grids, xAxis, yAxis, series, axisPointer: { link: [{ xAxisIndex: "all" }] },
        tooltip: { trigger: "axis", backgroundColor: "#fff", borderColor: STONE, borderWidth: 1, padding: [10, 14], textStyle: { color: INK, fontSize: 13, fontFamily: axisLabel.fontFamily }, axisPointer: { lineStyle: { color: STONE } },
          formatter: (ps) => `<div style="color:${NOTE};font-size:12px;margin-bottom:4px">${dot(new Date(ps[0].value[0]).toISOString().slice(0, 10))}</div>` + ps.map((p) => `${p.seriesName}　${p.seriesName === "自高点回撤" ? p.value[1] + "%" : (o.endFmt || yFmt)(p.value[1])}`).join("<br>") },
      }, true);
    };
    build();
    el.querySelectorAll("[data-r] a").forEach((a) => a.addEventListener("click", () => { range = +a.dataset.y; el.querySelectorAll("[data-r] a").forEach((x) => x.classList.toggle("on", x === a)); build(); }));
    el.querySelectorAll("[data-sw] a").forEach((a) => a.addEventListener("click", () => { cur = { ...opt, ...opt.switch[+a.dataset.i][1]() }; el.querySelectorAll("[data-sw] a").forEach((x) => x.classList.toggle("on", x === a)); $("[data-title]", el).textContent = cur.title; build(); }));
    return el;
  }
  // 分位带：整段历史的 20 与 80 分位。lowGood = 低位算便宜（估值）；否则高位算划算（性价比、收益率）
  function zoneBands(s, lowGood = true) {
    const q20 = quant(s, 0.2), q80 = quant(s, 0.8), lo = Math.min(...s.v), hi = Math.max(...s.v);
    const cheap = "#EBF4F9", dear = "#F8EDEE";
    return [{ from: lo, to: q20, color: lowGood ? cheap : dear, label: lowGood ? "低于 20 分位" : "低于 20 分位" }, { from: q80, to: hi, color: lowGood ? dear : cheap, label: "高于 80 分位" }];
  }
  const fwdCell = (c) => (c ? `${sign(c.med, 1)}%<span class="s" style="display:block">${sign(c.lo, 1)}% 至 ${sign(c.hi, 1)}%</span>` : "样本不足");
  const fwdRange = (c) => (c ? `${sign(c.lo, 1)}% 至 ${sign(c.hi, 1)}%` : "");
  function fwdTable(rows, horizons, head) {
    return `<div class="tb-w"><table class="tb num zh"><thead><tr><th>${head}</th>${horizons.map((y) => `<th>之后 ${y} 年年化</th><th>正收益占比</th>`).join("")}<th>样本数</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.label}</td>${horizons.map((y) => { const c = r["y" + y]; return `<td>${fwdCell(c)}</td><td>${c ? c.win + "%" : ""}</td>`; }).join("")}<td class="s">${r.n}</td></tr>`).join("")}</tbody></table></div><p class="src">每格上面是中位数，下面是八成样本落入的区间。</p>`;
  }

  // ───── 市场页 ─────
  async function market(key) {
    const m = MK[key], cfg = MARKETS[key];
    let data;
    try { data = await load(key); } catch (e) { mount(key + ".html", m.c, `<section class="top"><h1 class="h1">${m.name}</h1><p class="lead" style="margin-top:22px">数据暂时没有读到。请稍后刷新，或回到<a class="lk" href="index.html">总览</a>。</p></section>`); return; }
    const sc = data.score, T = Object.fromEntries(data.tiles.map((t) => [t.key, t])), ctx = { data, T, S: data.series, sc, m, key };
    let sum = null; try { sum = await load("summary"); } catch (e) {}
    const prof = getProfile(), by = sum ? Object.fromEntries(sum.markets.map((x) => [x.key, x])) : { [key]: { tier: sc.tier, rule: sc.rule } };
    const R = plan(prof, by)[key], base = R.base, ru = sc.rule, s2 = data.score2;
    const tiles = cfg.tiles(ctx).map((t, i) => `<div class="tile rv" style="--i:${i}"><div class="lb">${t.lb}</div><div class="h3" style="margin-top:6px">${t.label}</div><div class="num">${t.num}${t.unit ? `<small>${t.unit}</small>` : ""}</div><p class="s">${t.sub}</p>${t.old || ""}</div>`).join("");
    const comps = [...sc.components, ...(s2 ? s2.components : [])].map((c) => `<tr><td>${c.name}</td><td>${c.value == null ? "暂无" : c.value.toFixed(0)}</td><td>${Math.round(c.weight * 100)}%</td><td class="s">${dot(c.asOf)}</td></tr>`).join("");
    const arts = (list) => `<div class="rows" style="margin-top:28px">${list.map(([slug, title, min], i) => `<a class="row r3" href="${LA}/assets/${slug}" target="_blank" rel="noopener"><span class="lb">${String(i + 1).padStart(2, "0")}</span><span class="t">${title}</span><span class="m">${min} MIN</span></a>`).join("")}</div>`;
    const play = (p) => `<div class="play"><div class="sec-h" style="margin-bottom:0"><div class="h3">${p.t}</div>${p.adv ? `<span class="cap o">进阶</span>` : `<span class="cap">基础</span>`}</div><p class="p">${p.p}</p>${p.adv ? `<dl><dt>门槛</dt><dd>${p.bar}</dd><dt>适合谁</dt><dd>${p.who}</dd><dt>最坏情况</dt><dd>${p.worst}</dd></dl>` : ""}</div>`;

    mount(key + ".html", m.c, `
<section class="top"><div class="lb"><a class="lk" href="index.html">OVERVIEW</a> &nbsp;/&nbsp; ${m.en}</div>
  <h1 class="h1" style="margin-top:14px">${m.name}</h1><div class="rule"></div>
  <p class="lead" style="margin-top:22px;max-width:34em">${cfg.lead}</p><p class="meta">DATA AS OF ${dot(data.asOf)}</p></section>

<section class="sec tight two" id="position"><div class="side"><div class="lb">POSITION</div><div class="h3">现在的位置</div><p class="s">位置分 0 到 100。越低越便宜或越冷清，越高越昂贵或越过热。</p></div>
  <div class="wide"><div class="verdict rv"><div class="fig">${sc.value.toFixed(0)}<small>/ 100</small></div>
    <div><div class="lb">${cfg.posLabel}</div><div class="h2">${sc.tierName}。${cfg.verdicts[sc.tier]}</div></div></div>
    ${posBar(sc.value, sc.tier)}<div class="pos-l"><span>${cfg.ends[0]}</span><span>${cfg.ends[1]}</span></div>
    <p class="s" style="margin-top:22px">一周前是 ${sc.weekAgo.value.toFixed(0)} 分。规则只看三种状态：低位、中间、高位。现在是「${ru.name}」${ru.ladder && ru.ladder.level ? "（由回撤阶梯触发）" : ""}，${ru.weekAgo !== ru.state ? "这一周刚发生变化" : "和一周前相同"}。${ru.lastChange ? `最近一次变化在 ${dot(ru.lastChange.date)}，从「${ru.lastChange.from}」到「${ru.lastChange.to}」。` : ""}近十年平均每年变化 ${ru.perYear} 次。</p>
    ${ru.ladder ? `<p class="s" style="margin-top:10px">回撤阶梯有 ${ru.ladder.rungs.map((r) => r + "%").join("、")} 三档，从历史最高收盘价 ${num(ru.ladder.peak)} 点（${dot(ru.ladder.peakDate)}）算起。${ru.ladder.level ? `这一轮最深跌到 ${neg(ru.ladder.deepest)}%，已经触发第 ${ru.ladder.level} 档（${ru.ladder.triggers.map((x) => `${x.rung}% 在 ${dot(x.date)}`).join("，")}）。` : "现在没有触发。"}${ru.ladder.next ? `下一档是跌破 ${ru.ladder.next.rung}%，对应约 ${num(ru.ladder.next.price)} 点。` : "三档都已触发。"}</p>` : ""}
    ${s2 ? `<div style="margin-top:56px"><div class="lb">US TREASURIES</div><div class="h3" style="margin-top:8px">美债单独看：${s2.tierName}，${s2.value.toFixed(0)} 分</div>${posBar(s2.value, s2.tier)}<div class="pos-l"><span>${cfg.ends[0]}</span><span>${cfg.ends[1]}</span></div><p class="s" style="margin-top:14px">持有美元债券的人看这一条。只持有人民币债券的人看上面的中债。</p></div>` : ""}
    <div class="tb-w"><table class="tb num zh"><thead><tr><th>位置分由这几项合成</th><th>分项读数</th><th>权重</th><th>数据日期</th></tr></thead><tbody>${comps}</tbody></table></div>
    <p class="src">分项读数都换算成 0 到 100，方向统一为「越高越贵」。每个时点的分位只和当时已经发生的历史比较，不用未来的数据。合成后取 5 日平均再分档，避免在档位边界上来回跳。</p></div></section>

<section class="sec tight two"><div class="side"><div class="lb">READINGS</div><div class="h3">几个读数</div></div><div class="tiles">${tiles}</div></section>

${cfg.sections(ctx).map((s, i) => `<section class="sec two" id="${s.id}"><div class="side"><div class="lb">INDICATOR ${String(i + 1).padStart(2, "0")}</div><div class="h3">${s.name}</div><p class="s">${s.q}</p></div><div class="wide" data-sec="${i}"></div></section>`).join("")}

<section class="sec two" id="plays"><div class="side"><div class="lb">HOW TO PLAY</div><div class="h3">这个市场的做法</div><p class="s">从基础的开始。进阶的写明了门槛和最坏情况，不合适就跳过。</p></div><div class="wide">${cfg.plays.map(play).join("")}</div></section>

<section class="sec two" id="rule"><div class="side"><div class="lb">BY THE RULES</div><div class="h3">按这套规则</div><p class="s">每个人的收入、负债和目标不同。这里只把规则算给你看。</p></div>
  <div class="wide"><div class="h2">${base > 0 ? `${ACT[R.act]}。基准 ${w1(base)}%，${R.w === base ? "比例不变" : "规则仓位 " + w1(R.w) + "%"}` : `你的基准里没有配置${m.name}`}</div>
  <p class="p" style="margin-top:18px;text-align:left">${base > 0 ? `按${profName(prof)}，${m.name}的基准比例是 ${w1(base)}%。位置是「${sc.tierName}」，${R.act === "ladder" ? "但回撤阶梯已经触发。" : `规则状态是「${ru.name}」。`}${actText(R)}${s2 ? `美债的位置是「${s2.tierName}」，${s2.tier >= 3 ? "美元债券同样把期限放短" : s2.tier <= 1 ? "美元债券可以把期限拉长" : "美元债券的期限不用调整"}。` : ""}` : `按${profName(prof)}，${m.name}的基准比例是 0，这一页的位置只作了解。`}</p>
  <p class="p" style="margin-top:14px;text-align:left">${cfg.ruleNote}</p>
  <p class="s" style="margin-top:22px">${prof.mine ? "" : "这是一组示例比例，不是给你的建议。"}单次调整不超过基准的两成，也不超过 5 个百分点。<a class="lk" href="checkup.html">${prof.mine ? "修改我的比例" : "换成我自己的比例"}</a>。还没想清楚股债各放多少，可以先做一次<a class="lk" href="checkup.html#checkup">家庭财务体检</a>。</p></div></section>

<section class="sec two" id="read"><div class="side"><div class="lb">READ MORE</div><div class="h3">方法出自这几篇</div><p class="s">来自 Long Arc「投资配置」这条线。</p></div><div class="wide">${arts(cfg.articles)}</div></section>

<section class="sec two" id="sources"><div class="side"><div class="lb">SOURCES</div><div class="h3">数据出处</div></div><div class="wide"><div class="tb-w" style="margin-top:0"><table class="tb zh stack"><thead><tr><th>指标</th><th>来源</th><th>数据截至</th></tr></thead><tbody>${data.sources.map((s) => `<tr><td style="white-space:normal">${s.name}</td><td data-l="来源"><a class="lk" href="${s.url}" target="_blank" rel="noopener">${s.provider}</a></td><td data-l="截至" class="s">${dot(s.asOf)}${s.stale ? "，本次更新失败，沿用上次数据" : ""}</td></tr>`).join("")}</tbody></table></div>
  <p class="src" style="margin-top:22px">${cfg.sourceNote}</p></div></section>`);

    cfg.sections(ctx).forEach((s, i) => {
      const host = $(`[data-sec="${i}"]`);
      s.figures.forEach((f) => figure(host, { ...f, series: f.series.map((x, k) => ({ ...x, color: x.color || (k === 0 ? m.dc : GREY) })) }));
      if (s.custom) s.custom(host);
      if (s.table) host.insertAdjacentHTML("beforeend", s.table);
      if (s.tip) host.insertAdjacentHTML("beforeend", `<div class="tip rv"><div class="lb">HOW TO USE</div><p class="p">${s.tip}</p></div>`);
    });
    D.title = `${m.name} · ${sc.tierName}｜慢复利资产坐标`;
  }

  // ───── 总览 ─────
  async function home() {
    let sum;
    try { sum = await load("summary"); } catch (e) { mount("index.html", "lilac", `<section class="top"><h1 class="h1">慢复利资产坐标</h1><p class="lead" style="margin-top:22px">数据暂时没有读到，请稍后刷新。</p></section>`, { home: true }); return; }
    const prof = getProfile(), by = Object.fromEntries(sum.markets.map((x) => [x.key, x]));
    const latest = sum.markets.map((x) => x.asOf).sort().pop();
    const moved = sum.markets.filter((x) => x.rule.weekAgo !== x.rule.state), P = plan(prof, by), SN = { low: "低位", mid: "中间", high: "高位" };
    const rows = ORDER.map((k, i) => { const x = by[k], m = MK[k]; return `<a class="mk-row rv" style="--i:${i}" href="${k}.html"><span class="ck" style="background:${m.sw}"></span><span class="t">${m.name}</span>${posBar(x.score, x.tier, "sm").replace('class="on"', `class="on" style="background:${m.sw}"`)}<span class="rd">${x.tierName} · ${x.score.toFixed(0)} 分<span class="s">${x.headline.label} ${x.headline.value}，${x.headline.note}${x.second ? `。${x.second.headline}，${x.second.tierName}` : ""}${x.stale ? "。本次更新失败，沿用上次数据" : ""}</span></span><span class="m">${dot(x.asOf).slice(5)}</span></a>`; }).join("");
    let total = 0;
    const rule = ORDER.map((k) => { const x = by[k], r = P[k]; total += r.w; return `<tr><td>${MK[k].name}</td><td>${x.tierName}</td><td>${ACT[r.act]}</td><td>${w1(r.base)}%</td><td>${r.w === r.base ? "同基准" : w1(r.w) + "%"}</td></tr>`; }).join("");
    mount("index.html", "lilac", `
<section class="top"><div class="lb">WHERE EACH ASSET STANDS</div>
  <h1 class="h1" style="margin-top:14px">慢复利资产坐标</h1><div class="rule"></div>
  <p class="lead" style="margin-top:22px;max-width:34em">A 股、美股、债券、黄金、加密资产，现在各自站在历史的什么位置。这里只判断位置，再把你自己定的规则算给你看，不预测涨跌。</p><p class="meta">DATA AS OF ${dot(latest)} · UPDATED DAILY</p></section>

<section class="sec tight two"><div class="side"><div class="lb">POSITION</div><div class="h3">五类资产的位置</div><p class="s">位置条从左到右是便宜到昂贵，竖线是今天。点进去看依据。</p></div>
  <div><div class="rows">${rows}</div>
  <p class="s" style="margin-top:36px">${moved.length ? "和一周前比，" + moved.map((x) => `${MK[x.key].name}的规则状态从「${SN[x.rule.weekAgo]}」变成「${x.rule.name}」`).join("，") + "。" : "和一周前比，五类资产的规则状态都没有变。状态不变，就不需要动作。"}</p></div></section>

<section class="sec two" id="rule"><div class="side"><div class="lb">BY THE RULES</div><div class="h3">按这套规则</div><p class="s">基准比例是你定的。规则只在位置走到两端时动一小步，其余时间不动。</p></div>
  <div class="wide"><div class="h2">${prof.mine ? "按你的比例算一遍" : "先用一组示例比例算一遍"}</div>
  <div class="tb-w"><table class="tb num zh"><thead><tr><th>资产</th><th>位置</th><th>现在该做什么</th><th>基准比例</th><th>规则仓位</th></tr></thead><tbody>${rule}<tr><td>现金类</td><td></td><td class="s">其余部分</td><td>${w1(Math.max(0, 100 - ORDER.reduce((a, k) => a + (+prof.w[k] || 0), 0)))}%</td><td>${w1(Math.max(0, 100 - total))}%</td></tr></tbody></table></div>
  <p class="s" style="margin-top:22px">用的是${profName(prof)}。${prof.mine ? "" : "它不是给你的建议。"}<a class="lk" href="checkup.html">${prof.mine ? "修改我的比例" : "换成我自己的比例"}</a>。</p>
  <div class="rows" style="margin-top:36px">
  <div class="row r2"><span class="lb">A</span><span><span class="t">A 股：两端才动</span><p class="s" style="margin-top:6px">位置分低于 20 上调，高于 80 下调，中间不动。历史上中间几档之后的回报分不出好坏。</p></span></div>
  <div class="row r2"><span class="lb">B</span><span><span class="t">美股、黄金：不低配</span><p class="s" style="margin-top:6px">这两类的位置分常年偏高，按它减仓等于长期少配。偏高时只管新增资金，高出基准的部分卖回基准。美股另有回撤阶梯：距历史高点跌破 15%、20%、30% 各加一档，收复前高后回到基准。</p></span></div>
  <div class="row r2"><span class="lb">C</span><span><span class="t">债券：只调期限</span><p class="s" style="margin-top:6px">比例不变。收益率在低位时把期限放短，在高位时可以拉长。中债和美债分开看。</p></span></div>
  <div class="row r2"><span class="lb">D</span><span><span class="t">比特币：偏冷只补到基准</span><p class="s" style="margin-top:6px">全网平均亏损或价格跌破 200 周均线时才算偏冷，这时补到基准，不额外加码。</p></span></div></div>
  <p class="s" style="margin-top:28px">单次调整不超过基准的两成，也不超过 5 个百分点。A 股和美股合计上调同样不超过 5 个百分点。</p></div></section>

<section class="sec two" id="how"><div class="side"><div class="lb">HOW TO READ</div><div class="h3">怎么读这个站</div></div>
  <div class="wide"><div class="rows">
  <div class="row r2"><span class="lb">01</span><span><span class="t">先看位置</span><p class="s" style="margin-top:6px">每类资产一个位置分，由两三个指标合成。指标是什么、各占多少、数据到哪天，都写在页面上。</p></span></div>
  <div class="row r2"><span class="lb">02</span><span><span class="t">再看证据</span><p class="s" style="margin-top:6px">每个指标旁边有一张表：历史上处在这个位置之后，持有几年的结果是怎样分布的。失灵的时候也在表里。</p></span></div>
  <div class="row r2"><span class="lb">03</span><span><span class="t">最后看规则</span><p class="s" style="margin-top:6px">你定基准比例，规则只在位置走到两端时动一小步。大多数日子的结论是不动。</p></span></div></div>
  <div class="tip" style="margin-top:40px"><div class="lb">BOUNDARY</div><p class="p">这里用的是估值和情绪的历史分位。它们说的是「现在贵不贵」，说不了「明天涨不涨」。贵的东西可以继续贵很久，所以规则每次只动一小步，并且从不清仓。数据每天更新一次，天天看可以，天天动没有必要。</p></div></div></section>`, { home: true });
    D.title = "慢复利资产坐标｜五类资产现在站在什么位置";
  }

  // ───── 我的规则与体检 ─────
  function checkup() {
    const draw = () => {
      const p = getProfile(), sum = ORDER.reduce((a, k) => a + (+p.w[k] || 0), 0);
      $("#rules").innerHTML = `<div class="h2">${p.mine ? "你的基准比例" : "先选一个最接近的档位"}</div>
<p class="p" style="margin-top:18px;text-align:left">基准比例是你在不看行情的时候给自己定的长期配置。它应该来自你的收入稳定性、要用钱的时间和能承受的回撤，不来自今天的市场。这里只管准备放五年以上的钱。</p>
<div class="seg" style="margin-top:28px">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}"${p.preset === k ? ' class="on"' : ""}>${v.name}</button>`).join("")}<button data-pre="custom"${p.preset === "custom" ? ' class="on"' : ""}>自己填</button></div>
<div class="tb-w"><table class="tb num zh"><thead><tr><th>资产</th><th>基准比例</th></tr></thead><tbody>${ORDER.map((k) => `<tr><td>${MK[k].name}</td><td><input class="inp" inputmode="decimal" data-w="${k}" value="${p.w[k]}" aria-label="${MK[k].name}基准比例"> %</td></tr>`).join("")}<tr><td>现金类</td><td>${w1(Math.max(0, 100 - sum))} %</td></tr></tbody></table></div>
${sum > 100 ? `<p class="s" style="margin-top:14px;color:var(--ink)">五项加起来是 ${w1(sum)}%，超过了 100%。请调低其中几项。</p>` : ""}
<div class="h3" style="margin-top:44px">规则会怎么动它</div>
<p class="s" style="margin-top:6px">规则只在位置走到两端时调整，单次不超过基准的两成，也不超过 5 个百分点。基准 20% 的资产最多调到 24% 或 16%，基准 60% 的最多调 5 个百分点。A 股和美股合计上调也不超过 5 个百分点。</p>
<p class="s" style="margin-top:28px">${p.mine ? `已保存在这台设备的浏览器里，没有上传。<a class="lk" href="#" data-reset>清除，回到示例</a>。` : "还没有保存。选一个档位或改一个数字就会保存在这台设备的浏览器里，不上传。"} 设好后回到<a class="lk" href="index.html#rule">总览</a>看规则算出的结果。</p>`;
      $("#rules").querySelectorAll("[data-pre]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.pre; saveProfile({ preset: k, w: k === "custom" ? p.w : { ...PRESETS[k].w } }); draw(); }));
      $("#rules").querySelectorAll("[data-w]").forEach((i) => i.addEventListener("change", () => { const v = Math.max(0, Math.min(100, parseFloat(i.value) || 0)); saveProfile({ preset: "custom", w: { ...p.w, [i.dataset.w]: v } }); draw(); }));
      const rs = $("[data-reset]"); if (rs) rs.addEventListener("click", (e) => { e.preventDefault(); try { localStorage.removeItem("lac-profile"); } catch (x) {} draw(); });
    };
    mount("checkup.html", "lilac", `
<section class="top"><div class="lb"><a class="lk" href="index.html">OVERVIEW</a> &nbsp;/&nbsp; MY RULES</div>
  <h1 class="h1" style="margin-top:14px">我的规则与体检</h1><div class="rule"></div>
  <p class="lead" style="margin-top:22px;max-width:34em">市场的位置对每个人都一样，该怎么做因人而异。在这里定下你自己的基准比例，各个页面就会按它来算。</p></section>
<section class="sec tight two"><div class="side"><div class="lb">MY RULES</div><div class="h3">我的规则</div><p class="s">不注册，不上传，只存在你的浏览器里。</p></div><div class="wide" id="rules"></div></section>
<section class="sec two" id="checkup"><div class="side"><div class="lb">CHECKUP</div><div class="h3">家庭财务体检</div><p class="s">不知道基准该定多少时，从这里开始。</p></div>
  <div class="wide"><div class="h2">先看清家底，再定比例</div>
  <p class="p" style="margin-top:18px;text-align:left">基准比例定得对不对，比任何一个指标都重要。应急金够不够、保障有没有缺口、哪些钱三年内要用，这些问题排在「现在贵不贵」前面。家庭财务体检是 Long Arc 的另一个免费工具：填一份问卷，拿到一份体检报告和一页家庭投资政策书，里面有适合你家的股债比例。数据同样只存在你的浏览器里。</p>
  <p style="margin-top:32px"><a class="btn" href="${LA}/tools/checkup" target="_blank" rel="noopener">去做家庭财务体检</a></p>
  <p class="s" style="margin-top:28px">两个工具目前各自独立。做完体检后，把政策书里的比例填到上面的「我的规则」，这个站就会按它计算。之后会做成自动带入。</p>
  <div class="rows" style="margin-top:44px">${[["behave-ips", "投资政策书：一页纸写下自己的投资规则", 9], ["alloc-ratio", "股债比例怎么定：年龄、收入稳定性和风险承受力", 9], ["alloc-rebalance", "再平衡：定期还是按阈值，怎样低成本执行", 10], ["ledger-buckets", "家庭资金分四个账户：活钱、稳钱、长钱和保障", 12]].map(([s, t, n], i) => `<a class="row r3" href="${LA}/assets/${s}" target="_blank" rel="noopener"><span class="lb">0${i + 1}</span><span class="t">${t}</span><span class="m">${n} MIN</span></a>`).join("")}</div></div></section>`);
    draw();
    D.title = "我的规则与体检｜慢复利资产坐标";
  }

  return { market, home, checkup, figure, zoneBands, fwdTable, helpers: { sign, neg, num, dot, old, tierWord, quant, GREY, STONE, LA } };
})();
