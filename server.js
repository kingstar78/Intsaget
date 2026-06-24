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


// Root route (taki "Cannot GET /" na aaye)
app.get('/', (req, res) => {
    res.send("Server is running! Use /download?url=YOUR_URL");
});

// Download route
app.get('/download', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL is required");
    
    try {
        const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        res.json(JSON.parse(response.data.contents));
    } catch (err) {
        res.status(500).send("Error fetching data");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

