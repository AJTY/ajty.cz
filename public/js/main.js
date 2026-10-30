import { initCopyButtons } from "./copy.js";

initCopyButtons(document);

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
