import puppeteer from "puppeteer";

async function check() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle2" });
  
  // Fill login form
  const emailInput = await page.$('input[type="text"], input[type="email"]');
  const pwdInput = await page.$('input[type="password"]');
  if (emailInput && pwdInput) {
    await emailInput.type("admin@altvira.id");
    await pwdInput.type("admin123");
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
    }
  }
  await new Promise((r) => setTimeout(r, 2000));

  const report = await page.evaluate(() => {
    // Get the desktop sidebar nav (inside aside or portal shell)
    const nav = document.querySelector("aside nav");
    if (!nav) return { error: "No aside nav found" };

    const navStyle = window.getComputedStyle(nav);
    const children = Array.from(nav.children);

    const items = children.map((el, i) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const btn = el.querySelector("button") || el.querySelector("a") || el;
      const btnRect = btn.getBoundingClientRect();
      const btnStyle = window.getComputedStyle(btn);
      return {
        index: i,
        tagName: el.tagName,
        className: el.className,
        text: el.innerText.trim().split("\n")[0],
        outerHeight: rect.height,
        btnHeight: btnRect.height,
        top: rect.top,
        bottom: rect.bottom,
        btnTop: btnRect.top,
        btnBottom: btnRect.bottom,
        marginTop: style.marginTop,
        marginBottom: style.marginBottom,
        btnMinHeight: btnStyle.minHeight,
        btnLineHeight: btnStyle.lineHeight,
      };
    });

    return {
      navClass: nav.className,
      navDisplay: navStyle.display,
      items,
    };
  });

  console.log("NAV INFO:", report.navClass, report.navDisplay);
  if (report.items) {
    for (let i = 0; i < report.items.length; i++) {
      const cur = report.items[i];
      console.log(`[Item ${i}] "${cur.text}": outerH=${cur.outerHeight}px, btnH=${cur.btnHeight}px, top=${cur.top}, bottom=${cur.bottom}, marginTop=${cur.marginTop}`);
      if (i > 0) {
        const prev = report.items[i - 1];
        const gapOuter = cur.top - prev.bottom;
        const gapBtn = cur.btnTop - prev.btnBottom;
        console.log(`   -> GAP between [${i-1}] and [${i}]: outerGap=${gapOuter}px, btnGap=${gapBtn}px`);
      }
    }
  }

  await browser.close();
}

check().catch(console.error);
