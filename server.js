const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Purana: app.use(cors());
// Naya:
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST"],
  credentials: true
}));


app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL is required");

    try {
        // AllOrigins ke bajaye direct fetch try karte hain
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        res.send(response.data); // Yahan se aapko raw HTML milega
    } catch (err) {
        res.status(500).send("Error: Proxy blocked or invalid URL");
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

