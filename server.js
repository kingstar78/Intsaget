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
        // Hum yahan 'Referer' header add kar rahe hain taaki Instagram ko lage ki request sahi jagah se aayi hai
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            }
        });

        const $ = cheerio.load(response.data);
        const videoUrl = $('meta[property="og:video"]').attr('content');
        
        if (!videoUrl) {
            return res.status(404).json({ error: "Video tag nahi mila, link public hai?" });
        }

        res.json({ video: videoUrl });
    } catch (err) {
        // Yahan error details print hogi
        console.error("DEBUG ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000);
