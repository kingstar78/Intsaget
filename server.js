const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const response = await axios.get(`${url}?__a=1&__d=dis`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const data = response.data.graphql.shortcode_media;
        res.json({
            video: data.video_url,
            thumbnail: data.display_url,
            caption: data.edge_media_to_caption.edges[0]?.node.text || "No caption"
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch" });
    }
});

app.listen(process.env.PORT || 3000);
