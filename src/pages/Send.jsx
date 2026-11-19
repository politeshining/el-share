import { API_BASE_URL } from '../config/api';
import { Send as SendIcon, Download as DownloadIcon, Wifi, QrCode, LoaderCircle, Check } from 'lucide-react';

import { Link } from "react-router-dom"
import { useCallback, useState, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../components/ToastContext';

const Send = () => {
    const { showToast } = useToast();

    const [isConnected, setIsConnected] = useState(false);
    const [pairingToken, setPairingToken] = useState('');
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [deviceKey, setDeviceKey] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('send');
    const [downloadProgress, setDownloadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const [downloadedFiles, setDownloadedFiles] = useState([]);

    const createPairingSession = async () => {
        setIsCreatingSession(true);

        try {
            const response = await fetch(`${API_BASE_URL}/pair.php`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not create pairing session.');
            }

            setPairingToken(data.token);
            setDeviceKey(data.device_key);
            console.log('Pairing session created:', data);

        } catch (error) {
            console.error('Pairing error:', error);
            showToast({
                title: 'Pairing Failed',
                message: error.message,
                type: 'error'
            });

        } finally {
            setIsCreatingSession(false);
        }
    };

    const fetchReceivedFiles = useCallback(async () => {
        if (!pairingToken || !deviceKey) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/list_files.php?token=${pairingToken}`,
                { headers: { 'X-Device-Key': deviceKey } }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Could not retrieve files.');
            }

            setReceivedFiles(data.files);
        } catch (error) {
            console.error('File retrieval error:', error);
        }
    }, [pairingToken, deviceKey]);

    const downloadFile = async (file) => {
        try {
            setDownloadProgress((previous) => ({
                ...previous,
                [file.id]: 0,
            }));

            const response = await fetch(
                `${API_BASE_URL}/download.php?token=${pairingToken}&file_id=${file.id}`,
                { headers: { 'X-Device-Key': deviceKey } }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Could not download file.');
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                const percentage = file.size
                    ? Math.min(Math.round((receivedLength / file.size) * 100), 100)
                    : 0;

                setDownloadProgress((previous) => ({
                    ...previous,
                    [file.id]: percentage,
                }));
            }

            const blob = new Blob(chunks, {
                type: response.headers.get('Content-Type') || 'application/octet-stream',
            });

            setDownloadProgress((previous) => ({
                ...previous,
                [file.id]: 100,
            }));

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();

            setDownloadedFiles((previous) => [...previous, file.id]);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download error:', error);
            showToast({
                title: 'Download Failed',
                message: error.message,
                type: 'error'
            });
        }
    };

    useEffect(() => {
        if (!isConnected || !deviceKey) return;

        fetchReceivedFiles();

        const intervalId = setInterval(fetchReceivedFiles, 2000);
        return () => clearInterval(intervalId);
    }, [isConnected, deviceKey, fetchReceivedFiles]);

    useEffect(() => {
        if (!pairingToken) return;

        let isActive = true;

        const checkSessionStatus = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/status.php?token=${encodeURIComponent(pairingToken)}`
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Could not check session status.');
                }

                if (data.status === 'joined' && isActive) {
                    clearInterval(intervalId);
                    console.log('Receiving device has joined.');
                    setIsConnected(true);
                }

            } catch (error) {
                console.error('Session status check failed:', error);
            }
        };

        checkSessionStatus();

        const intervalId = setInterval(checkSessionStatus, 1500);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [pairingToken, fetchReceivedFiles]);

    const uploadFiles = async () => {
        if (!selectedFiles.length) {
            showToast({
                title: 'No files selected',
                message: 'Please select at least one file to send.',
                type: 'warning'
            });
            return;
        }

        if (!deviceKey || !pairingToken) {
            showToast({
                title: 'Pairing information missing',
                message: 'Please ensure you are properly paired with the receiving device.',
                type: 'error'
            });
            return;
        }

        try {
            setIsUploading(true);
            for (const file of selectedFiles) {
                const formData = new FormData();

                formData.append('token', pairingToken);
                formData.append('file', file);

                const response = await fetch(`${API_BASE_URL}/upload.php`, {
                    method: 'POST',
                    headers: {
                        'X-Device-Key': deviceKey
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || `Could not upload ${file.name}.`);
                }
                console.log('File uploaded:', data.file);
            }

            showToast({
                title: 'Upload Successful',
                message: 'All selected files have been sent successfully.',
                type: 'success'
            });
            setSelectedFiles([]);

        } catch (error) {
            console.error('Upload error:', error);
            showToast({
                title: 'Upload Failed',
                message: error.message,
                type: 'error'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatFileName = (fileName, maxLength = 35) => {
        if (fileName.length <= maxLength) return fileName;

        const extensionIndex = fileName.lastIndexOf('.');
        const hasExtension = extensionIndex > 0;

        const extension = hasExtension ? fileName.slice(extensionIndex) : '';
        const name = hasExtension ? fileName.slice(0, extensionIndex) : fileName;

        const availableLength = maxLength - extension.length - 3;
        const startLength = Math.ceil(availableLength / 2);
        const endLength = Math.floor(availableLength / 2);

        return `${name.slice(0, startLength)}...${name.slice(-endLength)}${extension}`;
    };

    return (
        <div className="mx-auto max-w-4xl">
            <Link
                to="/"
                className="mb-10 inline-flex items-center gap-2 text-sm text-[#88827D] transition-colors hover:text-[#EAE5DF]
                position sticky top-0 z-50 w-full border-b border-white/10 bg-[#080808] px-6 py-4"
            >
                <span>←</span>
                Back to home
            </Link>
            <div className="mt-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7F2929]/15 text-[#EAE5DF]">
                    <SendIcon size={21} />
                </div>

                <h1 className="text-3xl font-semibold tracking-tight">
                    Send files
                </h1>
            </div>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#88827D]">
                Send files directly to another device over a shared Wi-Fi
                network or mobile hotspot. No internet connection required.
            </p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-[#171717] p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7F2929]/15 text-[#A34A4A]">
                        <span className="text-xl">⌁</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <Wifi size={17} className="text-[#88827D]" />
                            <h2 className="text-sm font-medium text-[#EAE5DF]">
                                Local connection
                            </h2>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${isConnected
                                    ? 'bg-green-500'
                                    : 'animate-pulse bg-[#7F2929]'
                                    }`}
                            />

                            <p className="text-sm text-[#88827D]">
                                {isConnected ? 'Device connected successfully' : 'Waiting for connection...'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex rounded-xl border border-white/10 bg-[#171717] p-1">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 ${activeTab === 'send'
                        ? 'bg-[#7F2929] text-white shadow-lg'
                        : 'text-[#88827D] hover:text-[#EAE5DF]'
                        }`}
                >
                    Send files
                </button>

                <button
                    onClick={() => setActiveTab('receive')}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 ${activeTab === 'receive'
                        ? 'bg-[#7F2929] text-white shadow-lg'
                        : 'text-[#88827D] hover:text-[#EAE5DF]'
                        }`}
                >
                    Receive files
                </button>
            </div>

            {!isConnected && activeTab === 'send' && (
                <div className="tab-content mt-6 rounded-2xl border border-white/10 bg-[#171717] p-6">
                    <div className="flex items-center gap-2">
                        <QrCode size={17} className="text-[#88827D]" />
                        <h2 className="text-sm font-medium text-[#EAE5DF]">
                            Connect a receiving device
                        </h2>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[#88827D]">
                        Once your local network is ready, generate a pairing code
                        for the other device to scan.
                    </p>

                    <button
                        onClick={createPairingSession}
                        disabled={isCreatingSession}
                        className="mt-6 w-full rounded-xl bg-[#7F2929] px-6 py-4 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
                    >
                        {isCreatingSession ? 'Creating session...' : 'Generate pairing code'}
                    </button>

                    {pairingToken && (
                        <div className="mt-8 flex flex-col items-center gap-2.5 rounded-xl border border-white/10 bg-[#080808] p-6">
                            <p className="mt-5 text-sm font-medium text-[#EAE5DF]">
                                Scan to connect your device
                            </p>

                            <div className="mt-4 flex items-center justify-center rounded-xl border border-white/10 bg-[white] p-4">
                                <QRCodeSVG
                                    value={`${window.location.origin}/receive?token=${pairingToken}`}
                                    size={220}
                                    level="H"
                                    bgColor="#FFFFFF"
                                    fgColor="#7F2929"
                                />
                            </div>

                            <p className="mt-2 text-center text-xs leading-5 text-[#88827D]">
                                Open your phone's camera and scan this code to join the session.
                            </p>
                        </div>
                    )}
                </div>
            )}
            {isConnected && activeTab === 'send' && (
                <div className="tab-content mt-6 rounded-2xl border border-white/10 bg-[#171717] p-6">
                    <h2 className="text-sm font-medium text-[#EAE5DF]">
                        Select files to send
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#88827D]">
                        Choose the files you want to share with your connected device.
                    </p>

                    <input
                        type="file"
                        multiple
                        onChange={(e) =>
                            setSelectedFiles((previousFiles) => [
                                ...previousFiles,
                                ...Array.from(e.target.files),
                            ])
                        }
                        className="mt-6 block w-full text-sm text-[#88827D]
                        file:mr-4 file:rounded-xl file:border-0
                        file:bg-[#7F2929] file:px-6 file:py-3
                        file:font-medium file:text-[#EAE5DF]
                        hover:file:bg-[#963434]"
                    />

                    {selectedFiles.length > 0 && (
                        <div className="mt-5 space-y-3">
                            <h3 className="text-sm font-medium text-[#EAE5DF]">
                                Selected files ({selectedFiles.length})
                            </h3>

                            {selectedFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#080808] p-4"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[#EAE5DF]">
                                            {formatFileName(file.name)}
                                        </p>

                                        <p className="mt-1 text-xs text-[#88827D]">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setSelectedFiles((previous) =>
                                            previous.filter((_, i) => i !== index)
                                        )}
                                        className="shrink-0 text-sm text-[#A34A4A] transition-colors hover:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={uploadFiles}
                        disabled={selectedFiles.length === 0 || isUploading}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7F2929] px-6 py-3
                        text-sm font-medium text-[#EAE5DF]
                        transition hover:bg-[#963434]
                        disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isUploading && (
                            <LoaderCircle size={17} className="animate-spin" />
                        )}

                        {isUploading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            )}

            {activeTab === 'receive' && (
                <div className="tab-content mt-8 w-full space-y-3">
                    <h2 className="text-lg font-semibold text-[#EAE5DF]">
                        Files received from phone
                    </h2>

                    {receivedFiles.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-white/10 bg-[#171717] px-4 py-8 text-center text-sm text-[#88827D]">
                            No files received yet. Files sent from your connected device will appear here.
                        </p>
                    ) : (receivedFiles.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#171717] p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#EAE5DF]">
                                    {formatFileName(file.name)}
                                </p>

                                <p className="mt-1 text-xs text-[#88827D]">
                                    {formatFileSize(file.size)}
                                </p>

                                {downloadProgress[file.id] !== undefined && (
                                    <div className="mt-3 w-full">
                                        <div className="mb-1 flex justify-between text-xs text-[#88827D]">
                                            <span>
                                                {downloadProgress[file.id] === 100
                                                    ? 'Download complete'
                                                    : 'Downloading...'}
                                            </span>

                                            <span>{downloadProgress[file.id]}%</span>
                                        </div>

                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-[#7F2929] transition-all duration-200"
                                                style={{ width: `${downloadProgress[file.id]}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => downloadFile(file)}
                                disabled={downloadedFiles.includes(file.id)}
                                className="shrink-0 rounded-lg bg-[#7F2929] px-4 py-2 text-sm font-medium text-[#EAE5DF] transition hover:bg-[#963434] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {downloadedFiles.includes(file.id) ? (
                                    <Check size={18} />
                                ) : (
                                    <DownloadIcon size={18} />
                                )}
                            </button>
                        </div>
                    )))}
                </div>
            )}
        </div>
    )
}

export default Send