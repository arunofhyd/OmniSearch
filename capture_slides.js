const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function captureSlides() {
    console.log("Launching headless browser to capture 4K Retina slides...");
    const browser = await puppeteer.launch({
        executablePath: '/Users/arunthomas/.cache/puppeteer/chrome-headless-shell/mac_arm-151.0.7922.47/chrome-headless-shell-mac-arm64/chrome-headless-shell',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2 // 4K Retina Rendering
    });

    await page.goto('file:///Users/arunthomas/.gemini/antigravity-ide/scratch/OmniSearch/index.html', { waitUntil: 'load' });

    // Hide navbar and remove padding for clean 16:9 full-screen slide capture
    await page.evaluate(() => {
        const nav = document.getElementById('presentation-nav');
        if (nav) nav.style.display = 'none';
        
        const deck = document.getElementById('presentation-deck');
        if (deck) {
            deck.style.paddingTop = '0px';
            deck.style.height = '100vh';
        }

        document.querySelectorAll('.slide-container').forEach(slide => {
            slide.style.height = '100vh';
            slide.style.minHeight = '100vh';
        });

        // Ensure all fade-up elements are visible
        document.querySelectorAll('.fade-up').forEach(el => {
            el.classList.add('visible');
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });

    const slideCount = await page.evaluate(() => document.querySelectorAll('.slide-container').length);
    console.log(`Found ${slideCount} slides.`);

    const outputDir = path.join(__dirname, 'slide_images');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (let i = 0; i < slideCount; i++) {
        // Explicitly set presentation-deck.scrollTop to exact offsetTop of slide i
        await page.evaluate((idx) => {
            const deck = document.getElementById('presentation-deck');
            const slides = document.querySelectorAll('.slide-container');
            if (deck && slides[idx]) {
                deck.scrollTop = slides[idx].offsetTop;
            }
        }, i);

        // Brief delay for rendering & animations
        await new Promise(r => setTimeout(r, 600));

        const imagePath = path.join(outputDir, `slide_${String(i + 1).padStart(2, '0')}.png`);
        await page.screenshot({ path: imagePath, type: 'png', fullPage: false });
        console.log(`Captured slide ${i + 1}/${slideCount} -> ${imagePath}`);
    }

    await browser.close();
    console.log("All 10 unique slide captures complete!");
}

captureSlides().catch(err => {
    console.error("Error capturing slides:", err);
    process.exit(1);
});
