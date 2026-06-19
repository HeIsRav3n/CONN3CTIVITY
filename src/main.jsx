import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: '#0b0a08', minHeight: '100vh', color: '#C9A96E', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ef4444', marginBottom: 16 }}>Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#EDE8DC', fontSize: 13, lineHeight: 1.6 }}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
