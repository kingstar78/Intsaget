const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
        });

        // Cheerio ka use karke og:video tag nikalna (isse Instagram block nahi kar payega)
        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        const videoUrl = $('meta[property="og:video"]').attr('content');

        res.json({
            video: videoUrl,
            thumbnail: $('meta[property="og:image"]').attr('content'),
            caption: $('meta[property="og:title"]').attr('content')
        });
    }
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch" });
    }
});

app.listen(process.env.PORT || 3000);
