import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, TextInput, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = 'https://your-backend-url.com/api'; // Replace with your actual API URL

const DashboardScreen = () => {
  const { user } = useAuth();
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const handleExecuteCommand = async () => {
    if (!command.trim() || isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      const response = await axios.post(`${API_URL}/commands`, {
        prompt: command,
      });
      
      setResult(response.data.content);
    } catch (error: any) {
      console.error('Command execution error:', error);
      Alert.alert(
        'Command Failed',
        error.response?.data?.error || 'Failed to process command'
      );
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Recent projects (in a real app, you'd fetch these from the API)
  const recentProjects = [
    { id: '1', name: 'Landing Page', description: 'Website landing page for product launch' },
    { id: '2', name: 'Mobile App', description: 'iOS and Android app development' },
    { id: '3', name: 'Marketing Campaign', description: 'Social media marketing strategy' },
  ];
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {user?.full_name || 'Entrepreneur'}!</Text>
        <Text style={styles.subtitle}>What would you like to build today?</Text>
      </View>
      
      <Card style={styles.card}>
        <Card.Title title="Command Center" />
        <Card.Content>
          <TextInput
            label="Enter a natural language command"
            value={command}
            onChangeText={setCommand}
            placeholder="e.g., 'Create a landing page for my fintech startup'"
            multiline
            style={styles.commandInput}
            disabled={isProcessing}
          />
          
          <Button
            mode="contained"
            onPress={handleExecuteCommand}
            loading={isProcessing}
            disabled={isProcessing || !command.trim()}
            style={styles.button}
          >
            {isProcessing ? 'Processing...' : 'Run Command'}
          </Button>
          
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E88E5" />
              <Text style={styles.loadingText}>Processing your command...</Text>
            </View>
          )}
          
          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Result:</Text>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Recent Projects" />
        <Card.Content>
          {recentProjects.map(project => (
            <View key={project.id} style={styles.projectItem}>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <Text style={styles.projectDescription}>{project.description}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  commandInput: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    lineHeight: 20,
  },
  projectItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  projectTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  projectDescription: {
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardScreen;
