
import {
  BrowserRouter,
  Routes,
  Route,

} from 'react-router-dom'


import './App.css'

import TheRootStory from './components/TheRootStory'




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