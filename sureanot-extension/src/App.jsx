import { useState } from 'react'
import { FileText, ImageIcon, Mic, Loader2, ShieldCheck, AlertTriangle, HelpCircle, X, Upload, Fingerprint } from 'lucide-react'
import './App.css'

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response)
    })
  })
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read text file.'))
    reader.readAsText(file)
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

const VERDICT_CONFIG = {
  'Likely accurate': { cls: 'verdict-safe', Icon: ShieldCheck, label: 'Likely Accurate' },
  'Potentially misleading': { cls: 'verdict-warn', Icon: AlertTriangle, label: 'Potentially Misleading' },
  'Unverified / uncertain': { cls: 'verdict-grey', Icon: HelpCircle, label: 'Unverified / Uncertain' },
  safe: { cls: 'verdict-safe', Icon: ShieldCheck, label: 'Safe' },
  potentially_misleading: { cls: 'verdict-warn', Icon: AlertTriangle, label: 'Potentially Misleading' },
  manipulated: { cls: 'verdict-danger', Icon: AlertTriangle, label: 'Manipulated' },
  scam: { cls: 'verdict-danger', Icon: AlertTriangle, label: 'Scam Detected' },
  uncertain: { cls: 'verdict-grey', Icon: HelpCircle, label: 'Uncertain' },
}

function VerdictBadge({ classification }) {
  const cfg = VERDICT_CONFIG[classification] || { cls: 'verdict-grey', Icon: HelpCircle, label: classification || 'Unknown' }
  const { Icon } = cfg
  return (
    <div className={`verdict-badge ${cfg.cls}`}>
      <Icon size={13} />
      <span>{cfg.label}</span>
    </div>
  )
}

function ConfidencePips({ level }) {
  const steps = ['Low', 'Medium', 'High']
  const idx = steps.indexOf(level)
  return (
    <div className="confidence-pips">
      {steps.map((s, i) => (
        <span key={s} className={`pip ${i <= idx ? 'pip-on' : ''}`} />
      ))}
      <span className="confidence-label">{level || '—'} confidence</span>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState('text') // 'text' | 'image' | 'audio'

  const [textInput, setTextInput] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [selectedAudio, setSelectedAudio] = useState(null)

  const [textResult, setTextResult] = useState(null)
  const [imageResult, setImageResult] = useState(null)
  const [audioResult, setAudioResult] = useState(null)
  const [audioTranscript, setAudioTranscript] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setError('')
    setTextResult(null)
    setImageResult(null)
    setAudioResult(null)
    setAudioTranscript('')
    if (next === 'text') {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl('')
      setSelectedImage(null)
      setSelectedAudio(null)
    } else if (next === 'image') {
      setTextInput('')
      setSelectedAudio(null)
    } else {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl('')
      setSelectedImage(null)
      setTextInput('')
    }
  }

  const canAnalyze =
    mode === 'text' ? textInput.trim().length > 0 :
      mode === 'image' ? Boolean(selectedImage) :
        Boolean(selectedAudio)

  const onTextFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const content = await readFileAsText(file)
      setTextInput(content)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load text file.')
    } finally {
      event.target.value = ''
    }
  }

  const onImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setSelectedImage(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setImageResult(null)
    setError('')
  }

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl('')
    setSelectedImage(null)
    setImageResult(null)
  }

  const onAudioChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedAudio(file)
    setAudioResult(null)
    setAudioTranscript('')
    setError('')
    event.target.value = ''
  }

  const clearAudio = () => {
    setSelectedAudio(null)
    setAudioResult(null)
    setAudioTranscript('')
  }

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setIsAnalyzing(true)
    setError('')
    setTextResult(null)
    setImageResult(null)
    setAudioResult(null)
    setAudioTranscript('')

    try {
      if (mode === 'text') {
        const res = await sendRuntimeMessage({ type: 'ANALYZE_MESSAGE', text: textInput.trim() })
        setTextResult(res)
      } else if (mode === 'audio') {
        const formData = new FormData()
        formData.append('file', selectedAudio, selectedAudio.name)
        const res = await fetch('http://localhost:8000/api/audio/check', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error(`Audio API error: ${res.status}`)
        const data = await res.json()
        setAudioTranscript(data.transcript || '')
        setAudioResult(data)
      } else {
        const dataUrl = await readFileAsDataUrl(selectedImage)
        const commaIndex = dataUrl.indexOf(',')
        const metadata = dataUrl.substring(0, commaIndex)
        const imageB64 = dataUrl.substring(commaIndex + 1)
        const mimeMatch = metadata.match(/data:(.*?);base64/)
        const mime = mimeMatch?.[1] || selectedImage.type || 'image/jpeg'
        const res = await sendRuntimeMessage({
          type: 'ANALYZE_IMAGE',
          imageB64,
          mime,
          alt: null,
          platform: 'Extension Popup',
        })
        setImageResult(res)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const [isScanningSynthID, setIsScanningSynthID] = useState(false)
  const handleSynthIDScan = async () => {
    if (!selectedImage) return
    setIsScanningSynthID(true)
    setError('')
    try {
      const dataUrl = await readFileAsDataUrl(selectedImage)
      const commaIndex = dataUrl.indexOf(',')
      const metadata = dataUrl.substring(0, commaIndex)
      const imageB64 = dataUrl.substring(commaIndex + 1)
      const mimeMatch = metadata.match(/data:(.*?);base64/)
      const mime = mimeMatch?.[1] || selectedImage.type || 'image/jpeg'
      const res = await sendRuntimeMessage({
        type: 'SYNTHID_CHECK',
        imageB64,
        mime,
      })
      if (!res) throw new Error("SynthID check returned no data.")
      setImageResult(prev => ({ ...(prev || { classification: 'uncertain', explanation: 'Please run full Analyze for misinformation check.' }), synthid: res }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SynthID scan failed.')
    } finally {
      setIsScanningSynthID(false)
    }
  }

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="brand">
          <ShieldCheck size={17} className="brand-icon" />
          <h1>SureAnot.ai</h1>
        </div>
        <p>Credibility check in seconds</p>
      </header>

      <div className="mode-toggle">
        <button type="button" className={`tab ${mode === 'text' ? 'tab-active' : ''}`} onClick={() => switchMode('text')}>
          <FileText size={13} />
          Text
        </button>
        <button type="button" className={`tab ${mode === 'image' ? 'tab-active' : ''}`} onClick={() => switchMode('image')}>
          <ImageIcon size={13} />
          Image
        </button>
        <button type="button" className={`tab ${mode === 'audio' ? 'tab-active' : ''}`} onClick={() => switchMode('audio')}>
          <Mic size={13} />
          Audio
        </button>
      </div>

      {mode === 'text' && (
        <div className="input-panel">
          <textarea
            className="text-area"
            rows={5}
            placeholder="Paste a message, headline, or article extract…"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <label className="txt-upload-label">
            <Upload size={12} />
            <span>Upload .txt file</span>
            <input type="file" accept=".txt,text/plain" onChange={onTextFileChange} />
          </label>
        </div>
      )}

      {mode === 'image' && (
        <div className="input-panel">
          {!imagePreviewUrl ? (
            <label className="image-drop-zone">
              <ImageIcon size={28} className="drop-icon" />
              <span className="drop-main-text">Click to upload an image</span>
              <span className="drop-sub-text">PNG · JPG · WEBP supported</span>
              <input type="file" accept="image/*" onChange={onImageChange} />
            </label>
          ) : (
            <div className="image-preview-wrap">
              <img src={imagePreviewUrl} alt="Selected for analysis" className="image-preview" />
              <button type="button" className="remove-image-btn" onClick={clearImage}>
                <X size={12} />
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'audio' && (
        <div className="input-panel">
          {!selectedAudio ? (
            <label className="image-drop-zone">
              <Mic size={28} className="drop-icon" />
              <span className="drop-main-text">Click to upload audio</span>
              <span className="drop-sub-text">MP3 · MP4 · M4A · WAV · WEBM supported</span>
              <input type="file" accept="audio/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac" onChange={onAudioChange} />
            </label>
          ) : (
            <div className="audio-selected-wrap">
              <div className="audio-file-info">
                <Mic size={15} className="audio-file-icon" />
                <span className="audio-file-name">{selectedAudio.name}</span>
                <span className="audio-file-size">{(selectedAudio.size / 1024).toFixed(0)} KB</span>
              </div>
              <button type="button" className="remove-image-btn" onClick={clearAudio}>
                <X size={12} />
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="analyze-button"
        onClick={handleAnalyze}
        disabled={!canAnalyze || isAnalyzing || isScanningSynthID}
      >
        {isAnalyzing ? (
          <><Loader2 size={15} className="spin" /> Analyzing…</>
        ) : (
          <><ShieldCheck size={15} /> Analyze</>
        )}
      </button>

      {mode === 'image' && selectedImage && (
        <button
          type="button"
          className="analyze-button"
          style={{ marginTop: '8px', backgroundColor: '#5b21b6', border: '1px solid #7c3aed' }}
          onClick={handleSynthIDScan}
          disabled={!canAnalyze || isScanningSynthID || isAnalyzing}
        >
          {isScanningSynthID ? (
            <><Loader2 size={15} className="spin" /> Scanning Watermark…</>
          ) : (
            <><Fingerprint size={15} /> Scan AI Watermark (SynthID)</>
          )}
        </button>
      )}

      {error && <p className="error-text">{error}</p>}

      {textResult && (
        <div className="result-card">
          <VerdictBadge classification={textResult.classification} />
          <ConfidencePips level={textResult.confidence_level} />
          {textResult.explanation && (
            <p className="result-explanation">{textResult.explanation}</p>
          )}
          {textResult.source_credibility && (
            <div className="result-section">
              <span className="result-section-label">Source Credibility</span>
              <p className="result-explanation">{textResult.source_credibility}</p>
            </div>
          )}
          {textResult.sources?.length > 0 && (
            <div className="result-section">
              <span className="result-section-label">Sources</span>
              <ul className="sources-list">
                {textResult.sources.map((src, i) => (
                  <li key={i}>
                    {src.url
                      ? <a className="source-link" href={src.url} target="_blank" rel="noopener noreferrer">{src.name}</a>
                      : <span className="source-name">{src.name}</span>
                    }
                  </li>
                ))}
              </ul>
            </div>
          )}
          {textResult.recommended_action && (
            <div className="result-section">
              <span className="result-section-label">Recommended Action</span>
              <p className="result-explanation">{textResult.recommended_action}</p>
            </div>
          )}
        </div>
      )}

      {imageResult && (
        <div className="result-card">
          <VerdictBadge classification={imageResult.classification} />
          <ConfidencePips level={imageResult.confidence} />
          {imageResult.explanation && (
            <p className="result-explanation">{imageResult.explanation}</p>
          )}
          {imageResult.synthid != null && (
            <div className="result-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Fingerprint size={13} style={{ color: imageResult.synthid.is_synthid_watermarked ? '#a78bfa' : '#6b7280', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: imageResult.synthid.is_synthid_watermarked ? '#a78bfa' : '#6b7280' }}>
                  SynthID: {imageResult.synthid.is_synthid_watermarked ? 'AI watermark detected' : 'No watermark detected'}
                </span>
              </div>
              <p className="result-explanation" style={{ marginTop: '2px', fontSize: '11px', opacity: 0.75 }}>
                Confidence: {(imageResult.synthid.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}

      {audioResult && (
        <div className="result-card">
          {audioTranscript && (
            <div className="transcript-box">
              <span className="transcript-label">Transcript</span>
              <p className="transcript-text">{audioTranscript}</p>
            </div>
          )}
          <VerdictBadge classification={audioResult.classification} />
          <ConfidencePips level={audioResult.confidence_level} />
          {audioResult.explanation && (
            <p className="result-explanation">{audioResult.explanation}</p>
          )}
          {audioResult.source_credibility && (
            <div className="result-section">
              <span className="result-section-label">Source Credibility</span>
              <p className="result-explanation">{audioResult.source_credibility}</p>
            </div>
          )}
          {audioResult.sources?.length > 0 && (
            <div className="result-section">
              <span className="result-section-label">Sources</span>
              <ul className="sources-list">
                {audioResult.sources.map((src, i) => (
                  <li key={i}>
                    {src.url
                      ? <a className="source-link" href={src.url} target="_blank" rel="noopener noreferrer">{src.name}</a>
                      : <span className="source-name">{src.name}</span>
                    }
                  </li>
                ))}
              </ul>
            </div>
          )}
          {audioResult.recommended_action && (
            <div className="result-section">
              <span className="result-section-label">Recommended Action</span>
              <p className="result-explanation">{audioResult.recommended_action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
