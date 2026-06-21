import { ThemeManager } from "./modules/theme.js";
import { SUBSTANCES } from "./modules/substances.js";
import {
  parseDateLocal,
  getDayOffset,
  getDateFromOffset,
} from "./modules/dateUtils.js";
import {
  calculateProtocolLevels,
  simulateHpgAxisFeedback,
} from "./modules/pkEngine.js";
import { ChartManager } from "./modules/chartManager.js";
import { Protocol } from "./modules/protocol.js";
import { TripPlanner } from "./modules/tripPlanner.js";

class SimulationApp {
  constructor() {
    this.themeManager = new ThemeManager(
      document.getElementById("themeToggle"),
    );

    this.cacheElements();
    this.protocols = [];
    this.lastSex = this.elements.biologicalSex.value;

    this.chartManager = new ChartManager(
      document.getElementById("chartsContainer"),
      this.elements.chartTimeUnit,
    );

    this.tripPlanner = new TripPlanner({
      elements: this.elements,
      getProtocols: () => this.protocols,
      addProtocol: (data) => this.addProtocol(data),
      updateSimulation: () => this.updateSimulation(),
      chartManager: this.chartManager,
    });

    this.init();
  }

  cacheElements() {
    const byId = (id) => document.getElementById(id);
    this.elements = {
      protocolsList: byId("protocolsList"),
      addProtocol: byId("addProtocol"),
      resetSimulation: byId("resetSimulation"),
      cycleLength: byId("cycleLength"),
      weightKg: byId("weightKg"),
      steadyState: byId("steadyState"),
      biologicalSex: byId("biologicalSex"),
      chartTimeUnit: byId("chartTimeUnit"),
      startDate: byId("startDate"),
      splitCharts: byId("splitCharts"),
      showE2: byId("showE2"),
      showT: byId("showT"),
      showE2Target: byId("showE2Target"),
      showTTarget: byId("showTTarget"),
      e2TargetMin: byId("e2TargetMin"),
      e2TargetMax: byId("e2TargetMax"),
      tTargetMin: byId("tTargetMin"),
      tTargetMax: byId("tTargetMax"),
      useCalibration: byId("useCalibration"),
      e2Measured: byId("e2Measured"),
      tMeasured: byId("tMeasured"),
      calibrationSection: byId("calibrationSection"),
      calibrationResults: byId("calibrationResults"),
      tripStart: byId("tripStart"),
      tripEnd: byId("tripEnd"),
      tripProtocolSelect: byId("tripProtocolSelect"),
      tripMode: byId("tripMode"),
      calculateTrip: byId("calculateTrip"),
      tripPlanResult: byId("tripPlanResult"),
      tripSuggestionText: byId("tripSuggestionText"),
      applyTripPlan: byId("applyTripPlan"),
      revertTripPlan: byId("revertTripPlan"),
      tripModal: byId("tripModal"),
      closeTripModal: byId("closeTripModal"),
      modalCloseBtn: byId("modalCloseBtn"),
      modalApplyTrip: byId("modalApplyTrip"),
      tripModalSuggestion: byId("tripModalSuggestion"),
      showModalE2Target: byId("showModalE2Target"),
      showModalTTarget: byId("showModalTTarget"),
      tripDatesList: byId("tripDatesList"),
      chartsContainer: byId("chartsContainer"),
    };
  }

  init() {
    this.bindGlobalEvents();
    if (!this.loadState()) {
      this.addProtocol();
      this.applyTargetDefaults();
    }
    this.updateTripProtocolSelect();
    this.updateSimulation();
  }

  bindGlobalEvents() {
    this.elements.addProtocol.addEventListener("click", () =>
      this.addProtocol(),
    );
    this.elements.resetSimulation.addEventListener("click", () =>
      this.resetSimulation(),
    );

    const triggerUpdate = (id) => (event) => {
      if (id === "biologicalSex") {
        if (event.target.value !== this.lastSex) {
          this.applyTargetDefaults();
          this.lastSex = event.target.value;
        }
      }
      if (id === "useCalibration") {
        this.elements.calibrationSection.style.display = event.target.checked
          ? "block"
          : "none";
        this.elements.weightKg.closest(".input-group").style.opacity = event
          .target.checked
          ? "0.5"
          : "1";
        this.elements.weightKg.disabled = event.target.checked;
      }
      this.updateSimulation();
    };

    const inputIds = [
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
    ];

    inputIds.forEach((id) => {
      this.elements[id].addEventListener("change", triggerUpdate(id));
      this.elements[id].addEventListener("input", () =>
        this.updateSimulation(),
      );
    });
  }

  addProtocol(serializedData = null) {
    const protocol = new Protocol(
      serializedData,
      () => {
        this.updateTripProtocolSelect();
        this.updateSimulation();
      },
      (protocolId) => this.removeProtocol(protocolId),
    );

    if (!serializedData) {
      protocol.intervalInput.value = "7";
    }

    this.protocols.push(protocol);
    this.elements.protocolsList.appendChild(protocol.container);
    this.updateProtocolNumbers();
    this.updateSimulation();
  }

  removeProtocol(protocolId) {
    const index = this.protocols.findIndex((p) => p.id === protocolId);
    if (index !== -1) {
      this.protocols[index].destroy();
      this.protocols.splice(index, 1);
      this.updateProtocolNumbers();
      this.updateSimulation();
    }
  }

  applyTargetDefaults() {
    const isAmab = this.elements.biologicalSex.value === "amab";
    if (isAmab) {
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
    this.protocols.forEach((p, index) => {
      p.titleElement.textContent = `Protocol ${index + 1}`;
      p.removeButton.disabled = this.protocols.length === 1;
    });
    this.updateTripProtocolSelect();
  }

  updateTripProtocolSelect() {
    const select = this.elements.tripProtocolSelect;
    const currentValue = select.value;
    select.innerHTML = "";

    this.protocols.forEach((p, index) => {
      const option = document.createElement("option");
      option.value = p.id;
      const hormone =
        SUBSTANCES[p.categorySelect.value]?.categoryName || "Unknown";
      const ester = p.getSelectedEsterParams()?.name || "Unknown";
      option.textContent = `Protocol ${index + 1}: ${hormone} (${ester})`;
      select.appendChild(option);
    });

    if (
      currentValue &&
      Array.from(select.options).some((o) => o.value === currentValue)
    ) {
      select.value = currentValue;
    } else if (select.options.length > 0) {
      select.selectedIndex = 0;
    }
  }

  resetSimulation() {
    if (confirm("Reset ALL settings?")) {
      localStorage.removeItem("dosecalcSimulationState");
      location.reload();
    }
  }

  buildLabels(totalDays, outputStep) {
    const labels = [];
    for (let t = 0; t <= totalDays + 0.0001; t += outputStep) {
      labels.push(
        outputStep < 1 ? `H ${Math.round(t * 24)}` : `D ${Math.round(t)}`,
      );
    }
    return labels;
  }

  updateSimulation() {
    this.saveState();
    const totalDays = parseInt(this.elements.cycleLength.value) || 30;
    const outputStep =
      this.elements.chartTimeUnit.value === "hours" ? 1 / 24 : 1;
    const labels = this.buildLabels(totalDays, outputStep);
    const weightKg = parseFloat(this.elements.weightKg.value) || 70;
    const isAmab = this.elements.biologicalSex.value === "amab";
    const useSteadyState = this.elements.steadyState.checked;
    const useCalibration = this.elements.useCalibration.checked;

    const sampleCount = labels.length;
    const exogenousE2 = new Array(sampleCount).fill(0);
    const exogenousT = new Array(sampleCount).fill(0);
    const blockerEffect = new Array(sampleCount).fill(0);

    this.protocols.forEach((protocol) => {
      const catKey = protocol.getHormoneCategoryKey();
      const esterParams = protocol.getSelectedEsterParams();
      if (!esterParams) return;

      const doseEvents = protocol.buildDoseEvents(
        totalDays,
        this.elements.startDate.value,
      );
      if (doseEvents.length === 0) return;

      if (catKey === "androgen-blockers") {
        const blockerLevels = calculateProtocolLevels(
          esterParams,
          totalDays,
          doseEvents,
          weightKg,
          outputStep,
          useSteadyState,
          protocol.getDoseAmount(),
        );
        blockerLevels.forEach((level, i) => {
          const currentSuppression =
            1 -
            Math.pow(
              1 - esterParams.suppressionFactor,
              level / (esterParams.defaultDose || 10),
            );
          blockerEffect[i] =
            1 -
            (1 - blockerEffect[i]) * (1 - Math.min(0.99, currentSuppression));
        });
        return;
      }

      const levels = calculateProtocolLevels(
        esterParams,
        totalDays,
        doseEvents,
        useCalibration ? 70 : weightKg,
        outputStep,
        useSteadyState,
        protocol.getDoseAmount(),
      );

      const targetArray = catKey === "testosterone" ? exogenousT : exogenousE2;
      levels.forEach((level, i) => (targetArray[i] += level));
    });

    let e2CalibrationFactor = 1.0;
    let tCalibrationFactor = 1.0;
    let calibrationLog = "";

    if (useCalibration) {
      const e2Measured = parseFloat(this.elements.e2Measured.value);
      if (!isNaN(e2Measured) && exogenousE2[0] > 0) {
        e2CalibrationFactor = e2Measured / exogenousE2[0];
        calibrationLog += `Effective weight (E2): ${Math.round(70 / e2CalibrationFactor)}kg. `;
      }
      const tMeasured = parseFloat(this.elements.tMeasured.value);
      if (!isNaN(tMeasured) && exogenousT[0] > 0) {
        tCalibrationFactor = tMeasured / exogenousT[0];
        calibrationLog += `Effective weight (T): ${Math.round(70 / tCalibrationFactor)}kg. `;
      }

      exogenousE2.forEach((v, i) => (exogenousE2[i] = v * e2CalibrationFactor));
      exogenousT.forEach((v, i) => (exogenousT[i] = v * tCalibrationFactor));
    }
    this.elements.calibrationResults.textContent = calibrationLog;

    const { finalE2, finalT } = simulateHpgAxisFeedback(
      exogenousE2,
      exogenousT,
      blockerEffect,
      isAmab,
      outputStep,
      useSteadyState,
    );

    const datasets = [];
    if (this.elements.showE2.checked) {
      datasets.push({
        label: "Estradiol",
        unit: "pg/mL",
        data: finalE2,
        color: "#ffafcc",
      });
    }
    if (this.elements.showT.checked) {
      datasets.push({
        label: "Testosterone",
        unit: "ng/dL",
        data: finalT,
        color: "#a2d2ff",
      });
    }

    this.chartManager.renderSimulationCharts(
      labels,
      datasets,
      this.elements.splitCharts.checked,
      this.elements.showE2Target.checked,
      this.elements.showTTarget.checked,
      parseFloat(this.elements.e2TargetMin.value),
      parseFloat(this.elements.e2TargetMax.value),
      parseFloat(this.elements.tTargetMin.value),
      parseFloat(this.elements.tTargetMax.value),
    );
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
      protocols: this.protocols.map((p) => p.serialize()),
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
      this.elements.calibrationSection.style.display = state.useCalibration
        ? "block"
        : "none";
      this.elements.weightKg.disabled = state.useCalibration || false;
      if (this.elements.weightKg.closest(".input-group")) {
        this.elements.weightKg.closest(".input-group").style.opacity =
          state.useCalibration ? "0.5" : "1";
      }

      this.lastSex = this.elements.biologicalSex.value;

      if (state.protocols) {
        state.protocols.forEach((pData) => this.addProtocol(pData));
      }
      return !!(state.protocols && state.protocols.length);
    } catch (e) {
      return false;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => new SimulationApp());
