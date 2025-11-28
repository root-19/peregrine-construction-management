import { assignUserToProject, getAllPositions, getAssignedUsersForProject, getUsersByPosition, unassignUserFromProject } from '@/services/api';
import { User } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AssignProjectUserModalProps {
  visible: boolean;
  projectId: number;
  projectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignProjectUserModal({ visible, projectId, projectName, onClose, onSuccess }: AssignProjectUserModalProps) {
  const [positions, setPositions] = useState<string[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPositions, setShowPositions] = useState(true);

  useEffect(() => {
    if (visible && projectId) {
      loadPositions();
      loadAssignedUsers();
      // Reset to positions view when modal opens
      setShowPositions(true);
      setSelectedPosition(null);
    }
  }, [visible, projectId]);

  const loadPositions = async () => {
    try {
      const allPositions = await getAllPositions();
      setPositions(allPositions);
    } catch (error) {
      console.error('Error loading positions:', error);
      Alert.alert('Error', 'Failed to load positions');
    }
  };

  const loadUsersForPosition = async (position: string) => {
    try {
      setLoading(true);
      const usersForPosition = await getUsersByPosition(position);
      setUsers(usersForPosition);
      setSelectedPosition(position);
      setShowPositions(false);
    } catch (error) {
      console.error('Error loading users for position:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPositions = () => {
    setShowPositions(true);
    setSelectedPosition(null);
    setUsers([]);
  };

  const loadAssignedUsers = async () => {
    try {
      const assigned = await getAssignedUsersForProject(projectId);
      setAssignedUsers(assigned);
    } catch (error) {
      console.error('Error loading assigned users:', error);
    }
  };

  const handleToggleAssignment = async (user: User) => {
    const isAssigned = assignedUsers.some(au => au.id === user.id);
    
    try {
      setLoading(true);
      if (isAssigned) {
        await unassignUserFromProject(projectId, user.id);
        Alert.alert('Success', `${user.name} ${user.last_name} has been unassigned from this project`);
      } else {
        await assignUserToProject(projectId, user.id);
        Alert.alert('Success', `${user.name} ${user.last_name} has been assigned to this project`);
      }
      await loadAssignedUsers();
      onSuccess();
    } catch (error) {
      console.error('Error toggling assignment:', error);
      Alert.alert('Error', 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const isUserAssigned = (userId: number) => {
    return assignedUsers.some(au => au.id === userId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                {!showPositions && (
                  <TouchableOpacity onPress={handleBackToPositions} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#228B22" />
                  </TouchableOpacity>
                )}
                <Text style={styles.title}>
                  {showPositions ? 'Select Position' : `Users - ${selectedPosition}`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {showPositions ? (
              positions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={64} color="#999" />
                  <Text style={styles.emptyText}>No positions available</Text>
                  <Text style={styles.emptySubtext}>Create user accounts with positions first</Text>
                </View>
              ) : (
                <FlatList
                  data={positions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.positionCard}
                      onPress={() => loadUsersForPosition(item)}
                      disabled={loading}
                    >
                      <View style={styles.positionInfo}>
                        <Ionicons 
                          name="briefcase" 
                          size={24} 
                          color="#228B22" 
                          style={styles.positionIcon}
                        />
                        <Text style={styles.positionName}>{item}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.listContent}
                />
              )
            ) : (
              users.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#999" />
                  <Text style={styles.emptyText}>No users available</Text>
                  <Text style={styles.emptySubtext}>No users found for this position</Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => {
                    const assigned = isUserAssigned(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.userCard, assigned && styles.userCardAssigned]}
                        onPress={() => handleToggleAssignment(item)}
                        disabled={loading}
                      >
                        <View style={styles.userInfo}>
                          <Ionicons 
                            name={assigned ? "checkmark-circle" : "person-outline"} 
                            size={24} 
                            color={assigned ? "#228B22" : "#999"} 
                            style={styles.userIcon}
                          />
                          <View style={styles.userDetails}>
                            <Text style={styles.userName}>
                              {item.name} {item.last_name}
                            </Text>
                            <Text style={styles.userEmail}>{item.email}</Text>
                            {(item.position || item.company_position) && (
                              <Text style={styles.userPosition}>
                                {item.position || item.company_position}
                              </Text>
                            )}
                          </View>
                        </View>
                        {assigned && (
                          <View style={styles.assignedBadge}>
                            <Text style={styles.assignedText}>Assigned</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  contentContainerStyle={styles.listContent}
                />
              )
            )}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
    maxHeight: '100%',
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userCardAssigned: {
    backgroundColor: '#f0f8f0',
    borderColor: '#228B22',
    borderWidth: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIcon: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 12,
    color: '#999',
  },
  assignedBadge: {
    backgroundColor: '#228B22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  assignedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  positionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionIcon: {
    marginRight: 12,
  },
  positionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  doneButton: {
    backgroundColor: '#228B22',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

