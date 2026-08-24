import { useEffect, useState } from 'react'

import './App.css'

function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080')

    socket.onopen = () => {
      setSocket(socket)
      socket.send(JSON.stringify({ type: "Athentication", id: 'cmsz1jnud0000mwsafxp139tc' }))
    }

    socket.onmessage = (message) => {
      console.log(message.data)
    }

    return () => {
      socket.close()
    }
  }, [])

  if (!socket) {
    return <div>Loadigg</div>
  }

  return (
    <>
      <p>Connected to server</p>
    </>
  )
}

export default App
