import { registerRootComponent } from 'expo';

import App from './App';

// Release builds drop debug logging (every API request, the scan pipeline
// trace, scheduling details). Warnings and errors are kept.
if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
