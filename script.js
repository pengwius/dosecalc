class State {
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

  load() {
    try {
      const saved = localStorage.getItem("dosecalcState");
      if (saved) {
        Object.assign(this, JSON.parse(saved));
      }
    } catch (e) {
      console.error("Could not load state", e);
    }
  }

  save() {
    try {
      localStorage.setItem("dosecalcState", JSON.stringify(this));
    } catch (e) {
      console.error("Could not save state", e);
    }
  }
}

class Calculator {
  static calculateVolumeFromAmount(amount, concAmount, concVol) {
    if (!amount || !concAmount || !concVol) return 0;
    return (amount / concAmount) * concVol;
  }

  static calculateAmountFromVolume(volume, concAmount, concVol) {
    if (!volume || !concAmount || !concVol) return 0;
    return (volume / concVol) * concAmount;
  }

  static calculateUnits(volume, syringeUnits, syringeMl) {
    if (!volume || !syringeUnits || !syringeMl) return 0;
    return volume * (syringeUnits / syringeMl);
  }

  static calculateVialLife(vialVol, doseVolume, freq) {
    if (!vialVol || !doseVolume || !freq) return null;
    const totalDoses = vialVol / doseVolume;
    return Math.floor(totalDoses * freq);
  }
}

class SyringeRenderer {
  constructor(barrelEl, liquidEl, scaleEl, plungerEl) {
    this.barrel = barrelEl;
    this.liquid = liquidEl;
    this.scale = scaleEl;
    this.plunger = plungerEl;
  }

  render(units, maxUnits) {
    maxUnits = Math.max(1, maxUnits);
    const percentage = Math.min(100, Math.max(0, (units / maxUnits) * 100));

    this.liquid.style.width = `${percentage}%`;

    const plungerRightOffset = percentage;
    this.plunger.style.left = `calc(${100 - plungerRightOffset}% - 30px)`;

    this.scale.innerHTML = "";

    let majorStep = 10;
    if (maxUnits <= 5) majorStep = 1;
    else if (maxUnits <= 10) majorStep = 2;
    else if (maxUnits <= 30) majorStep = 5;
    else if (maxUnits <= 50) majorStep = 10;
    else if (maxUnits <= 100) majorStep = 20;
    else if (maxUnits <= 300) majorStep = 50;
    else majorStep = 100;

    let minorStep = majorStep / 5;

    for (let val = 0; val <= maxUnits + 0.001; val += minorStep) {
      const percent = 100 - (val / maxUnits) * 100;

      const isMajor =
        Math.abs(val % majorStep) < 0.001 ||
        Math.abs((val % majorStep) - majorStep) < 0.001;

      const tick = document.createElement("div");
      tick.className = isMajor ? "tick major" : "tick";
      tick.style.left = `${percent}%`;

      tick.style.transform = "translateX(-50%)";

      if (isMajor) {
        tick.setAttribute("data-value", Math.round(val));
      }

      this.scale.appendChild(tick);
    }
  }
}

class ThemeManager {
  constructor(toggleBtn) {
    this.btn = toggleBtn;

    const savedTheme = localStorage.getItem("dosecalcTheme");
    if (savedTheme) {
      this.isDark = savedTheme === "dark";
    } else {
      this.isDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    this.applyTheme();
    this.btn.addEventListener("click", () => this.toggle());
  }

  applyTheme() {
    if (this.isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("dosecalcTheme", this.isDark ? "dark" : "light");
  }

  toggle() {
    this.isDark = !this.isDark;
    this.applyTheme();
  }
}

class App {
  constructor() {
    this.state = new State();
    this.state.load();

    this.themeManager = new ThemeManager(
      document.getElementById("themeToggle"),
    );

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
    const sVal = `${this.state.syringeUnits},${this.state.syringeMl}`;
    if (
      Array.from(this.elements.syringePreset.options).some(
        (o) => o.value === sVal,
      )
    ) {
      this.elements.syringePreset.value = sVal;
    } else {
      this.elements.syringePreset.value = "custom";
    }

    const vVal = `${this.state.concAmount},${this.state.concUnit},${this.state.concVol}`;
    if (
      Array.from(this.elements.vialPreset.options).some((o) => o.value === vVal)
    ) {
      this.elements.vialPreset.value = vVal;
    } else {
      this.elements.vialPreset.value = "custom";
    }
  }

  bindEvents() {
    const updateState =
      (key, parser = parseFloat) =>
      (e) => {
        const val = parser(e.target.value);
        this.state[key] = isNaN(val) ? null : val;
        this.update();
      };

    this.elements.syringeUnits.addEventListener(
      "input",
      updateState("syringeUnits"),
    );
    this.elements.syringeMl.addEventListener("input", updateState("syringeMl"));
    this.elements.concAmount.addEventListener(
      "input",
      updateState("concAmount"),
    );
    this.elements.concVol.addEventListener("input", updateState("concVol"));
    this.elements.vialVol.addEventListener("input", updateState("vialVol"));
    this.elements.freq.addEventListener("input", updateState("freq"));

    this.elements.syringePreset.addEventListener("change", (e) => {
      if (e.target.value !== "custom") {
        const [u, ml] = e.target.value.split(",");
        this.state.syringeUnits = parseFloat(u);
        this.state.syringeMl = parseFloat(ml);
        this.syncDomFromState();
        this.update();
      }
    });

    this.elements.vialPreset.addEventListener("change", (e) => {
      if (e.target.value !== "custom") {
        const [amt, unit, vol] = e.target.value.split(",");
        this.state.concAmount = parseFloat(amt);
        this.state.concUnit = unit;
        this.state.concVol = parseFloat(vol);
        this.syncDomFromState();
        this.update();
      }
    });

    this.elements.concUnit.addEventListener("change", (e) => {
      this.state.concUnit = e.target.value;
      this.elements.doseUnitLabel.textContent = this.state.concUnit;
      this.update();
    });

    this.elements.doseAmount.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      this.state.doseAmount = isNaN(val) ? null : val;
      this.state.lastEditedDose = "amount";
      this.update();
    });

    this.elements.doseVolume.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      this.state.doseVolume = isNaN(val) ? null : val;
      this.state.lastEditedDose = "volume";
      this.update();
    });

    this.elements.resetBtn.addEventListener("click", () => {
      this.state = new State();
      this.syncDomFromState();
      this.update();
    });
  }

  update() {
    if (
      this.state.lastEditedDose === "amount" &&
      this.state.doseAmount !== null
    ) {
      this.state.doseVolume = Calculator.calculateVolumeFromAmount(
        this.state.doseAmount,
        this.state.concAmount,
        this.state.concVol,
      );
      if (document.activeElement !== this.elements.doseVolume) {
        this.elements.doseVolume.value = Number(
          this.state.doseVolume.toFixed(3),
        );
      }
    } else if (
      this.state.lastEditedDose === "volume" &&
      this.state.doseVolume !== null
    ) {
      this.state.doseAmount = Calculator.calculateAmountFromVolume(
        this.state.doseVolume,
        this.state.concAmount,
        this.state.concVol,
      );
      if (document.activeElement !== this.elements.doseAmount) {
        this.elements.doseAmount.value = Number(
          this.state.doseAmount.toFixed(3),
        );
      }
    } else if (
      this.state.doseAmount === null &&
      this.state.doseVolume === null
    ) {
      this.elements.doseAmount.value = "";
      this.elements.doseVolume.value = "";
    }

    const units = Calculator.calculateUnits(
      this.state.doseVolume,
      this.state.syringeUnits,
      this.state.syringeMl,
    );

    this.elements.resultUnits.textContent = units
      ? Number(units.toFixed(2))
      : "0";

    const life = Calculator.calculateVialLife(
      this.state.vialVol,
      this.state.doseVolume,
      this.state.freq,
    );

    if (life) {
      let timeString = `${life} days`;
      const timeParts = [];

      if (life >= 365) {
        const years = (life / 365).toFixed(1);
        timeParts.push(`~${years} years`);
      } else if (life >= 30) {
        const months = (life / 30.44).toFixed(1);
        timeParts.push(`~${months} months`);
      } else if (life >= 7) {
        const weeks = (life / 7).toFixed(1);
        timeParts.push(`~${weeks} weeks`);
      }

      if (timeParts.length > 0) {
        timeString += ` (${timeParts.join(" / ")})`;
      }

      this.elements.vialLife.textContent = `This vial will last for about ${timeString}! ✨`;
    } else {
      this.elements.vialLife.textContent = "";
    }

    this.syringeRenderer.render(units || 0, this.state.syringeUnits || 40);

    this.updatePresets();

    this.state.save();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
