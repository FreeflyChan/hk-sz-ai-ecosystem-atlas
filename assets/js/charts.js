/* =========================================================
   港深 AI 创业地图 · 图表与结论
   ========================================================= */
(function () {
  "use strict";

  var DATA = window.SITE_DATA;
  var C = { ai4s: "#2B62D9", embodied: "#E4671F", park: "#1F8A70", research: "#6B5BD2", investor: "#A2762A", policy: "#7C8798", ink: "#0B1B2B", slate: "#5A6B7C", muted: "#8A99A8", line: "#E3E8EE" };

  function count(list, fn) {
    return list.reduce(function (a, x) { var k = fn(x); a[k] = (a[k] || 0) + 1; return a; }, {});
  }

  function setupDefaults() {
    Chart.defaults.font.family = '"Inter","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = C.slate;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 14;
    Chart.defaults.plugins.tooltip.backgroundColor = C.ink;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 7;
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: "600" };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  }

  /* ---------- 图一：城市 × 赛道 ---------- */
  function cityDomainChart() {
    var cities = ["深圳", "香港"];
    var by = count(DATA.companies, function (c) { return c.city + "|" + c.domain; });

    new Chart(document.getElementById("chartCityDomain"), {
      type: "bar",
      data: {
        labels: cities,
        datasets: [
          {
            label: "AI4S",
            data: cities.map(function (c) { return by[c + "|AI4S"] || 0; }),
            backgroundColor: C.ai4s,
            borderRadius: 5,
            barPercentage: 0.5,
            categoryPercentage: 0.6
          },
          {
            label: "具身智能",
            data: cities.map(function (c) { return by[c + "|具身智能"] || 0; }),
            backgroundColor: C.embodied,
            borderRadius: 5,
            barPercentage: 0.5,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false }, border: { color: C.line } },
          y: { stacked: true, beginAtZero: true, suggestedMax: 24, ticks: { precision: 0, stepSize: 4 }, grid: { color: C.line }, border: { display: false } }
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + "：" + ctx.parsed.y + " 家"; } } }
        }
      }
    });
  }

  /* ---------- 图二：融资阶段 ---------- */
  function stageChart() {
    var order = ["早期", "成长期", "上市", "未披露"];
    var by = count(DATA.companies, function (c) { return c.stageGroup; });
    var colors = ["#8FB0F0", C.ai4s, C.ink, "#C8D2DE"];

    new Chart(document.getElementById("chartStage"), {
      type: "doughnut",
      data: {
        labels: order,
        datasets: [{
          data: order.map(function (k) { return by[k] || 0; }),
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "right" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total ? Math.round(ctx.parsed / total * 100) : 0;
                return ctx.label + "：" + ctx.parsed + " 家（" + pct + "%）";
              }
            }
          }
        }
      }
    });
  }

  /* ---------- 图三：生态资源类型 ---------- */
  function nodeChart() {
    var cities = ["深圳", "香港"];
    var types = [
      { key: "park", label: "园区基地", color: C.park },
      { key: "research", label: "高校实验室", color: C.research },
      { key: "investor", label: "投资机构", color: C.investor },
      { key: "policy", label: "扶持政策", color: C.policy }
    ];
    var by = count(DATA.nodes, function (n) { return n.city + "|" + n.type; });

    new Chart(document.getElementById("chartNodes"), {
      type: "bar",
      data: {
        labels: types.map(function (t) { return t.label; }),
        datasets: cities.map(function (city, i) {
          return {
            label: city,
            data: types.map(function (t) { return by[city + "|" + t.key] || 0; }),
            backgroundColor: i === 0 ? C.embodied : C.ai4s,
            borderRadius: 4,
            barPercentage: 0.78,
            categoryPercentage: 0.68
          };
        })
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0, stepSize: 2 }, grid: { color: C.line }, border: { display: false } },
          y: { grid: { display: false }, border: { color: C.line } }
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + "：" + ctx.parsed.x + " 个"; } } }
        }
      }
    });
  }

  /* ---------- 图四：具身智能量价 ---------- */
  function embodiedChart() {
    new Chart(document.getElementById("chartEmbodied"), {
      data: {
        labels: ["2025", "2026E", "2028E", "2030E"],
        datasets: [
          {
            type: "bar",
            label: "全球出货量（万台）",
            data: [2.1, 5.8, 42, 175],
            backgroundColor: "rgba(228, 103, 31, .82)",
            hoverBackgroundColor: C.embodied,
            borderRadius: 5,
            barPercentage: 0.56,
            categoryPercentage: 0.66,
            yAxisID: "y"
          },
          {
            type: "line",
            label: "单机物料成本（万美元）",
            data: [6, 4.6, 2.2, 1.75],
            borderColor: C.ink,
            backgroundColor: C.ink,
            borderWidth: 2,
            tension: 0.32,
            pointRadius: 3.5,
            pointBackgroundColor: "#fff",
            pointBorderWidth: 2,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false }, border: { color: C.line } },
          y: {
            beginAtZero: true, suggestedMax: 200,
            ticks: { precision: 0, stepSize: 50 },
            grid: { color: C.line }, border: { display: false }
          },
          y1: {
            position: "right", beginAtZero: true, suggestedMax: 8,
            ticks: { precision: 0, stepSize: 2 },
            grid: { display: false }, border: { display: false }
          }
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label.indexOf("出货") > -1
                  ? ctx.dataset.label + "：" + ctx.parsed.y + " 万台"
                  : ctx.dataset.label + "：" + ctx.parsed.y + " 万美元";
              }
            }
          }
        }
      }
    });
  }

  /* ---------- 图五：AI4S 渗透率 ---------- */
  function penetrationChart() {
    var centerText = {
      id: "centerText",
      afterDraw: function (chart) {
        var meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;
        var p = meta.data[0];
        var ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = C.ink;
        ctx.font = '700 30px "Inter","PingFang SC",sans-serif';
        ctx.fillText("3.6%", p.x, p.y - 8);
        ctx.fillStyle = C.muted;
        ctx.font = '500 11px "Inter","PingFang SC",sans-serif';
        ctx.fillText("科研机构真正在用", p.x, p.y + 18);
        ctx.restore();
      }
    };

    new Chart(document.getElementById("chartPenetration"), {
      type: "doughnut",
      data: {
        labels: ["已把 AI 用进科研流程", "尚未真正使用"],
        datasets: [{
          data: [3.6, 96.4],
          backgroundColor: [C.ai4s, "#E8EEF7"],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "76%",
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.label + "：" + ctx.parsed + "%"; }
            }
          }
        }
      },
      plugins: [centerText]
    });
  }

  /* ---------- 资本视角 ---------- */
  function renderCapital() {
    var cap = DATA.capital;
    var order = ["ai4s", "embodied"];
    var html = order.map(function (key) {
      var it = cap[key];
      var isEmb = key === "embodied";
      var facts = it.facts.map(function (f) {
        return '<div class="cap-fact"><b>' + f.v + (f.u ? "<small>" + f.u + "</small>" : "") + "</b>" +
          '<span class="k">' + f.k + "</span>" +
          '<span class="n">' + f.n + "</span></div>";
      }).join("");
      var metrics = it.metrics.map(function (m) { return "<li>" + m + "</li>"; }).join("");
      var risks = it.risks.map(function (r) { return "<li>" + r + "</li>"; }).join("");
      return '<article class="capital-card' + (isEmb ? " is-embodied" : "") + '">' +
        '<div class="capital-head">' +
          '<span class="capital-label">' + it.label + "</span>" +
          '<span class="capital-stage">' + it.stage + "</span>" +
        "</div>" +
        '<p class="capital-thesis">' + it.thesis + "</p>" +
        '<div class="cap-facts">' + facts + "</div>" +
        '<div class="cap-block"><h4>钱在哪</h4><p>' + it.money + "</p></div>" +
        '<div class="cap-block"><h4>怎么估值</h4><p>' + it.valuation + "</p></div>" +
        '<div class="cap-block"><h4>看什么指标</h4><ul class="cap-list">' + metrics + "</ul></div>" +
        '<div class="cap-block"><h4>最怕什么</h4><ul class="cap-list is-risk">' + risks + "</ul></div>" +
        "</article>";
    }).join("");
    document.getElementById("capitalGrid").innerHTML = html;
  }

  /* ---------- 面试备战 ---------- */
  function renderInterview() {
    var iv = DATA.interview;

    document.getElementById("pitchGrid").innerHTML = iv.pitches.map(function (p, i) {
      var words = p.body.replace(/\s/g, "").length;
      return '<article class="pitch-card' + (i === 1 ? " is-embodied" : "") + '">' +
        '<span class="pitch-tag">' + p.tag + "</span>" +
        "<h3>" + p.title + "</h3>" +
        "<p>" + p.body + "</p>" +
        '<div class="pitch-meta"><span>约 ' + words + " 字</span><span>建议语速 200 字 / 分钟</span><span>先讲结论，再讲证据</span></div>" +
        "</article>";
    }).join("");

    document.getElementById("qaList").innerHTML = iv.qa.map(function (item, i) {
      return '<div class="qa-item' + (i === 0 ? " is-open" : "") + '" data-tag="' + item.tag + '">' +
        '<button class="qa-q" type="button" aria-expanded="' + (i === 0) + '">' +
          '<span class="qa-tag" data-t="' + item.tag + '">' + item.tag + "</span>" +
          "<strong>" + item.q + "</strong>" +
          '<i class="arrow" aria-hidden="true"></i>' +
        "</button>" +
        '<div class="qa-a">' + item.a + "</div>" +
        "</div>";
    }).join("");

    /* 问答折叠 */
    var list = document.getElementById("qaList");
    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".qa-q");
      if (!btn) return;
      var item = btn.parentNode;
      var open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    /* 分类筛选 */
    var tags = ["全部"].concat(iv.qa.map(function (x) { return x.tag; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }));
    var tabs = document.getElementById("qaTabs");
    tabs.innerHTML = tags.map(function (t, i) {
      return '<button type="button" class="' + (i === 0 ? "is-active" : "") + '" data-tag="' + t + '">' + t + "</button>";
    }).join("");
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var t = b.getAttribute("data-tag");
      Array.prototype.forEach.call(tabs.children, function (x) { x.classList.toggle("is-active", x === b); });
      Array.prototype.forEach.call(list.children, function (row) {
        row.hidden = t !== "全部" && row.getAttribute("data-tag") !== t;
      });
    });

    document.getElementById("askList").innerHTML = iv.asks.map(function (a) {
      return "<li>" + a + "</li>";
    }).join("");

    document.getElementById("avoidList").innerHTML = iv.avoid.map(function (a) {
      return '<div class="avoid-row">' +
        '<div class="avoid-bad">' + a.bad + "</div>" +
        '<div class="avoid-why">' + a.why + "</div>" +
        '<div class="avoid-say">' + a.say + "</div>" +
        "</div>";
    }).join("");
  }

  /* ---------- 十条结论 ---------- */
  function renderInsights() {
    var html = DATA.insights.map(function (it) {
      return '<article class="insight-card">' +
        '<span class="idx">' + it.n + "</span>" +
        "<h4>" + it.t + "</h4>" +
        "<p>" + it.d + "</p>" +
        "</article>";
    }).join("");
    document.getElementById("insightGrid").innerHTML = html;
  }

  function boot() {
    setupDefaults();
    cityDomainChart();
    stageChart();
    nodeChart();
    embodiedChart();
    penetrationChart();
    renderCapital();
    renderInterview();
    renderInsights();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
