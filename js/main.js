// main.js — Bootstrap: Navigation verdrahten, Startscreen anzeigen.

document.addEventListener('DOMContentLoaded', () => {
  // Statische Emoji-Icons aus index.html durch Pixel-Icons ersetzen
  const navIcons = { map: 'map', collection: 'book', fusion: 'orb' };
  document.querySelectorAll('#nav button').forEach(b => {
    b.querySelector('.nav-ico').innerHTML = iconArt(navIcons[b.dataset.screen], 20);
    b.onclick = () => { Sfx.click(); showScreen(b.dataset.screen); };
  });
  document.querySelector('.gold-pill').innerHTML = `${iconArt('coin', 15)} <span id="gold-display">0</span>`;
  const settingsBtn = document.getElementById('btn-settings');
  settingsBtn.innerHTML = iconArt('gear', 20);
  settingsBtn.onclick = () => { Sfx.click(); openSettings(); };
  showScreen('map');
  showTitle();

  // PWA: Service Worker nur über http(s) — file:// wirft SecurityError
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW-Registrierung fehlgeschlagen:', err));
  }
});
