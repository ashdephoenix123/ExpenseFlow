import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';

interface FABProps {
  onPress: () => void;
  iconName?: string;
  style?: StyleProp<ViewStyle>;
}

export const FloatingActionButton: React.FC<FABProps> = ({ 
  onPress, 
  iconName = 'plus',
  style 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.fab, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon name={iconName} size={24} color="#000000" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.lg,
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
});
