import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Organizations from './pages/Organizations';
import Sites from './pages/Sites';
import Rooms from './pages/Rooms';
import Events from './pages/Events';
import Export from './pages/Export';

function App() {
  return (
    <BrowserRouter basename="/mri-physics-tool">
      <div className="app">
        <Routes>
          {/* Drill-down hierarchy */}
          <Route path="/" element={<Organizations />} />
          <Route path="/organizations/:orgId/sites" element={<Sites />} />
          <Route path="/organizations/:orgId/sites/:siteId/rooms" element={<Rooms />} />

          {/* Other pages - to be rebuilt */}
          <Route path="/events" element={<Events />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
