import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Sites from './pages/Sites';
import Locations from './pages/Locations';
import Equipment from './pages/Equipment';
import Events from './pages/Events';
import Gallery from './pages/Gallery';
import Export from './pages/Export';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      defaultProps: {
        elevation: 2,
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename="/mri-physics-tool">
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="sites" element={<Sites />} />
            <Route path="locations" element={<Locations />} />
            <Route path="equipment" element={<Equipment />} />
            <Route path="events" element={<Events />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="export" element={<Export />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
