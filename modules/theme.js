export class ThemeManager {
  constructor(toggleButton) {
    this.toggleButton = toggleButton;
    this.isDarkTheme = localStorage.getItem("dosecalcTheme") === "dark";
    this.applyTheme();

    this.toggleButton.addEventListener("click", () => {
      this.isDarkTheme = !this.isDarkTheme;
      this.applyTheme();
    });
  }

  applyTheme() {
    if (this.isDarkTheme) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    this.toggleButton.textContent = this.isDarkTheme ? "☀️" : "🌙";
    localStorage.setItem("dosecalcTheme", this.isDarkTheme ? "dark" : "light");
  }
}
