/* 慢复利资产坐标 · 五个市场页的内容
   改文案、增减指标都在这里。每个市场：导语、五档结论、读数、指标小节、做法、延伸阅读。
   ctx = { data, T（读数，按 key 取）, S（序列）, sc（位置分）, m, key } */
const MARKETS = (() => {
  const { sign, neg, num, dot, old, tierWord, GREY } = App.helpers;
  const P = (n = 1) => (v) => (+v).toFixed(n) + "%";
  const X = (n = 1) => (v) => (+v).toFixed(n) + " 倍";
  const N = (v) => (v >= 1000 ? Math.round(v).toLocaleString("en-US") : +(+v).toPrecision(3));
  const R3 = [["3Y", 3], ["10Y", 10], ["ALL", 0]];
  const R5 = [["5Y", 5], ["10Y", 10], ["ALL", 0]];
  const R30 = [["10Y", 10], ["30Y", 30], ["ALL", 0]];
  const bands = App.zoneBands, fwd = App.fwdTable;
  const lastOf = (s) => s.v[s.v.length - 1];

  // ═════════ A 股 ═════════
  const cn = {
    lead: "A 股牛短熊长，指数不适合一直拿着不管。这一页用三个时间尺度判断位置：长期看估值分位，中期看股债性价比，短期看情绪温度。",
    posLabel: "A-SHARES · CSI ALL SHARE",
    ends: ["便宜、冷清", "昂贵、过热"],
    verdicts: [
      "估值、性价比和情绪同时落在低位，这种时候历史上不多见。",
      "整体偏便宜，但几个指标还没有同时到极端。",
      "不贵也不便宜，指标之间有分歧。",
      "整体偏贵，继续加仓的性价比在下降。",
      "估值、性价比和情绪同时落在高位，历史上这之后的回报偏弱。",
    ],
    ruleNote: "A 股的规则只在两端动：位置分低于 20 才上调，高于 80 才下调，进出留 3 分缓冲。中间几档之后的回报分不出好坏，所以不动。位置分偏低有时只是一个指标拉出来的，比如国债收益率很低会把股债性价比抬高，这时估值本身可能还在中间。A 股的波动也比多数人想的大，中证全指全收益指数的历史最大回撤超过六成，规则仓位再高，也只用准备放五年以上的钱。",
    sourceNote: "滚动市盈率自 2011 年 6 月起才有官方数据，所以这一页的分位都是 2011 年以来的分位，只覆盖了两三轮牛熊。情绪温度是本站自算的简化版，三项等权：成交热度、价格相对年线、期权隐含波动率，各取滚动三年分位。它和其他网站的恐惧贪婪指数口径不同，读数不能直接比较。",
    tiles: ({ T }) => [
      { lb: "MID TERM", label: "股债性价比", num: sign(T.erp.value), unit: "%", sub: `2011 年以来 ${T.erp.pct}% 分位。越高，股票相对债券越划算`, old: old(T.erp) },
      { lb: "LONG TERM", label: "中证全指市盈率", num: T.pe.value.toFixed(2), unit: "倍", sub: `2011 年以来 ${T.pe.pct}% 分位。低于 20% 算低估区`, old: old(T.pe) },
      { lb: "SHORT TERM", label: "情绪温度", num: T.mood.value, unit: "/ 100", sub: `${T.mood.value < 25 ? "偏冷" : T.mood.value > 75 ? "偏热" : "不冷不热"}。成交 ${T.mood.parts.heat}，趋势 ${T.mood.parts.trend}，波动率平静度 ${T.mood.parts.calm ?? "暂无"}`, old: old(T.mood) },
      { lb: "FROM THE PEAK", label: "距历史高点", num: neg(T.dd.value), unit: "%", sub: `中证全指价格口径，不含分红。高点在 ${dot(T.dd.peakDate).slice(0, 7)}`, old: old(T.dd) },
    ],
    sections: ({ S, T, data }) => [
      { id: "erp", name: "股债性价比", q: "现在承担股市的风险，相比拿着债券值不值得。",
        figures: [{ title: `股票相对债券，${tierWord(T.erp.pct, "处在历史上偏不划算的位置", "处在历史的中间地带", "处在历史上偏划算的位置")}`, note: `股债性价比 = 100 ÷ 中证全指滚动市盈率 − 10 年期国债收益率。当前 ${T.erp.ey}% − ${T.erp.bond}% = ${sign(T.erp.value)}%`, source: "来源：中证指数有限公司（滚动市盈率）、中债估值（10 年期国债收益率）。", series: [{ name: "股债性价比", s: S.erp }], bands: bands(S.erp, false), fmt: P(1), endFmt: P(2), ranges: R3 }],
        table: fwd(data.tables.fwdErp, [1, 3], "当时的分位"),
        tip: `表里是 2012 年以来每周一个样本、持有中证全指全收益指数的结果。样本彼此重叠，只覆盖两三轮牛熊，当作历史分布看，不当作概率。还有一个结构性的偏差要知道：国债收益率已经降到 ${T.erp.bond}%，这会把性价比的分位天然抬高，所以同时要看盈利收益率的绝对值 ${T.erp.ey}%。` },
      { id: "pe", name: "估值分位", q: "现在的估值，放在历史里是偏高还是偏低。",
        figures: [{ title: `中证全指市盈率在 ${T.pe.pct}% 分位，${tierWord(T.pe.pct, "落在低估区", "不在极端位置", "落在高估区")}`, note: "滚动市盈率，淡蓝是历史最低的两成，淡粉是最高的两成", source: "来源：中证指数有限公司。", series: [{ name: "中证全指", s: S.pe }], bands: bands(S.pe, true), fmt: X(0), endFmt: X(2), ranges: R3,
          switch: [["中证全指", () => ({ title: `中证全指市盈率在 ${T.pe.pct}% 分位，${tierWord(T.pe.pct, "落在低估区", "不在极端位置", "落在高估区")}`, series: [{ name: "中证全指", s: S.pe, color: "#1570A2" }], bands: bands(S.pe, true) })],
            ["沪深 300", () => ({ title: `沪深 300 市盈率 ${lastOf(S.pe300).toFixed(2)} 倍`, series: [{ name: "沪深 300", s: S.pe300, color: "#1570A2" }], bands: bands(S.pe300, true) })],
            ["中证 500", () => ({ title: `中证 500 市盈率 ${lastOf(S.pe500).toFixed(2)} 倍`, series: [{ name: "中证 500", s: S.pe500, color: "#1570A2" }], bands: bands(S.pe500, true) })]] }],
        table: fwd(data.tables.fwdPe, [1, 3], "当时的估值分位"),
        tip: "估值分位低的时候买，之后三年的结果明显更好；分位高于 80% 时买，三年后多数是亏的。但中间三档的差别不大，所以规则只在两端调整，中间不动。分位用的是「当时能看到的历史」，不是事后回头看的分位。" },
      { id: "mood", name: "情绪温度", q: "市场现在是躁动还是冷清。",
        figures: [{ title: `情绪温度 ${T.mood.value}，${T.mood.value < 25 ? "市场偏冷" : T.mood.value > 75 ? "市场偏热" : "不冷不热"}`, note: "0 到 100，越高越热。成交热度、价格相对年线、期权隐含波动率（反向）三项等权，5 日平滑", source: "来源：中证指数有限公司（行情与成交额）、期权论坛（300ETF 期权隐含波动率），本站自算。", series: [{ name: "情绪温度", s: S.mood }], lines: [{ y: 25, label: "偏冷" }, { y: 75, label: "偏热" }], min: 0, max: 100, fmt: (v) => Math.round(v), ranges: R3, def: 3 }],
        tip: "情绪是三个指标里最短期的，在位置分里只占两成，不单独据它操作。强势行情里情绪可以连续几个月偏热，冷清也可以持续很久。它的用处是提醒：估值便宜并且没人关心的时候，通常比估值便宜但人声鼎沸的时候更接近底部。" },
      { id: "trend", name: "走势与回撤", q: "长期拿着，实际得到了什么，中间要忍受什么。",
        figures: [{ title: `含分红的中证全指 ${data.stats.trFrom.slice(0, 4)} 年以来年化 ${data.stats.trCagr}%，最深跌过 ${neg(data.stats.trMaxDD)}%`, note: "全收益口径（分红再投资），对数刻度；下方是每一天距离前高的跌幅", source: "来源：中证指数有限公司（H00985、H00300 全收益指数）。", series: [{ name: "中证全指全收益", s: S.tr }], dd: S.tr, log: true, fmt: N, ranges: R5, size: "tall",
          switch: [["中证全指", () => ({ series: [{ name: "中证全指全收益", s: S.tr, color: "#1570A2" }], dd: S.tr })], ["沪深 300", () => ({ title: "含分红的沪深 300，同一段历史", series: [{ name: "沪深 300 全收益", s: S.tr300, color: "#1570A2" }], dd: S.tr300 })]] }],
        tip: "价格指数不含分红，长期会低估真实回报。评估长期收益要看全收益口径。下面那条回撤线同样重要：这个市场里，腰斩发生过不止一次。" },
    ],
    plays: [
      { t: "宽基指数基金，定投加再平衡", p: "选一只覆盖面广、费率低的宽基指数基金，按固定节奏买入。每年或在档位变化时，把股票比例调回规则仓位。A 股指数不适合买了不管，再平衡是把波动变成收益的那一步。" },
      { t: "红利低波作底仓", p: "分红稳定、波动较低的一类指数，持有体验比宽基平缓。它同样会跌，历史最大回撤超过四成，低波动不等于低风险。红利拥挤的时候估值也会偏贵。" },
      { adv: true, t: "指数增强基金", p: "在跟踪指数的基础上，用量化方法争取多一点超额收益。", bar: "和买普通基金一样，没有资金门槛。难处在挑选和长期跟踪管理人。", who: "愿意花时间比较不同管理人、能接受某些年份跑输指数的人。", worst: "超额收益不稳定，可能连续一两年跑输指数，同时还要付更高的管理费。" },
      { adv: true, t: "用股指期货替代指数基金，赚贴水", p: "中证 500 股指期货长期比现货便宜，这个差价叫贴水。持有期货并不断换到下一个合约，除了指数涨跌，还能多拿到贴水收敛的那一部分。", bar: "开户需要 50 万元可用资金、通过知识测试并有交易经历。要懂保证金、基差和移仓。", who: "资金量较大、能每天看一眼保证金、已经理解杠杆的人。多数家庭不需要它。", worst: "期货自带杠杆，大跌时要追加保证金，补不上会在低点被强制平仓。贴水也可能收窄甚至变成升水，这时候反而跑输指数。" },
    ],
    articles: [["tool-valuation", "指数估值：市盈率、市净率与股债性价比", 8], ["alloc-markets", "A 股、港股、美股的结构差异：哪个市场更适合买指数", 9], ["alloc-rebalance", "再平衡：定期还是按阈值，怎样低成本执行", 10], ["behave-timing", "择时有多难：错过最好的十个交易日会怎样", 9], ["tool-income", "红利 ETF 与备兑期权 ETF：高分配率从哪里来", 9], ["adv-discount", "股指期货的贴水：成因、规律与会不会消失", 11]],
  };

  // ═════════ 美股 ═════════
  const us = {
    lead: "美股是长期配置的基本盘：低成本指数，长期持有，不在恐慌里卖出。这一页回答两个问题：现在的估值在百年历史里算什么位置，历史上同样深的下跌之后发生了什么。",
    posLabel: "US STOCKS · S&P 500",
    ends: ["便宜、恐慌", "昂贵、平静"],
    verdicts: [
      "估值回到历史低位，市场在恐慌。历史上这是长期资金最好的买点之一。",
      "估值偏低，值得比平时多买一点。",
      "估值在历史中间，照常持有和定投。",
      "估值偏高。这个位置已经持续了很多年，它说的是未来十年的回报可能低于过去十年。",
      "估值处在百年历史的最高一档。它在这一档已经停了很久，照常持有，新增的钱不必急着放进来。",
    ],
    ruleNote: "美股的位置分近十年有九成时间处在偏高或高位区，同期指数涨了几倍。偏高和高位之后一年的回报，和全部时间的平均水平几乎没有差别。所以这里的规则不把美股调到基准以下：位置照常显示，偏高时只管新增资金。真正该多买的时候是大跌：距历史最高收盘价跌破 15%、20%、30% 各算一档，每多一档，规则仓位上调一次，三档加满也不超过 5 个百分点。每档在一轮下跌里只触发一次，指数收复前高后回到基准。回撤按标普 500 的美元收盘点位算，和你持有的基金净值会有出入。",
    sourceNote: "标普 500 日线是价格口径，不含股息，所以持有胜率和长期回报的数字偏保守。席勒市盈率用过去十年经通胀调整的平均盈利计算，本站取自 multpl.com 的整理数据，月度更新，当月数值是估算。超额盈利收益率 = 1 ÷ 席勒市盈率 − 10 年期实际利率，实际利率 2003 年才有数据。",
    tiles: ({ T }) => [
      { lb: "FROM THE PEAK", label: "距历史高点", num: neg(T.dd.value), unit: "%", sub: `高点在 ${dot(T.dd.peakDate).slice(0, 7)}。跌超 20% 才进入历史上的大跌区间`, old: old(T.dd) },
      { lb: "VALUATION", label: "席勒市盈率", num: T.cape.value.toFixed(1), unit: "倍", sub: `1881 年以来 ${T.cape.pct}% 分位`, old: old(T.cape, 45) },
      { lb: "VS BONDS", label: "超额盈利收益率", num: sign(T.ecy.value), unit: "%", sub: `股票盈利收益率减去 ${T.ecy.real}% 的实际利率。2003 年以来 ${T.ecy.pct}% 分位`, old: old(T.ecy, 45) },
      { lb: "FEAR", label: "VIX 恐慌指数", num: T.vix.value.toFixed(1), unit: "", sub: `1990 年以来 ${T.vix.pct}% 分位。高于 30 算恐慌阶段`, old: old(T.vix) },
    ],
    sections: ({ S, T, data }) => [
      { id: "trend", name: "百年走势与回撤", q: "现在的下跌，放在百年曲线里是什么量级。",
        figures: [{ title: `标普 500 距历史高点 ${neg(T.dd.value)}%，${T.dd.value > -10 ? "还算不上一次像样的回撤" : T.dd.value > -20 ? "是一次常见的回调" : "已经进入历史上的大跌区间"}`, note: "价格口径，对数刻度，1927 年起；下方是每个交易日距历史最高收盘的跌幅", source: "来源：Yahoo Finance ^GSPC。", series: [{ name: "标普 500", s: S.spx }], dd: S.spx, log: true, fmt: N, ranges: R30, def: 30, size: "tall" }],
        table: `<div class="tb-w"><table class="tb num zh"><thead><tr><th>高点</th><th>低点</th><th>最大跌幅</th><th>见底用时</th><th>收复用时</th></tr></thead><tbody>${data.tables.episodes.map((e) => `<tr><td>${e.peak.replace("-", ".")}</td><td>${e.trough.replace("-", ".")}</td><td>${neg(e.depth)}%</td><td>${e.toTrough} 个月</td><td>${e.toRecover == null ? "尚未收复" : e.toRecover + " 个月"}</td></tr>`).join("")}</tbody></table></div>`,
        tip: "大跌的时候，最有用的是历史基础比率。对照表里两列：同样深的下跌，见底用了多久，收复用了多久。每一次危机在当时都被认为是前所未有，事后看都是曲线上的一段回撤。最长的一次收复用了二十多年，这也是为什么只用长钱。" },
      { id: "hold", name: "持有胜率", q: "随便挑一个月买入，拿 N 年，赚钱的概率有多大。", figures: [],
        table: `<div class="h3">拿得越久，亏钱的历史概率越低</div><p class="s cap-l">1871 年以来任意一个月初买入标普 500 并持有，价格口径，不含股息</p><div class="tb-w"><table class="tb num zh"><thead><tr><th>持有年数</th><th>正收益占比</th><th>年化中位数</th><th>最差一次年化</th><th>样本数</th></tr></thead><tbody>${data.tables.hold.map((h) => `<tr><td>${h.years} 年</td><td>${h.win}%</td><td>${sign(h.med, 1)}%</td><td>${sign(h.worst, 1)}%</td><td class="s">${h.n}</td></tr>`).join("")}</tbody></table></div><p class="src">来源：multpl.com 整理的标普 500 月度价格，本站自算。加上股息后，各档数字都会更高。</p>`,
        tip: "这张表是「长期持有」四个字背后的数据。持有一年和掷硬币差不了太多，持有二十年几乎没有亏过。它假设你中途没有卖出，难的是这一条。" },
      { id: "cape", name: "席勒市盈率", q: "把盈利的波动抹平之后，美股现在贵不贵。",
        figures: [{ title: `席勒市盈率 ${T.cape.value.toFixed(1)} 倍，${T.cape.pct >= 90 ? "是百年历史里最贵的一档" : tierWord(T.cape.pct, "处在历史低位", "处在历史中间", "处在历史高位")}`, note: "股价 ÷ 过去十年经通胀调整的平均每股盈利，月度，1871 年起", source: "来源：multpl.com，整理自 Robert Shiller 数据集。", series: [{ name: "席勒市盈率", s: S.cape }], bands: bands(S.cape, true), fmt: X(0), endFmt: X(1), ranges: [["30Y", 30], ["60Y", 60], ["ALL", 0]] }],
        table: fwd(data.tables.fwdCape, [10], "买入时的估值分位"),
        tip: "估值越高，之后十年的回报中位数越低，但差别没有想象的大，最贵的一档买入后十年多数仍是正收益。席勒市盈率说的是未来十年的回报高低，说不了今年的涨跌。上世纪九十年代它在高位停了很多年。所以它只用来决定「多买一点还是少买一点」。" },
      { id: "ecy", name: "超额盈利收益率", q: "考虑了利率之后，股票相对债券还有多少补偿。",
        figures: [{ title: `股票相对债券的补偿${T.ecy.value < 0 ? "已经是负的" : T.ecy.value < 2 ? "很薄" : "还算厚"}`, note: `1 ÷ 席勒市盈率 − 10 年期通胀保值债券实际利率，当前 ${sign(T.ecy.value)}%`, source: "来源：multpl.com、美联储圣路易斯分行 FRED（DFII10），本站自算。", series: [{ name: "超额盈利收益率", s: S.ecy }], lines: [{ y: 0, label: "零" }], fmt: P(0), endFmt: P(2) }],
        tip: "只看市盈率会忽略利率。利率很低时，高估值有它的道理；利率回到正常水平后，同样的估值就显得贵。这个指标把两件事放在一起看。" },
      { id: "vix", name: "VIX 恐慌指数", q: "市场现在是恐慌还是平静。",
        figures: [{ title: `VIX ${T.vix.value.toFixed(1)}，${T.vix.value >= 30 ? "市场在恐慌" : T.vix.value >= 20 ? "市场有些不安" : "市场很平静"}`, note: "标普 500 期权隐含的未来 30 天波动率，1990 年起", source: "来源：芝加哥期权交易所 Cboe。", series: [{ name: "VIX", s: S.vix }], lines: [{ y: 30, label: "恐慌阶段" }], fmt: (v) => Math.round(v), endFmt: (v) => (+v).toFixed(1), ranges: R3, def: 10 }],
        tip: "VIX 高的时候通常伴随大跌，也是长期资金分批买入的时候。它回落得很快，所以用来确认「现在是不是恐慌」，不用来预测。" },
    ],
    plays: [
      { t: "低费率宽基指数，长期持有", p: "以标普 500、纳斯达克 100 这类宽基指数为主。美股市场有效性高，主动管理长期很难跑赢指数，费率是少数能确定的事。有持续现金流就定投，每年再平衡一次。" },
      { t: "大跌时按阶梯多买", p: "事先写好规则：距高点每多跌一档，从现金类里拿出一部分买入。写在行情好的时候，执行在行情差的时候。这个站的规则用 15%、20%、30% 三档，每档在一轮下跌里只触发一次，下面「按这套规则」会算给你看。" },
      { adv: true, t: "开境外账户直接持有美股指数基金", p: "费率通常比境内的跨境基金低，可选的品种更多。", bar: "需要合规的出境资金和境外券商账户，要自己处理换汇和报税。", who: "已有境外合法收入或资产、金额较大、准备长期持有的人。", worst: "美国对非居民的股息预扣 30% 的税（有协定的可降到 10%），持有美国资产超过 6 万美元的部分还涉及遗产税。境外账户信息会交换回国内，境外所得要依法申报。" },
    ],
    articles: [["alloc-markets", "A 股、港股、美股的结构差异：哪个市场更适合买指数", 9], ["behave-active", "主动基金还是指数基金：跑赢指数的比例有多少", 9], ["behave-timing", "择时有多难：错过最好的十个交易日会怎样", 9], ["return-sources", "股票收益拆成三块：分红、盈利增长和估值变化", 10], ["global-channels", "投资海外的合规通道：QDII、港股通、跨境理财通与境外账户", 13], ["global-tax", "持有美股的美国税：股息预扣、W-8BEN 与遗产税", 10]],
  };

  // ═════════ 债券 ═════════
  const bond = {
    lead: "债券是组合里的压舱石。它的位置很好读：买入时的收益率，大致就是持有到期能拿到的回报。这一页把中债和美债分开看，各自在历史的什么位置。",
    posLabel: "CHINA GOVERNMENT BONDS · 10-YEAR",
    ends: ["收益率高，便宜", "收益率低，昂贵"],
    verdicts: [
      "中债收益率处在历史高位，现在买入并持有，未来的回报有保障。",
      "中债收益率偏高，债券的吸引力在上升。",
      "中债收益率在历史中间。",
      "中债收益率偏低，持有债券的回报有限。",
      "中债收益率处在历史低位，利率回升时长期限的债券会跌。",
    ],
    ruleNote: "债券的位置分高，意思是收益率低。中国国债收益率二十年来一路向下，位置分几乎一直在高位，按它减仓等于长期少配债券。所以这里的规则不动债券的比例，只给期限的倾向：收益率在低位时，长期限债券的价格对利率上行最敏感，新买入的放短一些；收益率回到高位时，再把期限拉长。上面这句结论按中债算。持有美元债券的人，期限的倾向看美债那一条。",
    sourceNote: "中债和美债各有一个位置分，都是 10 年期收益率的历史分位取反：收益率越低，分数越高。两个分不合并。中国国债收益率的历史从 2002 年起，这段时间利率整体向下，所以「历史低位」出现得很频繁，读数要结合绝对水平看。",
    tiles: ({ T }) => [
      { lb: "CHINA", label: "中债 10 年期", num: T.cn10.value.toFixed(2), unit: "%", sub: `${T.cn10.from} 年以来 ${T.cn10.pct}% 分位${T.cn10.pct <= 5 ? "，在历史最低附近" : ""}`, old: old(T.cn10) },
      { lb: "UNITED STATES", label: "美债 10 年期", num: T.us10.value.toFixed(2), unit: "%", sub: `${T.us10.from} 年以来 ${T.us10.pct}% 分位`, old: old(T.us10) },
      { lb: "REAL YIELD", label: "美国实际利率", num: sign(T.real.value), unit: "%", sub: `扣掉通胀预期后的 10 年期利率。2003 年以来 ${T.real.pct}% 分位`, old: old(T.real) },
      { lb: "SPREAD", label: "中美利差", num: sign(T.cnus.value), unit: "%", sub: `中债减美债。${T.cnus.value < 0 ? "倒挂，人民币资产的利息低于美元资产" : "中债利息高于美债"}`, old: old(T.cnus) },
    ],
    sections: ({ S, T }) => [
      { id: "ten", name: "两个市场的无风险利率", q: "现在买入长期国债并持有，一年大概能拿多少。",
        figures: [{ title: `中债 ${T.cn10.value.toFixed(2)}%，美债 ${T.us10.value.toFixed(2)}%，两个市场一冷一热`, note: "10 年期国债收益率", source: "来源：中债估值（经东方财富数据中心）、美联储圣路易斯分行 FRED（DGS10）。", series: [{ name: "中债 10 年期", s: S.cn10 }, { name: "美债 10 年期", s: S.us10, color: "#D98091", end: true }], fmt: P(0), endFmt: P(2), ranges: [["10Y", 10], ["25Y", 25], ["ALL", 0]], def: 25 }],
        tip: `无风险利率是所有资产定价的分母。中债收益率走低，是 A 股页股债性价比偏高的另一面。对持有人来说，收益率 ${T.cn10.value.toFixed(2)}% 的意思很直接：拿十年，每年大约就是这个数。想要更高，只能承担信用风险、加长期限，或者换一个币种。` },
      { id: "curve", name: "中国国债的期限结构", q: "把钱借出去更久，多拿了多少补偿。",
        figures: [{ title: `借 30 年比借 2 年，每年多拿 ${(lastOf(S.cn30) - lastOf(S.cn2)).toFixed(2)} 个百分点`, note: "中国国债 2 年、10 年、30 年期收益率", source: "来源：中债估值（经东方财富数据中心）。", series: [{ name: "10 年期", s: S.cn10 }, { name: "30 年期", s: S.cn30, color: "#6C4385", width: 1.4, end: true }, { name: "2 年期", s: S.cn2, color: GREY, end: true }], fmt: P(0), endFmt: P(2), ranges: R5, def: 10 }],
        tip: "期限越长，价格对利率越敏感。粗略算，利率上升 1 个百分点，10 年期国债价格大约跌 8%，30 年期大约跌 17%。收益率很低的时候，长债多出来的那点利息，补偿不了这个风险。" },
      { id: "real", name: "美国实际利率", q: "扣掉通胀之后，美元债券还剩多少真实回报。",
        figures: [{ title: `美元实际利率 ${sign(T.real.value)}%，${T.real.value > 1.5 ? "是二十年来偏高的水平" : T.real.value > 0 ? "为正" : "为负，持有债券跑不赢通胀"}`, note: "美国 10 年期通胀保值债券收益率，2003 年起", source: "来源：美联储圣路易斯分行 FRED（DFII10）。", series: [{ name: "实际利率", s: S.real }], lines: [{ y: 0, label: "零" }], fmt: P(0), endFmt: P(2) }],
        tip: "实际利率同时是黄金和成长股的对手：它越高，不生息的资产越没有吸引力。持有美元债券还要考虑汇率，利息多出来的部分可能被汇率变动抵掉。" },
      { id: "term", name: "美债期限利差", q: "美国的长短利率是否倒挂。",
        figures: [{ title: `美债 10 年减 2 年 ${sign(T.term.value)}%，${T.term.value < 0 ? "处在倒挂状态" : "已经是正值"}`, note: "长端低于短端称为倒挂，1976 年起", source: "来源：美联储圣路易斯分行 FRED（DGS10、DGS2），本站自算。", series: [{ name: "期限利差", s: S.term }], lines: [{ y: 0, label: "零" }], fmt: P(0), endFmt: P(2) }],
        tip: "历史上几次倒挂之后都出现过衰退，但间隔从几个月到两年不等。它是一个状态，不是时间点。这里只记录事实，不据此预测衰退。" },
    ],
    plays: [
      { t: "短债和现金类，放稳钱", p: "三年内要用的钱，放在货币基金、短期国债、短债基金这一类。目标是不亏本金、随时能用，收益排在后面。" },
      { t: "中长期国债，拿到期", p: "长期不用的钱里属于固定收益的那部分，可以买国债或利率债基金，按「拿到期」来想：买入时的收益率就是你的回报，中途的价格波动与你无关。" },
      { adv: true, t: "长债的利率波段", p: "判断利率要下行时买入长期限债券，赚价格上涨的钱。", bar: "要理解久期，要能判断利率方向。后者连专业机构也常常判断错。", who: "把它当作小仓位、清楚自己在做方向判断的人。", worst: "利率反向走 1 个百分点，30 年期国债价格跌一成半以上，几年的利息一次亏掉。" },
      { adv: true, t: "美元债券", p: "美元利率高于人民币利率时，持有美元国债或货币基金拿更高的利息。", bar: "要有合规的渠道（跨境基金或境外账户），要接受汇率波动。", who: "未来有美元支出（留学、海外生活）的家庭，这部分本来就该用美元准备。", worst: "人民币升值会吃掉利差。未来花的是人民币的话，多拿的利息可能不够补汇率的损失。" },
    ],
    articles: [["tool-bonds", "债券基金为什么会跌：利率、久期与信用风险", 8], ["return-real", "存款利率跌破 1% 以后：通胀、真实收益与现金的位置", 9], ["tool-cash", "活钱放哪里：货币基金、国债逆回购与美元现金 ETF", 8], ["tool-wmp", "银行理财怎么看：净值化、风险等级与破净", 9], ["alloc-ratio", "股债比例怎么定：年龄、收入稳定性和风险承受力", 9], ["global-usd", "为什么要配置美元资产：汇率风险与支出币种", 11]],
  };

  // ═════════ 黄金 ═════════
  const gold = {
    lead: "黄金不生息，没有盈利，没法像股票那样估值。它在组合里的作用是对冲：货币贬值、极端风险、股债一起跌的时候。这一页用扣除通胀的实际金价和长期均线判断位置。",
    posLabel: "GOLD · REAL PRICE",
    ends: ["便宜", "昂贵"],
    verdicts: [
      "实际金价处在历史低位，是建立长期仓位的好时候。",
      "金价偏低，可以把仓位补到基准。",
      "金价在历史中间。",
      "扣除通胀后的金价偏高。",
      "扣除通胀后的金价处在五十年来的最高一档。已有的仓位照常拿着，新增的钱不必急着放进来。",
    ],
    ruleNote: "黄金的位置分对之后一两年的涨跌没有预测力。2024 年 8 月它进入高位区，之后金价又涨了一倍多。所以这里的规则不把黄金调到基准以下，也不因为它涨得好就加码。黄金的仓位是保险：固定在组合的 5% 到 10%，涨到高出基准就卖回基准，跌到低于基准就补回来。",
    sourceNote: "实际金价 = 名义金价 ÷ 美国 CPI × 最新 CPI，即把历史金价都换算成今天的美元。月度金价 1971 年起（美元与黄金脱钩之后），取自 datahub 的伦敦金月均价；日线 2000 年起，是纽约黄金期货连续合约。两者口径略有差别。200 周均线用 1000 个交易日均线近似。",
    tiles: ({ T }) => [
      { lb: "PRICE", label: "国际金价", num: num(T.usd.value), unit: "美元/盎司", sub: `人民币金价 ${T.cny.value.toFixed(1)} 元/克（上海黄金交易所 Au99.99）`, old: old(T.usd) },
      { lb: "REAL PRICE", label: "实际金价分位", num: T.real.pct, unit: "%", sub: "扣除通胀后，在 1971 年以来的位置", old: "" },
      { lb: "VS TREND", label: "相对 200 周均线", num: sign(T.dev.value, 1), unit: "%", sub: `2004 年以来 ${T.dev.pct}% 分位。偏离越大，离长期成本越远`, old: old(T.dev) },
      { lb: "FROM THE PEAK", label: "距历史高点", num: neg(T.dd.value), unit: "%", sub: `高点在 ${dot(T.dd.peakDate).slice(0, 7)}`, old: old(T.dd) },
    ],
    sections: ({ S, T, data }) => [
      { id: "price", name: "金价与长期均线", q: "现在的价格离长期成本有多远。",
        figures: [{ title: `金价比 200 周均线${T.dev.value >= 0 ? "高" : "低"} ${Math.abs(T.dev.value).toFixed(0)}%`, note: "美元/盎司，对数刻度；灰线是 200 周均线", source: "来源：Yahoo Finance GC=F（纽约黄金期货连续合约）。", series: [{ name: "国际金价", s: S.usd }, { name: "200 周均线", s: S.ma200w, end: false }], log: true, fmt: N, ranges: R5, def: 10 }],
        tip: "200 周均线大致是过去四年买入者的平均成本。金价远高于它，说明近几年的买家都有不少浮盈，往后的波动通常更大。" },
      { id: "real", name: "实际金价", q: "扣掉通胀之后，黄金现在算贵还是便宜。",
        figures: [{ title: `按今天的美元算，金价在 1971 年以来的 ${T.real.pct}% 分位`, note: "历史金价按美国 CPI 换算成今天的美元，月度，对数刻度", source: "来源：datahub.io（月度金价）、美联储圣路易斯分行 FRED（CPIAUCSL），本站自算。", series: [{ name: "实际金价", s: S.real }], bands: bands(S.real, true), log: true, fmt: N, ranges: [["20Y", 20], ["ALL", 0]] }],
        table: fwd(data.tables.fwdReal, [5], "买入时的实际金价分位"),
        tip: "黄金有过很长的熊市：1980 年的高点买入，名义上要到 2007 年才回本，扣掉通胀要更久。表里可以看到，各档之后五年的结果都很分散，高位买入的结果并不比中间差。这个位置能告诉你金价离长期中枢有多远，告诉不了你接下来的方向。这也是黄金只做固定小仓位的原因。" },
      { id: "rate", name: "黄金与实际利率", q: "持有黄金的机会成本现在有多高。",
        figures: [{ title: `美元实际利率 ${sign(T.realRate.value)}%，持有黄金的机会成本${T.realRate.value > 1.5 ? "不低" : T.realRate.value > 0 ? "一般" : "很低"}`, note: "美国 10 年期通胀保值债券收益率", source: "来源：美联储圣路易斯分行 FRED（DFII10）。", series: [{ name: "实际利率", s: S.realRate }], lines: [{ y: 0, label: "零" }], fmt: P(0), endFmt: P(2), ranges: R5, def: 0 }],
        tip: "过去二十年里，实际利率下降时金价通常上涨，因为持有不生息资产的代价变小了。2022 年以后这个关系明显减弱：实际利率升到高位，金价仍然上涨，主要的买家换成了各国央行。旧的规律还在不在，现在没有定论。" },
      { id: "cny", name: "人民币金价", q: "在国内买，现在是什么价。",
        figures: [{ title: `人民币金价 ${T.cny.value.toFixed(1)} 元/克`, note: "上海黄金交易所 Au99.99 收盘价，2016 年 12 月起", source: "来源：上海黄金交易所。", series: [{ name: "Au99.99", s: S.cny }], fmt: N, endFmt: (v) => (+v).toFixed(1), size: "short" }],
        tip: "人民币金价 = 国际金价 × 汇率，再加上国内的供需溢价。人民币贬值时，国内金价会比国际金价涨得多。" },
    ],
    plays: [
      { t: "黄金 ETF，固定小比例", p: "用跟踪金价的交易所基金持有，费率低、买卖方便。定一个固定比例（比如 5% 到 10%），每年再平衡一次。" },
      { t: "银行积存金或实物金条", p: "看得见、拿得到，适合看重这一点的人。要算清买卖差价和保管成本，金饰的工费更高，不适合当作投资。" },
      { adv: true, t: "黄金期货或黄金股", p: "期货带杠杆，黄金股的涨跌幅通常是金价的两三倍。", bar: "期货要开户和理解保证金；黄金股要研究矿企的成本和经营。", who: "已经有基础仓位、想做短期交易并能承受大幅亏损的人。", worst: "期货在金价回调时可能被强制平仓。黄金股除了金价，还有经营和估值的风险，金价涨的年份它也可能下跌。" },
    ],
    articles: [["tool-gold", "黄金的作用：避险属性、真实利率与持有成本", 10], ["alloc-map", "大类资产地图：现金、债券、股票、黄金各管什么", 9], ["alloc-correlation", "分散化与相关性：为什么危机时分散会暂时失灵", 9], ["alloc-rebalance", "再平衡：定期还是按阈值，怎样低成本执行", 10]],
  };

  // ═════════ 加密资产 ═════════
  const cycleFig = (host, data, m) => {
    const el = document.createElement("div"); el.className = "figure rv";
    const cs = data.tables.cycles, names = ["2012 年减半后", "2016 年减半后", "2020 年减半后", "本轮（2024 年减半后）"];
    const cur = cs[cs.length - 1], lastPt = cur.pts[cur.pts.length - 1];
    el.innerHTML = `<div class="fig-h"><div><div class="h3">本轮走到减半后第 ${data.tiles.find((t) => t.key === "dd").sinceHalving} 天，价格是减半日的 ${lastPt[1].toFixed(2)} 倍</div><p class="s cap-l">每一轮的价格以减半日为 1，放在同一条时间轴上，对数刻度</p></div></div><div class="lg"><span><i style="background:${m.dc}"></i>${names[3]}</span><span><i style="background:${GREY}"></i>前三轮</span></div><div class="chart" id="cyc"></div><p class="src">来源：Coin Metrics 社区版数据，本站自算。</p>`;
    host.appendChild(el);
    const ch = echarts.init(el.querySelector("#cyc"));
    addEventListener("resize", () => ch.resize());
    const ax = { color: "#77787A", fontSize: 12 };
    ch.setOption({ grid: { left: 8, right: 64, top: 12, bottom: 8, containLabel: true },
      xAxis: { type: "value", min: 0, max: 1460, interval: 365, axisLabel: { ...ax, formatter: (v) => "第 " + v + " 天" }, axisLine: { lineStyle: { color: "#171717" } }, axisTick: { show: false }, splitLine: { show: false } },
      yAxis: { type: "log", axisLabel: { ...ax, formatter: (v) => v + " 倍" }, axisLine: { show: false }, splitLine: { lineStyle: { color: "#EFEFED" } } },
      tooltip: { trigger: "axis", backgroundColor: "#fff", borderColor: "#D5D5D2", textStyle: { color: "#171717", fontSize: 13 }, formatter: (ps) => `减半后第 ${ps[0].value[0]} 天<br>` + ps.map((p) => `${p.seriesName}　${p.value[1]} 倍`).join("<br>") },
      series: cs.map((c, i) => ({ name: names[i], type: "line", data: c.pts, showSymbol: false, z: i === 3 ? 10 : 1, lineStyle: { width: i === 3 ? 2 : 1.2, color: i === 3 ? m.dc : GREY, opacity: i === 3 ? 1 : 0.4 + i * 0.2 }, itemStyle: { color: i === 3 ? m.dc : GREY }, endLabel: { show: true, formatter: () => (i === 3 ? "本轮" : names[i].slice(0, 4)), color: "#77787A", fontSize: 12 }, emphasis: { disabled: true }, animationDuration: 1200 })) });
  };
  const btc = {
    lead: "加密资产这里只看比特币。它没有现金流，价格主要跟着四年一次的减半周期和市场情绪走。这一页用链上持币成本、长期均线和情绪三类指标判断周期位置。",
    posLabel: "CRYPTO · BITCOIN",
    ends: ["周期低位", "周期高位"],
    verdicts: [
      "各项指标都在周期低位。",
      "指标偏低。算不算偏冷，要看 MVRV 是否低于 1、价格是否跌破 200 周均线。",
      "不在周期的两端。",
      "指标偏高，市场开始拥挤。",
      "各项指标都在周期高位，历史上这之后的回撤很深。",
    ],
    ruleNote: "比特币的规则是：偏冷时只补到基准，不额外加码；高位时下调。偏冷用两个明确的条件判断，满足一个就算：全网平均亏损（MVRV 低于 1），或者价格跌破 200 周均线。只是位置分偏低不算。比特币历史上每一轮从高点下来都跌过七成以上，它在组合里只适合占很小的比例，常见的上限是 1% 到 5%，并且只用完全亏掉也不影响生活的钱。基准比例填 0 也是一个合理的选择。",
    sourceNote: "MVRV = 总市值 ÷ 按每枚币最后一次链上转移时的价格计算的总成本，大于 1 表示全网平均有浮盈。200 周均线用 1400 日均线计算。ahr999 = (价格 ÷ 200 日定投成本) × (价格 ÷ 按币龄拟合的增长估值)，是中文社区常用的定投参考指标，它的拟合参数来自早年数据，现在已经偏离，本站只把它列作参考，不计入位置分。比特币只有十几年历史、四轮周期，所有分位和表格的样本都很少。数据取自 Coin Metrics 社区版，按 CC BY-NC 4.0 许可使用。",
    tiles: ({ T }) => [
      { lb: "ON CHAIN", label: "MVRV 链上浮盈", num: T.mvrv.value.toFixed(2), unit: "倍", sub: `全历史 ${T.mvrv.pct}% 分位。低于 1 表示全网平均亏损`, old: old(T.mvrv) },
      { lb: "VS TREND", label: "相对 200 周均线", num: sign(T.ma.value, 1), unit: "%", sub: `均线在 ${num(T.ma.ma200w)} 美元。${T.ma.value < 0 ? "价格已经跌破" : "价格在均线之上"}`, old: old(T.ma) },
      { lb: "FROM THE PEAK", label: "距历史高点", num: neg(T.dd.value), unit: "%", sub: `高点 ${num(T.dd.peak)} 美元，在 ${dot(T.dd.peakDate).slice(0, 7)}。减半后第 ${T.dd.sinceHalving} 天`, old: old(T.dd) },
      { lb: "SENTIMENT", label: "恐惧贪婪指数", num: T.fng.value, unit: "/ 100", sub: `${T.fng.value < 25 ? "极度恐惧" : T.fng.value < 45 ? "恐惧" : T.fng.value < 55 ? "中性" : T.fng.value < 75 ? "贪婪" : "极度贪婪"}`, old: old(T.fng) },
    ],
    sections: ({ S, T, data, m }) => [
      { id: "price", name: "价格与 200 周均线", q: "现在的价格离长期成本有多远。",
        figures: [{ title: `比特币 ${num(T.price.value)} 美元，${T.price.value >= T.price.ma200w ? "在 200 周均线之上" : "跌到了 200 周均线之下"}`, note: `对数刻度；灰线是 200 周均线，当前 ${num(T.price.ma200w)} 美元`, source: "来源：Coin Metrics 社区版数据。", series: [{ name: "比特币", s: S.price }, { name: "200 周均线", s: S.ma200w, end: false }], dd: S.price, log: true, fmt: N, ranges: [["4Y", 4], ["8Y", 8], ["ALL", 0]], def: 8, size: "tall" }],
        tip: "过去几轮熊市的底部都落在 200 周均线附近。下面的回撤线更值得看：每一轮从高点下来都跌了七成以上。" },
      { id: "cycle", name: "减半周期", q: "和前几轮比，这一轮走到了哪里。", figures: [], custom: (host) => cycleFig(host, data, m),
        tip: "前三轮都在减半后 12 到 18 个月见顶，之后进入一年左右的下跌。每一轮的涨幅都比上一轮小。只有三轮完整的样本，节奏会不会延续，没有人能确定。" },
      { id: "mvrv", name: "MVRV 链上浮盈", q: "全网持币者平均赚了多少。",
        figures: [{ title: `全网平均浮盈 ${((T.mvrv.value - 1) * 100).toFixed(0)}%，${T.mvrv.value < 1 ? "市场过冷" : T.mvrv.value > 3.5 ? "市场过热" : "不在极端位置"}`, note: "总市值 ÷ 链上总成本。低于 1 为过冷，历史上高于 3.5 多在周期顶部", source: "来源：Coin Metrics 社区版数据（CapMVRVCur）。", series: [{ name: "MVRV", s: S.mvrv }], lines: [{ y: 1, label: "1" }, { y: 3.5, label: "3.5" }], log: true, fmt: (v) => +(+v).toPrecision(2), endFmt: (v) => (+v).toFixed(2), ranges: [["4Y", 4], ["8Y", 8], ["ALL", 0]], def: 8 }],
        table: fwd(data.tables.fwdMvrv, [1, 2], "当时的 MVRV"),
        tip: "表里的年化数字很大，因为比特币早年从很低的价格涨上来，未来不会重复这样的涨幅，可以参考的只是各档之间的相对关系。多数人都亏的时候，愿意卖的人已经不多；多数人浮盈几倍的时候，随时有人想兑现。每一轮顶部的 MVRV 都比上一轮低，所以 3.5 这条线未来可能要下调。" },
      { id: "fng", name: "恐惧贪婪指数", q: "市场现在的情绪。",
        figures: [{ title: `恐惧贪婪指数 ${T.fng.value}`, note: "0 到 100，越低越恐惧，2018 年起", source: "来源：alternative.me。", series: [{ name: "恐惧贪婪指数", s: S.fng }], lines: [{ y: 25, label: "极度恐惧" }, { y: 75, label: "极度贪婪" }], min: 0, max: 100, fmt: (v) => Math.round(v), ranges: [["1Y", 1], ["4Y", 4], ["ALL", 0]], def: 4, size: "short" }],
        tip: "情绪指标变化很快，在位置分里只占两成。它和周期指标同时落在低位时，才值得多看一眼。" },
      { id: "ahr", name: "ahr999，仅作参考", q: "一个常被引用的定投指标，现在为什么不能直接用。",
        figures: [{ title: `ahr999 是 ${T.ahr.value.toFixed(2)}，按旧标准在「抄底区」，但其他指标不支持`, note: "低于 0.45 曾被称为抄底区，高于 1.2 为观望区；对数刻度", source: "来源：价格取自 Coin Metrics，按公开公式自算。", series: [{ name: "ahr999", s: S.ahr }], lines: [{ y: 0.45, label: "0.45" }, { y: 1.2, label: "1.2" }], log: true, fmt: (v) => +(+v).toPrecision(2), endFmt: (v) => (+v).toFixed(2), ranges: [["4Y", 4], ["8Y", 8], ["ALL", 0]], def: 8 }],
        tip: `这个指标里有一条按币龄拟合的增长曲线，参数来自早年的数据。前几轮它进入抄底区时，全网几乎每天都是平均亏损的。这一轮它又进了抄底区，但 MVRV 是 ${T.mvrv.value.toFixed(2)}，全网平均仍有浮盈，价格也${T.ma.value < 0 ? "只是刚跌破" : "还在"} 200 周均线${T.ma.value < 0 ? "" : "之上"}。拟合曲线涨得比实际价格快，指标因此越来越容易显得便宜。所以它不计入位置分，这里只保留图。` },
    ],
    plays: [
      { t: "只买比特币，小比例定投", p: "定一个上限（比如家庭可投资资产的 1% 到 5%），按固定节奏买入，持仓到了上限就停，位置进入高位也停。跌下来时最多补回基准，不因为便宜额外加码。不碰小币种，不加杠杆。" },
      { t: "牛市分批卖出", p: "事先写好规则：比例超过上限时卖回上限，或者 MVRV 进入高位区后每月卖出一小部分。在高位区卖出比猜顶容易做到。" },
      { adv: true, t: "网格交易", p: "在一个价格区间里挂一串买单和卖单，跌了自动买，涨了自动卖，赚来回波动的钱。", bar: "要会用交易平台的网格工具，要自己定区间和每格的间距。", who: "已经有长期仓位、想在震荡期多一点收益的人。", worst: "价格单边跌破区间时，网格会一路买满然后被套；单边涨破区间时，筹码早早卖光，错过主要涨幅。" },
      { adv: true, t: "卖出期权增加收益", p: "持有现货的同时卖出看涨期权，收取权利金；或者卖出看跌期权，在更低的价格接货。", bar: "要先真正理解期权，并在提供期权交易的平台开户。", who: "持仓较大、能接受收益封顶、懂得计算最坏情况的人。", worst: "大涨时现货会被按约定价格买走，错过上涨；大跌时权利金远不够弥补现货的亏损。交易平台本身也有倒闭和被盗的风险。" },
    ],
    articles: [["tool-crypto", "加密资产：波动、相关性与仓位上限", 10], ["wealth-ruin", "杠杆与破产风险：为什么先要保证不出局", 10], ["alloc-correlation", "分散化与相关性：为什么危机时分散会暂时失灵", 9], ["behave-chase", "追涨杀跌的心理机制：损失厌恶、近因效应与从众", 10]],
  };

  return { cn, us, bond, gold, btc };
})();
