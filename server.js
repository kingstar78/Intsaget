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
        // AllOrigins proxy ka use kar rahe hain
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await axios.get(proxyUrl);
        
        const html = response.data.contents;
        const $ = cheerio.load(html);
        
        // Meta tags extract karna
        const videoUrl = $('meta[property="og:video"]').attr('content');
        
        if (!videoUrl) {
            return res.status(404).json({ error: "Video nahi mila, link check karein" });
        }

        res.json({ video: videoUrl });
    } catch (err) {
        console.error("PROXY ERROR:", err.message);
        res.status(500).json({ error: "Proxy connection failed" });
    }
});

app.listen(process.env.PORT || 3000);
