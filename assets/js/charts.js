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
    renderInsights();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
