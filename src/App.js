import './App.css';
import { AppProvider } from './context/globalContext';
import Header from './components/Header';
import Home from './pages/Home';
import About from './pages/About';
import { useRoutes, Link, useQueryParams } from 'raviger'

const routes = {
  '/': () => <Home />,
  '/about': () => <About />,
}

function App() {
  let route = useRoutes(routes)

  return (
    <AppProvider>
      <div className='container'>
        <Header />
        {route}
      </div>
    </AppProvider>
  );
}

export default App;
