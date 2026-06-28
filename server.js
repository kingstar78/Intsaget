const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Browser headers
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
};

// Download Post/Reel
app.post('/api/download', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.includes('instagram.com')) {
        return res.json({ error: 'Invalid URL' });
    }

    const match = url.match(/instagram\.com\/(p|reel|tv)\/([^/?]+)/);
    if (!match) return res.json({ error: 'Invalid post URL' });
    
    const shortcode = match[2];
    console.log('📥 Downloading:', shortcode);

    let mediaUrl = null;
    let isVideo = false;

    // Method 1: Embed page
    try {
        const embedRes = await axios.get(`https://www.instagram.com/p/${shortcode}/embed/captioned`, {
            headers,
            timeout: 15000
        });
        const html = embedRes.data;
        
        const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
        const imageMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/);
        const ogVideo = html.match(/property="og:video"\s*content="([^"]+)"/);
        const ogImage = html.match(/property="og:image"\s*content="([^"]+)"/);
        
        if (videoMatch) {
            mediaUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            isVideo = true;
        } else if (ogVideo) {
            mediaUrl = ogVideo[1];
            isVideo = true;
        } else if (imageMatch) {
            mediaUrl = imageMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        } else if (ogImage) {
            mediaUrl = ogImage[1];
        }
    } catch (e) {
        console.log('Method 1 failed');
    }

    // Method 2: Direct page
    if (!mediaUrl) {
        try {
            const pageRes = await axios.get(`https://www.instagram.com/p/${shortcode}/`, {
                headers,
                timeout: 15000
            });
            const html = pageRes.data;
            
            const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
            const ogVideo = html.match(/property="og:video"\s*content="([^"]+)"/);
            const ogImage = html.match(/property="og:image"\s*content="([^"]+)"/);
            
            if (videoMatch) {
                mediaUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
                isVideo = true;
            } else if (ogVideo) {
                mediaUrl = ogVideo[1];
                isVideo = true;
            } else if (ogImage) {
                mediaUrl = ogImage[1];
            }
        } catch (e) {
            console.log('Method 2 failed');
        }
    }

    // Method 3: oEmbed API
    if (!mediaUrl) {
        try {
            const oembedRes = await axios.get(`https://api.instagram.com/oembed?url=https://www.instagram.com/p/${shortcode}/`, {
                timeout: 10000
            });
            if (oembedRes.data && oembedRes.data.thumbnail_url) {
                mediaUrl = oembedRes.data.thumbnail_url;
                isVideo = oembedRes.data.media_type === 'video';
            }
        } catch (e) {
            console.log('Method 3 failed');
        }
    }

    // Fallback CDN
    if (!mediaUrl) {
        mediaUrl = `https://www.instagram.com/p/${shortcode}/media/?size=l`;
    }

    console.log('✅ Success:', isVideo ? 'Video' : 'Image');
    res.json({
        url: mediaUrl,
        type: isVideo ? 'video' : 'image'
    });
});

// Get DP
app.get('/api/dp/:username', async (req, res) => {
    const username = req.params.username.replace('@', '').trim();
    console.log('👤 DP:', username);

    let dpUrl = null;
    let fullName = username;
    let bio = '';

    try {
        const pageRes = await axios.get(`https://www.instagram.com/${username}/`, {
            headers,
            timeout: 10000
        });
        const html = pageRes.data;
        
        const hdMatch = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);
        const normalMatch = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
        const nameMatch = html.match(/"full_name"\s*:\s*"([^"]+)"/);
        const bioMatch = html.match(/"biography"\s*:\s*"([^"]+)"/);
        
        if (hdMatch) {
            dpUrl = hdMatch[1].replace(/\\u0026/g, '&');
        } else if (normalMatch) {
            dpUrl = normalMatch[1].replace(/\\u0026/g, '&');
        }
        if (nameMatch) fullName = nameMatch[1];
        if (bioMatch) bio = bioMatch[1];
    } catch (e) {
        console.log('HD fetch failed, using CDN');
    }

    if (!dpUrl) {
        dpUrl = `https://www.instagram.com/${username}/profile_pic.jpg`;
    }

    res.json({
        url: dpUrl,
        fullName: fullName,
        bio: bio,
        username: username
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n📸 InstaGet Server running on port ${PORT}\n`);
});
