document.getElementById("searchBtn").addEventListener("click", lookup);

async function lookup() {
  const code = document.getElementById("code").value.trim();
  const out = document.getElementById("out");
  out.textContent = "Loading...";

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();

    if (data.status === 0) {
      out.textContent = "Product not found";
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
