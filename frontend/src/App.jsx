import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

const Lobby = lazy(() => import('./pages/Lobby'));
const GameRoom = lazy(() => import('./pages/GameRoom'));

function App() {
  return (
    <Router>
      <div className="min-h-screen animated-bg">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0c0c14]">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/game/:gameId/:playerId" element={<GameRoom />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
