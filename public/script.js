let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let webhookUrl = '';
let aiInstruction = '';
let transcriptionService = 'whisper';
let isStatusVisible = false;

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadSettings() {
    try {
        const [webhookResponse, instructionResponse, transcriptionResponse] = await Promise.all([
            fetch('/api/get-webhook'),
            fetch('/api/get-instruction'),
            fetch('/api/get-transcription-service')
        ]);
        
        const webhookData = await webhookResponse.json();
        const instructionData = await instructionResponse.json();
        const transcriptionData = await transcriptionResponse.json();
        
        webhookUrl = webhookData.url || '';
        aiInstruction = instructionData.instruction || '';
        transcriptionService = transcriptionData.service || 'whisper';
        
        document.getElementById('webhookUrl').value = webhookUrl;
        document.getElementById('aiInstruction').value = aiInstruction;
        document.getElementById('transcriptionService').value = transcriptionService;

        // Prefill filename from URL parameter
        const prefillFilename = getQueryParam('filename');
        if (prefillFilename) {
            document.getElementById('filename').value = prefillFilename;
        }
    } catch (error) {
        showMessage(`Fehler beim Laden der Einstellungen: ${error.message}`, true);
    }
}

function toggleStatusSection() {
    const statusMessages = document.getElementById('statusMessages');
    const toggleButton = document.getElementById('toggleStatus');
    isStatusVisible = !isStatusVisible;
    
    if (isStatusVisible) {
        statusMessages.classList.remove('hidden');
        toggleButton.classList.add('expanded');
    } else {
        statusMessages.classList.add('hidden');
        toggleButton.classList.remove('expanded');
    }
}

async function saveWebhookUrl() {
    const newUrl = document.getElementById('webhookUrl').value;
    const statusDiv = document.getElementById('webhookStatus');
    
    try {
        const response = await fetch('/api/set-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: newUrl })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            webhookUrl = newUrl;
            showMessage('Webhook-URL erfolgreich gespeichert');
            statusDiv.textContent = 'Webhook-URL erfolgreich gespeichert';
            statusDiv.className = 'status-message success';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 3000);
        } else {
            throw new Error(data.error || 'Fehler beim Speichern');
        }
    } catch (error) {
        showMessage(`Fehler: ${error.message}`, true);
        statusDiv.textContent = `Fehler: ${error.message}`;
        statusDiv.className = 'status-message error';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 3000);
    }
}

async function saveInstruction() {
    const newInstruction = document.getElementById('aiInstruction').value;
    const statusDiv = document.getElementById('instructionStatus');
    
    try {
        const response = await fetch('/api/set-instruction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ instruction: newInstruction })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            aiInstruction = newInstruction;
            showMessage('KI-Anweisung erfolgreich gespeichert');
            statusDiv.textContent = 'KI-Anweisung erfolgreich gespeichert';
            statusDiv.className = 'status-message success';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 3000);
        } else {
            throw new Error(data.error || 'Fehler beim Speichern');
        }
    } catch (error) {
        showMessage(`Fehler: ${error.message}`, true);
        statusDiv.textContent = `Fehler: ${error.message}`;
        statusDiv.className = 'status-message error';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 3000);
    }
}

async function saveTranscriptionService() {
    const newService = document.getElementById('transcriptionService').value;
    const statusDiv = document.getElementById('transcriptionStatus');
    
    try {
        const response = await fetch('/api/set-transcription-service', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ service: newService })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            transcriptionService = newService;
            showMessage('Transkriptionsdienst erfolgreich gespeichert');
            statusDiv.textContent = 'Transkriptionsdienst erfolgreich gespeichert';
            statusDiv.className = 'status-message success';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 3000);
        } else {
            throw new Error(data.error || 'Fehler beim Speichern');
        }
    } catch (error) {
        showMessage(`Fehler: ${error.message}`, true);
        statusDiv.textContent = `Fehler: ${error.message}`;
        statusDiv.className = 'status-message error';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 3000);
    }
}

function showMessage(message, isError = false) {
    const statusMessages = document.getElementById('statusMessages');
    const messageDiv = document.createElement('div');
    
    messageDiv.textContent = message;
    messageDiv.className = `status-message ${isError ? 'error' : 'success'}`;
    
    // Add timestamp to message
    const timestamp = new Date().toLocaleTimeString();
    messageDiv.textContent = `[${timestamp}] ${message}`;
    
    // Add new message at the top
    statusMessages.insertBefore(messageDiv, statusMessages.firstChild);
    
    // Show status messages if hidden
    if (statusMessages.classList.contains('hidden')) {
        toggleStatusSection();
    }
    
    // Limit the number of messages (keep last 10)
    while (statusMessages.children.length > 10) {
        statusMessages.removeChild(statusMessages.lastChild);
    }
}

function switchPage(showSettings) {
    const mainPage = document.getElementById('mainPage');
    const settingsPage = document.getElementById('settingsPage');
    
    if (showSettings) {
        mainPage.classList.add('hidden');
        settingsPage.classList.remove('hidden');
    } else {
        settingsPage.classList.add('hidden');
        mainPage.classList.remove('hidden');
    }
}

async function startRecording() {
    const filename = document.getElementById('filename').value;
    if (!filename) {
        showMessage('Bitte geben Sie eine Patientenidentifikation ein', true);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const formData = new FormData();
            formData.append('audio', audioBlob, `${filename}.mp3`);
            formData.append('filename', filename);

            try {
                const response = await fetch('/api/save-recording', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Fehler beim Speichern der Aufnahme');
                }

                // Handle streaming response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    const messages = decoder.decode(value).split('\n');
                    for (const message of messages) {
                        if (message.trim()) {
                            try {
                                const data = JSON.parse(message);
                                if (data.status) {
                                    showMessage(data.status, data.error ? true : false);
                                }
                            } catch (e) {
                                console.error('Error parsing message:', e);
                            }
                        }
                    }
                }
            } catch (error) {
                showMessage(`Fehler: ${error.message}`, true);
            }
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI();
        showMessage('Aufnahme gestartet');
    } catch (error) {
        showMessage(`Fehler beim Starten der Aufnahme: ${error.message}`, true);
    }
}

async function stopRecording() {
    if (!isRecording || !mediaRecorder) {
        return;
    }

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording = false;
    updateRecordingUI();
    showMessage('Aufnahme gestoppt');
}

function updateRecordingUI() {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const filenameInput = document.getElementById('filename');
    const settingsButton = document.getElementById('settingsButton');

    startButton.disabled = isRecording;
    stopButton.disabled = !isRecording;
    filenameInput.disabled = isRecording;
    settingsButton.disabled = isRecording;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateRecordingUI();
    
    document.getElementById('startRecording').addEventListener('click', startRecording);
    document.getElementById('stopRecording').addEventListener('click', stopRecording);
    document.getElementById('saveWebhook').addEventListener('click', saveWebhookUrl);
    document.getElementById('saveInstruction').addEventListener('click', saveInstruction);
    document.getElementById('saveTranscriptionService').addEventListener('click', saveTranscriptionService);
    document.getElementById('settingsButton').addEventListener('click', () => switchPage(true));
    document.getElementById('backButton').addEventListener('click', () => switchPage(false));
    document.getElementById('toggleStatus').addEventListener('click', toggleStatusSection);
});