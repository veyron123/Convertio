require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 8081;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/start-conversion', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
    }

    try {
        const response = await axios.post('https://api.convertio.co/convert', {
            apikey: process.env.API_KEY,
            input: 'base64',
            file: req.file.buffer.toString('base64'),
            filename: req.file.originalname,
            outputformat: req.body.outputformat,
        });
        res.json({ id: response.data.data.id });
    } catch (error) {
        console.error('Error starting conversion:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to start conversion' });
    }
});

app.get('/api/conversion-status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`https://api.convertio.co/convert/${id}/status`);
        res.json(response.data.data);
    } catch (error) {
        console.error('Error fetching conversion status:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch conversion status' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});