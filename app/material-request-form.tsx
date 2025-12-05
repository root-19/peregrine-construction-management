import { useUser } from '@/contexts/UserContext';
import { submitMaterialRequest } from '@/services/api';
import { MaterialItem } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MaterialRequestFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectName?: string | string[];
    projectId?: string | string[];
  }>();
  const { user } = useUser();

  // Get project name from params
  const projectNameParam = Array.isArray(params.projectName) ? params.projectName[0] : params.projectName;

  // Form States
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');
  const [projectName, setProjectName] = useState(projectNameParam || '');
  const [projectLocation, setProjectLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [materials, setMaterials] = useState<MaterialItem[]>([
    { item_name: '', quantity: 1, unit: 'pcs', specifications: '' }
  ]);

  // Update project name when params change
  useEffect(() => {
    if (projectNameParam) {
      setProjectName(projectNameParam);
    }
  }, [projectNameParam]);

  const units = ['pcs', 'kg', 'g', 'L', 'mL', 'box', 'pack', 'roll', 'set', 'bag', 'meter', 'feet', 'unit'];

  const addMaterial = () => {
    setMaterials([...materials, { item_name: '', quantity: 1, unit: 'pcs', specifications: '' }]);
  };

  const updateMaterial = (index: number, field: keyof MaterialItem, value: string | number) => {
    const updated = [...materials];
    if (field === 'quantity') {
      updated[index][field] = typeof value === 'string' ? parseInt(value) || 1 : value;
    } else {
      updated[index][field] = value as string;
    }
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      const updated = materials.filter((_, i) => i !== index);
      setMaterials(updated);
    }
  };

  const validateForm = (): boolean => {
    if (!dateNeeded.trim()) {
      Alert.alert('Error', 'Please enter the date needed');
      return false;
    }
    if (!purpose.trim()) {
      Alert.alert('Error', 'Please enter the purpose of request');
      return false;
    }
    
    // Check if at least one material has a name
    const validMaterials = materials.filter(m => m.item_name.trim() !== '');
    if (validMaterials.length === 0) {
      Alert.alert('Error', 'Please add at least one material item');
      return false;
    }
    
    // Check all materials have required fields
    for (let i = 0; i < validMaterials.length; i++) {
      if (!validMaterials[i].item_name.trim()) {
        Alert.alert('Error', `Please enter the item name for material ${i + 1}`);
        return false;
      }
      if (validMaterials[i].quantity < 1) {
        Alert.alert('Error', `Please enter a valid quantity for ${validMaterials[i].item_name}`);
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) {
      Alert.alert('Error', 'You must be logged in to submit a material request.');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Filter out empty materials
      const filteredMaterials = materials.filter(m => m.item_name.trim() !== '');

      await submitMaterialRequest({
        requested_by_name: `${user.name || ''} ${user.last_name || ''}`.trim(),
        requested_by_position: user.company_position || user.position || 'Unknown Position',
        department: department.trim() || undefined,
        date_of_request: today,
        date_needed: dateNeeded.trim(),
        project_name: projectName.trim() || undefined,
        project_location: projectLocation.trim() || undefined,
        purpose: purpose.trim(),
        materials: filteredMaterials,
        priority: priority,
      });

      Alert.alert(
        'Success',
        'Material request submitted successfully. HR and Management will review your request.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting material request:', error);
      Alert.alert('Error', 'Failed to submit material request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#f44336';
      case 'urgent': return '#9C27B0';
      default: return '#666';
    }
  };

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>MATERIAL REQUEST</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Requester Info */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Requested by:</Text>
                  <Text style={styles.value}>
                    {user
                      ? `${user.name || ''} ${user.last_name || ''}`.trim()
                      : <Text style={{ color: 'red' }}>Not Logged In</Text>
                    }
                    {user && (user.company_position || user.position)
                      ? ` (${user.company_position || user.position})`
                      : ''}
                  </Text>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Date of Request:</Text>
                  <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                </View>
              </View>
            </View>

            {/* Request Details */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Request Details</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.inputLabel}>Department:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter department (optional)"
                placeholderTextColor="#999"
                value={department}
                onChangeText={setDepartment}
              />

              <Text style={styles.inputLabel}>Date Needed: *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={dateNeeded}
                onChangeText={setDateNeeded}
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Project Name:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Project name (optional)"
                    placeholderTextColor="#999"
                    value={projectName}
                    onChangeText={setProjectName}
                  />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Location:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Location (optional)"
                    placeholderTextColor="#999"
                    value={projectLocation}
                    onChangeText={setProjectLocation}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Purpose of Request: *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the purpose of this material request..."
                placeholderTextColor="#999"
                value={purpose}
                onChangeText={setPurpose}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Priority Selection */}
              <Text style={styles.inputLabel}>Priority Level: *</Text>
              <View style={styles.priorityContainer}>
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && { backgroundColor: getPriorityColor(p) }
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[
                      styles.priorityText,
                      priority === p && styles.priorityTextActive
                    ]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Materials List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MATERIALS REQUESTED</Text>
            </View>

            <View style={styles.section}>
              {materials.map((material, index) => (
                <View key={index} style={styles.materialCard}>
                  <View style={styles.materialHeader}>
                    <Text style={styles.materialTitle}>ITEM {index + 1}:</Text>
                    {materials.length > 1 && (
                      <TouchableOpacity onPress={() => removeMaterial(index)}>
                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <Text style={styles.inputLabel}>Item Name: *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter item name"
                    placeholderTextColor="#999"
                    value={material.item_name}
                    onChangeText={(value) => updateMaterial(index, 'item_name', value)}
                  />
                  
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Text style={styles.inputLabel}>Quantity: *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="1"
                        placeholderTextColor="#999"
                        value={material.quantity.toString()}
                        onChangeText={(value) => updateMaterial(index, 'quantity', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.inputLabel}>Unit: *</Text>
                      <View style={styles.unitContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {units.slice(0, 6).map((u) => (
                            <TouchableOpacity
                              key={u}
                              style={[
                                styles.unitButton,
                                material.unit === u && styles.unitButtonActive
                              ]}
                              onPress={() => updateMaterial(index, 'unit', u)}
                            >
                              <Text style={[
                                styles.unitText,
                                material.unit === u && styles.unitTextActive
                              ]}>
                                {u}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={styles.inputLabel}>Specifications:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Size, color, brand, etc. (optional)"
                    placeholderTextColor="#999"
                    value={material.specifications}
                    onChangeText={(value) => updateMaterial(index, 'specifications', value)}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addMaterialButton} onPress={addMaterial}>
                <Ionicons name="add-circle-outline" size={32} color="#228B22" />
                <Text style={styles.addMaterialText}>Add Another Item</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'SUBMIT REQUEST'}
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(34, 139, 34, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#000',
  },
  sectionHeader: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowItem: {
    flex: 1,
  },
  fieldRow: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  priorityTextActive: {
    color: 'white',
  },
  materialCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#228B22',
  },
  unitContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 6,
    backgroundColor: 'white',
  },
  unitButtonActive: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  unitTextActive: {
    color: 'white',
  },
  addMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addMaterialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#228B22',
  },
  submitButton: {
    backgroundColor: '#228B22',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});

