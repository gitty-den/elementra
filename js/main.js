// main.js — Bootstrap: Navigation verdrahten, Startscreen anzeigen.

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#nav button').forEach(b =>
    b.onclick = () => { Sfx.click(); showScreen(b.dataset.screen); });
  document.getElementById('btn-settings').onclick = () => { Sfx.click(); openSettings(); };
  showScreen('map');
  showTitle();
});
