// src/screens/Deploy.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Deploy = (): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Deploy</Text>
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

export default Deploy;
