import { ThemeManager } from "./modules/theme.js";
import { DosageCalculator } from "./modules/dosageCalculator.js";
import { SyringeRenderer } from "./modules/syringeRenderer.js";

class CalculatorState {
  constructor() {
    this.syringeUnits = 40;
    this.syringeMl = 1;
    this.concAmount = 40;
    this.concUnit = "mg";
    this.concVol = 1;
    this.vialVol = null;
    this.doseAmount = null;
    this.doseVolume = null;
    this.freq = null;
    this.lastEditedDose = "amount";
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem("dosecalcState");
      if (saved) Object.assign(this, JSON.parse(saved));
    } catch (e) {
      console.error("Could not load state", e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem("dosecalcState", JSON.stringify(this));
    } catch (e) {
      console.error("Could not save state", e);
    }
  }
}

class CalculatorApp {
  constructor() {
    this.state = new CalculatorState();
    this.state.loadFromStorage();

    new ThemeManager(document.getElementById("themeToggle"));

    this.cacheElements();
    this.syringeRenderer = new SyringeRenderer(
      document.getElementById("syringeBarrel"),
      document.getElementById("syringeLiquid"),
      document.getElementById("syringeScale"),
      document.getElementById("syringePlunger"),
    );

    this.syncDomFromState();
    this.bindEvents();
    this.update();
  }

  cacheElements() {
    this.elements = {
      syringeUnits: document.getElementById("syringeUnits"),
      syringeMl: document.getElementById("syringeMl"),
      concAmount: document.getElementById("concentrationAmount"),
      concUnit: document.getElementById("concentrationUnit"),
      concVol: document.getElementById("concentrationVolume"),
      vialVol: document.getElementById("vialVolume"),
      doseAmount: document.getElementById("doseAmount"),
      doseVolume: document.getElementById("doseVolume"),
      freq: document.getElementById("frequency"),
      doseUnitLabel: document.getElementById("doseUnitLabel"),
      resultUnits: document.getElementById("resultUnits"),
      vialLife: document.getElementById("vialLife"),
      syringePreset: document.getElementById("syringePreset"),
      vialPreset: document.getElementById("vialPreset"),
      resetBtn: document.getElementById("resetBtn"),
    };
  }

  syncDomFromState() {
    this.elements.syringeUnits.value = this.state.syringeUnits ?? "";
    this.elements.syringeMl.value = this.state.syringeMl ?? "";
    this.elements.concAmount.value = this.state.concAmount ?? "";
    this.elements.concUnit.value = this.state.concUnit ?? "mg";
    this.elements.concVol.value = this.state.concVol ?? "";
    this.elements.vialVol.value = this.state.vialVol ?? "";
    this.elements.freq.value = this.state.freq ?? "";
    this.elements.doseAmount.value = this.state.doseAmount ?? "";
    this.elements.doseVolume.value = this.state.doseVolume ?? "";
    this.elements.doseUnitLabel.textContent = this.state.concUnit || "mg";
    this.updatePresets();
  }

  updatePresets() {
    const syringeValue = `${this.state.syringeUnits},${this.state.syringeMl}`;
    if (
      Array.from(this.elements.syringePreset.options).some(
        (o) => o.value === syringeValue,
      )
    ) {
      this.elements.syringePreset.value = syringeValue;
    } else {
      this.elements.syringePreset.value = "custom";
    }

    const vialValue = `${this.state.concAmount},${this.state.concUnit},${this.state.concVol}`;
    if (
      Array.from(this.elements.vialPreset.options).some(
        (o) => o.value === vialValue,
      )
    ) {
      this.elements.vialPreset.value = vialValue;
    } else {
      this.elements.vialPreset.value = "custom";
    }
  }

  bindEvents() {
    const createStateUpdater =
      (key, parser = parseFloat) =>
      (event) => {
        const value = parser(event.target.value);
        this.state[key] = isNaN(value) ? null : value;
        this.update();
      };

    this.elements.syringeUnits.addEventListener(
      "input",
      createStateUpdater("syringeUnits"),
    );
    this.elements.syringeMl.addEventListener(
      "input",
      createStateUpdater("syringeMl"),
    );
    this.elements.concAmount.addEventListener(
      "input",
      createStateUpdater("concAmount"),
    );
    this.elements.concVol.addEventListener(
      "input",
      createStateUpdater("concVol"),
    );
    this.elements.vialVol.addEventListener(
      "input",
      createStateUpdater("vialVol"),
    );
    this.elements.freq.addEventListener("input", createStateUpdater("freq"));

    this.elements.syringePreset.addEventListener("change", (event) => {
      if (event.target.value !== "custom") {
        const [units, ml] = event.target.value.split(",");
        this.state.syringeUnits = parseFloat(units);
        this.state.syringeMl = parseFloat(ml);
        this.syncDomFromState();
        this.update();
      }
    });

    this.elements.vialPreset.addEventListener("change", (event) => {
      if (event.target.value !== "custom") {
        const [amount, unit, volume] = event.target.value.split(",");
        this.state.concAmount = parseFloat(amount);
        this.state.concUnit = unit;
        this.state.concVol = parseFloat(volume);
        this.syncDomFromState();
        this.update();
      }
    });

    this.elements.concUnit.addEventListener("change", (event) => {
      this.state.concUnit = event.target.value;
      this.elements.doseUnitLabel.textContent = this.state.concUnit;
      this.update();
    });

    this.elements.doseAmount.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      this.state.doseAmount = isNaN(value) ? null : value;
      this.state.lastEditedDose = "amount";
      this.update();
    });

    this.elements.doseVolume.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      this.state.doseVolume = isNaN(value) ? null : value;
      this.state.lastEditedDose = "volume";
      this.update();
    });

    this.elements.resetBtn.addEventListener("click", () => {
      this.state = new CalculatorState();
      this.syncDomFromState();
      this.update();
    });
  }

  validateInputs() {
    let hasError = false;

    const checkPositive = (element, value, allowZero = false) => {
      this.clearError(element);
      if (value === null || isNaN(value)) return;
      if (value < 0) {
        this.showError(element, "Value cannot be negative");
        hasError = true;
      } else if (!allowZero && value === 0) {
        this.showError(element, "Value must be greater than 0");
        hasError = true;
      }
    };

    checkPositive(this.elements.syringeUnits, this.state.syringeUnits);
    checkPositive(this.elements.syringeMl, this.state.syringeMl);
    checkPositive(this.elements.concAmount, this.state.concAmount);
    checkPositive(this.elements.concVol, this.state.concVol);
    checkPositive(this.elements.vialVol, this.state.vialVol, true);
    checkPositive(this.elements.freq, this.state.freq, true);
    checkPositive(this.elements.doseAmount, this.state.doseAmount, true);
    checkPositive(this.elements.doseVolume, this.state.doseVolume, true);

    if (!hasError && this.state.syringeMl > 0) {
      const maxVolume = this.state.syringeMl;
      const currentVolume = this.state.doseVolume;

      if (currentVolume > maxVolume) {
        const maxAmount =
          maxVolume * (this.state.concAmount / this.state.concVol);
        if (this.state.lastEditedDose === "amount") {
          this.showError(
            this.elements.doseAmount,
            `Exceeds syringe capacity (max ${Number(maxAmount.toFixed(2))} ${this.state.concUnit || "mg"})`,
          );
        } else {
          this.showError(
            this.elements.doseVolume,
            `Exceeds syringe capacity (max ${maxVolume} ml)`,
          );
        }
        hasError = true;
      }
    }

    return hasError;
  }

  showError(element, message) {
    this.clearError(element);
    if (!message) return;
    element.classList.add("input-error");
    const errorDiv = document.createElement("div");
    errorDiv.className = "input-error-message";
    errorDiv.textContent = message;
    element.parentNode.appendChild(errorDiv);
  }

  clearError(element) {
    element.classList.remove("input-error");
    const existing = element.parentNode.querySelector(".input-error-message");
    if (existing) existing.remove();
  }

  update() {
    const { lastEditedDose, doseAmount, doseVolume, concAmount, concVol } =
      this.state;

    if (lastEditedDose === "amount" && doseAmount !== null) {
      this.state.doseVolume = DosageCalculator.calculateVolumeFromAmount(
        doseAmount,
        concAmount,
        concVol,
      );
      if (document.activeElement !== this.elements.doseVolume) {
        this.elements.doseVolume.value =
          this.state.doseVolume !== null && !isNaN(this.state.doseVolume)
            ? Number(this.state.doseVolume.toFixed(3))
            : "";
      }
    } else if (lastEditedDose === "volume" && doseVolume !== null) {
      this.state.doseAmount = DosageCalculator.calculateAmountFromVolume(
        doseVolume,
        concAmount,
        concVol,
      );
      if (document.activeElement !== this.elements.doseAmount) {
        this.elements.doseAmount.value =
          this.state.doseAmount !== null && !isNaN(this.state.doseAmount)
            ? Number(this.state.doseAmount.toFixed(3))
            : "";
      }
    } else if (doseAmount === null && doseVolume === null) {
      this.elements.doseAmount.value = "";
      this.elements.doseVolume.value = "";
    }

    const hasError = this.validateInputs();

    let units = 0;
    let lifeDays = null;

    if (!hasError) {
      units = DosageCalculator.calculateSyringeUnits(
        this.state.doseVolume,
        this.state.syringeUnits,
        this.state.syringeMl,
      );
      lifeDays = DosageCalculator.calculateVialLifeDays(
        this.state.vialVol,
        this.state.doseVolume,
        this.state.freq,
      );
    }

    this.elements.resultUnits.textContent = units
      ? Number(units.toFixed(2))
      : "0";

    if (lifeDays) {
      let timeString = `${lifeDays} days`;
      const durationString = DosageCalculator.formatDuration(lifeDays);
      if (durationString !== `${lifeDays} days`) {
        timeString += ` (${durationString})`;
      }
      this.elements.vialLife.textContent = `This vial will last for about ${timeString}! ✨`;
    } else {
      this.elements.vialLife.textContent = "";
    }

    this.syringeRenderer.render(units || 0, this.state.syringeUnits || 40);
    this.updatePresets();
    this.state.saveToStorage();
  }
}

document.addEventListener("DOMContentLoaded", () => new CalculatorApp());
