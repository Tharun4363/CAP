/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';
import 'react-native-url-polyfill';
import 'react-native-get-random-values';
// import {Alert } from 'react-native';

AppRegistry.registerComponent(appName, () => App);
