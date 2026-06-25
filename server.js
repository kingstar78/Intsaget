const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL missing" });

    try {
        // Bina proxy ke direct request try karte hain (kabhi-kabhi ye best hota hai)
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const videoUrl = $('meta[property="og:video"]').attr('content');
        
        if (!videoUrl) {
            return res.status(404).json({ error: "Video tag not found in HTML" });
        }

        res.json({ video: videoUrl });
    } catch (err) {
        // Yahan error detail aayegi
        console.error("SERVER ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
