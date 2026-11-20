/* =========================================================
   港深 AI 创业地图 · 地图与交互
   ========================================================= */
(function () {
  "use strict";

  var DATA = window.SITE_DATA;
  var COMPANIES = DATA.companies;
  var NODES = DATA.nodes;

  var COLORS = {
    "AI4S": "#2B62D9",
    "具身智能": "#E4671F",
    park: "#1F8A70",
    research: "#6B5BD2",
    investor: "#A2762A",
    policy: "#7C8798",
    cluster: "#B4C0CD"
  };

  var LAYER_META = {
    park: { label: "园区 / 基地" },
    research: { label: "高校 / 实验室" },
    investor: { label: "投资机构" },
    policy: { label: "扶持政策" },
    cluster: { label: "产业片区" }
  };

  var DEFAULT_LAYERS = { park: true, research: true, investor: false, policy: false, cluster: false };

  var state = {
    city: "all",
    domain: "all",
    stages: [],
    q: "",
    layers: Object.assign({}, DEFAULT_LAYERS),
    activeId: null
  };

  var map, companyLayer, nodeLayers = {}, markers = {}, nodeMarkers = {};
  var BOUNDS = {
    all: [[22.23, 113.85], [22.79, 114.29]],
    sz: [[22.43, 113.85], [22.80, 114.35]],
    hk: [[22.20, 114.05], [22.50, 114.42]]
  };

  /* ---------------- 工具 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function countBy(list, key) {
    return list.reduce(function (acc, item) {
      var k = typeof key === "function" ? key(item) : item[key];
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  }

  /* 同一片区内坐标接近的公司，做轻微螺旋偏移，避免点位完全重叠 */
  function spreadCoords(list) {
    var buckets = {};
    list.forEach(function (c) {
      var key = c.lat.toFixed(2) + "," + c.lng.toFixed(2);
      var i = buckets[key] = (buckets[key] || 0) + 1;
      var angle = (i - 1) * 2.399963;
      var r = 0.0019 * Math.sqrt(i - 1);
      c._lat = c.lat + Math.sin(angle) * r;
      c._lng = c.lng + Math.cos(angle) * r * 1.1;
    });
  }

  /* ---------------- 顶部数字 ---------------- */
  function renderStats() {
    var cityCount = countBy(COMPANIES, "city");
    var kpi = [
      { n: COMPANIES.length, t: "家公司" },
      { n: (cityCount["深圳"] || 0) + " · " + (cityCount["香港"] || 0), t: "深圳 / 香港" },
      { n: NODES.length, t: "生态节点" }
    ];
    $("#topbarKpi").innerHTML = kpi.map(function (k) {
      return '<div class="kpi"><b>' + k.n + '</b><span>' + k.t + "</span></div>";
    }).join("");

    var domainCount = countBy(COMPANIES, "domain");
    var stats = [
      { n: COMPANIES.length, t: "家创业公司" },
      { n: NODES.length, t: "个生态资源节点" },
      { n: domainCount["具身智能"] || 0, t: "家具身智能" },
      { n: domainCount["AI4S"] || 0, t: "家 AI4S" }
    ];
    $("#heroStats").innerHTML = stats.map(function (s) {
      return '<div class="hero-stat"><b>' + s.n + "</b><span>" + s.t + "</span></div>";
    }).join("");

    $("#metaUpdated").textContent = DATA.meta.updated;
  }

  /* ---------------- 筛选器 ---------------- */
  function renderStageChips() {
    var groups = ["早期", "成长期", "上市", "未披露"];
    var counts = countBy(COMPANIES, "stageGroup");
    $("#filterStage").innerHTML = groups.map(function (g) {
      return '<button type="button" class="chip" data-value="' + g + '">' +
        g + ' <span style="opacity:.55">' + (counts[g] || 0) + "</span></button>";
    }).join("");
  }

  function renderLayerToggles() {
    var counts = countBy(NODES, "type");
    $("#layerToggles").innerHTML = Object.keys(LAYER_META).map(function (t) {
      var on = state.layers[t];
      return '<button type="button" class="layer-toggle' + (on ? "" : " is-off") + '" data-type="' + t + '" aria-pressed="' + on + '">' +
        '<span class="swatch" style="background:' + COLORS[t] + '"></span>' +
        LAYER_META[t].label +
        '<span class="cnt">' + (counts[t] || 0) + "</span></button>";
    }).join("");
  }

  function matches(c) {
    if (state.city !== "all" && c.city !== state.city) return false;
    if (state.domain !== "all" && c.domain !== state.domain) return false;
    if (state.stages.length && state.stages.indexOf(c.stageGroup) === -1) return false;
    if (state.q) {
      var hay = [
        c.name, c.nameEn, c.sub, c.positioning, c.why, c.district, c.stage,
        (c.founders || []).map(function (f) { return f.name; }).join(" ")
      ].join(" ").toLowerCase();
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  /* ---------------- 公司列表 ---------------- */
  function renderList(list) {
    $("#listCount").textContent = list.length + " 家公司";
    if (!list.length) {
      $("#companyList").innerHTML = '<p class="list-empty">没有符合条件的公司，试试清除筛选。</p>';
      return;
    }
    $("#companyList").innerHTML = list.map(function (c) {
      return '<button type="button" class="company-item' + (c.id === state.activeId ? " is-active" : "") +
        '" data-id="' + c.id + '" data-domain="' + c.domain + '">' +
        '<span class="ci-top"><span class="ci-dot" data-domain="' + c.domain + '"></span>' +
        '<span class="ci-name">' + esc(c.name) + "</span>" +
        '<span class="ci-city">' + esc(c.city) + "</span></span>" +
        '<span class="ci-sub">' + esc(c.sub) + "</span>" +
        '<span class="ci-meta"><span>' + esc(c.stage) + "</span><span>" + esc(c.district) + "</span></span>" +
        "</button>";
    }).join("");
  }

  /* ---------------- 地图 ---------------- */
  function initMap() {
    map = L.map("map", {
      zoomControl: true,
      minZoom: 9,
      maxZoom: 17,
      scrollWheelZoom: true,
      attributionControl: true
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    companyLayer = L.markerClusterGroup({
      maxClusterRadius: 44,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: function (cluster) {
        var n = cluster.getChildCount();
        var size = n < 5 ? 30 : (n < 10 ? 36 : 42);
        return L.divIcon({
          className: "co-cluster-wrap",
          html: '<div class="co-cluster">' + n + "</div>",
          iconSize: [size, size]
        });
      }
    }).addTo(map);

    COMPANIES.forEach(function (c) {
      var m = L.marker([c._lat, c._lng], {
        icon: L.divIcon({
          className: "co-marker",
          html: '<span class="co-pin" data-domain="' + c.domain + '"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        }),
        riseOnHover: true,
        title: c.name
      });
      m.bindTooltip('<b>' + esc(c.name) + "</b><i>" + esc(c.sub) + "</i>", {
        className: "co-tip", direction: "top", offset: [0, -9]
      });
      m.on("click", function () { openDetail(c.id, true); });
      markers[c.id] = m;
    });

    renderNodes();
    fitView("all");
  }

  function nodeIcon(type) {
    return L.divIcon({
      className: "node-icon-wrap",
      html: '<span class="node-icon" data-type="' + type + '" style="width:18px;height:18px"><i></i></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10]
    });
  }

  function renderNodes() {
    Object.keys(LAYER_META).forEach(function (type) {
      var group = L.layerGroup();
      NODES.filter(function (n) { return n.type === type; }).forEach(function (n) {
        if (type === "cluster") {
          var circle = L.circle([n.lat, n.lng], {
            radius: 1100, color: COLORS.cluster, weight: 1.2, dashArray: "5,6",
            fillColor: COLORS.cluster, fillOpacity: 0.07, interactive: false
          });
          group.addLayer(circle);
          var label = L.marker([n.lat, n.lng], {
            icon: L.divIcon({
              className: "cluster-label",
              html: '<span style="font-size:10.5px;color:#7C8798;letter-spacing:.04em;white-space:nowrap">' + esc(n.name) + "</span>",
              iconSize: [0, 0]
            }),
            interactive: false
          });
          group.addLayer(label);
        } else {
          var mk = L.marker([n.lat, n.lng], { icon: nodeIcon(type) });
          mk.bindTooltip('<b>' + esc(n.name) + "</b><span>" + esc(n.district) + " · " + esc(n.desc) + "</span>", {
            className: "node-tip", direction: "top", offset: [0, -10], opacity: 1
          });
          nodeMarkers[n.id] = mk;
          group.addLayer(mk);
        }
      });
      nodeLayers[type] = group;
      if (state.layers[type]) group.addTo(map);
    });
  }

  function toggleLayer(type, on) {
    state.layers[type] = on;
    if (on) { if (!map.hasLayer(nodeLayers[type])) nodeLayers[type].addTo(map); }
    else if (map.hasLayer(nodeLayers[type])) map.removeLayer(nodeLayers[type]);
    renderLayerToggles();
  }

  function fitView(key) {
    var b = L.latLngBounds(BOUNDS[key]);
    map.fitBounds(b, { padding: [24, 24] });
  }

  /* ---------------- 详情 ---------------- */
  function openDetail(id, fly) {
    var c = COMPANIES.filter(function (x) { return x.id === id; })[0];
    if (!c) return;

    setActive(id);
    if (fly && markers[id]) {
      map.flyTo([c._lat, c._lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }

    $("#detailTags").innerHTML =
      '<span class="tag city">' + esc(c.city) + " · " + esc(c.district) + "</span>" +
      '<span class="tag ' + c.domain + '">' + esc(c.domain) + "</span>" +
      '<span class="tag stage">' + esc(c.stage) + "</span>";

    var founders = (c.founders || []).map(function (f) {
      return '<div class="d-founder"><span class="d-avatar">' + esc(f.name.charAt(0)) + "</span>" +
        "<div><b>" + esc(f.name) + "</b><span>" + esc(f.background) + "</span></div></div>";
    }).join("");

    var conf = c.confidence === "high" ? "高（官网 / 监管披露可核）" : "中（公开报道，建议复核）";

    $("#detailBody").innerHTML =
      '<h2 class="d-title">' + esc(c.name) + "</h2>" +
      '<p class="d-en">' + esc(c.nameEn) + "</p>" +

      '<div class="d-block"><h4>做什么</h4><p>' + esc(c.positioning) + "</p></div>" +

      '<div class="d-block"><h4>核心团队</h4>' + (founders || "<p>未公开披露</p>") + "</div>" +

      '<div class="d-block"><h4>融资与进展</h4><p>' + esc(c.funding) + "</p></div>" +

      '<div class="d-block"><h4>投资看点</h4><div class="d-quote">' + esc(c.why) + "</div></div>" +

      '<div class="d-block"><h4>基本信息</h4>' +
        '<div class="d-meta-row"><span>所在城市</span><b>' + esc(c.city) + " · " + esc(c.district) + "</b></div>" +
        '<div class="d-meta-row"><span>细分方向</span><b>' + esc(c.sub) + "</b></div>" +
        '<div class="d-meta-row"><span>融资阶段</span><b>' + esc(c.stage) + "</b></div>" +
        '<div class="d-meta-row"><span>信息可信度</span><b>' + conf + "</b></div>" +
      "</div>" +

      '<div class="d-links">' +
        (c.site ? '<a class="d-link" href="' + esc(c.site) + '" target="_blank" rel="noopener">官网</a>' : "") +
        (c.source ? '<a class="d-link" href="' + esc(c.source) + '" target="_blank" rel="noopener">信息来源</a>' : "") +
      "</div>" +

      (c.note ? '<div class="d-note">' + esc(c.note) + "</div>" : "") +
      '<div class="d-note">坐标为所在片区近似点，不代表精确办公地址；融资信息截止 ' + esc(DATA.meta.updated) + "，仅作研究参考。</div>";

    $("#detail").classList.add("is-open");
    $("#detail").setAttribute("aria-hidden", "false");
    $("#detailScrim").classList.add("is-on");
    $("#detailBody").scrollTop = 0;

    try { history.replaceState(null, "", "#co=" + id); } catch (e) { /* ignore */ }
  }

  function closeDetail() {
    $("#detail").classList.remove("is-open");
    $("#detail").setAttribute("aria-hidden", "true");
    $("#detailScrim").classList.remove("is-on");
    setActive(null);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
  }

  function setActive(id) {
    if (state.activeId && markers[state.activeId]) {
      var prevEl = markers[state.activeId].getElement();
      var prevPin = prevEl && prevEl.querySelector(".co-pin");
      if (prevPin) prevPin.classList.remove("is-active");
    }
    state.activeId = id;
    if (id && markers[id]) {
      var el = markers[id].getElement();
      var pin = el && el.querySelector(".co-pin");
      if (pin) pin.classList.add("is-active");
    }
    $$(".company-item").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-id") === id);
    });
  }

  /* ---------------- 统一刷新 ---------------- */
  function applyFilters() {
    var visible = COMPANIES.filter(matches);
    var ids = {};
    visible.forEach(function (c) { ids[c.id] = true; });

    companyLayer.clearLayers();
    companyLayer.addLayers(visible.map(function (c) { return markers[c.id]; }));

    renderList(visible);
    if (state.activeId && !ids[state.activeId]) closeDetail();
    else setActive(state.activeId);
  }

  /* ---------------- 事件 ---------------- */
  function bindEvents() {
    $$("#filterCity button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.city = b.getAttribute("data-value");
        $$("#filterCity button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        applyFilters();
      });
    });

    $$("#filterDomain button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.domain = b.getAttribute("data-value");
        $$("#filterDomain button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        applyFilters();
      });
    });

    $("#filterStage").addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var v = btn.getAttribute("data-value");
      var i = state.stages.indexOf(v);
      if (i > -1) state.stages.splice(i, 1); else state.stages.push(v);
      btn.classList.toggle("is-active", state.stages.indexOf(v) > -1);
      applyFilters();
    });

    var searchTimer;
    $("#searchInput").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      var v = e.target.value.trim().toLowerCase();
      searchTimer = setTimeout(function () { state.q = v; applyFilters(); }, 140);
    });

    $("#layerToggles").addEventListener("click", function (e) {
      var btn = e.target.closest(".layer-toggle");
      if (!btn) return;
      var t = btn.getAttribute("data-type");
      toggleLayer(t, !state.layers[t]);
    });

    $("#resetLayers").addEventListener("click", function () {
      Object.keys(DEFAULT_LAYERS).forEach(function (t) { toggleLayer(t, DEFAULT_LAYERS[t]); });
    });

    $("#clearFilters").addEventListener("click", function () {
      state.city = "all"; state.domain = "all"; state.stages = []; state.q = "";
      $("#searchInput").value = "";
      $$("#filterCity button").forEach(function (x) {
        x.classList.toggle("is-active", x.getAttribute("data-value") === "all");
      });
      $$("#filterDomain button").forEach(function (x) {
        x.classList.toggle("is-active", x.getAttribute("data-value") === "all");
      });
      $$("#filterStage .chip").forEach(function (x) { x.classList.remove("is-active"); });
      applyFilters();
    });

    $("#companyList").addEventListener("click", function (e) {
      var btn = e.target.closest(".company-item");
      if (btn) openDetail(btn.getAttribute("data-id"), true);
    });

    $("#detailClose").addEventListener("click", closeDetail);
    $("#detailScrim").addEventListener("click", closeDetail);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDetail();
    });

    $$(".map-toolbar button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".map-toolbar button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        fitView(b.getAttribute("data-view"));
      });
    });
  }

  /* ---------------- 图例 ---------------- */
  function renderLegend() {
    $("#legend").innerHTML =
      '<div class="row"><span class="k" style="background:' + COLORS["具身智能"] + '"></span>具身智能公司</div>' +
      '<div class="row"><span class="k" style="background:' + COLORS["AI4S"] + '"></span>AI4S 公司</div>' +
      '<div class="sep"></div>' +
      '<div class="row"><span class="k sq" style="background:' + COLORS.park + '"></span>园区 / 基地</div>' +
      '<div class="row"><span class="k dia" style="background:' + COLORS.research + '"></span>高校 / 实验室</div>' +
      '<div class="row"><span class="k ring"></span>投资机构</div>';
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    spreadCoords(COMPANIES);
    renderStats();
    renderStageChips();
    renderLayerToggles();
    renderLegend();
    initMap();
    bindEvents();
    applyFilters();

    var m = /#co=([\w-]+)/.exec(location.hash);
    if (m) {
      var c = COMPANIES.filter(function (x) { return x.id === m[1]; })[0];
      if (c) {
        map.setView([c._lat, c._lng], 13);
        openDetail(c.id, false);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
