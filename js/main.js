// main.js — Bootstrap: Splash, Topbar verdrahten, Hauptmenü anzeigen.

// Ladebildschirm: nur das rotierende Logo, kein Text. Nach Mindestdauer +
// geladenen Fonts fliegt/dreht es auf die Emblem-Position im Hauptmenü (FLIP).
function showSplash() {
  const splash = document.createElement('div');
  splash.id = 'splash';
  splash.innerHTML = `<div class="splash-emblem">${emblemArt()}</div>`;
  document.body.appendChild(splash);
  const done = () => {
    const se = splash.querySelector('.splash-emblem');
    const target = document.querySelector('.menu-emblem');
    if (se && target) {
      const t = target.getBoundingClientRect();
      const s0 = se.getBoundingClientRect();
      se.classList.add('fly');
      se.style.transform =
        `translate(${(t.left + t.width / 2) - (s0.left + s0.width / 2)}px,` +
        ` ${(t.top + t.height / 2) - (s0.top + s0.height / 2)}px)` +
        ` scale(${t.width / s0.width}) rotate(360deg)`;
    }
    splash.classList.add('done');
    setTimeout(() => splash.remove(), 900);
  };
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))])
    .then(() => setTimeout(done, 900));
}

// Tages-Bonus: einmal pro Kalendertag, nach dem Splash bzw. nach der Profilwahl.
function showDailyBonus() {
  claimDailyBonus();
  updateGoldDisplay();
  const ov = showOverlay(`
    <div class="daily-bonus">
      ${iconArt('sun', 40)}
      <div class="result-gold">+ ${iconArt('coin')} ${DAILY_BONUS_GOLD}</div>
      <div class="ov-actions"><button class="btn btn-primary" id="db-ok">Weiter</button></div>
    </div>`);
  ov.querySelector('#db-ok').onclick = () => { Sfx.click(); closeOverlay(); };
}

document.addEventListener('DOMContentLoaded', () => {
  showSplash();
  // Statische Emoji-Icons aus index.html durch Pixel-Icons ersetzen
  document.querySelector('.gold-pill').innerHTML = `${iconArt('coin', 18)} <span id="gold-display">0</span>`;
  const settingsBtn = document.getElementById('btn-settings');
  settingsBtn.innerHTML = iconArt('gear', 24);
  settingsBtn.onclick = () => { Sfx.click(); openSettings(); };
  const backBtn = document.getElementById('btn-back');
  backBtn.innerHTML = iconArt('back', 22);
  backBtn.onclick = () => { Sfx.click(); showScreen('menu'); };

  // Erste Interaktion irgendwo entsperrt den AudioContext und startet die Musik.
  document.body.addEventListener('pointerdown', () => Music.play('map'), { once: true });

  // iOS-Long-Press öffnet sonst das Bild-Kontextmenü der Sprites — unterdrücken
  // (Long-Press ist im Spiel der Stat-Peek, siehe attachLongPress in ui.js).
  document.addEventListener('contextmenu', e => e.preventDefault());

  initNavArrows();
  showScreen('menu');

  // Profilauswahl beim Start (getrennte Spielstände, 20.07.): immer, wenn es
  // etwas zu wählen gibt oder das zuletzt gespielte Profil einen PIN hat.
  // Einzelnes Profil ohne PIN startet direkt durch.
  // Der Tages-Bonus kommt dann erst nach dem Betreten des Profils.
  const prof = activeProfile();
  if (!prof || prof.pin || Profiles.list.length > 1) {
    setTimeout(() => openProfileGate(), 1400);   // nach dem Splash-Flug
  } else if (dailyBonusAvailable()) {
    setTimeout(showDailyBonus, 2700);
  }

  // PWA: Service Worker nur über http(s) — file:// wirft SecurityError
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW-Registrierung fehlgeschlagen:', err));
  }
});
