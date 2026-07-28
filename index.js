const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
// Mengizinkan GitHub Pages milikmu mengakses API ini
app.use(cors());
app.use(express.json());

app.post('/cek', async (req, res) => {
    const { nomor } = req.body;

    if (!nomor) {
        return res.status(400).json({ error: 'Nomor tidak diberikan' });
    }

    let browser;
    try {
        // Konfigurasi Puppeteer untuk server Linux (Render)
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Buka Shopee
        await page.goto("https://shopee.co.id/buyer/login", { waitUntil: "networkidle2" });
        
        // Ketik nomor
        await page.waitForSelector('input[name="loginKey"]', { timeout: 10000 });
        await page.type('input[name="loginKey"]', nomor, { delay: 100 });
        
        // Klik Berikutnya
        const btnNext = await page.$('button.btn-solid-primary'); 
        if (btnNext) {
            await btnNext.click();
        }
        
        // Tunggu respon Shopee
        await new Promise(r => setTimeout(r, 3000));
        
        // Analisis Halaman
        const pageContent = await page.content();
        const htmlLower = pageContent.toLowerCase();
        
        let status = "UNKNOWN";
        if (htmlLower.includes("password") || htmlLower.includes("log in dengan password")) {
            status = "TERDAFTAR";
        } else if (htmlLower.includes("verifikasi") || htmlLower.includes("puzzle") || htmlLower.includes("geser")) {
            status = "BELUM_TERDAFTAR";
        }
        
        await browser.close();
        res.json({ nomor: nomor, status: status });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

// Menjalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
