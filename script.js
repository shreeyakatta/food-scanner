document.getElementById("searchBtn").addEventListener("click", () => {
  const code = document.getElementById("code").value.trim();
  lookup(code);
});

document.getElementById("cameraBtn").addEventListener("click", startCamera);

let scanner = null;

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
    document.getElementById("out").textContent = "Camera error: " + err;
  });
}

async function lookup(code) {
  const out = document.getElementById("out");
  out.textContent = "Loading...";

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();

    if (data.status === 0) {
      out.textContent = "Product not found for barcode " + code;
      return;
    }

    const p = data.product;
    out.textContent =
      "Name: " + p.product_name + "\n" +
      "Ingredients: " + p.ingredients_text + "\n" +
      "Diet tags: " + (p.ingredients_analysis_tags || []).join(", ") + "\n" +
      "Nutri-Score: " + p.nutriscore_grade;
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
}
document.getElementById("labelBtn").addEventListener("click", readLabel);

const NON_VEG_WORDS = [
  "gelatin", "gelatine", "carmine", "cochineal", "lard", "tallow",
  "fish", "chicken", "beef", "pork", "mutton", "egg", "eggs",
  "anchovy", "shellac", "isinglass", "meat", "bone"
];

async function readLabel() {
  const file = document.getElementById("labelPhoto").files[0];
  const out = document.getElementById("out");

  if (!file) {
    out.textContent = "Choose a photo first";
    return;
  }

  out.textContent = "Reading label... this can take 10-30 seconds";

  try {
    const result = await Tesseract.recognize(file, "eng");
    const text = result.data.text;
    out.textContent = analyseLabel(text) + "\n\n--- Raw text ---\n" + text;
  } catch (err) {
    out.textContent = "Error: " + err.message;
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
