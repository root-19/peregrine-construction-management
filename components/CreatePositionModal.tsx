import { useDatabase } from '@/hooks/use-database';
import { insertPosition, getAllPositionsFromTable, deletePosition } from '@/services/api';
import { Position } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, ActivityIndicator } from 'react-native';

interface CreatePositionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePositionModal({ visible, onClose, onSuccess }: CreatePositionModalProps) {
  const [position, setPosition] = useState('');
  const { isInitialized } = useDatabase();
  const [showPositionsList, setShowPositionsList] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const handleSave = async () => {
    if (!position.trim()) {
      Alert.alert('Error', 'Please enter a position name');
      return;
    }

    // Wait for API to be initialized
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
      } else if (error?.message?.includes('API not initialized')) {
        Alert.alert('Error', 'Database is not ready. Please try again.');
      } else {
        Alert.alert('Error', error.message || 'Failed to create position');
      }
    }
  };

  const handleClose = () => {
    setPosition('');
    setShowPositionsList(false);
    onClose();
  };

  const handleViewAllPositions = async () => {
    setLoadingPositions(true);
    try {
      const allPositions = await getAllPositionsFromTable();
      setPositions(allPositions);
      setShowPositionsList(true);
    } catch (error) {
      console.error('Error fetching positions:', error);
      Alert.alert('Error', 'Failed to load positions');
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleBackToCreate = () => {
    setShowPositionsList(false);
  };

  const handleDeletePosition = (pos: Position) => {
    Alert.alert(
      'Delete Position',
      `Are you sure you want to delete "${pos.position}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePosition(pos.id);
              // Refresh the list
              const allPositions = await getAllPositionsFromTable();
              setPositions(allPositions);
              Alert.alert('Success', 'Position deleted successfully');
            } catch (error) {
              console.error('Error deleting position:', error);
              Alert.alert('Error', 'Failed to delete position');
            }
          },
        },
      ]
    );
  };

  const renderPositionItem = ({ item }: { item: Position }) => (
    <View style={styles.positionItem}>
      <View style={styles.positionIcon}>
        <Ionicons name="briefcase" size={24} color="#228B22" />
      </View>
      <View style={styles.positionInfo}>
        <Text style={styles.positionName}>{item.position}</Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeletePosition(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

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
              <Text style={styles.title}>{showPositionsList ? 'All Positions' : 'Create Position'}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {showPositionsList ? (
              // Show Positions List
              <>
                {loadingPositions ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#228B22" />
                    <Text style={styles.loadingText}>Loading positions...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={positions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderPositionItem}
                    style={styles.positionsList}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Ionicons name="briefcase-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No positions found</Text>
                      </View>
                    }
                  />
                )}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.backButton} onPress={handleBackToCreate}>
                    <Ionicons name="arrow-back" size={18} color="#228B22" />
                    <Text style={styles.backButtonText}>Back to Create</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Show Create Position Form
              <>
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
                  <TouchableOpacity style={styles.viewPositionsButton} onPress={handleViewAllPositions} disabled={loadingPositions}>
                    {loadingPositions ? (
                      <ActivityIndicator size="small" color="#228B22" />
                    ) : (
                      <>
                        <Ionicons name="list" size={18} color="#228B22" />
                        <Text style={styles.viewPositionsButtonText}>View All Positions</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, !position.trim() && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!position.trim()}
                  >
                    <Text style={styles.saveButtonText}>Create Position</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  viewPositionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#228B22',
    gap: 6,
  },
  viewPositionsButtonText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#228B22',
    gap: 6,
  },
  backButtonText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
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
  positionsList: {
    maxHeight: 300,
  },
  positionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  positionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionInfo: {
    flex: 1,
  },
  positionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
});

