/**
 * @file assets/js/state/formats.js
 * @description Handles loading, storing, and exporting map data formats.
 * @module state/formats
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

export let formats = {};

export function setFormats(obj) {
  formats = obj || {};
}

export function getFormats() {
  return formats;
}