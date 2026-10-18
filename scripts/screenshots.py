# Full-page preview screenshots (desktop 1440 / mobile 390) + lead-form failure state.
# Usage: python3 scripts/screenshots.py [base_url]
import sys, asyncio
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173/"
OUT = "screenshots"

async def settle(page):
    await page.wait_for_load_state("networkidle")
    await page.evaluate("document.fonts.ready")
    h = await page.evaluate("document.body.scrollHeight")
    y = 0
    while y < h:
        await page.evaluate(f"window.scrollTo(0, {y})")
        await page.wait_for_timeout(120)
        y += 500
        h = await page.evaluate("document.body.scrollHeight")
    await page.evaluate("document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('is-visible'))")
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(1200)

async def shoot(p, name, width, height, mobile):
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = await b.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    await page.goto(BASE)
    await settle(page)
    await page.screenshot(path=f"{OUT}/{name}-full.png", full_page=True)
    await page.screenshot(path=f"{OUT}/{name}-fold.png")

    # interactive states: slider to 15%, pick 2 stars
    await page.locator(".ba-range").evaluate("el => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,'22'); el.dispatchEvent(new Event('input',{bubbles:true})); }")
    await page.locator(".star-row button").nth(1).click()
    await page.locator(".compare-section").scroll_into_view_if_needed()
    await page.wait_for_timeout(500)
    await page.locator(".compare-section").screenshot(path=f"{OUT}/{name}-slider.png")
    await page.locator(".reviews-section").screenshot(path=f"{OUT}/{name}-stars.png")

    # lead form with no env vars configured -> fallback, not fake success
    await page.evaluate("window.scrollTo(0,0)")
    await page.locator(".nav-cta, .nav-toggle").first.click() if not mobile else None
    if mobile:
        await page.locator(".local-card .btn-primary").click()
    await page.fill(".modal-card input[autocomplete=name]", "Jane Smith")
    await page.fill(".modal-card input[autocomplete=organization]", "Main Street Auto Repair")
    await page.fill(".modal-card input[type=email]", "jane@example.com")
    await page.locator(".consent-row input").check()
    await page.locator(".modal-card button[type=submit]").click()
    await page.wait_for_selector(".fallback", timeout=8000)
    await page.wait_for_timeout(400)
    await page.screenshot(path=f"{OUT}/{name}-lead-fallback.png")
    print(name, "errors:", errors or "none")
    await b.close()

async def main():
    async with async_playwright() as p:
        await shoot(p, "desktop-1440", 1440, 900, False)
        await shoot(p, "mobile-390", 390, 844, True)

asyncio.run(main())
