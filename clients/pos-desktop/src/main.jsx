import { createRoot } from 'react-dom/client';
import { PosProvider } from './context/PosContext.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
	<PosProvider>
		<App />
	</PosProvider>
);
