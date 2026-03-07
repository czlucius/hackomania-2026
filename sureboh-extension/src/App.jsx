import { useState } from 'react'
import { FileText, ImageIcon, Loader2, ShieldCheck, AlertTriangle, HelpCircle, X, Upload } from 'lucide-react'
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
  'Likely accurate':           { cls: 'verdict-safe',   Icon: ShieldCheck,    label: 'Likely Accurate' },
  'Potentially misleading':    { cls: 'verdict-warn',   Icon: AlertTriangle,  label: 'Potentially Misleading' },
  'Unverified / uncertain':    { cls: 'verdict-grey',   Icon: HelpCircle,     label: 'Unverified / Uncertain' },
  safe:                        { cls: 'verdict-safe',   Icon: ShieldCheck,    label: 'Safe' },
  potentially_misleading:      { cls: 'verdict-warn',   Icon: AlertTriangle,  label: 'Potentially Misleading' },
  manipulated:                 { cls: 'verdict-danger', Icon: AlertTriangle,  label: 'Manipulated' },
  scam:                        { cls: 'verdict-danger', Icon: AlertTriangle,  label: 'Scam Detected' },
  uncertain:                   { cls: 'verdict-grey',   Icon: HelpCircle,     label: 'Uncertain' },
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
  const [mode, setMode] = useState('text') // 'text' | 'image'

  const [textInput, setTextInput] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  const [textResult, setTextResult] = useState(null)
  const [imageResult, setImageResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const switchMode = (next) => {
    if (next === mode) return
    setMode(next)
    setError('')
    setTextResult(null)
    setImageResult(null)
    if (next === 'text') {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl('')
      setSelectedImage(null)
    } else {
      setTextInput('')
    }
  }

  const canAnalyze = mode === 'text' ? textInput.trim().length > 0 : Boolean(selectedImage)

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

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setIsAnalyzing(true)
    setError('')
    setTextResult(null)
    setImageResult(null)

    try {
      if (mode === 'text') {
        const res = await sendRuntimeMessage({ type: 'ANALYZE_MESSAGE', text: textInput.trim() })
        setTextResult(res)
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

  const textSummary = textResult?.summary?.en || []

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

      <button
        type="button"
        className="analyze-button"
        onClick={handleAnalyze}
        disabled={!canAnalyze || isAnalyzing}
      >
        {isAnalyzing ? (
          <><Loader2 size={15} className="spin" /> Analyzing…</>
        ) : (
          <><ShieldCheck size={15} /> Analyze</>
        )}
      </button>

      {error && <p className="error-text">{error}</p>}

      {textResult && (
        <div className="result-card">
          <VerdictBadge classification={textResult.classification} />
          <ConfidencePips level={textResult.confidence_level} />
          {textSummary.length > 0 && (
            <ul className="summary-list">
              {textSummary.map((item, i) => (
                <li key={i} className={`summary-item summary-${item.type}`}>{item.text}</li>
              ))}
            </ul>
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
        </div>
      )}
    </div>
  )
}

export default App
