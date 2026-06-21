class AppHeader extends HTMLElement {
  connectedCallback() {
    const currentPage = this.getAttribute("current-page");

    let navigationLink = "";
    if (currentPage === "calculator") {
      navigationLink = `<a id="goToSimulator" href="simulation.html"></a>`;
    } else if (currentPage === "simulator") {
      navigationLink = `<a id="goToCalculator" href="index.html"></a>`;
    }

    this.innerHTML = `
      <header>
        <h1>Dosecalc 🌸</h1>
        ${navigationLink}
        <button id="themeToggle" aria-label="Toggle theme"></button>
      </header>
    `;
  }
}
customElements.define("app-header", AppHeader);
