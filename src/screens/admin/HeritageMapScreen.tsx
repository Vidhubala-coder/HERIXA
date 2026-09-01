import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { HeritageMapScreen as BaseHeritageMapScreen } from '../HeritageMapScreen';

export const HeritageMapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <AdminLayout navigation={navigation} activeSection="heritage" title="Heritage Map">
      <View style={styles.container}>
        <BaseHeritageMapScreen navigation={navigation} />
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
