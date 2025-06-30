import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

export default function FaceVerification() {
  const router = useRouter();
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = Array.isArray(devices)
    ? devices.find((d) => d.position === 'front')
    : devices?.front || (devices && Object.values(devices).find((d) => d.position === 'front'));
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [storedFaces, setStoredFaces] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);

  // Face detection options (customize as needed)
  const faceDetectionOptions = useRef({
    // Example: mode: 'accurate', detectLandmarks: true
  }).current;
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  const handleDetectedFaces = Worklets.createRunOnJS((faces) => {
    setIsFaceDetected(Array.isArray(faces) && faces.length > 0);
    setDetectedFaces(faces);
    console.log('faces detected', faces);
  });

  // Frame processor worklet for face detection
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    try {
      const faces = detectFaces(frame);
      handleDetectedFaces(faces);
    } catch (err) {
    }
  }, [handleDetectedFaces]);

  // Request camera permission on component mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      setIsRequestingPermission(true);
      const status = await Camera.requestCameraPermission();
      console.log('Camera permission status:', status);
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Load stored faces on component mount
  useEffect(() => {
    loadStoredFaces();
  }, []);

  const loadStoredFaces = async () => {
    try {
      const faces = await AsyncStorage.getItem('faces');
      if (faces) {
        setStoredFaces(JSON.parse(faces));
      }
    } catch (error) {
      console.error('Failed to load faces:', error);
    }
  };

  const verifyFace = async () => {
    if (!camera.current || isVerifying || storedFaces.length === 0 || !isFaceDetected) {
      if (storedFaces.length === 0) {
        Alert.alert('No Faces', 'Please add some faces in the Face Collection screen first.');
      } else if (!isFaceDetected) {
        Alert.alert('No Face Detected', 'Please position a face in the frame.');
      }
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult(null);

      // Capture photo for verification
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
      });

      // Simulate face verification process
      // In a real implementation, you would:
      // 1. Extract face features from the captured photo
      // 2. Compare with stored face features
      // 3. Calculate similarity score
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      // Simulate verification result
      const randomMatch = Math.random() > 0.5;
      const matchedFace = randomMatch ? storedFaces[Math.floor(Math.random() * storedFaces.length)] : null;
      
      const result = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        success: randomMatch,
        matchedFace: matchedFace,
        confidence: randomMatch ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4, // 70-100% for match, 0-40% for no match
        imagePath: photo.path,
      };

      setVerificationResult(result);
      
      // Add to verification history
      setVerificationHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10

      if (randomMatch) {
        Alert.alert(
          'Verification Successful!', 
          `Face matched: ${matchedFace.name}\nConfidence: ${(result.confidence * 100).toFixed(1)}%`
        );
      } else {
        Alert.alert(
          'Verification Failed', 
          'No matching face found in database.\nConfidence: ' + (result.confidence * 100).toFixed(1) + '%'
        );
      }

    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify face');
    } finally {
      setIsVerifying(false);
    }
  };

  const clearHistory = () => {
    setVerificationHistory([]);
  };

  if (isRequestingPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="hourglass" size={80} color="#fff" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color="#fff" />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <Text style={styles.permissionSubtext}>
          Please grant camera permission to use face verification features
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* Camera Overlay */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Face Verification</Text>
              <Text style={styles.headerSubtitle}>Verify faces against database</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.faceCountBadge}>
                <Text style={styles.faceCountText}>{storedFaces.length}</Text>
              </View>
            </View>
          </View>

          {/* Controls - always at the bottom */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[
                styles.verifyButton, 
                (!isFaceDetected || isVerifying || storedFaces.length === 0) && styles.verifyButtonDisabled
              ]}
              onPress={verifyFace}
              disabled={!isFaceDetected || isVerifying || storedFaces.length === 0}
            >
              <Ionicons 
                name={isVerifying ? "hourglass" : "checkmark-circle"} 
                size={32} 
                color="#fff" 
              />
            </TouchableOpacity>
            <Text style={styles.verifyButtonText}>
              {isVerifying ? 'Verifying...' : 'Verify Face'}
            </Text>
          </View>
        </SafeAreaView>

        {/* Floating Stored Faces Bar */}
        {storedFaces.length > 0 && (
          <View style={styles.storedFacesBar}>
            <Text style={styles.storedFacesLabel}>Stored Faces</Text>
            <ScrollView style={styles.facesList} horizontal showsHorizontalScrollIndicator={false}>
              {storedFaces.map((face) => (
                <View key={face.id} style={styles.faceItem}>
                  <View style={styles.faceImagePlaceholder}>
                    <Ionicons name="person" size={24} color="#888" />
                  </View>
                  <Text style={styles.faceName}>{face.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Floating Verification History Bar */}
        {verificationHistory.length > 0 && (
          <View style={styles.historyBar}>
            <View style={styles.historyHeaderBar}>
              <Text style={styles.historyLabel}>Recent Verifications</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Ionicons name="trash" size={18} color="#bbb" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyList} horizontal showsHorizontalScrollIndicator={false}>
              {verificationHistory.map((result) => (
                <View key={result.id} style={[
                  styles.historyItem,
                  result.success ? styles.historySuccess : styles.historyFailure
                ]}>
                  <Ionicons 
                    name={result.success ? "checkmark" : "close"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.historyText}>
                    {result.success ? result.matchedFace.name : 'No Match'}
                  </Text>
                  <Text style={styles.historyConfidence}>
                    {(result.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Verification Result */}
      {verificationResult && (
        <View style={styles.resultContainer}>
          <View style={[
            styles.resultCard,
            verificationResult.success ? styles.successCard : styles.failureCard
          ]}>
            <Ionicons 
              name={verificationResult.success ? "checkmark-circle" : "close-circle"} 
              size={40} 
              color={verificationResult.success ? "#4CAF50" : "#F44336"} 
            />
            <Text style={styles.resultTitle}>
              {verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
            </Text>
            {verificationResult.success && (
              <Text style={styles.resultName}>
                Matched: {verificationResult.matchedFace.name}
              </Text>
            )}
            <Text style={styles.resultConfidence}>
              Confidence: {(verificationResult.confidence * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'space-between',
  },
  safeArea: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingTop: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faceCountBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  faceCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 20,
  },
  verifyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  verifyButtonDisabled: {
    backgroundColor: '#666',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
  },
  resultCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  successCard: {
    borderColor: '#4CAF50',
  },
  failureCard: {
    borderColor: '#F44336',
  },
  resultTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  resultName: {
    color: '#4CAF50',
    fontSize: 16,
    marginTop: 5,
  },
  resultConfidence: {
    color: '#888',
    fontSize: 14,
    marginTop: 5,
  },
  storedFacesBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 170,
    backgroundColor: 'rgba(30,30,30,0.85)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  storedFacesLabel: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  facesList: {
    flexDirection: 'row',
  },
  faceItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  faceImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  historyBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 60,
    backgroundColor: 'rgba(30,30,30,0.85)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  historyHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  historyLabel: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  historyList: {
    flexDirection: 'row',
  },
  historyItem: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  historySuccess: {
    backgroundColor: '#4CAF50',
  },
  historyFailure: {
    backgroundColor: '#F44336',
  },
  historyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  historyConfidence: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
  },
}); 