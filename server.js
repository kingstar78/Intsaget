const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
    const { url } = req.query;
    try {
        // Yahan aap apna Scraping logic ya API key rotation daalenge
        const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        res.json(JSON.parse(response.data.contents));
    } catch (err) {
        res.status(500).send("Error fetching data");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
