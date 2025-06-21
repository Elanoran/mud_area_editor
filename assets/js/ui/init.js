/**
 * @file assets/js/ui/init.js
 * @module ui/init
 * @description Initializes the sidebar UI: random area names, toggle buttons, tabs and format dropdown.
 * @author Elanoran
 */

import { areaNames } from '../constants/index.js';
import { initButtons, updateUndoRedoUI } from '../ui/buttons.js';
import { pushHistory } from '../state/history.js';
import { updateGrid, setGridSize } from '../scene/grid.js';
import { setAreaNameInput, setFilenameInput } from '../core/state.js';
import { setFormats, getFormats } from '../state/formats.js';

// Grid lock toggle using lock button
export let gridLocked = true;

export function setGridLocked(val) {
  gridLocked = val;
}

/**
 * Returns the current grid-locked state.
 * @returns {boolean}
 */
export function getGridLocked() {
  return gridLocked;
}

export function initUI() {
  //–– Prevent sun‐animation flag bleed
  window.sunAnimationActive = false;

  //–– Random “funny” area & filename on first load
  const areaNameInput  = document.getElementById('areaName');
  const filenameInput  = document.getElementById('filename');

  setAreaNameInput(areaNameInput);
  setFilenameInput(filenameInput);
  if (
    areaNameInput &&
    filenameInput &&
    !areaNameInput.value.trim() &&
    !filenameInput.value.trim()
  ) {
    const idx = Math.floor(Math.random() * areaNames.length);
    areaNameInput.value = areaNames[idx].area;
    filenameInput.value = areaNames[idx].file;
    setAreaNameInput(areaNameInput);
    setFilenameInput(filenameInput);
  }

  //–– Area‐info toggle button
  const toggleBtn         = document.getElementById('toggleAreaInfoBtn');
  const areaInfoContainer = document.getElementById('areaInfoContainer');
  if (toggleBtn && areaInfoContainer) {
    toggleBtn.addEventListener('click', () => {
      areaInfoContainer.classList.toggle('hidden');
      toggleBtn.textContent = areaInfoContainer.classList.contains('hidden') ? '+' : '-';

      // adjust container height for open/closed state
      const areaInfo = document.getElementById('area-info');
      if (areaInfo) {
        areaInfo.classList.remove('expanded-area', 'expanded-room', 'collapsed');
        if (areaInfoContainer.classList.contains('hidden')) {
          areaInfo.classList.add('collapsed');
        } else {
          const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
          areaInfo.classList.add(
            activeTab === 'roomTab' ? 'expanded-room' : 'expanded-area'
          );
        }
      }
    });
  }

  //–– Tab‐switching logic
  const tabButtons  = document.querySelectorAll('.tab-button');
  const tabContents = areaInfoContainer ? areaInfoContainer.querySelectorAll('.tab-content') : [];
  // Track the current active tab for window resize
  let currentTab = document.querySelector('.tab-button.active')?.dataset.tab || 'areaTab';
  function showTab(tabId) {
    currentTab = tabId;
    tabContents.forEach(tab  => tab.classList.toggle('active', tab.id === tabId));
    tabButtons .forEach(btn  => btn.classList.toggle('active', btn.dataset.tab === tabId));
    const activeTab = areaInfoContainer.querySelector('.tab-content.active');
    if (activeTab) areaInfoContainer.style.height = activeTab.scrollHeight + 'px';
  }
  tabButtons.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  window.addEventListener('DOMContentLoaded', () => {
    const initTab = areaInfoContainer.querySelector('.tab-button.active')?.dataset.tab || 'areaTab';
    showTab(initTab);
  });
  window.addEventListener('resize', () => showTab(currentTab));

  //–– Populate export‐format dropdown
  fetch(`./assets/json/formats.json?nocache=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
      const formatsObj         = data.formats || {};
      setFormats(formatsObj);

      const formats = getFormats();

      const exportSelect    = document.getElementById('exportFormat');
      if (exportSelect) {
        exportSelect.innerHTML = '';
        for (const key of Object.keys(formats)) {
          const opt = document.createElement('option');
          opt.value       = key;
          opt.textContent = formats[key].label || key;
          exportSelect.appendChild(opt);
        }
      }
      // helper to show correct file extension
      const extSpan = document.getElementById('filenameExt');
      const filenameInput = document.getElementById('filename');
      function getExt(fmt) {
        const fe = formats[fmt]?.fileExtension?.replace(/^\./, '');
        return fe || (fmt === 'JSON' ? 'json' : ['ROM','AW'].includes(fmt) ? 'are' : 'txt');
      }
      function updateExt() {
        const fmt = exportSelect?.value;
        if (extSpan && fmt) extSpan.textContent = `.${getExt(fmt)}`;
      }
      exportSelect?.addEventListener('change', updateExt);
      updateExt();
    });

  // After initial scene and UI setup, capture baseline history state
  pushHistory();
  updateUndoRedoUI();
  initButtons();

  // --- Grid selector logic ---
    function populateGridDropdown() {
      const options = [
    // Most common square grids
    { label: '10 x 10',   width: 10, height: 10 },
    { label: '16 x 16',   width: 16, height: 16 },
    { label: '20 x 20',   width: 20, height: 20 },
    { label: '30 x 30',   width: 30, height: 30 },
    { label: '40 x 40',   width: 40, height: 40 },
    { label: '50 x 50',   width: 50, height: 50 },
    { label: '60 x 60',   width: 60, height: 60 },
    // Rectangle and specialty grids
    { label: '10 x 30',   width: 10, height: 30 },
    { label: '30 x 10',   width: 30, height: 10 },
    { label: '6 x 40',    width: 6,  height: 40 },
    { label: '40 x 6',    width: 40, height: 6  },
    { label: '12 x 36',   width: 12, height: 36 },
    { label: '36 x 12',   width: 36, height: 12 },
    { label: '16 x 26',   width: 16, height: 26 },
    { label: '26 x 16',   width: 26, height: 16 },
  ];
      gridSelect.innerHTML = '';
      options.forEach((opt, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = opt.label;
        gridSelect.appendChild(option);
      });
      const defaultLabel = '20 x 20';
      let defaultIndex = options.findIndex(opt => opt.label === defaultLabel);
      if (defaultIndex === -1) defaultIndex = 0; // fallback if not found
  
      setGridSize(options[defaultIndex].width, options[defaultIndex].height);
      gridSelect.selectedIndex = defaultIndex;
      updateGrid(options[defaultIndex].width, options[defaultIndex].height);
    }
  
    // Grid dropdown logic (moved here to ensure DOM is ready and layout is stable)
    if (gridSelect) {
      populateGridDropdown();
      gridSelect.addEventListener('change', () => {
        const selected = gridSelect.selectedIndex;
        const option = gridSelect.options[selected];
        const [w, h] = option.textContent.split('x').map(s => parseInt(s.trim()));
        setGridSize(w, h);
        updateGrid(w, h);
      });
    }
}