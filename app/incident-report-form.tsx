import { useUser } from '@/contexts/UserContext';
import { submitIncidentReport } from '@/services/api';
import { PersonInvolved } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

export default function IncidentReportFormScreen() {
  const router = useRouter();
  const { user, isHR } = useUser();
  
  // Check if user is Manager or COO
  const isManagerOrCOO = user?.company_position?.toLowerCase().includes('manager') || 
                         user?.company_position?.toLowerCase().includes('coo');

  // Form States
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [dateOfIncident, setDateOfIncident] = useState('');
  const [timeOfIncident, setTimeOfIncident] = useState('');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('AM');
  const [descriptionOfAccident, setDescriptionOfAccident] = useState('');
  const [isSomeoneInjured, setIsSomeoneInjured] = useState<boolean | null>(null);
  const [injuryDescription, setInjuryDescription] = useState('');
  const [peopleInvolved, setPeopleInvolved] = useState<PersonInvolved[]>([
    { name: '', phone_number: '', position: '' }
  ]);

  const addPerson = () => {
    setPeopleInvolved([...peopleInvolved, { name: '', phone_number: '', position: '' }]);
  };

  const updatePerson = (index: number, field: keyof PersonInvolved, value: string) => {
    const updated = [...peopleInvolved];
    updated[index][field] = value;
    setPeopleInvolved(updated);
  };

  const removePerson = (index: number) => {
    if (peopleInvolved.length > 1) {
      const updated = peopleInvolved.filter((_, i) => i !== index);
      setPeopleInvolved(updated);
    }
  };

  const validateForm = (): boolean => {
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter the location');
      return false;
    }
    if (!dateOfIncident.trim()) {
      Alert.alert('Error', 'Please enter the date of incident');
      return false;
    }
    if (!timeOfIncident.trim()) {
      Alert.alert('Error', 'Please enter the time of incident');
      return false;
    }
    if (!descriptionOfAccident.trim()) {
      Alert.alert('Error', 'Please enter the description of accident');
      return false;
    }
    if (isSomeoneInjured === null) {
      Alert.alert('Error', 'Please indicate if someone was injured');
      return false;
    }
    if (isSomeoneInjured && !injuryDescription.trim()) {
      Alert.alert('Error', 'Please describe the injuries');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Filter out empty people
      const filteredPeople = peopleInvolved.filter(p => p.name.trim() !== '');

      await submitIncidentReport({
        reported_by_name: `${user.name} ${user.last_name || ''}`.trim(),
        reported_by_position: user.company_position || user.position || 'Employee',
        date_of_report: today,
        location: location.trim(),
        date_of_incident: dateOfIncident.trim(),
        time_of_incident: timeOfIncident.trim(),
        time_period: timePeriod,
        description_of_accident: descriptionOfAccident.trim(),
        is_someone_injured: isSomeoneInjured || false,
        injury_description: isSomeoneInjured ? injuryDescription.trim() : undefined,
        people_involved: filteredPeople.length > 0 ? filteredPeople : undefined,
      });

      Alert.alert(
        'Success',
        'Incident report submitted successfully. HR and Management will review your report.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting incident report:', error);
      Alert.alert('Error', 'Failed to submit incident report. Please try again.');
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>INCIDENT REPORT</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Reporter Info */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Reported by:</Text>
                  <Text style={styles.value}>{user?.name} {user?.last_name}</Text>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Date of Report:</Text>
                  <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Position:</Text>
                <Text style={styles.value}>{user?.company_position || user?.position || 'Employee'}</Text>
              </View>
            </View>

            {/* Description of the Accident */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Description of the Accident</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.inputLabel}>Location: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Date of Incident: *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                    value={dateOfIncident}
                    onChangeText={setDateOfIncident}
                  />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.inputLabel}>Time: *</Text>
                  <View style={styles.timeContainer}>
                    <TextInput
                      style={[styles.input, styles.timeInput]}
                      placeholder="HH:MM"
                      placeholderTextColor="#999"
                      value={timeOfIncident}
                      onChangeText={setTimeOfIncident}
                    />
                    <View style={styles.amPmContainer}>
                      <TouchableOpacity
                        style={[styles.amPmButton, timePeriod === 'AM' && styles.amPmButtonActive]}
                        onPress={() => setTimePeriod('AM')}
                      >
                        <Text style={[styles.amPmText, timePeriod === 'AM' && styles.amPmTextActive]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.amPmButton, timePeriod === 'PM' && styles.amPmButtonActive]}
                        onPress={() => setTimePeriod('PM')}
                      >
                        <Text style={[styles.amPmText, timePeriod === 'PM' && styles.amPmTextActive]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Description of Accident: *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what happened..."
                placeholderTextColor="#999"
                value={descriptionOfAccident}
                onChangeText={setDescriptionOfAccident}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Injury Section */}
            <View style={styles.section}>
              <View style={styles.injuryRow}>
                <Text style={styles.inputLabel}>IS SOMEONE INJURED? *</Text>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsSomeoneInjured(true)}
                  >
                    <View style={[styles.checkboxBox, isSomeoneInjured === true && styles.checkboxChecked]}>
                      {isSomeoneInjured === true && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>YES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsSomeoneInjured(false)}
                  >
                    <View style={[styles.checkboxBox, isSomeoneInjured === false && styles.checkboxChecked]}>
                      {isSomeoneInjured === false && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isSomeoneInjured && (
                <>
                  <Text style={styles.inputLabel}>IF YES, DESCRIBE THE INJURIES: *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the injuries..."
                    placeholderTextColor="#999"
                    value={injuryDescription}
                    onChangeText={setInjuryDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </>
              )}
            </View>

            {/* People Involved */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PEOPLE INVOLVED</Text>
            </View>

            <View style={styles.section}>
              {peopleInvolved.map((person, index) => (
                <View key={index} style={styles.personCard}>
                  <View style={styles.personHeader}>
                    <Text style={styles.personTitle}>PERSON {index + 1}:</Text>
                    {peopleInvolved.length > 1 && (
                      <TouchableOpacity onPress={() => removePerson(index)}>
                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <Text style={styles.inputLabel}>NAME:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter name"
                    placeholderTextColor="#999"
                    value={person.name}
                    onChangeText={(value) => updatePerson(index, 'name', value)}
                  />
                  
                  <Text style={styles.inputLabel}>PHONE NUMBER:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    value={person.phone_number}
                    onChangeText={(value) => updatePerson(index, 'phone_number', value)}
                    keyboardType="phone-pad"
                  />
                  
                  <Text style={styles.inputLabel}>POSITION:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter position"
                    placeholderTextColor="#999"
                    value={person.position}
                    onChangeText={(value) => updatePerson(index, 'position', value)}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addPersonButton} onPress={addPerson}>
                <Ionicons name="add-circle-outline" size={32} color="#228B22" />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'SUBMIT'}
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeInput: {
    flex: 1,
  },
  amPmContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    overflow: 'hidden',
  },
  amPmButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  amPmButtonActive: {
    backgroundColor: '#228B22',
  },
  amPmText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  amPmTextActive: {
    color: 'white',
  },
  injuryRow: {
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  personCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  personHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  addPersonButton: {
    alignItems: 'center',
    paddingVertical: 8,
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




