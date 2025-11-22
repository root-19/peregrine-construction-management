import { useDatabase } from '@/hooks/use-database';
import { insertPosition } from '@/peregrineDB/database';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CreatePositionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePositionModal({ visible, onClose, onSuccess }: CreatePositionModalProps) {
  const [position, setPosition] = useState('');
  const { isInitialized } = useDatabase();

  const handleSave = async () => {
    if (!position.trim()) {
      Alert.alert('Error', 'Please enter a position name');
      return;
    }

    // Wait for database to be initialized
    if (!isInitialized) {
      Alert.alert('Error', 'Database is not ready. Please wait a moment and try again.');
      return;
    }

    // Add a longer delay to ensure database is fully ready (React Native Expo needs more time)
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      await insertPosition(position.trim());
      Alert.alert('Success', 'Position created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setPosition('');
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating position:', error);
      if (error?.message?.includes('UNIQUE constraint') || error?.message?.includes('already exists')) {
        Alert.alert('Error', 'This position already exists');
      } else if (error?.message?.includes('Database not initialized')) {
        Alert.alert('Error', 'Database is not ready. Please try again.');
      } else {
        Alert.alert('Error', error.message || 'Failed to create position');
      }
    }
  };

  const handleClose = () => {
    setPosition('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Position</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Position Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Manager, Engineer, Developer"
                placeholderTextColor="#999"
                value={position}
                onChangeText={setPosition}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !position.trim() && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!position.trim()}
              >
                <Text style={styles.saveButtonText}>Create Position</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#228B22',
  },
  closeButton: {
    padding:12
    
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 30,
    backgroundColor: '#228B22',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

