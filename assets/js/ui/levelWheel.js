/**
 * @file assets/js/ui/levelWheel.js
 * @description Level wheel UI component for adjusting floor levels.
 * @module ui/levelWheel
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { switchLevel, currentLevel } from '../core/level.js';

// TODO: Move level wheel to ui/levelWheel.js
export function registerLevelWheel() {
  const MIN_LEVEL = -20;
  const MAX_LEVEL = 20;
  let wheelContainer = document.getElementById('levelWheelContainer');
  if (!wheelContainer) {
    wheelContainer = document.createElement('div');
    wheelContainer.id = 'levelWheelContainer';
    wheelContainer.className = 'level-wheel-container';
    // Insert next to sidebar or at suitable parent (modify if specific layout needed)
    const sidebar = document.querySelector('.sidebar') || document.body;
    sidebar.parentNode.insertBefore(wheelContainer, sidebar.nextSibling);
  }
  wheelContainer.innerHTML = `
    <button id="levelWheelUp" class="wheel-arrow">&#9650;</button>
    <div id="levelWheel" class="level-wheel"></div>
    <button id="levelWheelDown" class="wheel-arrow">&#9660;</button>
  `;
  function renderLevelWheel() {
    const wheel = document.getElementById('levelWheel');
    if (!wheel) return;
    wheel.innerHTML = '';
    // Render from highest (top, positive) to lowest (bottom, negative)
    for (let i = currentLevel + 5; i >= currentLevel - 5; i--) {
      if (i < MIN_LEVEL || i > MAX_LEVEL) continue;
      const el = document.createElement('div');
      el.className = 'level-item';
      if (i === currentLevel) {
        el.classList.add('center');
        el.textContent = i === 0 ? '0' : (i > 0 ? '+' + i : i);
      } else {
        const fade = Math.abs(i - currentLevel);
        el.classList.add('fade' + Math.min(fade, 5));
        el.textContent = i === 0 ? '0' : (i > 0 ? '+' + i : i);
        el.addEventListener('click', () => {
          switchLevel(i);
          renderLevelWheel();
        });
      }
      wheel.appendChild(el);
    }
  }
  document.getElementById('levelWheelUp').onclick = () => {
    if (currentLevel < MAX_LEVEL) {
      switchLevel(currentLevel + 1);
      renderLevelWheel();
    }
  };
  document.getElementById('levelWheelDown').onclick = () => {
    if (currentLevel > MIN_LEVEL) {
      switchLevel(currentLevel - 1);
      renderLevelWheel();
    }
  };
  // On level change, re-render wheel:
  const origSwitchLevel = switchLevel;
  window.switchLevel = function(newLevel) {
    origSwitchLevel(newLevel);
    renderLevelWheel();
  };
  renderLevelWheel();
  // --- Enable scrolling with mouse wheel on the level wheel ---
  const levelWheelDiv = document.getElementById('levelWheelContainer');
  if (levelWheelDiv) {
    levelWheelDiv.addEventListener('wheel', (event) => {
      event.preventDefault(); // Prevent page scroll
      event.stopPropagation();
      const delta = Math.sign(event.deltaY);
      if (delta > 0 && currentLevel > MIN_LEVEL) {
        switchLevel(currentLevel - 1);
        renderLevelWheel();
      } else if (delta < 0 && currentLevel < MAX_LEVEL) {
        switchLevel(currentLevel + 1);
        renderLevelWheel();
      }
    }, { passive: false });
  }
}