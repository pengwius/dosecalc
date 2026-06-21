import { SUBSTANCES } from "./substances.js";
import {
  parseDateLocal,
  getDayOffset,
  getDateFromOffset,
} from "./dateUtils.js";
import {
  calculateProtocolLevels,
  calculateSingleDoseContribution,
} from "./pkEngine.js";

export class TripPlanner {
  constructor({
    elements,
    getProtocols,
    addProtocol,
    updateSimulation,
    chartManager,
  }) {
    this.elements = elements;
    this.getProtocols = getProtocols;
    this.addProtocol = addProtocol;
    this.updateSimulation = updateSimulation;
    this.chartManager = chartManager;
    this.currentPlan = null;
    this.previousState = null;
    this.tripChartInstance = null;

    this.bindEvents();
  }

  bindEvents() {
    this.elements.calculateTrip.addEventListener("click", () =>
      this.calculateAdjustment(),
    );
    this.elements.applyTripPlan.addEventListener("click", () =>
      this.applyPlan(),
    );
    this.elements.revertTripPlan.addEventListener("click", () =>
      this.revertPlan(),
    );
    this.elements.closeTripModal.addEventListener("click", () =>
      this.closeModal(),
    );
    this.elements.modalCloseBtn.addEventListener("click", () =>
      this.closeModal(),
    );
    this.elements.modalApplyTrip.addEventListener("click", () =>
      this.applyPlan(),
    );
    this.elements.showModalE2Target.addEventListener("change", () => {
      const protocol = this.findTargetProtocol();
      if (protocol) this.renderTripModalChart(protocol);
    });
    this.elements.showModalTTarget.addEventListener("change", () => {
      const protocol = this.findTargetProtocol();
      if (protocol) this.renderTripModalChart(protocol);
    });
  }

  findTargetProtocol() {
    if (!this.currentPlan) return null;
    return this.getProtocols().find(
      (p) => p.id === this.currentPlan.protocolId,
    );
  }

  closeModal() {
    this.elements.tripModal.style.display = "none";
  }

  calculateAdjustment() {
    const startStr = this.elements.tripStart.value;
    const endStr = this.elements.tripEnd.value;
    const protocolId = this.elements.tripProtocolSelect.value;
    const mode = this.elements.tripMode.value;

    if (!startStr || !endStr || !protocolId) {
      alert("Please fill in trip dates and select a protocol.");
      return;
    }

    const protocol = this.getProtocols().find((p) => p.id === protocolId);
    if (!protocol) return;

    const tripStartDate = parseDateLocal(startStr);
    const tripEndDate = parseDateLocal(endStr);
    if (isNaN(tripStartDate.getTime()) || isNaN(tripEndDate.getTime())) {
      alert("Invalid trip dates.");
      return;
    }

    const result = this.findMissedDoses(protocol, tripStartDate, tripEndDate);
    const { missed, preTripDose, returnDateOffset } = result;

    if (missed.length === 0) {
      alert("No doses found during the selected trip period.");
      return;
    }
    if (!preTripDose) {
      alert("No dose found before the trip to adjust.");
      return;
    }

    const totalMissedDose = missed.reduce((sum, event) => sum + event.dose, 0);

    this.currentPlan = {
      protocolId,
      preTripDoseTime: preTripDose.time,
      returnDateOffset,
      mode,
      originalDose: preTripDose.dose,
      missed,
      totalMissedDose,
    };

    if (mode === "single") {
      const extra = totalMissedDose * 0.8;
      this.currentPlan.suggestedPreDose =
        Math.round((preTripDose.dose + extra) * 10) / 10;
    } else {
      const extraEach = totalMissedDose * 0.5;
      this.currentPlan.suggestedPreExtra = Math.round(extraEach * 10) / 10;
      this.currentPlan.suggestedPostExtra = Math.round(extraEach * 10) / 10;
    }

    this.showTripModal(protocol, missed, preTripDose, mode, totalMissedDose);
  }

  findMissedDoses(protocol, tripStartDate, tripEndDate) {
    const simStart = parseDateLocal(this.elements.startDate.value);
    const toOffset = (date) => (date - simStart) / 86400000;
    const returnDateOffset = toOffset(tripEndDate);

    const missed = [];
    let preTripDose = null;
    const doseValue = protocol.getDoseAmount();
    const catKey = protocol.getHormoneCategoryKey();
    const esterParams = SUBSTANCES[catKey]?.esters?.[protocol.typeSelect.value];

    const scanStart = new Date(tripStartDate);
    scanStart.setDate(scanStart.getDate() - 365);

    if (esterParams?.type === "continuous") {
      const perDose = doseValue / 3;
      for (
        let t = tripStartDate.getTime();
        t <= tripEndDate.getTime();
        t += 8 * 3600000
      ) {
        missed.push({ time: toOffset(new Date(t)), dose: perDose });
      }
      return {
        missed,
        preTripDose: {
          time: toOffset(new Date(tripStartDate.getTime() - 8 * 3600000)),
          dose: perDose,
        },
        returnDateOffset,
      };
    }

    if (protocol.isCustomSchedule()) {
      let lastBefore = null;
      protocol.customListElement
        .querySelectorAll(".custom-dose-row")
        .forEach((row) => {
          const dayStr = row.querySelector('[data-role="day"]').value;
          const doseVal = parseFloat(
            row.querySelector('[data-role="dose"]').value,
          );
          const doseDate = parseDateLocal(dayStr);
          if (!isNaN(doseDate.getTime()) && !isNaN(doseVal)) {
            if (doseDate >= tripStartDate && doseDate <= tripEndDate) {
              missed.push({ time: toOffset(doseDate), dose: doseVal });
            }
            if (
              doseDate < tripStartDate &&
              (!lastBefore || doseDate > lastBefore.date)
            ) {
              lastBefore = { date: doseDate, dose: doseVal };
            }
          }
        });
      if (lastBefore)
        preTripDose = {
          time: toOffset(lastBefore.date),
          dose: lastBefore.dose,
        };
      return { missed, preTripDose, returnDateOffset };
    }

    if (isNaN(doseValue))
      return { missed, preTripDose: null, returnDateOffset };

    const scheduleType = protocol.scheduleTypeSelect.value;

    if (scheduleType === "interval") {
      const interval =
        parseFloat(protocol.intervalInput.value) /
        (protocol.intervalUnitSelect.value === "hours" ? 24 : 1);
      const refDate = parseDateLocal(
        protocol.referenceDateInput.value || this.elements.startDate.value,
      );
      if (!isNaN(refDate.getTime()) && interval > 0) {
        let currentDate = new Date(refDate);
        while (currentDate > scanStart)
          currentDate.setDate(currentDate.getDate() - interval);
        let lastBefore = null;
        while (currentDate <= tripEndDate) {
          if (currentDate >= tripStartDate) {
            missed.push({
              time: toOffset(new Date(currentDate)),
              dose: doseValue,
            });
          } else {
            lastBefore = { date: new Date(currentDate), dose: doseValue };
          }
          currentDate.setDate(currentDate.getDate() + interval);
        }
        if (lastBefore)
          preTripDose = {
            time: toOffset(lastBefore.date),
            dose: lastBefore.dose,
          };
      }
    } else if (scheduleType === "weekdays") {
      const selectedDays = Array.from(protocol.weekDayCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => parseInt(cb.value));
      const isBiWeekly = protocol.biWeeklyCheckbox?.checked || false;
      const refDate = parseDateLocal(
        protocol.referenceDateInput.value || this.elements.startDate.value,
      );

      for (
        let d = new Date(tripStartDate);
        d <= tripEndDate;
        d.setDate(d.getDate() + 1)
      ) {
        if (selectedDays.includes(d.getDay())) {
          const diffDays = Math.round((d - refDate) / 86400000);
          if (!isBiWeekly || Math.floor(diffDays / 7) % 2 === 0) {
            missed.push({ time: toOffset(new Date(d)), dose: doseValue });
          }
        }
      }
      for (
        let d = new Date(tripStartDate);
        d > scanStart;
        d.setDate(d.getDate() - 1)
      ) {
        if (selectedDays.includes(d.getDay())) {
          const diffDays = Math.round((d - refDate) / 86400000);
          if (!isBiWeekly || Math.floor(diffDays / 7) % 2 === 0) {
            preTripDose = { time: toOffset(new Date(d)), dose: doseValue };
            break;
          }
        }
      }
    } else if (scheduleType === "monthdays") {
      const days = protocol.monthDaysInput.value
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));
      for (
        let d = new Date(tripStartDate);
        d <= tripEndDate;
        d.setDate(d.getDate() + 1)
      ) {
        if (days.includes(d.getDate())) {
          missed.push({ time: toOffset(new Date(d)), dose: doseValue });
        }
      }
      for (
        let d = new Date(tripStartDate);
        d > scanStart;
        d.setDate(d.getDate() - 1)
      ) {
        if (days.includes(d.getDate())) {
          preTripDose = { time: toOffset(new Date(d)), dose: doseValue };
          break;
        }
      }
    }

    return { missed, preTripDose, returnDateOffset };
  }

  showTripModal(protocol, missed, preTripDose, mode, totalMissedDose) {
    const modal = this.elements.tripModal;
    modal.style.display = "flex";

    const tripStart = getDayOffset(
      this.elements.startDate.value,
      this.elements.tripStart.value,
    );
    const tripEnd = getDayOffset(
      this.elements.startDate.value,
      this.elements.tripEnd.value,
    );
    const startDateVal = this.elements.startDate.value;

    let suggestion = "";
    if (mode === "single") {
      suggestion = `Recommended: Increase dose on ${getDateFromOffset(startDateVal, this.currentPlan.preTripDoseTime)} to ${this.currentPlan.suggestedPreDose}mg.`;
    } else {
      suggestion = `Recommended: Extra ${this.currentPlan.suggestedPreExtra}mg on ${getDateFromOffset(startDateVal, tripStart - 1)} AND ${this.currentPlan.suggestedPostExtra}mg on ${getDateFromOffset(startDateVal, tripEnd + 1)}.`;
    }
    this.elements.tripModalSuggestion.textContent = suggestion;

    this.renderDatesList(tripStart, tripEnd, mode);
    this.renderTripModalChart(protocol);
  }

  renderDatesList(tripStart, tripEnd, mode) {
    const dateList = this.elements.tripDatesList;
    dateList.innerHTML = "";
    const startDateVal = this.elements.startDate.value;

    const items = [];
    if (mode === "single") {
      items.push({
        time: this.currentPlan.preTripDoseTime,
        dose: this.currentPlan.suggestedPreDose,
        note: "(Adjusted)",
      });
    } else {
      items.push({
        time: tripStart - 1,
        dose: this.currentPlan.suggestedPreExtra,
        note: "(New Extra Dose)",
      });
      items.push({
        time: tripEnd + 1,
        dose: this.currentPlan.suggestedPostExtra,
        note: "(New Extra Dose)",
      });
    }

    this.currentPlan.missed.forEach((m) => {
      items.push({ time: m.time, dose: 0, note: "(Omitted)" });
    });

    items.sort((a, b) => a.time - b.time);

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "trip-date-item";
      div.innerHTML = `<strong>${getDateFromOffset(startDateVal, item.time)}</strong><br>Dose: ${item.dose}mg <br><small>${item.note}</small>`;
      dateList.appendChild(div);
    });
  }

  renderTripModalChart(protocol) {
    const canvas = document.getElementById("tripChart");
    if (this.tripChartInstance) this.tripChartInstance.destroy();

    const startDateVal = this.elements.startDate.value;
    const tripStart = getDayOffset(startDateVal, this.elements.tripStart.value);
    const tripEnd = getDayOffset(startDateVal, this.elements.tripEnd.value);
    const buffer = 60;
    const chartStart = tripStart - buffer;
    const chartEnd = tripEnd + buffer;

    const outputStep = 0.5;
    const labels = [];
    for (let t = chartStart; t <= chartEnd; t += outputStep) {
      labels.push(getDateFromOffset(startDateVal, t));
    }

    const catKey = protocol.getHormoneCategoryKey();
    const esterParams = SUBSTANCES[catKey]?.esters?.[protocol.typeSelect.value];
    const weightKg = parseFloat(this.elements.weightKg.value) || 70;
    const bloodUnit = protocol.getCategoryBloodUnit();

    const getLevels = (events) => {
      const sampleCount = Math.floor((chartEnd - chartStart) / outputStep) + 1;
      const data = new Array(sampleCount).fill(0);
      const weightFactor = 70 / weightKg;
      let extendedEvents = [...events];
      const firstEvent = events[0];
      const secondEvent = events[1];
      const actualInterval = secondEvent
        ? secondEvent.time - firstEvent.time
        : 7;
      for (let i = 1; i <= 150; i++) {
        extendedEvents.push({
          time: firstEvent.time - i * actualInterval,
          dose: firstEvent.dose,
        });
      }
      for (let i = 0; i < sampleCount; i++) {
        const t = chartStart + i * outputStep;
        let total = 0;
        extendedEvents.forEach((e) => {
          total += calculateSingleDoseContribution(
            esterParams,
            t - e.time,
            e.dose,
            weightFactor,
          );
        });
        data[i] = total;
      }
      return data;
    };

    const originalEvents = protocol.buildDoseEvents(
      chartEnd + 10,
      startDateVal,
    );
    let originalLevels = getLevels(originalEvents);
    const adjustedEvents = originalEvents.filter(
      (e) => e.time < tripStart || e.time > tripEnd,
    );

    if (this.currentPlan.mode === "single") {
      const preDose = adjustedEvents.find(
        (e) => e.time === this.currentPlan.preTripDoseTime,
      );
      if (preDose) preDose.dose = this.currentPlan.suggestedPreDose;
    } else {
      adjustedEvents.push({
        time: tripStart - 1,
        dose: this.currentPlan.suggestedPreExtra,
      });
      adjustedEvents.push({
        time: tripEnd + 1,
        dose: this.currentPlan.suggestedPostExtra,
      });
    }
    let adjustedLevels = getLevels(adjustedEvents);

    if (this.elements.useCalibration.checked) {
      const e2Measured = parseFloat(this.elements.e2Measured.value);
      const tMeasured = parseFloat(this.elements.tMeasured.value);
      let calibrationFactor = 1.0;
      if (catKey === "estradiol" && !isNaN(e2Measured)) {
        calibrationFactor = e2Measured / (originalLevels[0] || 1);
      }
      if (catKey === "testosterone" && !isNaN(tMeasured)) {
        calibrationFactor = tMeasured / (originalLevels[0] || 1);
      }
      originalLevels = originalLevels.map((v) => v * calibrationFactor);
      adjustedLevels = adjustedLevels.map((v) => v * calibrationFactor);
    }

    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const themeColors = {
      grid: isDark ? "#5c4d68" : "#cdb4db",
      text: isDark ? "#fdf5ff" : "#5c4d68",
    };

    const chartManagerAnnotations =
      this.chartManager?.buildAnnotationsForHormone(
        catKey === "estradiol" ? "Estradiol" : "Testosterone",
        this.elements.showModalE2Target.checked,
        this.elements.showModalTTarget.checked,
        parseFloat(this.elements.e2TargetMin.value),
        parseFloat(this.elements.e2TargetMax.value),
        parseFloat(this.elements.tTargetMin.value),
        parseFloat(this.elements.tTargetMax.value),
      ) || {};

    const tripStartLabel = getDateFromOffset(startDateVal, tripStart);
    const tripEndLabel = getDateFromOffset(startDateVal, tripEnd);

    const combinedAnnotations = {
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
      ...chartManagerAnnotations,
    };

    this.tripChartInstance = new Chart(canvas.getContext("2d"), {
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
            borderColor: "#ffafcc",
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
          annotation: { annotations: combinedAnnotations },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${Math.round(ctx.raw)} ${bloodUnit || ""}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: themeColors.grid },
            ticks: { color: themeColors.text, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: false,
            grid: { color: themeColors.grid },
            title: { display: true, text: bloodUnit, color: themeColors.text },
            ticks: { color: themeColors.text },
          },
        },
      },
    });
  }

  applyPlan() {
    if (!this.currentPlan) return;
    const protocol = this.getProtocols().find(
      (p) => p.id === this.currentPlan.protocolId,
    );
    if (!protocol) return;

    this.savePreviousState();
    this.elements.revertTripPlan.style.display = "inline-block";

    const preBuffer = 60;
    const postBuffer = 60;

    let tripStart = getDayOffset(
      this.elements.startDate.value,
      this.elements.tripStart.value,
    );
    let tripEnd = getDayOffset(
      this.elements.startDate.value,
      this.elements.tripEnd.value,
    );

    if (tripStart < preBuffer) {
      const shift = preBuffer - Math.floor(tripStart);
      const date = parseDateLocal(this.elements.startDate.value);
      if (!isNaN(date.getTime())) {
        date.setDate(date.getDate() - shift);
        this.elements.startDate.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        tripStart += shift;
        tripEnd += shift;
        this.currentPlan.preTripDoseTime += shift;
        this.currentPlan.returnDateOffset += shift;
      }
    }

    const extendedDays = Math.max(
      parseInt(this.elements.cycleLength.value) || 30,
      Math.ceil(tripEnd + postBuffer),
    );
    this.elements.cycleLength.value = extendedDays;
    this.elements.steadyState.checked = true;

    const startDateVal = this.elements.startDate.value;
    const events = protocol.buildDoseEvents(extendedDays, startDateVal);

    protocol.customToggleCheckbox.checked = true;
    protocol.container.classList.add("protocol-card--custom");

    const filtered = events.filter(
      (e) => e.time < tripStart || e.time > tripEnd,
    );

    if (this.currentPlan.mode === "single") {
      const preDose = filtered.find(
        (e) => e.time === this.currentPlan.preTripDoseTime,
      );
      if (preDose) preDose.dose = this.currentPlan.suggestedPreDose;
    } else {
      filtered.push({
        time: tripStart - 1,
        dose: this.currentPlan.suggestedPreExtra,
      });
      filtered.push({
        time: tripEnd + 1,
        dose: this.currentPlan.suggestedPostExtra,
      });
    }

    protocol.customListElement.innerHTML = "";
    filtered
      .sort((a, b) => a.time - b.time)
      .forEach((e) => {
        protocol.addCustomDoseRow({
          day: getDateFromOffset(startDateVal, e.time),
          dose: e.dose,
        });
      });

    this.elements.tripPlanResult.style.display = "none";
    this.closeModal();
    this.updateSimulation();
    alert("Trip plan applied!");
  }

  savePreviousState() {
    this.previousState = JSON.stringify(
      this.getProtocols().map((p) => p.serialize()),
    );
  }

  revertPlan() {
    if (!this.previousState) return;
    const state = JSON.parse(this.previousState);
    this.getProtocols().forEach((p) => p.destroy());
    const protocolsArray = this.getProtocols();
    protocolsArray.length = 0;
    state.forEach((pData) => this.addProtocol(pData));
    this.previousState = null;
    this.elements.revertTripPlan.style.display = "none";
    this.updateSimulation();
    alert("Trip plan reverted to previous state.");
  }
}
