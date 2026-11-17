document.getElementById("searchBtn").addEventListener("click", () => {
  lookup(document.getElementById("code").value.trim());
});
document.getElementById("cameraBtn").addEventListener("click", startCamera);
document.getElementById("labelBtn").addEventListener("click", readLabel);

const NON_VEG_WORDS = [
  "gelatin", "gelatine", "carmine", "cochineal", "lard", "tallow",
  "fish", "chicken", "beef", "pork", "mutton", "egg", "eggs",
  "anchovy", "shellac", "isinglass", "meat", "bone"
];

let scanner = null;

// ---------- helpers ----------

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showMessage(msg) {
  document.getElementById("resultCard").innerHTML = "";
  document.getElementById("out").textContent = msg;
}

function vegStatus(tags, ingredientsText) {
  tags = tags || [];
  if (tags.includes("en:non-vegetarian")) {
    return { cls: "nonveg", label: "Non-veg" };
  }
  if (tags.includes("en:vegetarian")) {
    return { cls: "veg", label: "Vegetarian" };
  }

  const text = (ingredientsText || "").toLowerCase();
  const hits = NON_VEG_WORDS.filter(w => new RegExp("\\b" + w + "\\b").test(text));

  if (hits.length > 0) {
    return { cls: "nonveg", label: "May be non-veg: " + hits.join(", ") };
  }
  if (text) {
    return { cls: "veg", label: "Likely veg" };
  }
  return { cls: "unknown", label: "Unknown" };
}

// ---------- camera ----------

function startCamera() {
  scanner = new Html5Qrcode("reader");
  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    (decodedText) => {
      scanner.stop();
      document.getElementById("code").value = decodedText;
      lookup(decodedText);
    },
    () => {}
  ).catch((err) => {
    showMessage("Camera error: " + err);
  });
}

// ---------- barcode lookup ----------

async function lookup(code) {
  showMessage("Loading...");

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();

    if (data.status === 0) {
      showMessage("Product not found for barcode " + code + ".\nTry reading the label instead.");
      return;
    }

    showProduct(data.product);
  } catch (err) {
    showMessage("Error: " + err.message);
  }
}

function showProduct(p) {
  const status = vegStatus(p.ingredients_analysis_tags, p.ingredients_text);

  const grade = (p.nutriscore_grade || "").toUpperCase();
  const validGrade = grade.length === 1 && "ABCDE".includes(grade);
  const gradeClass = validGrade ? "n-" + grade : "n-unknown";
  const gradeText = validGrade ? grade : "?";

  const img = p.image_front_small_url || p.image_url || "";

  document.getElementById("out").textContent = "";
  document.getElementById("resultCard").innerHTML = `
    <div class="product">
      ${img ? `<img src="${esc(img)}" alt="Product photo">` : ""}
      <div>
        <h3>${esc(p.product_name || "Unnamed product")}</h3>
        <div class="badges">
          <span class="vegbadge ${status.cls}"><span class="dot"></span>${esc(status.label)}</span>
          <span class="nutri ${gradeClass}">Nutri-Score ${gradeText}</span>
        </div>
      </div>
    </div>
    <h4>Ingredients</h4>
    <p>${esc(p.ingredients_text || "Not available")}</p>
  `;
}

// ---------- label reading (Tesseract) ----------

async function readLabel() {
  const file = document.getElementById("labelPhoto").files[0];

  if (!file) {
    showMessage("Choose a photo first");
    return;
  }

  showMessage("Reading label... this can take 10-30 seconds");

  try {
    const result = await Tesseract.recognize(file, "eng");
    const text = result.data.text;
    showMessage(analyseLabel(text) + "\n\n--- Raw text ---\n" + text);
  } catch (err) {
    showMessage("Error: " + err.message);
  }
}

function analyseLabel(text) {
  const lower = text.toLowerCase();

  const hits = NON_VEG_WORDS.filter(w =>
    new RegExp("\\b" + w + "\\b").test(lower)
  );

  const vegResult = hits.length === 0
    ? "Veg check: no non-veg words found (also check the green/brown dot on the pack)"
    : "Veg check: MAY BE NON-VEG, found: " + hits.join(", ");

  const dateLines = text.split("\n").filter(line =>
    /\b(best before|use by|expiry|exp|mfg|pkd|packed|manufactured)\b/i.test(line)
  );

  const dateResult = dateLines.length === 0
    ? "Dates: not found, try a closer photo of the date stamp"
    : "Dates:\n" + dateLines.join("\n");

  return vegResult + "\n\n" + dateResult;
}
