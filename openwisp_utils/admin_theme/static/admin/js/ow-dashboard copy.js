(function () {
  "use strict";

  function slugify(str) {
    str = str.replace(/^\s+|\s+$/g, "");
    str = str.toLowerCase();
    str = str
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return str;
  }

  let elementsParam = Object.values(owDashboardCharts),
    container = document.getElementById("plot-container");

  // Layout settings
  const GAP_PX = 15;
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.justifyContent = "flex-start";
  container.style.gap = GAP_PX + "px";
  container.style.width = "96%";
  container.style.margin = "0 auto";

  const baseLayout = {
    autosize: true,
    margin: { t: 30, b: 30, l: 10, r: 10 },
    legend: {
      yanchor: "bottom",
      xanchor: "center",
      x: 0.5,
      y: -0.2,
      orientation: "h",
      bgcolor: "transparent",
    },
    title: { font: { size: 14 } },
  };
  const options = { displayModeBar: false, responsive: true };

  // helpers
  function getColsForWidth(width) {
    // tune breakpoints to your taste
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  }

  function debounce(fn, delay) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  // collect cards and chart wrappers so we can update on resize
  const cards = [];
  const chartWrappers = [];

  for (let i = 0; i < elementsParam.length; ++i) {
    const cfg = elementsParam[i];
    baseLayout.title.text = cfg.name;

    let data = {
        type: "pie",
        hole: 0.6,
        showlegend: !cfg.hasOwnProperty("quick_link"),
      },
      element = document.createElement("div"), // card
      chartWrapper = document.createElement("div"), // plot target
      totalValues = 0;

    // Card styles
    element.style.background = "#fff";
    element.style.borderRadius = "12px";
    element.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)";
    element.style.padding = "16px";
    element.style.boxSizing = "border-box";
    element.style.minWidth = "220px"; // prevent too small
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.alignItems = "stretch";

    // Chart wrapper styles (Plotly will size to this)
    chartWrapper.style.width = "100%";
    chartWrapper.style.height = "260px";
    chartWrapper.style.flex = "1 1 auto";

    // prepare data
    if (!cfg.query_params || cfg.query_params.values.length === 0) {
      data.values = [1];
      data.labels = ["Not enough data"];
      data.marker = { colors: ["#d3d3d3"] };
      data.texttemplate = " ";
      data.showlegend = false;
      data.hovertemplate = "%{label}";
    } else {
      data.values = cfg.query_params.values;
      data.labels = cfg.query_params.labels;

      if (data.labels.length > 4) data.showlegend = false;
      data.rotation = 180;
      data.textposition = "inside";
      data.insidetextorientation = "horizontal";
      if (cfg.colors) data.marker = { colors: cfg.colors };
      data.texttemplate = "<b>%{value}</b><br>(%{percent})";
      data.targetLink = cfg.target_link;
      data.filters = cfg.filters;
      data.filtering = cfg.filtering;

      for (var c = 0; c < data.values.length; c++) {
        totalValues += data.values[c];
      }
    }

    const layoutForThis = Object.assign({}, baseLayout);
    layoutForThis.annotations = [
      {
        font: { size: 18, weight: "bold" },
        showarrow: false,
        text: `<b>${totalValues}</b>`,
        x: 0.5,
        y: 0.5,
      },
    ];

    // attach elements to DOM BEFORE plotting so Plotly sees correct size
    element.appendChild(chartWrapper);
    container.appendChild(element);

    // create the plot
    Plotly.newPlot(chartWrapper, [data], layoutForThis, options);

    // click handler (attached to the chart wrapper)
    if (cfg.query_params && cfg.query_params.values.length !== 0) {
      chartWrapper.on("plotly_click", function (evt) {
        var path = evt.points[0].data.targetLink,
          filters = evt.points[0].data.filters,
          filtering = evt.points[0].data.filtering,
          idx = evt.points[0].i;
        if (filtering !== "False") {
          if (filters && typeof filters[idx] !== "undefined") {
            path += filters[idx];
          } else {
            path += encodeURIComponent(evt.points[0].label);
          }
        }
        window.location = path;
      });
    }

    // quick link button (if any)
    if (cfg.hasOwnProperty("quick_link")) {
      let quickLinkContainer = document.createElement("div");
      quickLinkContainer.style.textAlign = "center";
      quickLinkContainer.style.marginTop = "10px";

      let quickLink = document.createElement("a");
      quickLink.href = cfg.quick_link.url;
      quickLink.innerHTML = cfg.quick_link.label;
      quickLink.title = cfg.quick_link.title || cfg.quick_link.label;
      quickLink.classList.add("button", "quick-link");

      if (cfg.quick_link.custom_css_classes) {
        for (let j = 0; j < cfg.quick_link.custom_css_classes.length; ++j) {
          quickLink.classList.add(cfg.quick_link.custom_css_classes[j]);
        }
      }
      quickLinkContainer.appendChild(quickLink);
      element.appendChild(quickLinkContainer);
    }

    element.classList.add(slugify(cfg.name));
    cards.push(element);
    chartWrappers.push(chartWrapper);
  }

  // function to recalc columns & apply flex-basis
  function updateGridAndResizeCharts() {
    const containerWidth = container.clientWidth || window.innerWidth;
    const cols = getColsForWidth(containerWidth);
    // compute basis subtracting gap total
    const totalGap = (cols - 1) * GAP_PX;
    const basis = `calc((100% - ${totalGap}px) / ${cols})`;

    for (let card of cards) {
      card.style.flex = `1 1 ${basis}`;
      card.style.maxWidth = basis;
    }

    // trigger Plotly resize for each chart wrapper (debounced caller)
    for (let cw of chartWrappers) {
      try {
        Plotly.Plots.resize(cw);
      } catch (e) {
        // ignore if plotly not yet ready for some wrapper
      }
    }
  }

  // initial layout
  updateGridAndResizeCharts();

  // listen for resizes (debounced)
  window.addEventListener("resize", debounce(updateGridAndResizeCharts, 120));
})();
