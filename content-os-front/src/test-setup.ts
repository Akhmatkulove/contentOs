// Runs before every test file (vite.config.ts → test.setupFiles).

// jsdom has no scrollIntoView; Reka's Listbox calls it on the highlighted option.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
