import { SUBSTANCES } from "./substances.js";

const COLOR_PALETTE = [
  "#ffafcc",
  "#a2d2ff",
  "#cdb4db",
  "#bde0fe",
  "#ffcad4",
  "#9bf6ff",
  "#ffc8dd",
];

export class ChartManager {
  constructor(chartsContainerElement, chartTimeUnitElement) {
    this.chartsContainer = chartsContainerElement;
    this.chartTimeUnitElement = chartTimeUnitElement;
    this.activeCharts = [];
  }

  destroyAll() {
    this.activeCharts.forEach((chart) => chart.destroy());
    this.activeCharts = [];
    this.chartsContainer.innerHTML = "";
  }

  getThemeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    return {
      grid: isDark ? "#5c4d68" : "#cdb4db",
      text: isDark ? "#fdf5ff" : "#5c4d68",
    };
  }

  createChartBlock(title) {
    const blockElement = document.createElement("div");
    blockElement.className = "chart-block";
    blockElement.innerHTML = `
      ${title ? `<div class="chart-title">${title}</div>` : ""}
      <div class="chart-scroll-wrapper">
        <div class="chart-inner-wrapper">
          <canvas></canvas>
        </div>
      </div>`;
    this.chartsContainer.appendChild(blockElement);
    return blockElement.querySelector("canvas").getContext("2d");
  }

  buildAnnotationsForHormone(
    hormone,
    showE2Target,
    showTTarget,
    e2Min,
    e2Max,
    tMin,
    tMax,
  ) {
    const annotations = {};

    if ((hormone === "Estradiol" || hormone === "both") && showE2Target) {
      if (!isNaN(e2Min) && !isNaN(e2Max)) {
        annotations.e2Box = {
          type: "box",
          yMin: e2Min,
          yMax: e2Max,
          backgroundColor: "rgba(255, 175, 204, 0.1)",
          borderColor: "transparent",
          drawTime: "beforeDatasetsDraw",
        };
        annotations.e2MinLine = {
          type: "line",
          yMin: e2Min,
          yMax: e2Min,
          borderColor: "rgba(255, 175, 204, 0.5)",
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: "E2 Min",
            position: "start",
            backgroundColor: "rgba(255, 175, 204, 0.8)",
            color: "#fff",
            font: { size: 10 },
          },
        };
        annotations.e2MaxLine = {
          type: "line",
          yMin: e2Max,
          yMax: e2Max,
          borderColor: "rgba(255, 175, 204, 0.5)",
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: "E2 Max",
            position: "start",
            backgroundColor: "rgba(255, 175, 204, 0.8)",
            color: "#fff",
            font: { size: 10 },
          },
        };
      }
    }

    if ((hormone === "Testosterone" || hormone === "both") && showTTarget) {
      if (!isNaN(tMin) && !isNaN(tMax)) {
        annotations.tBox = {
          type: "box",
          yMin: tMin,
          yMax: tMax,
          backgroundColor: "rgba(162, 210, 255, 0.1)",
          borderColor: "transparent",
          drawTime: "beforeDatasetsDraw",
        };
        annotations.tMinLine = {
          type: "line",
          yMin: tMin,
          yMax: tMin,
          borderColor: "rgba(162, 210, 255, 0.5)",
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: "T Min",
            position: "end",
            backgroundColor: "rgba(162, 210, 255, 0.8)",
            color: "#fff",
            font: { size: 10 },
          },
        };
        annotations.tMaxLine = {
          type: "line",
          yMin: tMax,
          yMax: tMax,
          borderColor: "rgba(162, 210, 255, 0.5)",
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: "T Max",
            position: "end",
            backgroundColor: "rgba(162, 210, 255, 0.8)",
            color: "#fff",
            font: { size: 10 },
          },
        };
      }
    }
    return annotations;
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getChartConfig(labels, datasets, themeColors, showLegend, annotations = {}) {
    return {
      type: "line",
      data: {
        labels,
        datasets: datasets.map((dataset, index) => ({
          label: `${dataset.label} (${dataset.unit})`,
          data: dataset.data,
          borderColor:
            dataset.color || COLOR_PALETTE[index % COLOR_PALETTE.length],
          backgroundColor: this.hexToRgba(
            dataset.color || COLOR_PALETTE[index % COLOR_PALETTE.length],
            0.1,
          ),
          fill: true,
          tension: 0.4,
          pointRadius: labels.length > 100 ? 0 : 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: showLegend, labels: { color: themeColors.text } },
          annotation: { annotations },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${Math.round(context.raw)}`,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text:
                this.chartTimeUnitElement.value === "hours" ? "Hours" : "Days",
              color: themeColors.text,
            },
            grid: { color: themeColors.grid },
            ticks: {
              color: themeColors.text,
              maxTicksLimit: 10,
              callback: (value, index) => labels[index].replace(/[DH]\s*/, ""),
            },
          },
          y: {
            grid: { color: themeColors.grid },
            ticks: { color: themeColors.text },
            beginAtZero: true,
          },
        },
      },
    };
  }

  renderSimulationCharts(
    labels,
    datasets,
    showSplitCharts,
    showE2Target,
    showTTarget,
    e2Min,
    e2Max,
    tMin,
    tMax,
  ) {
    this.destroyAll();
    const themeColors = this.getThemeColors();

    if (showSplitCharts) {
      datasets.forEach((dataset) => {
        const context = this.createChartBlock(
          `${dataset.label} (${dataset.unit})`,
        );
        const annotations = this.buildAnnotationsForHormone(
          dataset.label,
          showE2Target,
          showTTarget,
          e2Min,
          e2Max,
          tMin,
          tMax,
        );
        const chart = new Chart(
          context,
          this.getChartConfig(
            labels,
            [dataset],
            themeColors,
            false,
            annotations,
          ),
        );
        this.activeCharts.push(chart);
      });
    } else {
      const context = this.createChartBlock();
      const annotations = this.buildAnnotationsForHormone(
        "both",
        showE2Target,
        showTTarget,
        e2Min,
        e2Max,
        tMin,
        tMax,
      );
      const chart = new Chart(
        context,
        this.getChartConfig(labels, datasets, themeColors, true, annotations),
      );
      this.activeCharts.push(chart);
    }
  }

  renderTripChart(
    canvasElement,
    labels,
    originalLevels,
    adjustedLevels,
    tripStartLabel,
    tripEndLabel,
    annotations,
    bloodUnit,
    themeColors,
  ) {
    if (this.tripChart) this.tripChart.destroy();

    const tripAnnotations = {
      tripBox: {
        type: "box",
        xMin: tripStartLabel,
        xMax: tripEndLabel,
        backgroundColor: "transparent",
        borderColor: "var(--pink-orchid)",
        borderWidth: 2,
        borderDash: [5, 5],
        drawTime: "beforeDatasetsDraw",
      },
    };
    Object.assign(tripAnnotations, annotations);

    this.tripChart = new Chart(canvasElement.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Original Level",
            data: originalLevels,
            borderColor: "#999",
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.4,
          },
          {
            label: "Adjusted Level",
            data: adjustedLevels,
            borderColor: COLOR_PALETTE[0],
            fill: false,
            pointRadius: 0,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: themeColors.text } },
          annotation: { annotations: tripAnnotations },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${Math.round(context.raw)} ${bloodUnit || ""}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: themeColors.text, maxTicksLimit: 10 } },
          y: {
            beginAtZero: false,
            title: { display: true, text: bloodUnit, color: themeColors.text },
            ticks: { color: themeColors.text },
          },
        },
      },
    });
  }

  destroyTripChart() {
    if (this.tripChart) {
      this.tripChart.destroy();
      this.tripChart = null;
    }
  }
}
