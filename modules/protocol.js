import { SUBSTANCES } from "./substances.js";
import { parseDateLocal, getDayOffset } from "./dateUtils.js";

export class Protocol {
  constructor(
    serializedData = null,
    onChangeCallback = null,
    onRemoveCallback = null,
  ) {
    this.id = `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.onChange = onChangeCallback;
    this.onRemove = onRemoveCallback;
    this.renderContainer();
    this.cacheElements();
    this.populateCategoryOptions();
    if (serializedData) {
      this.deserialize(serializedData);
    } else {
      this.updateTypeOptions();
    }
    this.bindElementEvents();
  }

  renderContainer() {
    this.container = document.createElement("div");
    this.container.className = "protocol-card";
    this.container.innerHTML = `
      <div class="protocol-header">
        <h3>Protocol</h3>
        <div class="protocol-actions">
          <button class="ghost-button" type="button" data-action="remove">Remove</button>
        </div>
      </div>
      <div class="regular-schedule-options">
        <div class="input-row">
          <div class="input-group"><label>Hormone</label><select data-role="category"></select></div>
          <div class="input-group"><label>Form</label><select data-role="type"></select></div>
          <div class="input-group"><label>Dose (mg)</label><input type="number" data-role="dose" step="0.1" value="5" /></div>
        </div>
        <div class="input-row">
          <div class="input-group"><label>Schedule Type</label><select data-role="schedule-type">
            <option value="interval">Every X days/hours</option>
            <option value="weekdays">Days of week</option>
            <option value="monthdays">Days of month</option>
          </select></div>
        </div>
        <div class="schedule-type-interval">
          <div class="input-row">
            <div class="input-group"><label>Every</label><input type="number" data-role="interval" value="5" /></div>
            <div class="input-group"><label>Unit</label><select data-role="interval-unit">
              <option value="days">days</option><option value="hours">hours</option>
            </select></div>
            <div class="input-group"><label>Starting from (optional)</label><input type="date" data-role="reference-date" /></div>
          </div>
        </div>
        <div class="schedule-type-weekdays" style="display:none">
          <div class="input-row">
            <div class="input-group"><label>Days of week</label>
              <div class="weekdays-grid" style="display:flex; gap:8px; flex-wrap:wrap">
                <label style="font-size:0.8rem"><input type="checkbox" value="1" /> Mon</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="2" /> Tue</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="3" /> Wed</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="4" /> Thu</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="5" /> Fri</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="6" /> Sat</label>
                <label style="font-size:0.8rem"><input type="checkbox" value="0" /> Sun</label>
              </div>
            </div>
            <div class="input-group"><label class="toggle" style="margin-top:10px"><input type="checkbox" data-role="bi-weekly" /> Every other week</label></div>
          </div>
        </div>
        <div class="schedule-type-monthdays" style="display:none">
          <div class="input-row">
            <div class="input-group"><label>Days of month (comma separated)</label><input type="text" data-role="month-days" placeholder="e.g. 1, 15" /></div>
          </div>
        </div>
      </div>
      <div class="input-row"><label class="toggle"><input type="checkbox" data-role="custom-toggle" /> Custom schedule</label></div>
      <div class="custom-schedule">
        <div class="custom-schedule-header"><span>Doses</span><button type="button" data-action="add-custom">Add</button></div>
        <div data-role="custom-list"></div>
      </div>
    `;
  }

  cacheElements() {
    const q = (selector) => this.container.querySelector(selector);
    this.titleElement = this.container.querySelector("h3");
    this.categorySelect = q('[data-role="category"]');
    this.typeSelect = q('[data-role="type"]');
    this.doseInput = q('[data-role="dose"]');
    this.scheduleTypeSelect = q('[data-role="schedule-type"]');
    this.intervalInput = q('[data-role="interval"]');
    this.intervalUnitSelect = q('[data-role="interval-unit"]');
    this.referenceDateInput = q('[data-role="reference-date"]');
    this.weekDayCheckboxes = this.container.querySelectorAll(
      ".weekdays-grid input",
    );
    this.biWeeklyCheckbox = q('[data-role="bi-weekly"]');
    this.monthDaysInput = q('[data-role="month-days"]');
    this.customToggleCheckbox = q('[data-role="custom-toggle"]');
    this.customListElement = q('[data-role="custom-list"]');
    this.addCustomButton = q('[data-action="add-custom"]');
    this.removeButton = q('[data-action="remove"]');
    this.scheduleSections = {
      interval: this.container.querySelector(".schedule-type-interval"),
      weekdays: this.container.querySelector(".schedule-type-weekdays"),
      monthdays: this.container.querySelector(".schedule-type-monthdays"),
    };
  }

  bindElementEvents() {
    this.categorySelect.addEventListener("change", () => {
      this.updateTypeOptions();
      this.notifyChange();
    });

    this.scheduleTypeSelect.addEventListener("change", () => {
      this.updateScheduleVisibility();
      this.notifyChange();
    });

    this.typeSelect.addEventListener("change", () => this.notifyChange());
    this.doseInput.addEventListener("input", () => this.notifyChange());
    this.intervalInput.addEventListener("input", () => this.notifyChange());
    this.intervalUnitSelect.addEventListener("change", () =>
      this.notifyChange(),
    );
    this.referenceDateInput.addEventListener("change", () =>
      this.notifyChange(),
    );
    this.monthDaysInput.addEventListener("input", () => this.notifyChange());
    this.weekDayCheckboxes.forEach((cb) =>
      cb.addEventListener("change", () => this.notifyChange()),
    );
    if (this.biWeeklyCheckbox) {
      this.biWeeklyCheckbox.addEventListener("change", () =>
        this.notifyChange(),
      );
    }

    this.customToggleCheckbox.addEventListener("change", (event) => {
      this.container.classList.toggle(
        "protocol-card--custom",
        event.target.checked,
      );
      this.notifyChange();
    });

    this.addCustomButton.addEventListener("click", () => {
      this.addCustomDoseRow();
      this.notifyChange();
    });

    this.removeButton.addEventListener("click", () => {
      if (this.onRemove) this.onRemove(this.id);
    });
  }

  updateScheduleVisibility() {
    Object.keys(this.scheduleSections).forEach((key) => {
      this.scheduleSections[key].style.display = "none";
    });
    const selectedSection =
      this.scheduleSections[this.scheduleTypeSelect.value];
    if (selectedSection) selectedSection.style.display = "block";
  }

  populateCategoryOptions() {
    this.categorySelect.innerHTML = "";
    Object.keys(SUBSTANCES).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = SUBSTANCES[key].categoryName || key;
      this.categorySelect.appendChild(option);
    });
  }

  updateTypeOptions() {
    const category = SUBSTANCES[this.categorySelect.value];
    this.typeSelect.innerHTML = "";
    if (!category || !category.esters) return;
    Object.keys(category.esters).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = category.esters[key].name;
      this.typeSelect.appendChild(option);
    });
  }

  addCustomDoseRow(values = {}) {
    const row = document.createElement("div");
    row.className = "custom-dose-row";
    row.innerHTML = `
      <input type="text" data-role="day" placeholder="Day or Date (dd/mm/yyyy)" />
      <input type="number" data-role="dose" step="0.1" />
      <button type="button">✕</button>`;

    const dayInput = row.querySelector('[data-role="day"]');
    const doseInput = row.querySelector('[data-role="dose"]');
    if (values.day) dayInput.value = values.day;
    if (values.dose) doseInput.value = values.dose;

    dayInput.addEventListener("input", () => this.notifyChange());
    doseInput.addEventListener("input", () => this.notifyChange());
    row.querySelector("button").addEventListener("click", () => {
      row.remove();
      this.notifyChange();
    });

    this.customListElement.appendChild(row);
  }

  getSelectedEsterParams() {
    return (
      SUBSTANCES[this.categorySelect.value]?.esters?.[this.typeSelect.value] ||
      null
    );
  }

  getHormoneCategoryKey() {
    return this.categorySelect.value;
  }

  getCategoryBloodUnit() {
    const cat = SUBSTANCES[this.categorySelect.value];
    return cat ? cat.bloodUnit : "";
  }

  getDoseAmount() {
    return parseFloat(this.doseInput.value) || 0;
  }

  isCustomSchedule() {
    return this.customToggleCheckbox.checked;
  }

  buildDoseEvents(totalDays, startDateStr) {
    const events = [];
    const esterParams = this.getSelectedEsterParams();
    const simulationStart = parseDateLocal(startDateStr);

    if (esterParams?.type === "continuous") {
      const frequency = 8 / 24;
      for (let t = 0; t < totalDays; t += frequency) {
        events.push({ time: t, dose: this.getDoseAmount() / 3 });
      }
      return events;
    }

    if (this.isCustomSchedule()) {
      this.customListElement
        .querySelectorAll(".custom-dose-row")
        .forEach((row) => {
          const dayStr = row.querySelector('[data-role="day"]').value;
          const doseValue = parseFloat(
            row.querySelector('[data-role="dose"]').value,
          );
          const dayOffset = getDayOffset(startDateStr, dayStr);
          if (!isNaN(dayOffset) && !isNaN(doseValue)) {
            events.push({ time: dayOffset, dose: doseValue });
          }
        });
      return events;
    }

    const dose = this.getDoseAmount();
    const scheduleType = this.scheduleTypeSelect.value;

    if (scheduleType === "interval") {
      const interval =
        parseFloat(this.intervalInput.value) /
        (this.intervalUnitSelect.value === "hours" ? 24 : 1);
      const referenceDateStr = this.referenceDateInput.value;
      let firstTime = 0;
      if (referenceDateStr) {
        firstTime =
          (parseDateLocal(referenceDateStr) - simulationStart) /
          (1000 * 60 * 60 * 24);
      }
      if (!isNaN(dose) && !isNaN(interval) && interval > 0) {
        let currentTime = firstTime;
        while (currentTime < 0) currentTime += interval;
        for (; currentTime <= totalDays; currentTime += interval) {
          if (currentTime >= 0) events.push({ time: currentTime, dose });
        }
      }
    } else if (scheduleType === "weekdays") {
      const selectedDays = Array.from(this.weekDayCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => parseInt(cb.value));
      const isBiWeekly = this.biWeeklyCheckbox?.checked || false;
      const referenceDateStr = this.referenceDateInput.value || startDateStr;
      const referenceDate = parseDateLocal(referenceDateStr);
      referenceDate.setHours(0, 0, 0, 0);

      for (let t = 0; t <= totalDays; t++) {
        const currentDate = new Date(simulationStart);
        currentDate.setDate(currentDate.getDate() + t);
        currentDate.setHours(0, 0, 0, 0);

        if (selectedDays.includes(currentDate.getDay())) {
          if (isBiWeekly) {
            const diffDays = Math.round(
              (currentDate - referenceDate) / (1000 * 60 * 60 * 24),
            );
            const diffWeeks = Math.floor(diffDays / 7);
            if (diffWeeks % 2 === 0) events.push({ time: t, dose });
          } else {
            events.push({ time: t, dose });
          }
        }
      }
    } else if (scheduleType === "monthdays") {
      const days = this.monthDaysInput.value
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));
      for (let t = 0; t <= totalDays; t++) {
        const currentDate = new Date(simulationStart);
        currentDate.setDate(currentDate.getDate() + t);
        if (days.includes(currentDate.getDate())) {
          events.push({ time: t, dose });
        }
      }
    }
    return events;
  }

  serialize() {
    return {
      category: this.categorySelect.value,
      type: this.typeSelect.value,
      dose: this.doseInput.value,
      scheduleType: this.scheduleTypeSelect.value,
      interval: this.intervalInput.value,
      intervalUnit: this.intervalUnitSelect.value,
      referenceDate: this.referenceDateInput.value,
      weekDays: Array.from(this.weekDayCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => parseInt(cb.value)),
      biWeekly: this.biWeeklyCheckbox ? this.biWeeklyCheckbox.checked : false,
      monthDays: this.monthDaysInput.value,
      customToggle: this.customToggleCheckbox.checked,
      customDoses: Array.from(
        this.customListElement.querySelectorAll(".custom-dose-row"),
      ).map((row) => ({
        day: row.querySelector('[data-role="day"]').value,
        dose: row.querySelector('[data-role="dose"]').value,
      })),
    };
  }

  deserialize(data) {
    if (!data) return;
    this.categorySelect.value = data.category || "estradiol";
    this.updateTypeOptions();
    this.typeSelect.value = data.type || "valerate";
    this.doseInput.value = data.dose || 5;
    this.scheduleTypeSelect.value = data.scheduleType || "interval";
    this.intervalInput.value = data.interval || 7;
    this.intervalUnitSelect.value = data.intervalUnit || "days";
    this.referenceDateInput.value = data.referenceDate || "";

    if (data.weekDays) {
      this.weekDayCheckboxes.forEach((cb) => {
        cb.checked = data.weekDays.includes(parseInt(cb.value));
      });
    }
    if (this.biWeeklyCheckbox)
      this.biWeeklyCheckbox.checked = data.biWeekly || false;
    this.monthDaysInput.value = data.monthDays || "";
    this.customToggleCheckbox.checked = data.customToggle || false;
    this.container.classList.toggle(
      "protocol-card--custom",
      !!data.customToggle,
    );

    if (data.customDoses) {
      data.customDoses.forEach((cd) => this.addCustomDoseRow(cd));
    }

    this.updateScheduleVisibility();
  }

  notifyChange() {
    if (this.onChange) this.onChange();
  }

  destroy() {
    this.container.remove();
  }
}
