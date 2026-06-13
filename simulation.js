class SimulationApp {
  constructor() {
    this.substances = {
      estradiol: {
        categoryName: "Estradiol",
        unit: "mg",
        bloodUnit: "pg/mL",
        esters: {
          benzoate: {
            name: "Estradiol Benzoate",
            ka: 2.5,
            ke: 0.55,
            scale: 195,
            defaultDose: 1,
          },
          valerate: {
            name: "Estradiol Valerate",
            ka: 0.75,
            ke: 0.23,
            scale: 59,
            defaultDose: 4,
          },
          cypionate: {
            name: "Estradiol Cypionate",
            ka: 0.4,
            ke: 0.1,
            scale: 28.0,
            defaultDose: 5,
          },
          enanthate: {
            name: "Estradiol Enanthate",
            ka: 0.45,
            ke: 0.1,
            scale: 29.0,
            defaultDose: 5,
          },
          undecylate: {
            name: "Estradiol Undecylate",
            ka: 0.26,
            ke: 0.033,
            scale: 10.6,
            defaultDose: 15,
          },
        },
      },
      testosterone: {
        categoryName: "Testosterone",
        unit: "mg",
        bloodUnit: "ng/dL",
        esters: {
          cypionate: {
            name: "Testosterone Cypionate",
            ka: 0.098,
            ke: 1,
            scale: 4.3,
            defaultDose: 100,
          },
          enanthate: {
            name: "Testosterone Enanthate",
            ka: 2.44,
            ke: 0.18,
            scale: 5.25,
            defaultDose: 100,
          },
          undecanoate: {
            name: "Testosterone Undecanoate",
            ka: 4.537292,
            ke: 0.024048,
            scale: 5.279689,
            defaultDose: 200,
          },
        },
      },
    };
    this.protocols = [];
    this.charts = [];
    this.colorPalette = [
      "#ffafcc",
      "#a2d2ff",
      "#cdb4db",
      "#bde0fe",
      "#ffcad4",
      "#9bf6ff",
      "#ffc8dd",
    ];
    this.elements = {
      protocolsList: document.getElementById("protocolsList"),
      addProtocol: document.getElementById("addProtocol"),
      resetSimulation: document.getElementById("resetSimulation"),
      cycleLength: document.getElementById("cycleLength"),
      weightKg: document.getElementById("weightKg"),
      steadyState: document.getElementById("steadyState"),
      biologicalSex: document.getElementById("biologicalSex"),
      chartTimeUnit: document.getElementById("chartTimeUnit"),
      startDate: document.getElementById("startDate"),
      splitCharts: document.getElementById("splitCharts"),
      showE2: document.getElementById("showE2"),
      showT: document.getElementById("showT"),
      showE2Target: document.getElementById("showE2Target"),
      showTTarget: document.getElementById("showTTarget"),
      e2TargetMin: document.getElementById("e2TargetMin"),
      e2TargetMax: document.getElementById("e2TargetMax"),
      tTargetMin: document.getElementById("tTargetMin"),
      tTargetMax: document.getElementById("tTargetMax"),
      useCalibration: document.getElementById("useCalibration"),
      e2Measured: document.getElementById("e2Measured"),
      tMeasured: document.getElementById("tMeasured"),
      calibrationSection: document.getElementById("calibrationSection"),
      calibrationResults: document.getElementById("calibrationResults"),
      chartsContainer: document.getElementById("chartsContainer"),
    };
    this.themeManager = new ThemeManager(
      document.getElementById("themeToggle"),
    );
    this.lastSex = this.elements.biologicalSex.value;
    this.init();
  }

  init() {
    this.bindGlobalEvents();
    if (!this.loadState()) {
      this.addProtocol();
      this.applyTargetDefaults();
    }
    this.updateSimulation();
  }

  bindGlobalEvents() {
    this.elements.addProtocol.onclick = () => this.addProtocol();
    this.elements.resetSimulation.onclick = () => this.resetSimulation();
    [
      "cycleLength",
      "weightKg",
      "steadyState",
      "startDate",
      "biologicalSex",
      "chartTimeUnit",
      "splitCharts",
      "showE2",
      "showT",
      "showE2Target",
      "showTTarget",
      "e2TargetMin",
      "e2TargetMax",
      "tTargetMin",
      "tTargetMax",
      "useCalibration",
      "e2Measured",
      "tMeasured",
    ].forEach((id) => {
      this.elements[id].onchange = () => {
        if (id === "biologicalSex") {
          if (this.elements.biologicalSex.value !== this.lastSex) {
            this.applyTargetDefaults();
            this.lastSex = this.elements.biologicalSex.value;
          }
        }
        if (id === "useCalibration") {
          this.elements.calibrationSection.style.display = this.elements
            .useCalibration.checked
            ? "block"
            : "none";
          this.elements.weightKg.closest(".input-group").style.opacity = this
            .elements.useCalibration.checked
            ? "0.5"
            : "1";
          this.elements.weightKg.disabled =
            this.elements.useCalibration.checked;
        }
        this.updateSimulation();
      };
      this.elements[id].oninput = () => this.updateSimulation();
    });
    document
      .getElementById("themeToggle")
      .addEventListener("click", () =>
        setTimeout(() => this.updateSimulation(), 50),
      );
  }

  addProtocol(data = null) {
    const p = this.createProtocol(data);
    this.protocols.push(p);
    this.elements.protocolsList.appendChild(p.container);
    this.updateProtocolNumbers();
    this.updateSimulation();
  }

  removeProtocol(id) {
    const idx = this.protocols.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.protocols[idx].container.remove();
      this.protocols.splice(idx, 1);
      this.updateProtocolNumbers();
      this.updateSimulation();
    }
  }

  applyTargetDefaults() {
    const isAMAB = this.elements.biologicalSex.value === "amab";
    if (isAMAB) {
      this.elements.e2TargetMin.value = 150;
      this.elements.e2TargetMax.value = 400;
      this.elements.tTargetMin.value = 10;
      this.elements.tTargetMax.value = 50;
    } else {
      this.elements.e2TargetMin.value = 20;
      this.elements.e2TargetMax.value = 50;
      this.elements.tTargetMin.value = 400;
      this.elements.tTargetMax.value = 700;
    }
  }

  updateProtocolNumbers() {
    this.protocols.forEach((p, i) => {
      p.title.textContent = `Protocol ${i + 1}`;
      p.removeBtn.disabled = this.protocols.length === 1;
    });
  }

  createProtocol(data = null) {
    const id = `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const container = document.createElement("div");
    container.className = "protocol-card";
    container.innerHTML = `
      <div class="protocol-header"><h3>Protocol</h3><button class="ghost-button" type="button" data-role="remove">Remove</button></div>
      <div class="input-row">
        <div class="input-group"><label>Hormone</label><select data-role="category"></select></div>
        <div class="input-group"><label>Form</label><select data-role="type"></select></div>
      </div>
      <div class="input-row">
        <div class="input-group"><label>Dose (mg)</label><input type="number" data-role="dose" step="0.1" value="5" /></div>
        <div class="input-group"><label>Every</label><input type="number" data-role="interval" value="5" /></div>
        <div class="input-group"><label>Unit</label><select data-role="interval-unit"><option value="days">days</option><option value="hours">hours</option></select></div>
      </div>
      <div class="input-row"><label class="toggle"><input type="checkbox" data-role="custom-toggle" /> Custom schedule</label></div>
      <div class="custom-schedule"><div class="custom-schedule-header"><span>Doses</span><button type="button" data-role="add-custom">Add</button></div><div data-role="custom-list"></div></div>
    `;

    const p = {
      id,
      container,
      title: container.querySelector("h3"),
      categorySelect: container.querySelector('[data-role="category"]'),
      typeSelect: container.querySelector('[data-role="type"]'),
      doseAmount: container.querySelector('[data-role="dose"]'),
      doseInterval: container.querySelector('[data-role="interval"]'),
      intervalUnit: container.querySelector('[data-role="interval-unit"]'),
      customToggle: container.querySelector('[data-role="custom-toggle"]'),
      customList: container.querySelector('[data-role="custom-list"]'),
      addCustomBtn: container.querySelector('[data-role="add-custom"]'),
      removeBtn: container.querySelector('[data-role="remove"]'),
    };

    this.populateCategorySelect(p.categorySelect);
    if (data) {
      p.categorySelect.value = data.category;
      this.updateTypeOptions(p);
      p.typeSelect.value = data.type;
      p.doseAmount.value = data.dose;
      p.doseInterval.value = data.interval;
      p.intervalUnit.value = data.intervalUnit;
      p.customToggle.checked = data.customToggle;
      p.container.classList.toggle("protocol-card--custom", data.customToggle);
      if (data.customDoses)
        data.customDoses.forEach((cd) => this.addCustomDoseRow(p, cd));
    } else {
      this.updateTypeOptions(p);
      p.doseInterval.value = "7";
    }

    p.categorySelect.onchange = () => {
      this.updateTypeOptions(p);
      this.updateSimulation();
    };
    p.typeSelect.onchange = () => this.updateSimulation();
    p.doseAmount.oninput = () => this.updateSimulation();
    p.doseInterval.oninput = () => this.updateSimulation();
    p.intervalUnit.onchange = () => this.updateSimulation();
    p.customToggle.onchange = (e) => {
      p.container.classList.toggle("protocol-card--custom", e.target.checked);
      this.updateSimulation();
    };
    p.addCustomBtn.onclick = () => {
      this.addCustomDoseRow(p);
      this.updateSimulation();
    };
    p.removeBtn.onclick = () => this.removeProtocol(p.id);

    return p;
  }

  populateCategorySelect(select) {
    select.innerHTML = "";
    Object.keys(this.substances).forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = this.substances[k].categoryName || k;
      select.appendChild(opt);
    });
  }

  updateTypeOptions(p) {
    const cat = this.substances[p.categorySelect.value];
    p.typeSelect.innerHTML = "";
    if (!cat || !cat.esters) return;
    Object.keys(cat.esters).forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = cat.esters[k].name;
      p.typeSelect.appendChild(opt);
    });
  }

  updateProtocolDetails(p) {
    const type =
      this.substances[p.categorySelect.value]?.esters?.[p.typeSelect.value];
    if (type) p.doseAmount.value = type.defaultDose ?? "5";
  }

  addCustomDoseRow(p, vals = {}) {
    const row = document.createElement("div");
    row.className = "custom-dose-row";
    row.innerHTML = `<input type="text" data-role="day" placeholder="Day or Date (dd/mm/yyyy)" /><input type="number" data-role="dose" step="0.1" /><button type="button">✕</button>`;
    const dIn = row.querySelector('[data-role="day"]'),
      vIn = row.querySelector('[data-role="dose"]');
    if (vals.day) dIn.value = vals.day;
    if (vals.dose) vIn.value = vals.dose;
    dIn.oninput = () => this.updateSimulation();
    vIn.oninput = () => this.updateSimulation();
    row.querySelector("button").onclick = () => {
      row.remove();
      this.updateSimulation();
    };
    p.customList.appendChild(row);
  }

  calculateProtocolLevels(
    params,
    totalDays,
    doseEvents,
    weightKg,
    outputStep,
    protocolInterval,
  ) {
    const sampleCount = Math.floor(totalDays / outputStep) + 1;
    const data = new Array(sampleCount).fill(0);
    const ka = params.ka,
      ke = params.ke,
      scale = params.scale;
    const weightFactor = 70 / weightKg;

    let extendedEvents = [...doseEvents];
    if (this.elements.steadyState.checked) {
      const firstEvent = doseEvents[0];
      const interval = protocolInterval || 7;
      for (let i = 1; i <= 50; i++) {
        extendedEvents.push({ time: -i * interval, dose: firstEvent.dose });
      }
    }

    for (let i = 0; i < sampleCount; i++) {
      const t = i * outputStep;
      let total = 0;
      extendedEvents.forEach((e) => {
        const dt = t - e.time;
        if (dt > 0 && dt < 150) {
          let val = 0;
          if (params.type === "continuous") {
            val = scale * e.dose * Math.exp(-ke * dt);
          } else {
            const tPeak = Math.log(ka / ke) / (ka - ke);
            const fMax = Math.exp(-ke * tPeak) - Math.exp(-ka * tPeak);
            val = (Math.exp(-ke * dt) - Math.exp(-ka * dt)) / fMax;
            val = val * e.dose * scale;
          }
          total += val * weightFactor;
        }
      });
      data[i] = total;
    }
    return data;
  }

  updateSimulation() {
    this.saveState();
    const totalDays = parseInt(this.elements.cycleLength.value) || 30;
    const outputStep =
      this.elements.chartTimeUnit.value === "hours" ? 1 / 24 : 1;
    const labels = this.buildLabels(totalDays, outputStep);
    const weightKg = parseFloat(this.elements.weightKg.value) || 70;
    const biologicalSex = this.elements.biologicalSex.value;
    const isAMAB = biologicalSex === "amab";

    const sampleCount = labels.length;
    const exoE2 = new Array(sampleCount).fill(0),
      exoT = new Array(sampleCount).fill(0);
    const blockerEffect = new Array(sampleCount).fill(0);

    this.protocols.forEach((p) => {
      const catKey = p.categorySelect.value;
      const type = this.substances[catKey]?.esters?.[p.typeSelect.value];
      if (!type) return;
      const events = this.buildDoseEvents(p, totalDays);
      if (events.length === 0) return;

      if (catKey === "androgen-blockers") {
        const blockerLevels = this.calculateProtocolLevels(
          type,
          totalDays,
          events,
          weightKg,
          outputStep,
        );
        blockerLevels.forEach((v, i) => {
          const currentSup =
            1 -
            Math.pow(1 - type.suppressionFactor, v / (type.defaultDose || 10));
          blockerEffect[i] =
            1 - (1 - blockerEffect[i]) * (1 - Math.min(0.99, currentSup));
        });
        return;
      }

      const levels = this.calculateProtocolLevels(
        type,
        totalDays,
        events,
        this.elements.useCalibration.checked ? 70 : weightKg,
        outputStep,
        parseFloat(p.doseInterval.value),
      );
      const target = catKey === "testosterone" ? exoT : exoE2;
      levels.forEach((v, i) => (target[i] += v));
    });

    let e2CalibFactor = 1.0,
      tCalibFactor = 1.0;
    let calibrationLog = "";

    if (this.elements.useCalibration.checked) {
      const e2M = parseFloat(this.elements.e2Measured.value);
      if (!isNaN(e2M) && exoE2[0] > 0) {
        e2CalibFactor = e2M / exoE2[0];
        const effWeight = Math.round(70 / e2CalibFactor);
        calibrationLog += `Effective weight (E2): ${effWeight}kg. `;
      }
      const tM = parseFloat(this.elements.tMeasured.value);
      if (!isNaN(tM) && exoT[0] > 0) {
        tCalibFactor = tM / exoT[0];
        const effWeight = Math.round(70 / tCalibFactor);
        calibrationLog += `Effective weight (T): ${effWeight}kg. `;
      }

      exoE2.forEach((v, i) => (exoE2[i] = v * e2CalibFactor));
      exoT.forEach((v, i) => (exoT[i] = v * tCalibFactor));
    }
    this.elements.calibrationResults.textContent = calibrationLog;

    const baseE2 = isAMAB ? 20 : 100,
      baseT = isAMAB ? 500 : 35;
    const finalE = new Array(sampleCount),
      finalT = new Array(sampleCount);

    let hpgSuppressionLevel = 1.0;
    const inertia = 0.05;

    if (this.elements.steadyState.checked) {
      const initialE2 = exoE2[0] || 0;
      const initialT = exoT[0] || 0;
      hpgSuppressionLevel = isAMAB
        ? 1 / (1 + Math.pow(initialE2 / 100, 3.0))
        : 1 / (1 + Math.pow(initialT / 300, 2.5));
    }

    for (let i = 0; i < sampleCount; i++) {
      const curE2 = exoE2[i];
      const curT = exoT[i];

      const stepsIn24h = Math.round(1 / outputStep);
      let sumE2 = 0,
        sumT = 0,
        count = 0;
      for (let j = Math.max(0, i - stepsIn24h); j <= i; j++) {
        sumE2 += exoE2[j] || 0;
        sumT += exoT[j] || 0;
        count++;
      }
      const smoothedE2 = count > 0 ? sumE2 / count : curE2;

      if (isAMAB) {
        const targetSuppression = 1 / (1 + Math.pow(smoothedE2 / 100, 3.0));
        hpgSuppressionLevel = this.elements.steadyState.checked
          ? targetSuppression
          : hpgSuppressionLevel +
            (targetSuppression - hpgSuppressionLevel) * inertia;

        finalE[i] = Math.round(baseE2 + curE2);

        const adrenalT = 20;
        const gonadalT =
          (baseT - adrenalT) * hpgSuppressionLevel * (1 - blockerEffect[i]);
        finalT[i] = Math.round(gonadalT + curT + adrenalT);
      } else {
        if (typeof hpgSuppressionLevel === "undefined")
          hpgSuppressionLevel = 1.0;
        const targetSuppression = 1 / (1 + Math.pow(curT / 300, 2.5));
        hpgSuppressionLevel = this.elements.steadyState.checked
          ? targetSuppression
          : hpgSuppressionLevel +
            (targetSuppression - hpgSuppressionLevel) * inertia;

        finalT[i] = Math.round(baseT + curT);
        finalE[i] = Math.round(baseE2 * hpgSuppressionLevel + curE2);
      }
    }
    const datasets = [];
    if (this.elements.showE2.checked) {
      datasets.push({
        label: "Estradiol",
        unit: "pg/mL",
        data: finalE,
        color: this.colorPalette[0],
      });
    }
    if (this.elements.showT.checked) {
      datasets.push({
        label: "Testosterone",
        unit: "ng/dL",
        data: finalT,
        color: this.colorPalette[1],
      });
    }

    this.updateCharts(labels, datasets);
  }

  saveState() {
    const state = {
      cycleLength: this.elements.cycleLength.value,
      weightKg: this.elements.weightKg.value,
      steadyState: this.elements.steadyState.checked,
      biologicalSex: this.elements.biologicalSex.value,
      chartTimeUnit: this.elements.chartTimeUnit.value,
      startDate: this.elements.startDate.value,
      splitCharts: this.elements.splitCharts.checked,
      showE2: this.elements.showE2.checked,
      showT: this.elements.showT.checked,
      showE2Target: this.elements.showE2Target.checked,
      showTTarget: this.elements.showTTarget.checked,
      e2TargetMin: this.elements.e2TargetMin.value,
      e2TargetMax: this.elements.e2TargetMax.value,
      tTargetMin: this.elements.tTargetMin.value,
      tTargetMax: this.elements.tTargetMax.value,
      useCalibration: this.elements.useCalibration.checked,
      e2Measured: this.elements.e2Measured.value,
      tMeasured: this.elements.tMeasured.value,
      protocols: this.protocols.map((p) => ({
        category: p.categorySelect.value,
        type: p.typeSelect.value,
        dose: p.doseAmount.value,
        interval: p.doseInterval.value,
        intervalUnit: p.intervalUnit.value,
        customToggle: p.customToggle.checked,
        customDoses: Array.from(
          p.customList.querySelectorAll(".custom-dose-row"),
        ).map((row) => ({
          day: row.querySelector('[data-role="day"]').value,
          dose: row.querySelector('[data-role="dose"]').value,
        })),
      })),
    };
    localStorage.setItem("dosecalcSimulationState", JSON.stringify(state));
  }

  loadState() {
    const saved = localStorage.getItem("dosecalcSimulationState");
    if (!saved) return false;
    try {
      const state = JSON.parse(saved);
      this.elements.cycleLength.value = state.cycleLength || 30;
      this.elements.weightKg.value = state.weightKg || 70;
      this.elements.steadyState.checked = state.steadyState || false;
      this.elements.biologicalSex.value = state.biologicalSex || "amab";
      this.elements.chartTimeUnit.value = state.chartTimeUnit || "days";
      this.elements.startDate.value = state.startDate || "";
      this.elements.splitCharts.checked = state.splitCharts || false;
      this.elements.showE2.checked = state.showE2 ?? true;
      this.elements.showT.checked = state.showT ?? true;
      this.elements.showE2Target.checked = state.showE2Target || false;
      this.elements.showTTarget.checked = state.showTTarget || false;
      this.elements.e2TargetMin.value =
        state.e2TargetMin ??
        (this.elements.biologicalSex.value === "amab" ? 150 : 20);
      this.elements.e2TargetMax.value =
        state.e2TargetMax ??
        (this.elements.biologicalSex.value === "amab" ? 400 : 50);
      this.elements.tTargetMin.value =
        state.tTargetMin ??
        (this.elements.biologicalSex.value === "amab" ? 10 : 400);
      this.elements.tTargetMax.value =
        state.tTargetMax ??
        (this.elements.biologicalSex.value === "amab" ? 50 : 700);
      this.elements.useCalibration.checked = state.useCalibration || false;
      this.elements.e2Measured.value = state.e2Measured || "";
      this.elements.tMeasured.value = state.tMeasured || "";
      this.elements.calibrationSection.style.display = this.elements
        .useCalibration.checked
        ? "block"
        : "none";
      this.elements.weightKg.disabled = this.elements.useCalibration.checked;
      if (this.elements.weightKg.closest(".input-group")) {
        this.elements.weightKg.closest(".input-group").style.opacity = this
          .elements.useCalibration.checked
          ? "0.5"
          : "1";
      }
      this.lastSex = this.elements.biologicalSex.value;
      if (state.protocols)
        state.protocols.forEach((pData) => this.addProtocol(pData));
      return !!(state.protocols && state.protocols.length);
    } catch (e) {
      return false;
    }
  }

  resetSimulation() {
    if (confirm("Reset ALL settings?")) {
      localStorage.removeItem("dosecalcSimulationState");
      location.reload();
    }
  }

  getDayOffset(dateStr) {
    const start = this.elements.startDate.value;
    if (!start || !dateStr) return parseFloat(dateStr) || 0;

    const parseDate = (d) => {
      const parts = d.split("/");
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
      return new Date(d);
    };

    const startDate = parseDate(start);
    const targetDate = parseDate(dateStr);

    if (isNaN(startDate) || isNaN(targetDate)) return parseFloat(dateStr) || 0;

    const diff = targetDate - startDate;
    return Math.max(0, diff / (1000 * 60 * 60 * 24));
  }

  buildDoseEvents(p, totalDays) {
    const events = [];
    const catKey = p.categorySelect.value;
    const type = this.substances[catKey]?.esters?.[p.typeSelect.value];

    if (type?.type === "continuous") {
      const frequency = 8 / 24;
      for (let t = 0; t < totalDays; t += frequency) {
        events.push({ time: t, dose: parseFloat(p.doseAmount.value) / 3 });
      }
    } else if (p.customToggle.checked) {
      p.customList.querySelectorAll(".custom-dose-row").forEach((row) => {
        const dStr = row.querySelector('[data-role="day"]').value,
          v = parseFloat(row.querySelector('[data-role="dose"]').value);
        const d = this.getDayOffset(dStr);
        if (!isNaN(d) && !isNaN(v)) events.push({ time: d, dose: v });
      });
    } else {
      const dose = parseFloat(p.doseAmount.value),
        interval =
          parseFloat(p.doseInterval.value) /
          (p.intervalUnit.value === "hours" ? 24 : 1);
      if (!isNaN(dose) && !isNaN(interval) && interval > 0)
        for (let t = 0; t <= totalDays; t += interval)
          events.push({ time: t, dose });
    }
    return events;
  }

  buildLabels(totalDays, step) {
    const labels = [];
    for (let t = 0; t <= totalDays + 0.0001; t += step)
      labels.push(step < 1 ? `H ${Math.round(t * 24)}` : `D ${Math.round(t)}`);
    return labels;
  }

  updateCharts(labels, datasets) {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    this.elements.chartsContainer.innerHTML = "";
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const colors = {
      grid: isDark ? "#5c4d68" : "#cdb4db",
      text: isDark ? "#fdf5ff" : "#5c4d68",
    };
    const createBlock = (title) => {
      const div = document.createElement("div");
      div.className = "chart-block";
      div.innerHTML = `
        ${title ? `<div class="chart-title">${title}</div>` : ""}
        <div class="chart-scroll-wrapper">
          <div class="chart-inner-wrapper">
            <canvas></canvas>
          </div>
        </div>`;
      this.elements.chartsContainer.appendChild(div);
      return div.querySelector("canvas").getContext("2d");
    };

    const getTargetAnnotations = (hormone) => {
      const ann = {};
      if (
        (hormone === "Estradiol" || hormone === "both") &&
        this.elements.showE2Target.checked
      ) {
        const min = parseFloat(this.elements.e2TargetMin.value);
        const max = parseFloat(this.elements.e2TargetMax.value);
        if (!isNaN(min) && !isNaN(max)) {
          ann.e2Box = {
            type: "box",
            yMin: min,
            yMax: max,
            backgroundColor: "rgba(255, 175, 204, 0.1)",
            borderColor: "transparent",
            drawTime: "beforeDatasetsDraw",
          };
          ann.e2MinLine = {
            type: "line",
            yMin: min,
            yMax: min,
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
          ann.e2MaxLine = {
            type: "line",
            yMin: max,
            yMax: max,
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
      if (
        (hormone === "Testosterone" || hormone === "both") &&
        this.elements.showTTarget.checked
      ) {
        const min = parseFloat(this.elements.tTargetMin.value);
        const max = parseFloat(this.elements.tTargetMax.value);
        if (!isNaN(min) && !isNaN(max)) {
          ann.tBox = {
            type: "box",
            yMin: min,
            yMax: max,
            backgroundColor: "rgba(162, 210, 255, 0.1)",
            borderColor: "transparent",
            drawTime: "beforeDatasetsDraw",
          };
          ann.tMinLine = {
            type: "line",
            yMin: min,
            yMax: min,
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
          ann.tMaxLine = {
            type: "line",
            yMin: max,
            yMax: max,
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
      return ann;
    };

    if (this.elements.splitCharts.checked)
      datasets.forEach((d) => {
        const ctx = createBlock(`${d.label} (${d.unit})`);
        const chart = new Chart(
          ctx,
          this.getChartConfig(
            labels,
            [d],
            colors,
            false,
            getTargetAnnotations(d.label),
          ),
        );
        this.charts.push(chart);
      });
    else {
      const ctx = createBlock();
      const chart = new Chart(
        ctx,
        this.getChartConfig(
          labels,
          datasets,
          colors,
          true,
          getTargetAnnotations("both"),
        ),
      );
      this.charts.push(chart);
    }
  }

  getChartConfig(labels, datasets, colors, showLegend, annotations = {}) {
    return {
      type: "line",
      data: {
        labels,
        datasets: datasets.map((d) => ({
          label: `${d.label} (${d.unit})`,
          data: d.data,
          borderColor: d.color,
          backgroundColor: this.hexToRgba(d.color, 0.1),
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
          legend: { display: showLegend, labels: { color: colors.text } },
          annotation: {
            annotations: annotations,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text:
                this.elements.chartTimeUnit.value === "hours"
                  ? "Hours"
                  : "Days",
              color: colors.text,
            },
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              maxTicksLimit: 10,
              callback: (val, index) => {
                const label = labels[index];
                return label.replace(/[DH]\s*/, "");
              },
            },
          },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text },
            beginAtZero: true,
          },
        },
      },
    };
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

class ThemeManager {
  constructor(btn) {
    this.btn = btn;
    this.isDark = localStorage.getItem("dosecalcTheme") === "dark";
    this.applyTheme();
    this.btn.addEventListener("click", () => {
      this.isDark = !this.isDark;
      this.applyTheme();
    });
  }
  applyTheme() {
    if (this.isDark)
      document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    this.btn.textContent = this.isDark ? "☀️" : "🌙";
    localStorage.setItem("dosecalcTheme", this.isDark ? "dark" : "light");
  }
}

document.addEventListener("DOMContentLoaded", () => new SimulationApp());
