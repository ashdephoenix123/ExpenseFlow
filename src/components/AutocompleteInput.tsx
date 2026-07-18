import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/theme';

interface AutocompleteInputProps {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  suggestions: string[];
  isLoading?: boolean;
  onAddNew?: (value: string) => Promise<void>;
  placeholder?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onSelect,
  suggestions,
  isLoading = false,
  onAddNew,
  placeholder = 'Start typing...',
}) => {
  const [inputText, setInputText] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputText.trim()) return suggestions;
    const query = inputText.toLowerCase().trim();
    return suggestions.filter(s => s.toLowerCase().includes(query));
  }, [inputText, suggestions]);

  const exactMatchExists = useMemo(() => {
    if (!inputText.trim()) return true;
    return suggestions.some(
      s => s.toLowerCase() === inputText.toLowerCase().trim(),
    );
  }, [inputText, suggestions]);

  const showDropdown = isFocused;

  const handleSelect = (item: string) => {
    setInputText(item);
    onSelect(item);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleAddNew = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !onAddNew) return;
    setIsAdding(true);
    try {
      await onAddNew(trimmed);
      onSelect(trimmed);
      setIsFocused(false);
      Keyboard.dismiss();
    } catch {
      // Error handled by the store/caller
    } finally {
      setIsAdding(false);
    }
  };

  const handleChangeText = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      onSelect('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay to allow tap on dropdown items to register
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
        ]}>
        <Icon
          name="magnify"
          size={20}
          color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
        />
        {inputText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setInputText('');
              onSelect('');
              inputRef.current?.focus();
            }}
            style={styles.clearBtn}
            activeOpacity={0.7}>
            <Icon name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <ActivityIndicator
          size="small"
          color={theme.colors.primary}
          style={styles.loader}
        />
      )}

      {showDropdown && !isLoading && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownList}>
            {filteredSuggestions.map((item) => {
              const isSelected = item === value;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.dropdownText,
                      isSelected && styles.dropdownTextSelected,
                    ]}>
                    {item}
                  </Text>
                  {isSelected && (
                    <Icon
                      name="check"
                      size={18}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {!exactMatchExists && filteredSuggestions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matches found</Text>
              </View>
            ) : null}

            {!exactMatchExists && onAddNew ? (
              <TouchableOpacity
                style={styles.addNewItem}
                onPress={handleAddNew}
                activeOpacity={0.7}
                disabled={isAdding}>
                {isAdding ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <>
                    <Icon
                      name="plus-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.addNewText}>
                      Add "{inputText.trim()}"
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
    zIndex: 10,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 14 : 12,
    minHeight: 32,
  },
  clearBtn: {
    padding: 4,
    marginLeft: theme.spacing.xs,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  dropdown: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    maxHeight: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  dropdownText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 15,
  },
  dropdownTextSelected: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  addNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.primary + '08',
  },
  addNewText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontSize: 15,
  },
});
