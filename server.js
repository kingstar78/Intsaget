const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const videoUrl = $('meta[property="og:video"]').attr('content');
        const thumbUrl = $('meta[property="og:image"]').attr('content');
        const title = $('meta[property="og:title"]').attr('content');

        if (!videoUrl) throw new Error("Video not found");

        res.json({
            video: videoUrl,
            thumbnail: thumbUrl,
            caption: title
        });
    } catch (err) {
        console.error("Scraping Error:", err.message); // Ye Render logs mein dikhega
        res.status(500).json({ error: "Failed to fetch media" });
    }
});

app.listen(process.env.PORT || 3000);
