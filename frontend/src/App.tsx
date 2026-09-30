import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'


import './App.css'

import TheRootStory from './components/TheRootStory'

type AuthMode = 'login' | 'signup'

function AuthPage() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    console.log('Redirecting to Google authentication...')

    // Google OAuth normally starts with a browser redirect,
    // not a normal fetch().
    const response = await fetch('http://localhost:3000/api/v1/auth/google', {
      method: 'POST'
    })
    const data = await response.json()
    if (data.valid) {
      window.location.href = data.url
    } else {
      alert(data.message)
    }
  }

  const handleCredentialsAuth = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const endpoint =
        mode === 'login'
          ? 'http://localhost:3000/api/v1/auth/login'
          : 'http://localhost:3000/api/v1/auth/signup'

      const body =
        mode === 'login'
          ? { email, password }
          : { name, email, password }

      console.log('Calling:', endpoint)
      console.log('Request body:', body)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      })

      const data = await response.json()
      console.log('Auth response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      // Your credentials API returns accessToken in JSON.
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }

      console.log(`${mode === 'login' ? 'Login' : 'Signup'} successful`)
      navigate('/home')
    } catch (error) {
      console.error('Authentication error:', error)
      setError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Medlinks</h1>
          <p>{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        </div>

        <button className="google-button" onClick={handleGoogleLogin}>
          Continue with Google
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleCredentialsAuth}>
          {mode === 'signup' && (
            <div className="input-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="switch-auth">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError('') }}>Sign Up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    console.log('User successfully reached HomePage')

    const accessToken = localStorage.getItem('accessToken')
    console.log('Credential access token:', accessToken)

    const ws = new WebSocket('ws://localhost:8080')

    ws.onopen = () => {
      console.log('WebSocket connected')
      setSocket(ws)

      // Credentials: token is in localStorage.
      // Google: token is an HttpOnly cookie, so JS can't read it.
      if (accessToken) {
        ws.send(JSON.stringify({ type: 'Authentication', token: accessToken }))
      }
    }

    ws.onmessage = (message) => console.log('WebSocket message:', message.data)
    ws.onerror = (error) => console.error('WebSocket error:', error)
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setSocket(null)
    }

    return () => ws.close()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    if (socket) socket.close()
    console.log('Logged out')
    navigate('/login')
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="status-dot" />
        <h1>You're In 🚀</h1>
        <p>Authentication was successful.</p>
        <p className="connection-status">
          WebSocket: {socket ? 'Connected' : 'Connecting...'}
        </p>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <button
        className="logout-button"
        onClick={async () => {
          const obj = {
            userId: 'cmsz1jnud0000mwsafxp139tc',
            orderDetails: {
              products: [
                { productId: '01BX5ZZKBKACTAV9WEVGEMMVS1', quantity: 14 },
                { productId: '21JL0ZEKBKAYTRV9WEVGEMMVS2', quantity: 12 },
              ],
              addressId: '01BX5ZZKBKACTAV9WEVGEMMVS4',
            },
          }
          const response = await fetch('http://localhost:3000/api/v1/order/newOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(obj),
          })
          const data = await response.json()
          console.log(data)
        }}
      >
        Send Mock Request
      </button>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<TheRootStory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App