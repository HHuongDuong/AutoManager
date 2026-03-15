import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { MobileAppProvider } from './src/context/MobileAppContext';

const Root = () => (
	<MobileAppProvider>
		<App />
	</MobileAppProvider>
);

AppRegistry.registerComponent(appName, () => Root);
