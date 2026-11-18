import './styles/tokens.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  const boot = document.createElement('div');
  boot.className = 'boot-placeholder';
  boot.textContent = 'YZakkartOS';
  boot.style.cssText =
    'display:grid;place-items:center;height:100%;font-family:var(--font-mono);letter-spacing:.3em;color:var(--os-accent)';
  app.append(boot);
}
