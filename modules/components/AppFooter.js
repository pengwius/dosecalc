class AppFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer>
        <div class="footer-content">
          <p>
            Made by <a href="https://github.com/pengwius" target="_blank" rel="noopener noreferrer">pengwius</a> with ❤️
          </p>
          <p style="margin-top: -4px">
            <a href="https://github.com/pengwius/dosecalc" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
          </p>
          <div class="attribution">
            Icons made by <a href="https://www.flaticon.com/authors/candy-design" title="Candy Design" target="_blank" rel="noopener noreferrer">Candy Design</a>
            from <a href="https://www.flaticon.com/" title="Flaticon" target="_blank" rel="noopener noreferrer">www.flaticon.com</a>
          </div>
        </div>
      </footer>
    `;
  }
}
customElements.define("app-footer", AppFooter);
