#!/usr/bin/env node
// 慢复利资产坐标 · 数据更新
// 用法：node scripts/update-data.mjs
// 抓取公开数据 → 计算指标与位置分 → 写入 site/data/*.json
// 任何一个数据源失败时沿用 cache/ 里上一次成功的原始数据，并在输出里标注 stale。
// 不需要任何 token。接入 Tushare 的位置见 README「Tushare 接入」。

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "cache");
const OUT = join(ROOT, "site", "data");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const today = new Date().toISOString().slice(0, 10);
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const log = (...a) => console.log(...a);
const fetchLog = [];

// ───────── 抓取与缓存 ─────────
async function httpText(url, { curl = false, post = false, headers = {} } = {}) {
  if (curl) {
    return execFileSync("curl", ["-s", "-f", "-m", "60", "-A", "Mozilla/5.0", url], { maxBuffer: 1 << 30 }).toString();
  }
  const r = await fetch(url, { method: post ? "POST" : "GET", headers: { "User-Agent": UA, Accept: "*/*", ...headers }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

// 取一份原始数据并解析；失败时退回缓存。parse 抛错也算失败，避免把坏数据写进缓存。
async function source(name, loader, parse) {
  const file = join(CACHE, name + ".txt");
  const meta = join(CACHE, name + ".meta.json");
  try {
    const raw = await loader();
    const parsed = parse(raw);
    if (!parsed || (parsed.d && parsed.d.length === 0)) throw new Error("empty");
    writeFileSync(file, raw);
    writeFileSync(meta, JSON.stringify({ fetchedAt: new Date().toISOString() }));
    fetchLog.push({ name, ok: true });
    return Object.assign(parsed, { stale: false });
  } catch (e) {
    fetchLog.push({ name, ok: false, error: String(e.message || e).slice(0, 120) });
    if (existsSync(file)) {
      log(`  ! ${name} 抓取失败（${String(e.message).slice(0, 60)}），沿用缓存`);
      return Object.assign(parse(readFileSync(file, "utf8")), { stale: true });
    }
    log(`  ! ${name} 抓取失败且无缓存：${String(e.message).slice(0, 80)}`);
    return { d: [], v: [], stale: true, missing: true };
  }
}

// ───────── 解析器 ─────────
const S = (d, v) => ({ d, v });
function clean(pairs) {
  const m = new Map();
  for (const [d, v] of pairs) if (d && Number.isFinite(v)) m.set(d, v);
  const ds = [...m.keys()].sort();
  return S(ds, ds.map((d) => m.get(d)));
}
const parseCsindex = (field) => (raw) => {
  const rows = JSON.parse(raw).data;
  return clean(rows.map((r) => [`${r.tradeDate.slice(0, 4)}-${r.tradeDate.slice(4, 6)}-${r.tradeDate.slice(6, 8)}`, r[field] == null ? NaN : +r[field]]));
};
const parseFred = (raw) => clean(raw.trim().split("\n").slice(1).map((l) => { const [d, v] = l.split(","); return [d, v === "" || v === "." ? NaN : +v]; }));
const parseYahoo = (raw) => {
  const r = JSON.parse(raw).chart.result[0];
  const c = r.indicators.quote[0].close;
  return clean(r.timestamp.map((t, i) => [ymd(t * 1000), c[i] == null ? NaN : +c[i]]));
};
const MON = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
const parseMultpl = (raw) => {
  const m = [...raw.matchAll(/<td>([A-Z][a-z]{2}) (\d+), (\d{4})<\/td>\s*<td>\s*(?:&#x2002;)?\s*([\d.,]+)/g)];
  const seen = new Map(); // 每月只留最新一条
  for (const x of m) { const k = `${x[3]}-${MON[x[1]]}-01`; if (!seen.has(k)) seen.set(k, +x[4].replace(/,/g, "")); }
  return clean([...seen.entries()]);
};
const csindex = (code) => () => httpText(`https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=${code}&startDate=20050101&endDate=${today.replace(/-/g, "")}`);
const fred = (id) => () => httpText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
const yahoo = (sym) => () => httpText(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=-1500000000&period2=9999999999&interval=1d`, { curl: true });

// ───────── 序列工具 ─────────
const last = (s) => s.v[s.v.length - 1];
const lastD = (s) => s.d[s.d.length - 1];
const round = (x, n = 2) => (Number.isFinite(x) ? +x.toFixed(n) : null);
const mapS = (s, f) => { const d = [], v = []; s.d.forEach((x, i) => { const y = f(s.v[i], i, x); if (Number.isFinite(y)) { d.push(x); v.push(y); } }); return S(d, v); };
const from = (s, d0) => { const i = s.d.findIndex((x) => x >= d0); return i < 0 ? S([], []) : S(s.d.slice(i), s.v.slice(i)); };
// 按日期取「当日或之前最近一个值」的查找器（两条序列对齐用）
function asof(s) {
  return (date) => {
    let lo = 0, hi = s.d.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (s.d[m] <= date) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans < 0 ? NaN : s.v[ans];
  };
}
// 两条序列按 a 的日期对齐后逐点运算
const zip = (a, b, f) => { const g = asof(b); return mapS(a, (v, i, d) => f(v, g(d))); };
function sma(s, n) { let sum = 0; return mapS(s, (v, i) => { sum += v; if (i >= n) sum -= s.v[i - n]; return i >= n - 1 ? sum / n : NaN; }); }
function geoMean(s, n) { let sum = 0; const lg = s.v.map(Math.log); return mapS(s, (v, i) => { sum += lg[i]; if (i >= n) sum -= lg[i - n]; return i >= n - 1 ? Math.exp(sum / n) : NaN; }); }
// 分位：每个时点只和「当时已经发生的历史」比，不用未来数据。window 为空则用全部历史。
function pctRank(s, { minN = 250, window = 0 } = {}) {
  const sorted = [];
  const ins = (x) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= x) lo = m + 1; else hi = m; } sorted.splice(lo, 0, x); return lo + 1; };
  const del = (x) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < x) lo = m + 1; else hi = m; } sorted.splice(lo, 1); };
  return mapS(s, (v, i) => {
    const rank = ins(v);
    if (window && i >= window) del(s.v[i - window]);
    const n = sorted.length;
    return n >= minN ? (100 * rank) / n : NaN;
  });
}
function drawdown(s) { let hi = -Infinity; return mapS(s, (v) => { hi = Math.max(hi, v); return 100 * (v / hi - 1); }); }
const weekly = (s) => { const d = [], v = []; s.d.forEach((x, i) => { const nx = s.d[i + 1]; if (!nx || new Date(nx).getUTCDay() < new Date(x).getUTCDay() || (new Date(nx) - new Date(x)) > 6 * 864e5) { d.push(x); v.push(s.v[i]); } }); return S(d, v); };
const r2 = (s, n = 2) => S(s.d, s.v.map((x) => +x.toFixed(n)));
const median = (a) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const q = (a, p) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };

// 「处于某个分位区间之后，持有 N 年的结果」。样本彼此重叠，只能当作历史分布看，不是独立样本。
function forwardTable(signal, price, { buckets, horizons, stepDays }) {
  const pf = asof(price), lastDate = lastD(price);
  const addY = (d, y) => { const t = new Date(d); t.setUTCFullYear(t.getUTCFullYear() + y); return ymd(t); };
  return buckets.map(([lo, hi, label]) => {
    const row = { label, n: 0, h: {} };
    for (const y of horizons) row.h[y] = [];
    for (let i = 0; i < signal.d.length; i += stepDays) {
      const sv = signal.v[i];
      if (!(sv >= lo && sv < hi)) continue;
      row.n++;
      const p0 = pf(signal.d[i]);
      for (const y of horizons) {
        const d1 = addY(signal.d[i], y);
        if (d1 > lastDate) continue;
        const p1 = pf(d1);
        if (p0 > 0 && p1 > 0) row.h[y].push(100 * (Math.pow(p1 / p0, 1 / y) - 1));
      }
    }
    const out = { label, n: row.n };
    for (const y of horizons) {
      const a = row.h[y];
      out["y" + y] = a.length >= 5 ? { med: round(median(a), 1), lo: round(q(a, 0.1), 1), hi: round(q(a, 0.9), 1), win: round((100 * a.filter((x) => x > 0).length) / a.length, 0), n: a.length } : null;
    }
    return out;
  });
}

// 位置分：0 = 便宜或冷清，100 = 昂贵或过热。各分项先各自换成 0–100，再按权重合成，5 日平滑后分档。
const TIERS = [[20, "低位区"], [40, "偏低"], [60, "中性"], [80, "偏高"], [101, "高位区"]];
const tierOf = (x) => TIERS.findIndex(([hi]) => x < hi);
// 规则状态只有三种：低位、中间、高位。只在两端动，进出留 3 分缓冲（低于 20 进、回到 23 出；高于 80 进、回到 77 出）。
// opt.low(date, 已在低位) 可以替换「低位」的判定（比特币用明确条件，不用分位）。
const STATE = { low: "低位", mid: "中间", high: "高位" };
function buildScore(axis, comps, opt = {}) {
  const fs = comps.map((c) => asof(c.series));
  const raw = mapS(axis, (_, i, d) => {
    let w = 0, sum = 0;
    comps.forEach((c, k) => { const v = fs[k](d); if (Number.isFinite(v)) { w += c.weight; sum += c.weight * v; } });
    return w >= 0.5 ? sum / w : NaN; // 可用权重不足一半时不出分
  });
  const sm = sma(raw, 5);
  const n = sm.v.length;
  const value = sm.v[n - 1], tier = tierOf(value);
  let change = null;
  for (let i = n - 1; i > 0; i--) if (tierOf(sm.v[i]) !== tierOf(sm.v[i - 1])) { change = { date: sm.d[i], from: TIERS[tierOf(sm.v[i - 1])][1], to: TIERS[tierOf(sm.v[i])][1] }; break; }
  const wk = sm.v[Math.max(0, n - 6)];
  const st = []; let cur = "mid";
  sm.v.forEach((x, i) => {
    if (opt.low) { const c = opt.low(sm.d[i], cur === "low"); if (cur === "low" && !c) cur = "mid"; else if (cur !== "low" && c) cur = "low"; }
    else if (cur === "low" && x >= 23) cur = "mid"; else if (cur !== "low" && x < 20) cur = "low";
    if (cur === "high" && x <= 77) cur = "mid"; else if (cur === "mid" && x > 80) cur = "high";
    st.push(cur);
  });
  let sChange = null;
  for (let i = n - 1; i > 0; i--) if (st[i] !== st[i - 1]) { sChange = { date: sm.d[i], from: STATE[st[i - 1]], to: STATE[st[i]] }; break; }
  const d10 = `${+sm.d[n - 1].slice(0, 4) - 10}${sm.d[n - 1].slice(4)}`, i10 = Math.max(1, sm.d.findIndex((d) => d >= d10));
  let flips = 0; for (let i = i10; i < n; i++) if (st[i] !== st[i - 1]) flips++;
  const yrs = (new Date(sm.d[n - 1]) - new Date(sm.d[i10])) / 31557600000;
  const rule = { state: st[n - 1], name: STATE[st[n - 1]], weekAgo: st[Math.max(0, n - 6)], lastChange: sChange, perYear: round(flips / Math.max(1, yrs), 1) };
  return {
    rule,
    value: round(value, 1), tier, tierName: TIERS[tier][1], asOf: sm.d[n - 1],
    weekAgo: { value: round(wk, 1), tier: tierOf(wk), tierName: TIERS[tierOf(wk)][1] },
    lastTierChange: change,
    components: comps.map((c, k) => ({ key: c.key, name: c.name, weight: c.weight, value: round(fs[k](sm.d[n - 1]), 1), asOf: lastD(c.series) })),
    hist: r2(weekly(sm), 1),
  };
}
const daysOld = (d) => Math.round((new Date(today) - new Date(d)) / 864e5);
const tile = (key, value, asOfDate, extra = {}) => ({ key, value, asOf: asOfDate, ageDays: daysOld(asOfDate), ...extra });
const write = (name, obj) => { writeFileSync(join(OUT, name + ".json"), JSON.stringify(obj)); log(`  → site/data/${name}.json`); };
const src = (name, provider, url, s) => ({ name, provider, url, asOf: s && s.d.length ? lastD(s) : null, stale: !!(s && s.stale) });

// ═════════ 抓取 ═════════
log("抓取数据…");
const [csAll, csAllPe, csAllTR, cs300Pe, cs500Pe, cs300TR] = await Promise.all([
  source("csindex-000985-close", csindex("000985"), parseCsindex("close")),
  source("csindex-000985-pe", csindex("000985"), parseCsindex("peg")),
  source("csindex-H00985-close", csindex("H00985"), parseCsindex("close")),
  source("csindex-000300-pe", csindex("000300"), parseCsindex("peg")),
  source("csindex-000905-pe", csindex("000905"), parseCsindex("peg")),
  source("csindex-H00300-close", csindex("H00300"), parseCsindex("close")),
]);
const csAllVal = await source("csindex-000985-value", csindex("000985"), parseCsindex("tradingValue"));
const qvix = await source("optbbs-qvix", () => httpText("http://1.optbbs.com/d/csv/d/k.csv"), (raw) =>
  clean(raw.trim().split("\n").slice(1).map((l) => { const c = l.split(","); return [c[0].replace(/\//g, "-").replace(/-(\d)(?=-|$)/g, "-0$1"), +c[12]]; })));

// 中国国债收益率长历史：东方财富数据中心（原始数据来自中债估值）。分页抓取后合并缓存。
const treasury = await source("eastmoney-treasury", async () => {
  const rows = [];
  for (let p = 1; p <= 40; p++) {
    const j = JSON.parse(await httpText(`https://datacenter.eastmoney.com/api/data/get?type=RPTA_WEB_TREASURYYIELD&sty=ALL&st=SOLAR_DATE&sr=-1&token=894050c76af8597a853f5b408b759f5d&p=${p}&ps=500`));
    if (!j.result) break;
    rows.push(...j.result.data);
    if (p >= j.result.pages) break;
  }
  return JSON.stringify(rows);
}, (raw) => {
  const rows = JSON.parse(raw);
  const pick = (k) => clean(rows.map((r) => [r.SOLAR_DATE.slice(0, 10), r[k] == null ? NaN : +r[k]]));
  return { d: [1], cn10: pick("EMM00166466"), cn2: pick("EMM00588704"), cn30: pick("EMM00166469") };
});
const cn10 = Object.assign(treasury.cn10 || S([], []), { stale: treasury.stale });

const [us10, us2, usReal, cpi] = await Promise.all([
  source("fred-DGS10", fred("DGS10"), parseFred), source("fred-DGS2", fred("DGS2"), parseFred),
  source("fred-DFII10", fred("DFII10"), parseFred), source("fred-CPIAUCSL", fred("CPIAUCSL"), parseFred),
]);
const spx = await source("yahoo-GSPC", yahoo("^GSPC"), parseYahoo);
const goldD = await source("yahoo-GC", yahoo("GC=F"), parseYahoo);
const vix = await source("cboe-vix", () => httpText("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv"), (raw) =>
  clean(raw.trim().split("\n").slice(1).map((l) => { const c = l.split(","); const [m, d, y] = c[0].split("/"); return [`${y}-${m}-${d}`, +c[4]]; })));
const cape = await source("multpl-cape", () => httpText("https://www.multpl.com/shiller-pe/table/by-month"), parseMultpl);
const spxM = await source("multpl-sp500", () => httpText("https://www.multpl.com/s-p-500-historical-prices/table/by-month"), parseMultpl);
const goldM = await source("datahub-gold", () => httpText("https://datahub.io/core/gold-prices/r/monthly.csv"), (raw) =>
  clean(raw.trim().split("\n").slice(1).map((l) => { const [d, v] = l.split(","); return [d + "-01", +v]; })));
const sge = await source("sge-au9999", () => httpText("https://www.sge.com.cn/graph/Dailyhq?instid=Au99.99", { post: true }), (raw) =>
  clean(JSON.parse(raw).time.map((r) => [r[0], +r[2]])));
const cm = await source("coinmetrics-btc", () => httpText("https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=PriceUSD,CapMVRVCur&frequency=1d&page_size=10000"), (raw) => {
  const rows = JSON.parse(raw).data;
  return { d: [1], price: clean(rows.map((r) => [r.time.slice(0, 10), r.PriceUSD == null ? NaN : +r.PriceUSD])), mvrv: clean(rows.map((r) => [r.time.slice(0, 10), r.CapMVRVCur == null ? NaN : +r.CapMVRVCur])) };
});
const fng = await source("alternative-fng", () => httpText("https://api.alternative.me/fng/?limit=0"), (raw) =>
  clean(JSON.parse(raw).data.map((r) => [ymd(+r.timestamp * 1000), +r.value])));

const summary = { generatedAt: new Date().toISOString(), today, markets: [] };
const pushSummary = (key, name, score, headline, asOfDate, stale, extra = {}) => summary.markets.push({ ...extra, rule: score.rule, key, name, score: score.value, tier: score.tier, tierName: score.tierName, weekAgo: score.weekAgo, lastTierChange: score.lastTierChange, headline, asOf: asOfDate, stale });

// ═════════ A 股 ═════════
log("计算 A 股…");
{
  const pe = from(csAllPe, "2011-06-01");
  const pePct = pctRank(pe, { minN: 250 });
  const erp = zip(pe, cn10, (p, y) => 100 / p - y);
  const erpPct = pctRank(erp, { minN: 250 });
  // 情绪温度（简化版，三项等权）：成交热度、价格相对年线、期权隐含波动率（反向）。各取滚动三年分位。
  const W3 = 750;
  const heat = pctRank(zip(sma(csAllVal, 20), sma(csAllVal, 250), (a, b) => a / b), { minN: 250, window: W3 });
  const trend = pctRank(zip(csAll, sma(csAll, 250), (a, b) => a / b), { minN: 250, window: W3 });
  const calm = mapS(pctRank(qvix, { minN: 250, window: W3 }), (v) => 100 - v);
  const fh = asof(heat), ft = asof(trend), fc = asof(calm);
  const mood = sma(mapS(from(csAll, "2008-01-01"), (_, i, d) => { const a = [fh(d), ft(d), fc(d)].filter(Number.isFinite); return a.length >= 2 ? a.reduce((x, y) => x + y, 0) / a.length : NaN; }), 5);
  const score = buildScore(pe, [
    { key: "pe", name: "估值分位", weight: 0.4, series: pePct },
    { key: "erp", name: "股债性价比（反向）", weight: 0.4, series: mapS(erpPct, (v) => 100 - v) },
    { key: "mood", name: "情绪温度", weight: 0.2, series: mood },
  ]);
  const dd = drawdown(csAll);
  const fwd = forwardTable(pePct, csAllTR, { buckets: [[0, 20, "低于 20%"], [20, 40, "20% 至 40%"], [40, 60, "40% 至 60%"], [60, 80, "60% 至 80%"], [80, 101, "高于 80%"]], horizons: [1, 3], stepDays: 5 });
  const fwdErp = forwardTable(erpPct, csAllTR, { buckets: [[80, 101, "高于 80%（股票划算）"], [20, 80, "20% 至 80%"], [0, 20, "低于 20%（股票不划算）"]], horizons: [1, 3], stepDays: 5 });
  const years = (new Date(lastD(csAllTR)) - new Date(csAllTR.d[0])) / 31557600000;
  write("cn", {
    asOf: lastD(csAll), score,
    tiles: [
      tile("erp", round(last(erp)), lastD(erp), { pct: round(last(erpPct), 0), ey: round(100 / last(pe)), bond: round(asof(cn10)(lastD(pe))), stale: cn10.stale || csAllPe.stale }),
      tile("pe", round(last(pe)), lastD(pe), { pct: round(last(pePct), 0), stale: csAllPe.stale }),
      tile("mood", round(last(mood), 0), lastD(mood), { parts: { heat: round(fh(lastD(mood)), 0), trend: round(ft(lastD(mood)), 0), calm: round(fc(lastD(mood)), 0) }, qvix: round(last(qvix), 1), qvixAsOf: lastD(qvix), stale: qvix.stale }),
      tile("dd", round(last(dd), 1), lastD(dd), { peakDate: csAll.d[csAll.v.indexOf(Math.max(...csAll.v))] }),
    ],
    series: {
      pe: r2(pe), pePct: r2(pePct, 1), erp: r2(erp), erpPct: r2(erpPct, 1), mood: r2(from(mood, "2011-06-01"), 1),
      pe300: r2(from(cs300Pe, "2011-06-01")), pe500: r2(from(cs500Pe, "2011-06-01")),
      close: r2(csAll), tr: r2(csAllTR), tr300: r2(cs300TR),
    },
    stats: { trCagr: round(100 * (Math.pow(last(csAllTR) / csAllTR.v[0], 1 / years) - 1), 1), trMaxDD: round(Math.min(...drawdown(csAllTR).v), 1), trFrom: csAllTR.d[0] },
    tables: { fwdPe: fwd, fwdErp },
    sources: [
      src("中证全指行情、滚动市盈率、全收益指数", "中证指数有限公司", "https://www.csindex.com.cn", csAll),
      src("沪深 300、中证 500 滚动市盈率", "中证指数有限公司", "https://www.csindex.com.cn", cs300Pe),
      src("中国 10 年期国债收益率", "中债估值（经东方财富数据中心）", "https://data.eastmoney.com/cjsj/zmgzsyl.html", cn10),
      src("300ETF 期权隐含波动率 QVIX", "期权论坛", "http://1.optbbs.com", qvix),
    ],
  });
  pushSummary("cn", "A 股", score, { label: "股债性价比", value: `${last(erp) >= 0 ? "+" : ""}${last(erp).toFixed(2)}%`, note: `${Math.round(last(erpPct))}% 分位` }, lastD(csAll), csAll.stale);
}

// ═════════ 美股 ═════════
log("计算美股…");
{
  const capePct = pctRank(cape, { minN: 120 });
  // 超额盈利收益率：1 / 席勒市盈率 − 10 年期实际利率。实际利率 2003 年才有，之前不计入位置分。
  const ecy = zip(from(cape, "2003-01-01"), usReal, (c, r) => 100 / c - r);
  const ecyPct = pctRank(ecy, { minN: 36 });
  const vixPct = pctRank(vix, { minN: 250 });
  const axis = from(spx, "1990-01-02");
  // 回撤阶梯：距历史最高收盘价跌破 15%、20%、30% 各算一档。一轮下跌里每档只触发一次，
  // 档位按这一轮跌到过的最深处算，指数收复前高（创新高）后整轮重置。
  const RUNGS = [15, 20, 30];
  const ladder = (() => {
    let peak = -Infinity, peakD = null, deep = 0, lvl = 0, trig = [];
    const d = [], v = [];
    spx.d.forEach((x, i) => {
      const p = spx.v[i];
      if (p >= peak) { peak = p; peakD = x; deep = 0; lvl = 0; trig = []; }
      else { const dd = 100 * (p / peak - 1); if (dd < deep) deep = dd; const l = RUNGS.filter((r) => deep <= -r).length; if (l > lvl) { for (let k = lvl; k < l; k++) trig.push({ rung: RUNGS[k], date: x }); lvl = l; } }
      d.push(x); v.push(lvl);
    });
    return { series: S(d, v), now: { level: lvl, rungs: RUNGS, peak: round(peak, 2), peakDate: peakD, deepest: round(deep, 1), triggers: trig, next: lvl < RUNGS.length ? { rung: RUNGS[lvl], price: round(peak * (1 - RUNGS[lvl] / 100), 0) } : null } };
  })();
  const lvlAt = asof(ladder.series);
  const score = buildScore(axis, [
    { key: "cape", name: "席勒市盈率分位", weight: 0.5, series: capePct },
    { key: "ecy", name: "超额盈利收益率（反向）", weight: 0.3, series: mapS(ecyPct, (v) => 100 - v) },
    { key: "vix", name: "VIX 平静度", weight: 0.2, series: mapS(vixPct, (v) => 100 - v) },
  ], { low: (d) => lvlAt(d) > 0 }); // 美股的「低位」只由回撤阶梯决定，位置分低于 20 近几十年没有出现过
  score.rule.ladder = ladder.now;
  const dd = drawdown(spx);
  // 历次大跌：跌幅超过 19% 的回撤，从高点到低点再到收复
  const eps = []; let peak = spx.v[0], peakD = spx.d[0], trough = peak, troughD = peakD;
  const mo = (a, b) => Math.round((new Date(b) - new Date(a)) / (30.44 * 864e5));
  spx.d.forEach((d, i) => {
    const v = spx.v[i];
    if (v >= peak) {
      if (trough / peak - 1 <= -0.19) eps.push({ peak: peakD.slice(0, 7), trough: troughD.slice(0, 7), depth: round(100 * (trough / peak - 1), 1), toTrough: mo(peakD, troughD), toRecover: mo(troughD, d) });
      peak = v; peakD = d; trough = v; troughD = d;
    } else if (v < trough) { trough = v; troughD = d; }
  });
  if (trough / peak - 1 <= -0.19) eps.push({ peak: peakD.slice(0, 7), trough: troughD.slice(0, 7), depth: round(100 * (trough / peak - 1), 1), toTrough: mo(peakD, troughD), toRecover: null });
  // 持有胜率：任意一个月初买入、持有 N 年，价格口径（不含股息，偏保守）
  const hold = [1, 3, 5, 10, 15, 20].map((y) => {
    const a = []; const n = y * 12;
    for (let i = 0; i + n < spxM.v.length; i++) a.push(100 * (Math.pow(spxM.v[i + n] / spxM.v[i], 1 / y) - 1));
    return { years: y, win: round((100 * a.filter((x) => x > 0).length) / a.length, 0), med: round(median(a), 1), worst: round(Math.min(...a), 1), n: a.length };
  });
  const fwd = forwardTable(capePct, spxM, { buckets: [[0, 20, "低于 20%"], [20, 40, "20% 至 40%"], [40, 60, "40% 至 60%"], [60, 80, "60% 至 80%"], [80, 101, "高于 80%"]], horizons: [10], stepDays: 1 });
  write("us", {
    asOf: lastD(spx), score,
    tiles: [
      tile("dd", round(last(dd), 1), lastD(dd), { peakDate: spx.d[spx.v.indexOf(Math.max(...spx.v))], stale: spx.stale }),
      tile("cape", round(last(cape), 1), lastD(cape), { pct: round(last(capePct), 0), stale: cape.stale }),
      tile("ecy", round(last(ecy)), lastD(ecy), { pct: round(last(ecyPct), 0), real: round(last(usReal)), stale: usReal.stale }),
      tile("vix", round(last(vix), 1), lastD(vix), { pct: round(last(vixPct), 0), stale: vix.stale }),
    ],
    series: { spx: r2(spx), cape: r2(cape), capePct: r2(capePct, 1), ecy: r2(ecy), vix: r2(vix) },
    tables: { episodes: eps, hold, fwdCape: fwd },
    sources: [
      src("标普 500 日线（1927 年起，价格口径）", "Yahoo Finance ^GSPC", "https://finance.yahoo.com", spx),
      src("席勒市盈率、标普 500 月度价格（1871 年起）", "multpl.com（整理自 Robert Shiller 数据集）", "https://www.multpl.com/shiller-pe", cape),
      src("VIX 恐慌指数", "芝加哥期权交易所 Cboe", "https://www.cboe.com/tradable_products/vix/vix_historical_data/", vix),
      src("美国 10 年期通胀保值债券实际利率", "美联储圣路易斯分行 FRED（DFII10）", "https://fred.stlouisfed.org/series/DFII10", usReal),
    ],
  });
  pushSummary("us", "美股", score, { label: "席勒市盈率", value: last(cape).toFixed(1), note: `${Math.round(last(capePct))}% 分位` }, lastD(spx), spx.stale);
}

// ═════════ 债券 ═════════
log("计算债券…");
{
  const cnPct = pctRank(cn10, { minN: 500 });
  const usPct = pctRank(us10, { minN: 500 });
  const spread = zip(us10, us2, (a, b) => a - b);
  const cnus = zip(cn10, us10, (a, b) => a - b);
  // 债券的「贵」是收益率低：收益率分位越低，位置分越高
  // 中债、美债分开读：只持有人民币债券的人不该拿到一个混合结论
  const score = buildScore(from(cn10, "2006-01-01"), [{ key: "cn10", name: "中债 10 年期收益率分位（反向）", weight: 1, series: mapS(cnPct, (v) => 100 - v) }]);
  const score2 = buildScore(from(us10, "1990-01-02"), [{ key: "us10", name: "美债 10 年期收益率分位（反向）", weight: 1, series: mapS(usPct, (v) => 100 - v) }]);
  write("bond", {
    asOf: lastD(cn10), score, score2,
    tiles: [
      tile("cn10", round(last(cn10)), lastD(cn10), { pct: round(last(cnPct), 0), from: cn10.d[0].slice(0, 4), stale: cn10.stale }),
      tile("us10", round(last(us10)), lastD(us10), { pct: round(last(usPct), 0), from: us10.d[0].slice(0, 4), stale: us10.stale }),
      tile("real", round(last(usReal)), lastD(usReal), { pct: round(last(pctRank(usReal, { minN: 250 })), 0), stale: usReal.stale }),
      tile("cnus", round(last(cnus)), lastD(cnus), { stale: cn10.stale || us10.stale }),
      tile("term", round(last(spread)), lastD(spread), { stale: us2.stale }),
    ],
    series: { cn10: r2(cn10), us10: r2(us10), real: r2(usReal), term: r2(spread), cnus: r2(cnus), cn2: r2(treasury.cn2 || S([], [])), cn30: r2(treasury.cn30 || S([], [])) },
    sources: [
      src("中国国债 2、10、30 年期收益率", "中债估值（经东方财富数据中心）", "https://data.eastmoney.com/cjsj/zmgzsyl.html", cn10),
      src("美债 2、10 年期收益率", "美联储圣路易斯分行 FRED（DGS2、DGS10）", "https://fred.stlouisfed.org/series/DGS10", us10),
      src("美国 10 年期实际利率", "美联储圣路易斯分行 FRED（DFII10）", "https://fred.stlouisfed.org/series/DFII10", usReal),
    ],
  });
  pushSummary("bond", "债券", score, { label: "中债 10 年期", value: `${last(cn10).toFixed(2)}%`, note: `${Math.round(last(cnPct))}% 分位` }, lastD(cn10), cn10.stale, { second: { name: "美债", score: score2.value, tier: score2.tier, tierName: score2.tierName, rule: score2.rule, headline: `美债 10 年期 ${last(us10).toFixed(2)}%，${Math.round(last(usPct))}% 分位` } });
}

// ═════════ 黄金 ═════════
log("计算黄金…");
{
  // 月度长历史：datahub 月均价（1971 年起）接到最新日线；实际金价 = 名义金价 ÷ CPI × 最新 CPI
  const gm = from(goldM, "1971-01-01");
  const dailyMonthEnd = (() => { const m = new Map(); goldD.d.forEach((d, i) => m.set(d.slice(0, 7) + "-01", goldD.v[i])); return m; })();
  const lastMonth = lastD(goldD).slice(0, 7) + "-01";
  const merged = clean([...gm.d.map((d, i) => [d, gm.v[i]]), ...(dailyMonthEnd.has(lastMonth) ? [[lastMonth, dailyMonthEnd.get(lastMonth)]] : [])]);
  const cpiNow = last(cpi);
  const real = zip(merged, cpi, (g, c) => (g / c) * cpiNow);
  const realPct = pctRank(real, { minN: 120 });
  // 相对 200 周均线（约 1000 个交易日）的偏离
  const dev = zip(goldD, sma(goldD, 1000), (a, b) => 100 * (a / b - 1));
  const devPct = pctRank(dev, { minN: 500 });
  const score = buildScore(from(goldD, "2006-01-01"), [
    { key: "real", name: "实际金价分位", weight: 0.5, series: realPct },
    { key: "dev", name: "相对 200 周均线", weight: 0.5, series: devPct },
  ]);
  const dd = drawdown(goldD);
  const fwd = forwardTable(realPct, merged, { buckets: [[0, 20, "低于 20%"], [20, 40, "20% 至 40%"], [40, 60, "40% 至 60%"], [60, 80, "60% 至 80%"], [80, 101, "高于 80%"]], horizons: [5], stepDays: 1 });
  write("gold", {
    asOf: lastD(goldD), score,
    tiles: [
      tile("usd", round(last(goldD), 0), lastD(goldD), { stale: goldD.stale }),
      tile("real", round(last(real), 0), lastD(real), { pct: round(last(realPct), 0), stale: cpi.stale || goldM.stale, cpiAsOf: lastD(cpi) }),
      tile("dev", round(last(dev), 1), lastD(dev), { pct: round(last(devPct), 0) }),
      tile("dd", round(last(dd), 1), lastD(dd), { peakDate: goldD.d[goldD.v.indexOf(Math.max(...goldD.v))] }),
      tile("cny", round(last(sge), 1), lastD(sge), { stale: sge.stale }),
      tile("realRate", round(last(usReal)), lastD(usReal), { stale: usReal.stale }),
    ],
    series: { usd: r2(goldD, 1), ma200w: r2(sma(goldD, 1000), 1), real: r2(real, 0), nominalM: r2(merged, 1), dev: r2(dev, 1), cny: r2(sge), realRate: r2(usReal) },
    tables: { fwdReal: fwd },
    sources: [
      src("国际金价日线（2000 年起）", "Yahoo Finance GC=F（纽约黄金期货连续）", "https://finance.yahoo.com", goldD),
      src("月度金价（1971 年起）", "datahub.io gold-prices（伦敦金口径）", "https://datahub.io/core/gold-prices", goldM),
      src("人民币金价 Au99.99", "上海黄金交易所", "https://www.sge.com.cn", sge),
      src("美国 CPI、10 年期实际利率", "美联储圣路易斯分行 FRED（CPIAUCSL、DFII10）", "https://fred.stlouisfed.org", cpi),
    ],
  });
  pushSummary("gold", "黄金", score, { label: "实际金价", value: `${Math.round(last(realPct))}% 分位`, note: `1971 年以来` }, lastD(goldD), goldD.stale);
}

// ═════════ 加密 ═════════
log("计算加密…");
{
  const p = from(cm.price || S([], []), "2010-07-18");
  const mvrv = cm.mvrv || S([], []);
  const GENESIS = Date.UTC(2009, 0, 3);
  const cost200 = geoMean(p, 200);
  const fair = mapS(p, (_, i, d) => Math.pow(10, 5.84 * Math.log10((new Date(d) - GENESIS) / 864e5) - 17.01));
  const ahr = zip(zip(p, cost200, (a, b) => a / b), zip(p, fair, (a, b) => a / b), (a, b) => a * b);
  const ahrPct = pctRank(ahr, { minN: 365 });
  const mvrvPct = pctRank(mvrv, { minN: 365 });
  const ma200w = sma(p, 1400);
  // ahr999 的拟合参数已经漂移（2026 年进了「抄底区」但 MVRV 一天也没低于 1），退出位置分，只留作参考图。
  const ratio = zip(p, ma200w, (a, b) => a / b);
  const ratioPct = pctRank(ratio, { minN: 365 });
  const fm = asof(sma(mvrv, 5)), fr = asof(sma(ratio, 5));
  // 偏冷的判定用明确条件：全网平均亏损（MVRV 低于 1），或价格跌破 200 周均线。回到 1.05 且站上均线 3% 才算离开。
  const cold = (d, isLow) => { const m = fm(d), r = fr(d); return isLow ? !(m >= 1.05 && !(r < 1.03)) : (m < 1 || r < 1); };
  const score = buildScore(from(p, "2012-01-01"), [
    { key: "mvrv", name: "MVRV 分位", weight: 0.5, series: mvrvPct },
    { key: "ma", name: "相对 200 周均线", weight: 0.3, series: ratioPct },
    { key: "fng", name: "恐惧贪婪指数", weight: 0.2, series: fng },
  ], { low: cold });
  const dd = drawdown(p);
  const HALVINGS = ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"];
  const pf = asof(p);
  const cycles = HALVINGS.map((h, k) => {
    const end = HALVINGS[k + 1] || lastD(p), base = pf(h), pts = [];
    for (let i = p.d.findIndex((x) => x >= h); i < p.d.length && p.d[i] <= end; i += 7) pts.push([Math.round((new Date(p.d[i]) - new Date(h)) / 864e5), +(p.v[i] / base).toFixed(3)]);
    return { halving: h, pts };
  });
  const fwd = forwardTable(mvrv, p, { buckets: [[0, 1, "低于 1（全网平均亏损）"], [1, 2, "1 至 2"], [2, 3.5, "2 至 3.5"], [3.5, 1e9, "高于 3.5"]], horizons: [1, 2], stepDays: 7 });
  write("btc", {
    asOf: lastD(p), score,
    tiles: [
      tile("ahr", round(last(ahr), 3), lastD(ahr), { pct: round(last(ahrPct), 0), stale: cm.stale }),
      tile("mvrv", round(last(mvrv)), lastD(mvrv), { pct: round(last(mvrvPct), 0), stale: cm.stale }),
      tile("dd", round(last(dd), 1), lastD(dd), { peak: round(Math.max(...p.v), 0), peakDate: p.d[p.v.indexOf(Math.max(...p.v))], sinceHalving: Math.round((new Date(lastD(p)) - new Date(HALVINGS[3])) / 864e5) }),
      tile("fng", round(last(fng), 0), lastD(fng), { stale: fng.stale }),
      tile("price", round(last(p), 0), lastD(p), { ma200w: round(last(ma200w), 0) }),
      tile("ma", round(100 * (last(ratio) - 1), 1), lastD(ratio), { pct: round(last(ratioPct), 0), ma200w: round(last(ma200w), 0) }),
    ],
    series: { price: r2(p), ma200w: r2(ma200w), ahr: r2(ahr, 3), mvrv: r2(mvrv), fng: r2(fng, 0) },
    tables: { cycles, fwdMvrv: fwd },
    sources: [
      src("比特币价格、MVRV", "Coin Metrics 社区版数据（CC BY-NC 4.0）", "https://coinmetrics.io/community-network-data/", p),
      src("恐惧贪婪指数", "alternative.me", "https://alternative.me/crypto/fear-and-greed-index/", fng),
    ],
  });
  pushSummary("btc", "加密资产", score, { label: "MVRV", value: `${last(mvrv).toFixed(2)} 倍`, note: `${Math.round(last(mvrvPct))}% 分位` }, lastD(p), cm.stale);
}

// ═════════ 汇总、档位变化 ═════════
const prevFile = join(OUT, "summary.json");
const prev = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, "utf8")) : null;
summary.sinceLastRun = prev ? summary.markets.filter((m) => { const o = prev.markets.find((x) => x.key === m.key); return o && o.rule && o.rule.state !== m.rule.state; }).map((m) => ({ key: m.key, name: m.name, from: prev.markets.find((x) => x.key === m.key).rule.name, to: m.rule.name })) : [];
// 回撤阶梯每多跌破一档，单独算一次变化（规则状态可能已经是「低位」，不会重复出现在上面）
if (prev) for (const m of summary.markets) { const o = prev.markets.find((x) => x.key === m.key), a = m.rule.ladder, b = o && o.rule && o.rule.ladder; if (a && b && a.level > b.level) summary.sinceLastRun.push({ key: m.key, name: m.name, from: b.level ? `回撤阶梯第 ${b.level} 档` : "未触发回撤阶梯", to: `回撤阶梯第 ${a.level} 档（距高点跌超 ${a.rungs[a.level - 1]}%）` }); }
summary.previousRun = prev ? prev.generatedAt : null;
summary.fetch = fetchLog;
write("summary", summary);

const failed = fetchLog.filter((f) => !f.ok);
log("\n完成。" + summary.markets.map((m) => `${m.name} ${m.score}（${m.tierName}，规则状态：${m.rule.name}，近十年年均变化 ${m.rule.perYear} 次）`).join("；"));
if (summary.sinceLastRun.length) log("规则状态变化：" + summary.sinceLastRun.map((c) => `${c.name} ${c.from} → ${c.to}`).join("；"));
else log("规则状态变化：无");
if (failed.length) { log("抓取失败、已沿用缓存：" + failed.map((f) => f.name).join("，")); process.exitCode = 2; }
