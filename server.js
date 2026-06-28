const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Instagram session cookie - Get from your browser after logging into Instagram
// Open Instagram.com → F12 → Application → Cookies → instagram.com → sessionid
const SESSION_ID = process.env.INSTAGRAM_SESSION_ID || '';

// Headers that mimic a real browser
const getHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cookie': SESSION_ID ? `sessionid=${SESSION_ID};` : '',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
});

// ============ API: Extract Media ============
app.post('/api/extract', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !url.includes('instagram.com')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid Instagram URL' 
            });
        }

        console.log('📥 Fetching:', url);
        
        // Extract shortcode
        const shortcode = extractShortcode(url);
        if (!shortcode) {
            return res.status(400).json({ 
                success: false, 
                error: 'Could not extract post ID' 
            });
        }

        // Method 1: Try Instagram's embed API (most reliable)
        try {
            const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned`;
            const response = await axios.get(embedUrl, { 
                headers: getHeaders(),
                timeout: 10000 
            });
            
            const html = response.data;
            const mediaData = extractFromEmbed(html);
            
            if (mediaData && (mediaData.videoUrl || mediaData.imageUrl)) {
                console.log('✅ Found via embed API');
                return res.json({ 
                    success: true, 
                    data: mediaData,
                    method: 'embed'
                });
            }
        } catch (e) {
            console.log('Embed method failed, trying alternate...');
        }

        // Method 2: Try page scraping
        try {
            const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
            const response = await axios.get(pageUrl, { 
                headers: getHeaders(),
                timeout: 10000 
            });
            
            const html = response.data;
            const mediaData = extractFromPage(html);
            
            if (mediaData && (mediaData.videoUrl || mediaData.imageUrl)) {
                console.log('✅ Found via page scraping');
                return res.json({ 
                    success: true, 
                    data: mediaData,
                    method: 'scraping'
                });
            }
        } catch (e) {
            console.log('Page scraping failed, trying API...');
        }

        // Method 3: Try Instagram's internal API
        try {
            const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=1`;
            const response = await axios.get(apiUrl, { 
                headers: {
                    ...getHeaders(),
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 10000 
            });
            
            const data = response.data;
            const mediaData = extractFromAPI(data);
            
            if (mediaData && (mediaData.videoUrl || mediaData.imageUrl)) {
                console.log('✅ Found via API');
                return res.json({ 
                    success: true, 
                    data: mediaData,
                    method: 'api'
                });
            }
        } catch (e) {
            console.log('API method failed');
        }

        return res.status(404).json({ 
            success: false, 
            error: 'Could not extract media. Post might be private or deleted.' 
        });

    } catch (error) {
        console.error('❌ Server Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again.' 
        });
    }
});

// ============ API: Get Profile Picture ============
app.get('/api/dp/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const cleanUsername = username.replace('@', '').trim();
        
        console.log('👤 Fetching DP for:', cleanUsername);
        
        // Method 1: Try page scraping for HD image
        try {
            const pageUrl = `https://www.instagram.com/${cleanUsername}/`;
            const response = await axios.get(pageUrl, { 
                headers: getHeaders(),
                timeout: 8000 
            });
            
            const html = response.data;
            
            // Look for HD profile pic
            const hdMatch = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);
            const normalMatch = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
            
            if (hdMatch || normalMatch) {
                const dpUrl = (hdMatch || normalMatch)[1].replace(/\\u0026/g, '&');
                console.log('✅ DP found via scraping');
                return res.json({ 
                    success: true, 
                    url: dpUrl,
                    username: cleanUsername,
                    quality: hdMatch ? 'hd' : 'normal'
                });
            }
        } catch (e) {
            console.log('Scraping failed, trying API...');
        }

        // Method 2: Try API
        try {
            const apiUrl = `https://www.instagram.com/${cleanUsername}/?__a=1&__d=1`;
            const response = await axios.get(apiUrl, { 
                headers: {
                    ...getHeaders(),
                    'Accept': 'application/json',
                },
                timeout: 8000 
            });
            
            const data = response.data;
            const user = data?.graphql?.user || data?.user;
            
            if (user?.profile_pic_url_hd || user?.profile_pic_url) {
                const dpUrl = (user.profile_pic_url_hd || user.profile_pic_url).replace(/\\u0026/g, '&');
                console.log('✅ DP found via API');
                return res.json({ 
                    success: true, 
                    url: dpUrl,
                    username: cleanUsername,
                    quality: user.profile_pic_url_hd ? 'hd' : 'normal'
                });
            }
        } catch (e) {
            console.log('API method failed, using CDN fallback...');
        }

        // Method 3: Direct CDN fallback (always works for public accounts)
        const cdnUrl = `https://www.instagram.com/${cleanUsername}/profile_pic.jpg`;
        console.log('✅ Using CDN fallback');
        return res.json({ 
            success: true, 
            url: cdnUrl,
            username: cleanUsername,
            quality: 'standard'
        });

    } catch (error) {
        console.error('❌ DP Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch profile picture' 
        });
    }
});

// ============ Helper Functions ============
function extractShortcode(url) {
    const patterns = [
        /instagram\.com\/p\/([^/?]+)/,
        /instagram\.com\/reel\/([^/?]+)/,
        /instagram\.com\/tv\/([^/?]+)/,
        /instagram\.com\/stories\/([^/?]+)/,
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function extractFromEmbed(html) {
    const result = {
        imageUrl: null,
        videoUrl: null,
        isVideo: false,
        isCarousel: false,
        items: []
    };

    // Extract JSON config from embed
    const jsonMatch = html.match(/<script type="application\/json"[^>]*>(.*?)<\/script>/);
    if (jsonMatch) {
        try {
            const data = JSON.parse(jsonMatch[1]);
            // Navigate through embed data structure
            const media = data?.shortcode_media || data?.graphql?.shortcode_media;
            
            if (media) {
                if (media.video_url) {
                    result.videoUrl = media.video_url;
                    result.isVideo = true;
                    result.imageUrl = media.thumbnail_url || media.display_url;
                } else if (media.display_url) {
                    result.imageUrl = media.display_url;
                }
            }
        } catch (e) {}
    }

    // Fallback: Check meta tags
    if (!result.videoUrl && !result.imageUrl) {
        const ogVideo = html.match(/property="og:video"[^>]*content="([^"]+)"/);
        const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/);
        
        if (ogVideo) {
            result.videoUrl = ogVideo[1];
            result.isVideo = true;
        }
        if (ogImage) {
            result.imageUrl = ogImage[1];
        }
    }

    return result;
}

function extractFromPage(html) {
    const result = {
        imageUrl: null,
        videoUrl: null,
        isVideo: false,
        items: []
    };

    // Extract from JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
    if (jsonLdMatch) {
        try {
            const data = JSON.parse(jsonLdMatch[1]);
            if (data.video && data.video.length > 0) {
                result.videoUrl = data.video[0].contentUrl;
                result.isVideo = true;
                result.imageUrl = data.thumbnailUrl;
            }
            if (data.image && data.image.length > 0) {
                result.imageUrl = data.image[0].url || data.image[0];
            }
        } catch (e) {}
    }

    // Extract from __INITIAL_STATE__ or similar
    if (!result.videoUrl && !result.imageUrl) {
        const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});<\/script>/);
        if (stateMatch) {
            try {
                const data = JSON.parse(stateMatch[1]);
                const media = data?.graphql?.shortcode_media;
                if (media) {
                    if (media.video_url) {
                        result.videoUrl = media.video_url;
                        result.isVideo = true;
                        result.imageUrl = media.display_url;
                    } else if (media.display_url) {
                        result.imageUrl = media.display_url;
                    }
                }
            } catch (e) {}
        }
    }

    // Fallback: Meta tags
    if (!result.videoUrl && !result.imageUrl) {
        const ogVideo = html.match(/property="og:video"[^>]*content="([^"]+)"/);
        const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/);
        
        if (ogVideo) {
            result.videoUrl = ogVideo[1];
            result.isVideo = true;
        }
        if (ogImage) {
            result.imageUrl = ogImage[1];
        }
    }

    return result;
}

function extractFromAPI(data) {
    const result = {
        imageUrl: null,
        videoUrl: null,
        isVideo: false,
        items: []
    };

    const media = data?.graphql?.shortcode_media || data?.items?.[0];
    
    if (media) {
        if (media.video_url) {
            result.videoUrl = media.video_url;
            result.isVideo = true;
            result.imageUrl = media.display_url || media.thumbnail_url;
        } else if (media.display_url) {
            result.imageUrl = media.display_url;
        }

        // Handle carousel
        if (media.edge_sidecar_to_children?.edges || media.carousel_media) {
            const edges = media.edge_sidecar_to_children?.edges || media.carousel_media;
            result.isCarousel = true;
            
            for (const edge of edges) {
                const node = edge.node || edge;
                if (node.video_url) {
                    result.items.push({
                        type: 'video',
                        url: node.video_url,
                        thumbnail: node.display_url
                    });
                } else if (node.display_url || node.image_versions2?.candidates?.[0]?.url) {
                    result.items.push({
                        type: 'image',
                        url: node.display_url || node.image_versions2.candidates[0].url
                    });
                }
            }
        }
    }

    return result;
}

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════');
    console.log('  📸 InstaSave Server Running!');
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log('  📱 Open this URL on your phone');
    console.log('═══════════════════════════════════');
});
