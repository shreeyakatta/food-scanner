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
