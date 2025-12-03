import { useUser } from '@/contexts/UserContext';
import { useDatabase } from '@/hooks/use-database';
import { getAllUsers, getAllHRAccounts, getAllManagerCOOAccounts, getConversations, getIncidentReports, getMyIncidentReports } from '@/services/api';
import { User, HRAccount, ManagerCOOAccount, IncidentReport } from '@/peregrineDB/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, View, TextInput, RefreshControl } from 'react-native';

interface MessageUser {
  id: number;
  name: string;
  last_name: string;
  email: string;
  type: 'user' | 'hr' | 'manager_coo';
  position?: string;
  last_message_at?: string;
  unread_count?: number;
  hasMessages?: boolean;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user, isHR } = useUser();
  const { isInitialized } = useDatabase();
  const [allUsers, setAllUsers] = useState<MessageUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<MessageUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MESSAGE' | 'INCIDENT REPORT'>('MESSAGE');
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is Manager or COO
  const isManagerOrCOO = user?.company_position?.toLowerCase().includes('manager') || 
                         user?.company_position?.toLowerCase().includes('coo');
  const canViewAllReports = isHR || isManagerOrCOO;

  useEffect(() => {
    if (isInitialized) {
      loadAllUsers();
      loadIncidentReports();
    }
  }, [isInitialized, activeTab]);

  const loadIncidentReports = async () => {
    try {
      // HR/Manager/COO see all reports, regular users see only their own
      if (canViewAllReports) {
        const reports = await getIncidentReports();
        setIncidentReports(reports);
      } else {
        const reports = await getMyIncidentReports();
        setIncidentReports(reports);
      }
    } catch (error) {
      console.error('Error loading incident reports:', error);
      setIncidentReports([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidentReports();
    setRefreshing(false);
  };

  const handleCreateIncidentReport = () => {
    router.push('/incident-report-form');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'reviewed': return '#2196F3';
      case 'resolved': return '#228B22';
      default: return '#666';
    }
  };

  const renderIncidentReport = ({ item }: { item: IncidentReport }) => (
    <View style={styles.incidentCard}>
      <View style={styles.incidentHeader}>
        <View style={styles.incidentInfo}>
          <Text style={styles.incidentTitle}>Incident Report #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.incidentDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.incidentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reported by:</Text>
          <Text style={styles.detailValue}>{item.reported_by_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date of Incident:</Text>
          <Text style={styles.detailValue}>
            {new Date(item.date_of_incident).toLocaleDateString()} {item.time_of_incident} {item.time_period}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Injured:</Text>
          <Text style={[styles.detailValue, item.is_someone_injured && { color: '#ff4444' }]}>
            {item.is_someone_injured ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.descriptionLabel}>Description:</Text>
      <Text style={styles.descriptionText} numberOfLines={3}>
        {item.description_of_accident}
      </Text>
    </View>
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const filtered = allUsers.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.last_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.position && u.position.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  }, [searchQuery, allUsers]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const messageUsers: MessageUser[] = [];
      const usersMap = new Map<string, MessageUser>();

      // Get conversations first (users with messages)
      let conversations: any[] = [];
      try {
        conversations = await getConversations();
      } catch (error) {
        console.error('Error loading conversations:', error);
      }

      // Create a map of users with messages
      const conversationsMap = new Map<string, { last_message_at: string; unread_count: number }>();
      conversations.forEach((conv: any) => {
        const key = `${conv.user.type}-${conv.user.id}`;
        conversationsMap.set(key, {
          last_message_at: conv.last_message_at || new Date().toISOString(),
          unread_count: conv.unread_count || 0,
        });
      });

      // Get all regular users
      const users = await getAllUsers();
      users.forEach(u => {
        if (u.id !== user?.id) { // Exclude current user
          const key = `user-${u.id}`;
          const conv = conversationsMap.get(key);
          const messageUser: MessageUser = {
            id: u.id,
            name: u.name,
            last_name: u.last_name,
            email: u.email,
            type: 'user',
            position: u.position,
            hasMessages: !!conv,
            last_message_at: conv?.last_message_at,
            unread_count: conv?.unread_count || 0,
          };
          messageUsers.push(messageUser);
          usersMap.set(key, messageUser);
        }
      });

      // Get all HR accounts
      const hrAccounts = await getAllHRAccounts();
      hrAccounts.forEach(hr => {
        const key = `hr-${hr.id}`;
        const conv = conversationsMap.get(key);
        const messageUser: MessageUser = {
          id: hr.id,
          name: hr.name,
          last_name: hr.last_name,
          email: hr.email,
          type: 'hr',
          position: hr.position || 'HR',
          hasMessages: !!conv,
          last_message_at: conv?.last_message_at,
          unread_count: conv?.unread_count || 0,
        };
        messageUsers.push(messageUser);
        usersMap.set(key, messageUser);
      });

      // Get all Manager/COO accounts
      try {
        const managerCooAccounts = await getAllManagerCOOAccounts();
        managerCooAccounts.forEach(mc => {
          const key = `manager_coo-${mc.id}`;
          const conv = conversationsMap.get(key);
          const messageUser: MessageUser = {
            id: mc.id,
            name: mc.name,
            last_name: mc.last_name,
            email: mc.email,
            type: 'manager_coo',
            position: mc.position || 'Manager/COO',
            hasMessages: !!conv,
            last_message_at: conv?.last_message_at,
            unread_count: conv?.unread_count || 0,
          };
          messageUsers.push(messageUser);
          usersMap.set(key, messageUser);
        });
      } catch (error) {
        console.error('Error loading Manager/COO accounts:', error);
      }

      // Sort: Users with messages first (by last_message_at), then users without messages (by name)
      messageUsers.sort((a, b) => {
        // Users with messages come first
        if (a.hasMessages && !b.hasMessages) return -1;
        if (!a.hasMessages && b.hasMessages) return 1;
        
        // If both have messages, sort by last_message_at (most recent first)
        if (a.hasMessages && b.hasMessages && a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        }
        
        // If both don't have messages, sort by name
        const nameA = `${a.name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setAllUsers(messageUsers);
      setFilteredUsers(messageUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (messageUser: MessageUser) => {
    router.push({
      pathname: '/chat',
      params: {
        userId: messageUser.id.toString(),
        userName: `${messageUser.name} ${messageUser.last_name}`,
        userType: messageUser.type,
        chatType: activeTab === 'MESSAGE' ? 'message' : 'incident',
      },
    } as any);
  };

  const getUserIcon = (type: string) => {
    switch (type) {
      case 'hr':
        return 'briefcase';
      case 'manager_coo':
        return 'person-circle';
      default:
        return 'person';
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'hr':
        return 'HR';
      case 'manager_coo':
        return 'Manager/COO';
      default:
        return 'User';
    }
  };

  const renderUserItem = ({ item }: { item: MessageUser }) => {
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleUserPress(item)}
      >
        <View style={styles.userCardContent}>
          <View style={styles.avatarContainer}>
            <Ionicons name={getUserIcon(item.type)} size={32} color="#228B22" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name} {item.last_name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userType}>{getUserTypeLabel(item.type)}</Text>
              {item.position && (
                <Text style={styles.userPosition}> • {item.position}</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.title}>{activeTab === 'MESSAGE' ? 'Messages' : 'Incident Reports'}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tabs Container */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsBox}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'MESSAGE' && styles.activeTab]}
              onPress={() => setActiveTab('MESSAGE')}
            >
              <Text style={[styles.tabText, activeTab === 'MESSAGE' && styles.activeTabText]}>
                MESSAGE
              </Text>
            </TouchableOpacity>
            <View style={styles.tabDivider} />
            <TouchableOpacity
              style={[styles.tab, activeTab === 'INCIDENT REPORT' && styles.activeTab]}
              onPress={() => setActiveTab('INCIDENT REPORT')}
            >
              <Text style={[styles.tabText, activeTab === 'INCIDENT REPORT' && styles.activeTabText]}>
                INCIDENT REPORT
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {activeTab === 'MESSAGE' ? (
            // MESSAGE TAB CONTENT
            <>
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : filteredUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#999" />
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search term' : 'No users available'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredUsers}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          ) : (
            // INCIDENT REPORT TAB CONTENT
            <>
              {/* Create button for regular users */}
              {!canViewAllReports && (
                <TouchableOpacity
                  style={styles.createReportButton}
                  onPress={handleCreateIncidentReport}
                >
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text style={styles.createReportButtonText}>Create New Incident Report</Text>
                </TouchableOpacity>
              )}

              {/* Title for the list */}
              <View style={styles.incidentListHeader}>
                <Text style={styles.incidentListTitle}>
                  {canViewAllReports ? 'All Incident Reports' : 'My Incident Reports'}
                </Text>
                <TouchableOpacity onPress={onRefresh}>
                  <Ionicons name="refresh" size={20} color="#228B22" />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading incident reports...</Text>
                </View>
              ) : incidentReports.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="#999" />
                  <Text style={styles.emptyText}>No incident reports</Text>
                  <Text style={styles.emptySubtext}>
                    {canViewAllReports 
                      ? 'No incident reports have been submitted yet' 
                      : 'Tap the button above to create a new report'
                    }
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={incidentReports}
                  renderItem={renderIncidentReport}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#228B22']} />
                  }
                />
              )}
            </>
          )}
        </View>
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
    // backgroundColor: 'rgba(34, 139, 34, 0.85)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabsBox: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  activeTabText: {
    color: '#228B22',
    fontWeight: 'bold',
  },
  tabDivider: {
    width: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userType: {
    fontSize: 12,
    color: '#228B22',
    fontWeight: '600',
  },
  userPosition: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Incident Report Styles
  createReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#228B22',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  createReportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incidentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  incidentListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  incidentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  incidentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  incidentDate: {
    fontSize: 12,
    color: '#666',
  },
  incidentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 110,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
});

