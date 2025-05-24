// src/screens/previewurl.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PreviewUrl = (): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Preview Url</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Optional: give a white background
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default PreviewUrl;
