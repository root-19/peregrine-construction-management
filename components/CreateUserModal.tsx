import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { insertUser, getAllUsers } from '@/services/api';
import { User } from '@/peregrineDB/types';

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserModal({ visible, onClose, onSuccess }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [showUsersList, setShowUsersList] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !lastName.trim() || !email.trim() || !password.trim() || !position.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // insertUser parameters: name, last_name, email, password, company_name?, position?
      await insertUser(name.trim(), lastName.trim(), email.trim(), password.trim(), undefined, position.trim());
      Alert.alert('Success', 'User account created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setPosition('');
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.message || 'Failed to create user account');
    }
  };

  const handleClose = () => {
    setName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPosition('');
    setShowUsersList(false);
    onClose();
  };

  const handleViewAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setShowUsersList(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleBackToCreate = () => {
    setShowUsersList(false);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userAvatar}>
        <Ionicons name="person" size={24} color="#228B22" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name} {item.last_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userPosition}>{item.company_position || item.position || 'No position'}</Text>
      </View>
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
              <Text style={styles.title}>{showUsersList ? 'All Users' : 'Create User Account'}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {showUsersList ? (
              // Show Users List
              <>
                {loadingUsers ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#228B22" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUserItem}
                    style={styles.usersList}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No users found</Text>
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
              // Show Create User Form
              <>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter first name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />

                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter last name"
                    placeholderTextColor="#999"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />

                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>Position *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Manager, Engineer, etc."
                    placeholderTextColor="#999"
                    value={position}
                    onChangeText={setPosition}
                    autoCapitalize="words"
                  />
                </ScrollView>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.viewUsersButton} onPress={handleViewAllUsers} disabled={loadingUsers}>
                    {loadingUsers ? (
                      <ActivityIndicator size="small" color="#228B22" />
                    ) : (
                      <>
                        <Ionicons name="people" size={18} color="#228B22" />
                        <Text style={styles.viewUsersButtonText}>View All Users</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, (!name.trim() || !lastName.trim() || !email.trim() || !password.trim() || !position.trim()) && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!name.trim() || !lastName.trim() || !email.trim() || !password.trim() || !position.trim()}
                  >
                    <Text style={styles.saveButtonText}>Create Account</Text>
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
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
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
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewUsersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
    gap: 6,
  },
  viewUsersButtonText: {
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
  usersList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userPosition: {
    fontSize: 12,
    color: '#228B22',
    marginTop: 2,
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

