const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(express.static("public")); // Serve index.html and other assets from 'public'

// Function to scrape table data
async function scrapeTable(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector("table");

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    return rows.map((row, index) => {
      const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
        cell.innerText.trim()
      );
      return {
        id: index + 1,
        bank: (cells[0]?.split("\n")[1] || cells[0] || "").trim(),
        type: cells[1] || "",
        interest: cells[2] || "",
        minimum: cells[3] || "",
        tenure: cells[4] || "",
      };
    });
  });

  await browser.close();
  return data;
}

// Route: Scrape savings deposit and save as savinglist.js
app.get("/scrape-savings", async (req, res) => {
  try {
    const data = await scrapeTable(
      "https://bankbyaj.com/detail/current-savings"
    );

    // ✅ Store globally on window
    const jsContent = `window.savinglist = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync("public/savinglist.js", jsContent, "utf-8");

    res.send("✅ Savings data scraped and saved to savinglist.js!");
  } catch (error) {
    res.status(500).send("❌ Error scraping savings data: " + error.message);
  }
});

// Route: Scrape fixed deposit and save as fixedlist.js
app.get("/scrape-fixed", async (req, res) => {
  try {
    const data = await scrapeTable("https://bankbyaj.com/detail/fd-individual");

    // ✅ Store globally on window
    const jsContent = `window.fixedlist = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync("public/fixedlist.js", jsContent, "utf-8");

    res.send("✅ Fixed deposit data scraped and saved to fixedlist.js!");
  } catch (error) {
    res
      .status(500)
      .send("❌ Error scraping fixed deposit data: " + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
