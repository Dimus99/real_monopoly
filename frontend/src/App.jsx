import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen animated-bg">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:gameId/:playerId" element={<GameRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
