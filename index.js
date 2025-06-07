/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

// ✅ Polyfills
import 'react-native-url-polyfill';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { decode } from 'base-64';
import { Readable } from 'readable-stream';

if (!global.atob) {
  global.atob = decode;
}

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = Readable; // ✅ FIXED here
}

AppRegistry.registerComponent(appName, () => App);
