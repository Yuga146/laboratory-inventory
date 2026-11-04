
"use strict";

/*
 LABORATORY INVENTORY APPLICATION
 Requires:
 1. index.html
 2. catalogue-data.js
 3. app.js
*/

const $ = id => document.getElementById(id);

const q = $("q");
const section = $("section");
const limit = $("limit");
const cards = $("cards");
const count = $("count");
const pager = $("pager");
const status = $("status");
const prev = $("prev");
const next = $("next");
const dialog = $("addDialog");
const form = $("addForm");

const STORAGE_KEY = "lab_inventory_added_v1";
const THEME_KEY = "lab_inventory_theme_v1";

let addedTests = [];
let currentPage = 1;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getCatalogue() {
  const original = Array.isArray(CATALOGUE_DATA)
    ? CATALOGUE_DATA
    : [];

  return [...original, ...addedTests];
}

function loadAddedTests() {
  try {
    const saved = JSON.parse(
      readStorage(STORAGE_KEY) || "[]"
    );

    addedTests = Array.isArray(saved)
      ? saved.filter(isValidTest)
      : [];
  } catch (error) {
    addedTests = [];
  }
}

function isValidTest(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.name === "string" &&
    item.name.trim() !== "" &&
    typeof item.code === "string" &&
    item.code.trim() !== "" &&
    typeof item.section === "string" &&
    item.section.trim() !== ""
  );
}

function saveAddedTests() {
  return writeStorage(
    STORAGE_KEY,
    JSON.stringify(addedTests)
  );
}

function populateCategories() {
  const selected = section.value;

  const categories = [
    ...new Set(
      getCatalogue()
        .map(item => item.section)
        .filter(Boolean)
    )
  ].sort();

  section.innerHTML =
    '<option value="">All categories</option>';

  const formSection = form.elements.section;

  formSection.innerHTML =
    '<option value="">Select category</option>';

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;

    section.appendChild(option);

    const formOption = option.cloneNode(true);
    formSection.appendChild(formOption);
  });

  section.value = selected;
}

function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Price: Confirm with Pantai";
  }

  if (typeof value === "number") {
    return "RM" + value.toFixed(2);
  }

  return String(value);
}

function isCallLab(item) {
  const price = normalize(item.price);

  return (
    item.callLab === true ||
    price.includes("call") ||
    price.includes("refer lab") ||
    price.includes("refer to lab")
  );
}

function searchableText(item) {
  const components = Array.isArray(item.components)
    ? item.components
    : [];

  return [
    item.name,
    item.code,
    item.section,
    item.specimen,
    item.collection,
    item.fasting,
    ...components
  ].join(" ").toLowerCase();
}

function getFilteredTests() {
  const keyword = normalize(q.value);
  const selectedCategory = section.value;

  return getCatalogue().filter(item => {
    const matchesSearch =
      !keyword ||
      searchableText(item).includes(keyword);

    const matchesCategory =
      !selectedCategory ||
      item.section === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

function renderComponents(item) {
  const components = Array.isArray(item.components)
    ? item.components.filter(Boolean)
    : [];

  if (!components.length) {
    return "";
  }

  return `
    <details class="package-details">
      <summary>
        + View more — ${components.length} included tests
      </summary>

      <ol class="included-tests">
        ${components.map(test =>
          `<li>${escapeHTML(test)}</li>`
        ).join("")}
      </ol>
    </details>
  `;
}

function renderCallLab(item) {
  if (!isCallLab(item)) {
    return "";
  }

  return `
    <div class="call-lab">
      <strong>Call Pantai to confirm</strong>

      <div class="lab-links">
        <a href="tel:0333854337">
          03-3385 4337
        </a>

        <a href="tel:034289115">
          03-4289 115
        </a>

        <a
          href="https://wa.me/60123930199"
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp: 012-393 0199
        </a>
      </div>
    </div>
  `;
}

function renderCard(item) {
  const specimen = item.specimen
    ? escapeHTML(item.specimen)
    : '<span class="unconfirmed">Not confirmed in extracted record</span>';

  const fasting = item.fasting
    ? escapeHTML(item.fasting)
    : '<span class="unconfirmed">Not specified — confirm with lab</span>';

  const collection = item.collection
    ? `
      <div class="specimen">
        <strong>Collection:</strong>
        ${escapeHTML(item.collection)}
      </div>
    `
    : "";

  return `
    <article class="card">

      <div class="meta">
        ${escapeHTML(item.section)}
      </div>

      <h3>${escapeHTML(item.name)}</h3>

      <div class="code-line">
        <strong>
          Code:
          <span class="test-code-value">
            ${escapeHTML(item.code)}
          </span>
        </strong>
      </div>

      <div class="price">
        ${escapeHTML(formatPrice(item.price))}
      </div>

      <div class="specimen">
        <strong>Specimen / quantity:</strong>
        ${specimen}
      </div>

      <div class="specimen">
        <strong>Fasting:</strong>
        ${fasting}
      </div>

      ${collection}

      ${renderComponents(item)}

      ${renderCallLab(item)}

    </article>
  `;
}

function render() {
  const filtered = getFilteredTests();

  count.textContent =
    `${filtered.length} matching catalogue entries`;

  const selectedLimit = limit.value;

  const pageSize = selectedLimit === "all"
    ? Math.max(filtered.length, 1)
    : Number(selectedLimit);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  currentPage = Math.min(
    Math.max(currentPage, 1),
    totalPages
  );

  const start = (currentPage - 1) * pageSize;

  const visible = filtered.slice(
    start,
    start + pageSize
  );

  if (!visible.length) {
    cards.innerHTML =
      '<p class="note">No matching tests found.</p>';
  } else {
    cards.innerHTML = visible
      .map(renderCard)
      .join("");
  }

  status.textContent =
    `${currentPage} / ${totalPages}`;

  prev.disabled = currentPage <= 1;
  next.disabled = currentPage >= totalPages;

  pager.hidden =
    filtered.length === 0 ||
    selectedLimit === "all";
}

function resetPageAndRender() {
  currentPage = 1;
  render();
}

function setTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle(
    "dark",
    dark
  );

  $("theme").textContent = dark
    ? "Light theme"
    : "Dark theme";

  writeStorage(
    THEME_KEY,
    dark ? "dark" : "light"
  );
}

function downloadJSON(data, filename) {
  const content = JSON.stringify(
    data,
    null,
    2
  );

  const blob = new Blob(
    [content],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function handleAddTest(event) {
  event.preventDefault();

  $("formError").textContent = "";

  const data = new FormData(form);

  const name = String(
    data.get("name") || ""
  ).trim();

  const code = String(
    data.get("code") || ""
  ).trim();

  const price = Number(
    data.get("price")
  );

  const category = String(
    data.get("section") || ""
  ).trim();

  if (
    !name ||
    !code ||
    !category ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    $("formError").textContent =
      "Please complete all required fields.";
    return;
  }

  const duplicate = getCatalogue().some(item =>
    normalize(item.code) === normalize(code) &&
    normalize(item.name) === normalize(name)
  );

  if (duplicate) {
    $("formError").textContent =
      "A test with this name and code already exists.";
    return;
  }

  const components = String(
    data.get("components") || ""
  )
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(Boolean);

  const newTest = {
    name,
    code,
    price: "RM" + price.toFixed(2),
    section: category,
    specimen: String(
      data.get("specimen") || ""
    ).trim(),
    collection: String(
      data.get("collection") || ""
    ).trim(),
    components,
    userAdded: true
  };

  addedTests.push(newTest);

  if (!saveAddedTests()) {
    alert(
      "The test was added for this session, " +
      "but browser storage is unavailable. " +
      "Please export your added tests."
    );
  }

  populateCategories();
  resetPageAndRender();

  form.reset();
  dialog.close();
}

function initializeEvents() {
  q.addEventListener(
    "input",
    resetPageAndRender
  );

  section.addEventListener(
    "change",
    resetPageAndRender
  );

  limit.addEventListener(
    "change",
    resetPageAndRender
  );

  $("clear").addEventListener("click", () => {
    q.value = "";
    section.value = "";
    limit.value = "24";
    resetPageAndRender();
  });

  prev.addEventListener("click", () => {
    currentPage--;
    render();
    window.scrollTo({ top: 0 });
  });

  next.addEventListener("click", () => {
    currentPage++;
    render();
    window.scrollTo({ top: 0 });
  });

  $("theme").addEventListener("click", () => {
    const isDark = document.body.classList
      .contains("dark");

    setTheme(isDark ? "light" : "dark");
  });

  $("add").addEventListener("click", () => {
    dialog.showModal();
  });

  $("cancel").addEventListener("click", () => {
    dialog.close();
  });

  form.addEventListener(
    "submit",
    handleAddTest
  );

  $("export").addEventListener("click", () => {
    downloadJSON(
      addedTests,
      "laboratory-added-tests.json"
    );
  });

  $("import").addEventListener("click", () => {
    $("importfile").click();
  });

  $("importfile").addEventListener(
    "change",
    async event => {
      const file = event.target.files[0];

      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (!Array.isArray(imported)) {
          throw new Error(
            "JSON must contain an array of tests."
          );
        }

        let importedCount = 0;

        for (const item of imported) {
          if (!isValidTest(item)) {
            continue;
          }

          const duplicate = getCatalogue().some(
            existing =>
              normalize(existing.code) ===
                normalize(item.code) &&
              normalize(existing.name) ===
                normalize(item.name)
          );

          if (!duplicate) {
            addedTests.push(item);
            importedCount++;
          }
        }

        saveAddedTests();
        populateCategories();
        resetPageAndRender();

        alert(
          `${importedCount} new tests imported.`
        );

      } catch (error) {
        alert(
          "Unable to import file: " +
          error.message
        );
      }

      event.target.value = "";
    }
  );
}

function initialize() {
  loadAddedTests();

  populateCategories();

  setTheme(
    readStorage(THEME_KEY) || "light"
  );

  initializeEvents();

  render();
}

initialize();
