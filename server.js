const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    try {
        // Hum request ko browser jaisa dikhayenge
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        const $ = cheerio.load(data);
        // Instagram ke meta tags
        const video = $('meta[property="og:video"]').attr('content');
        
        if (!video) {
            return res.status(400).json({ error: "Video source not found, make sure URL is public." });
        }

        res.json({ video: video });
    } catch (err) {
        // Agar error 403 hai, toh server-side restriction hai
        res.status(500).json({ error: "Server restricted by Instagram. Use a scraping API." });
    }
});

app.listen(process.env.PORT || 3000);
