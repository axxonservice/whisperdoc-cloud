const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Constants
const RECORDS_DIR = path.join(os.homedir(), 'whisperdoc/records');
const EXPORT_DIR = path.join(os.homedir(), 'whisperdoc/export');
const SETTINGS_FILE = path.join(RECORDS_DIR, 'settings.json');

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, RECORDS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Global variables
let webhookUrl = null;
let aiInstruction = null;
let transcriptionService = 'whisper';

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            webhookUrl = data.webhookUrl || null;
            aiInstruction = data.aiInstruction || null;
            transcriptionService = data.transcriptionService || 'whisper';
            console.log('Settings loaded successfully');
        }
    } catch (error) {
        console.log(`Error loading settings: ${error.message}`);
    }
}

function saveSettings() {
    try {
        const settings = {
            webhookUrl,
            aiInstruction,
            transcriptionService
        };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        console.log('Settings saved successfully');
    } catch (error) {
        console.log(`Error saving settings: ${error.message}`);
    }
}

async function sendWebhook(filePath, filename) {
    if (!webhookUrl) {
        console.log('No webhook URL configured, skipping notification');
        throw new Error('Kein Webhook konfiguriert');
    }

    try {
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(filePath));
        formData.append('filename', filename.replace('.mp3', ''));
        formData.append('instruction', aiInstruction || '');
        formData.append('transcriptionService', transcriptionService);

        const response = await axios.post(webhookUrl, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        // Save webhook response to export directory
        if (response.data) {
            const exportFilename = path.join(EXPORT_DIR, `${filename.replace('.mp3', '')}.txt`);
            fs.writeFileSync(exportFilename, JSON.stringify(response.data, null, 2));
            console.log(`Webhook response saved to ${exportFilename}`);
            return exportFilename;
        }

        console.log('Webhook notification sent successfully');
    } catch (error) {
        console.log(`Failed to send webhook: ${error.message}`);
        throw error;
    }
}

function ensureDirectories() {
    try {
        if (!fs.existsSync(RECORDS_DIR)) {
            fs.mkdirSync(RECORDS_DIR, { recursive: true });
        }
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }
        return true;
    } catch (error) {
        console.log(`Directory error: ${error.message}`);
        return false;
    }
}

// Routes
app.post('/api/save-recording', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
        const filePath = req.file.path;
        const filename = req.file.originalname;

        try {
            res.write(JSON.stringify({ status: 'Sende Webhook-Benachrichtigung...' }) + '\n');
            const exportPath = await sendWebhook(filePath, filename);
            res.write(JSON.stringify({ status: 'Webhook-Benachrichtigung erfolgreich gesendet' }) + '\n');
            if (exportPath) {
                res.write(JSON.stringify({ status: `Antwort gespeichert in: ${exportPath}` }) + '\n');
            }
        } catch (webhookError) {
            res.write(JSON.stringify({ status: `Webhook-Fehler: ${webhookError.message}` }) + '\n');
        }
        
        res.write(JSON.stringify({ 
            status: 'Verarbeitung abgeschlossen',
            path: filePath
        }));
        res.end();
    } catch (error) {
        console.log(`Failed to process recording: ${error.message}`);
        res.status(500).json({ 
            error: 'Failed to process recording',
            details: error.message
        });
    }
});

app.post('/api/set-webhook', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'Webhook URL is required' });
    }
    webhookUrl = url;
    saveSettings();
    res.json({ message: 'Webhook URL updated' });
});

app.get('/api/get-webhook', (req, res) => {
    res.json({ url: webhookUrl });
});

app.post('/api/set-instruction', (req, res) => {
    const { instruction } = req.body;
    if (instruction === undefined) {
        return res.status(400).json({ error: 'Instruction is required' });
    }
    aiInstruction = instruction;
    saveSettings();
    res.json({ message: 'AI instruction updated' });
});

app.get('/api/get-instruction', (req, res) => {
    res.json({ instruction: aiInstruction });
});

app.post('/api/set-transcription-service', (req, res) => {
    const { service } = req.body;
    if (!service) {
        return res.status(400).json({ error: 'Transcription service is required' });
    }
    transcriptionService = service;
    saveSettings();
    res.json({ message: 'Transcription service updated' });
});

app.get('/api/get-transcription-service', (req, res) => {
    res.json({ service: transcriptionService });
});

// Server startup
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`Records directory: ${RECORDS_DIR}`);
    console.log(`Export directory: ${EXPORT_DIR}`);
    
    ensureDirectories();
    loadSettings();
});