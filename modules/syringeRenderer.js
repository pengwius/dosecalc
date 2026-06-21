export class SyringeRenderer {
  constructor(barrelElement, liquidElement, scaleElement, plungerElement) {
    this.barrelElement = barrelElement;
    this.liquidElement = liquidElement;
    this.scaleElement = scaleElement;
    this.plungerElement = plungerElement;
  }

  render(currentUnits, maxUnits) {
    maxUnits = Math.max(1, maxUnits);
    const fillPercentage = Math.min(
      100,
      Math.max(0, (currentUnits / maxUnits) * 100),
    );

    this.liquidElement.style.width = `${fillPercentage}%`;

    const plungerRightOffset = fillPercentage;
    this.plungerElement.style.left = `calc(${100 - plungerRightOffset}% - ${((100 - plungerRightOffset) / 100) * 12}px)`;

    this.renderScale(maxUnits);
  }

  renderScale(maxUnits) {
    this.scaleElement.innerHTML = "";

    let majorStep = 10;
    if (maxUnits <= 5) majorStep = 1;
    else if (maxUnits <= 10) majorStep = 2;
    else if (maxUnits <= 30) majorStep = 5;
    else if (maxUnits <= 50) majorStep = 10;
    else if (maxUnits <= 100) majorStep = 20;
    else if (maxUnits <= 300) majorStep = 50;
    else majorStep = 100;

    const minorStep = majorStep / 5;

    for (let value = 0; value <= maxUnits + 0.001; value += minorStep) {
      const percentPosition = 100 - (value / maxUnits) * 100;

      const isMajorTick =
        Math.abs(value % majorStep) < 0.001 ||
        Math.abs((value % majorStep) - majorStep) < 0.001;

      const tickElement = document.createElement("div");
      tickElement.className = isMajorTick ? "tick major" : "tick";
      tickElement.style.left = `${percentPosition}%`;
      tickElement.style.transform = "translateX(-50%)";

      if (isMajorTick) {
        tickElement.setAttribute("data-value", Math.round(value));
      }

      this.scaleElement.appendChild(tickElement);
    }
  }
}
