// main.js — Bootstrap: Topbar verdrahten, Hauptmenü anzeigen.

document.addEventListener('DOMContentLoaded', () => {
  // Statische Emoji-Icons aus index.html durch Pixel-Icons ersetzen
  document.querySelector('.gold-pill').innerHTML = `${iconArt('coin', 15)} <span id="gold-display">0</span>`;
  const settingsBtn = document.getElementById('btn-settings');
  settingsBtn.innerHTML = iconArt('gear', 20);
  settingsBtn.onclick = () => { Sfx.click(); openSettings(); };
  const backBtn = document.getElementById('btn-back');
  backBtn.innerHTML = iconArt('back', 18);
  backBtn.onclick = () => { Sfx.click(); showScreen('menu'); };

  // Erste Interaktion irgendwo entsperrt den AudioContext und startet die Musik.
  document.body.addEventListener('pointerdown', () => Music.play('map'), { once: true });

  showScreen('menu');

  // PWA: Service Worker nur über http(s) — file:// wirft SecurityError
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW-Registrierung fehlgeschlagen:', err));
  }
});
