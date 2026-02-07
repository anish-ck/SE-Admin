'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import jsQR from 'jsqr'
import { X, Camera, AlertCircle, FlipHorizontal, Upload, ImageIcon } from 'lucide-react'

interface QRScannerProps {
    onScan: (data: string) => void
    onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [error, setError] = useState('')
    const [useFrontCamera, setUseFrontCamera] = useState(false)
    // Default to upload mode on desktop (no touch screen)
    const [mode, setMode] = useState<'camera' | 'upload'>(() => {
        if (typeof window !== 'undefined') {
            const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            return isMobile ? 'camera' : 'upload'
        }
        return 'upload'
    })
    const [scanning, setScanning] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const isRunningRef = useRef(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (mode !== 'camera') return
        
        let mounted = true

        const startScanner = async () => {
            try {
                // Clean up previous instance
                if (scannerRef.current) {
                    try {
                        const state = scannerRef.current.getState()
                        if (state === Html5QrcodeScannerState.SCANNING) {
                            await scannerRef.current.stop()
                        }
                    } catch {
                        // Ignore
                    }
                    scannerRef.current = null
                }

                const scanner = new Html5Qrcode('qr-reader', {
                    verbose: false,
                    formatsToSupport: undefined
                })
                scannerRef.current = scanner

                const config = {
                    fps: 15,
                    qrbox: { width: 300, height: 300 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                }

                const cameraFacing = useFrontCamera ? 'user' : 'environment'

                await scanner.start(
                    { facingMode: cameraFacing },
                    config,
                    (decodedText) => {
                        if (mounted && isRunningRef.current) {
                            isRunningRef.current = false
                            scanner.stop()
                                .then(() => onScan(decodedText))
                                .catch(() => onScan(decodedText))
                        }
                    },
                    () => {
                        // Ignore scan errors (no QR found in frame)
                    }
                )
                isRunningRef.current = true
            } catch (err: any) {
                if (mounted) {
                    console.error('Scanner error:', err)
                    if (err.name === 'NotAllowedError') {
                        setError('Camera permission denied. Please allow camera access.')
                    } else if (err.name === 'NotFoundError') {
                        setError('No camera found on this device.')
                    } else if (err.message?.includes('NotReadableError') || err.name === 'NotReadableError') {
                        // Camera in use or not accessible - switch to upload mode
                        setError('')
                        setMode('upload')
                    } else {
                        setError(`Camera error: ${err.message || 'Please try again.'}`)
                    }
                }
            }
        }

        startScanner()

        return () => {
            mounted = false
            if (scannerRef.current && isRunningRef.current) {
                isRunningRef.current = false
                scannerRef.current.stop().catch(() => {
                    // Ignore stop errors on cleanup
                })
            }
        }
    }, [onScan, useFrontCamera, mode])

    const toggleCamera = () => {
        setUseFrontCamera(!useFrontCamera)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setScanning(true)
        setError('')

        try {
            // Stop camera if running
            if (scannerRef.current && isRunningRef.current) {
                await scannerRef.current.stop()
                isRunningRef.current = false
            }

            // Method 1: Try Html5Qrcode first
            let result: string | null = null
            
            try {
                const scanner = new Html5Qrcode('qr-reader-upload', {
                    verbose: false,
                    formatsToSupport: undefined
                })
                result = await scanner.scanFile(file, true)
                await scanner.clear()
            } catch {
                // Html5Qrcode failed, try jsQR fallback
                console.log('Html5Qrcode failed, trying jsQR...')
            }
            
            // Method 2: Fallback to jsQR (more reliable for static images)
            if (!result) {
                result = await scanWithJsQR(file)
            }
            
            if (result) {
                onScan(result)
            } else {
                throw new Error('QR code not detected')
            }
        } catch (err: any) {
            console.error('File scan error:', err)
            setError('No QR code found. Tips: Make sure QR is clear, well-lit, and takes up most of the image.')
            setScanning(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }
    
    // jsQR-based scanner for better image detection
    const scanWithJsQR = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image()
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            img.onload = () => {
                console.log('Image loaded:', img.width, 'x', img.height)
                
                // Scale down very large images for faster processing
                const maxSize = 1500
                let width = img.width
                let height = img.height
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize
                        width = maxSize
                    } else {
                        width = (width / height) * maxSize
                        height = maxSize
                    }
                }
                
                canvas.width = width
                canvas.height = height
                ctx?.drawImage(img, 0, 0, width, height)
                
                const imageData = ctx?.getImageData(0, 0, width, height)
                console.log('ImageData:', imageData?.width, 'x', imageData?.height, 'bytes:', imageData?.data.length)
                
                if (imageData) {
                    // Try multiple inversion modes
                    const attempts = ['dontInvert', 'onlyInvert', 'attemptBoth'] as const
                    
                    for (const attempt of attempts) {
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: attempt
                        })
                        
                        if (code) {
                            console.log(`jsQR (${attempt}) found:`, code.data)
                            resolve(code.data)
                            return
                        }
                    }
                    
                    console.log('jsQR found nothing in any mode')
                }
                
                resolve(null)
            }
            
            img.onerror = (e) => {
                console.error('Image load error:', e)
                resolve(null)
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            // Create a synthetic event to reuse handleFileUpload
            const syntheticEvent = {
                target: { files: [file] }
            } as unknown as React.ChangeEvent<HTMLInputElement>
            handleFileUpload(syntheticEvent)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent safe-top">
                <div className="flex items-center gap-2 text-white">
                    <Camera className="h-5 w-5" />
                    <span className="font-medium">Scan QR Code</span>
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'camera' && (
                        <button
                            onClick={toggleCamera}
                            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
                            title="Switch camera"
                        >
                            <FlipHorizontal className="h-5 w-5" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="absolute top-20 left-0 right-0 flex justify-center z-10">
                <div className="bg-white/10 rounded-full p-1 flex gap-1">
                    <button
                        onClick={() => { setMode('camera'); setError(''); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            mode === 'camera' 
                                ? 'bg-white text-black' 
                                : 'text-white hover:bg-white/10'
                        }`}
                    >
                        <Camera className="h-4 w-4 inline mr-2" />
                        Camera
                    </button>
                    <button
                        onClick={() => { setMode('upload'); setError(''); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            mode === 'upload' 
                                ? 'bg-white text-black' 
                                : 'text-white hover:bg-white/10'
                        }`}
                    >
                        <Upload className="h-4 w-4 inline mr-2" />
                        Upload
                    </button>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
            />
            <div id="qr-reader-upload" className="hidden" />
            
            {/* Debug: Show uploaded image preview */}
            <div id="qr-reader-preview" className="hidden" />

            {/* Scanner / Upload Area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pt-32">
                {error ? (
                    <div className="text-center p-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <p className="text-white mb-4 max-w-xs">{error}</p>
                        <div className="flex gap-2 justify-center">
                            <button 
                                onClick={() => setError('')} 
                                className="btn-secondary"
                            >
                                Try Again
                            </button>
                            <button onClick={onClose} className="btn-primary">
                                Close
                            </button>
                        </div>
                    </div>
                ) : mode === 'camera' ? (
                    <div className="w-full max-w-md px-4">
                        <div
                            id="qr-reader"
                            className="w-full overflow-hidden rounded-lg"
                            style={{ maxHeight: '60vh' }}
                        />
                        <p className="text-white/70 text-center mt-4 text-sm">
                            Point camera at student&apos;s QR code
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-md px-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                                dragActive 
                                    ? 'border-blue-400 bg-blue-500/20' 
                                    : 'border-white/30 hover:border-white/50 hover:bg-white/5'
                            }`}
                        >
                            {scanning ? (
                                <>
                                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-white">Scanning image...</p>
                                </>
                            ) : dragActive ? (
                                <>
                                    <Upload className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                                    <p className="text-white font-medium">Drop image here</p>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="h-16 w-16 text-white/50 mx-auto mb-4" />
                                    <p className="text-white font-medium mb-2">Upload QR Code Image</p>
                                    <p className="text-white/50 text-sm">
                                        Click to browse or drag & drop an image
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="text-white/50 text-center mt-4 text-sm space-y-1">
                            <p>📸 Take a screenshot of the student&apos;s QR code</p>
                            <p className="text-xs">Tip: Crop the image to just the QR code for best results</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Decorative frame overlay - only for camera mode */}
            {!error && mode === 'camera' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-32">
                    <div className="w-72 h-72 relative">
                        <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-xl" />
                        <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-xl" />
                        <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-xl" />
                        <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-xl" />
                    </div>
                </div>
            )}
        </div>
    )
}
