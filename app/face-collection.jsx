import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  Camera,
  useCameraDevices,
  useFrameProcessor
} from "react-native-vision-camera";
import {
  useFaceDetector
} from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";

export default function FaceCollection() {
  const router = useRouter();
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = Array.isArray(devices)
    ? devices.find((d) => d.position === "front")
    : devices?.front ||
      (devices && Object.values(devices).find((d) => d.position === "front"));
  //   console.log('All camera devices:', devices);
  //   console.log('Selected device:', device);

  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [currentFaceName, setCurrentFaceName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [lastCapturedImage, setLastCapturedImage] = useState(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  // Face detection options (customize as needed)
  const faceDetectionOptions = useRef({
    // Example: mode: 'accurate', detectLandmarks: true
  }).current;
  const { detectFaces } = useFaceDetector(faceDetectionOptions);


  const detectFacesJs = Worklets.createRunOnJS((frame) => {
    return detectFaces(frame);
  });
  
  const [detectedFaces, setDetectedFaces] = useState([]);

const handleDetectedFaces = Worklets.createRunOnJS((faces) => {
  setIsFaceDetected(Array.isArray(faces) && faces.length > 0);
  setDetectedFaces(faces); // store faces
  console.log('faces detected', faces);
});

  

  // Frame processor worklet for face detection
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
  
    try {
      const faces = detectFaces(frame);
      handleDetectedFaces(faces);
    } catch (err) {
      console.error('Frame Processor Error:', err);
    }
  }, [handleDetectedFaces]);
  

  // Request camera permission on component mount
  React.useEffect(() => {
    requestCameraPermission();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await Camera.getCameraPermissionStatus();
      console.log("Current permission status:", status);
      Alert.alert("Permission Status", `Current status: ${status}`);
    } catch (error) {
      console.error("Error checking permission status:", error);
    }
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Error opening settings:", error);
      Alert.alert(
        "Cannot Open Settings",
        "Please manually go to Settings > Apps > Your App > Permissions > Camera and enable camera access."
      );
    }
  };

  const requestCameraPermission = async () => {
    try {
      setIsRequestingPermission(true);
      console.log("Requesting camera permission...");

      // Check current permission status first
      const currentStatus = await Camera.getCameraPermissionStatus();
      console.log("Current camera permission status:", currentStatus);

      const status = await Camera.requestCameraPermission();
      console.log("Camera permission request result:", status);
      setHasPermission(status === "granted");

      if (status !== "granted") {
        console.log("Permission denied. Status:", status);
        Alert.alert(
          "Camera Permission Required",
          "This app needs camera access to detect faces. Please grant camera permission in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openSettings },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      setHasPermission(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  console.log("_WORKLET:", global._WORKLET);

  const captureFace = async () => {
    if (!camera.current || isCapturing || !isFaceDetected) return;
    try {
      setIsCapturing(true);
      const photo = await camera.current.takePhoto({
        qualityPrioritization: "quality",
        flash: "off",
      });
      setLastCapturedImage(photo.path);
      setShowNameInput(true);
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", "Failed to capture photo");
    } finally {
      setIsCapturing(false);
    }
  };

  const saveFace = async () => {
    if (!currentFaceName.trim() || !lastCapturedImage) return;

    const newFace = {
      id: Date.now().toString(),
      name: currentFaceName.trim(),
      imagePath: lastCapturedImage,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingFaces = await AsyncStorage.getItem("faces");
      const faces = existingFaces ? JSON.parse(existingFaces) : [];
      faces.push(newFace);
      await AsyncStorage.setItem("faces", JSON.stringify(faces));

      setCapturedFaces(faces);
      setCurrentFaceName("");
      setShowNameInput(false);
      setLastCapturedImage(null);

      Alert.alert("Success", `Face saved for ${newFace.name}`);
    } catch (error) {
      Alert.alert("Error", "Failed to save face");
    }
  };

  const loadSavedFaces = async () => {
    try {
      const faces = await AsyncStorage.getItem("faces");
      if (faces) {
        setCapturedFaces(JSON.parse(faces));
      }
    } catch (error) {
      console.error("Failed to load faces:", error);
    }
  };

  React.useEffect(() => {
    loadSavedFaces();
  }, []);

  if (isRequestingPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="hourglass" size={80} color="#fff" />
        <Text style={styles.permissionText}>
          Requesting camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color="#fff" />
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <Text style={styles.permissionSubtext}>
          Please grant camera permission to use face detection features
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.settingsButton]}
          onPress={openSettings}
        >
          <Text style={styles.buttonText}>Open Device Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.debugButton]}
          onPress={checkPermissionStatus}
        >
          <Text style={styles.buttonText}>Check Permission Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    console.log("No camera device found. Devices:", devices);
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {devices && Object.keys(devices).length === 0
            ? "No camera devices found. Are you on a real device?"
            : "Loading camera..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* Camera Overlay */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Face Collection</Text>
              <Text style={styles.headerSubtitle}>
                Add new faces to database
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.faceCountBadge}>
                <Text style={styles.faceCountText}>{capturedFaces.length}</Text>
              </View>
            </View>
          </View>

          {/* Saved Faces Bar - floating above controls */}
          {capturedFaces.length > 0 && (
            <View style={styles.savedFacesBar}>
              <Text style={styles.savedFacesLabel}>Saved Faces</Text>
              <ScrollView
                style={styles.facesList}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {capturedFaces.map((face) => (
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

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                (!isFaceDetected || isCapturing) && styles.captureButtonDisabled,
              ]}
              onPress={captureFace}
              disabled={!isFaceDetected || isCapturing}
            >
              <Ionicons name="camera" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Name Input Modal */}
      {showNameInput && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Enter Face Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter name..."
              placeholderTextColor="#888"
              value={currentFaceName}
              onChangeText={setCurrentFaceName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNameInput(false);
                  setCurrentFaceName("");
                  setLastCapturedImage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveFace}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "space-between",
  },
  safeArea: {
    backgroundColor: "rgba(0,0,0,0.7)",
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingTop: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerContent: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  faceCountBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  faceCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  controls: {
    alignItems: "center",
    paddingBottom: 30,
    paddingTop: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonDisabled: {
    backgroundColor: "#666",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
  },
  permissionSubtext: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  secondaryButton: {
    backgroundColor: "#666",
  },
  settingsButton: {
    backgroundColor: "#FF9500",
  },
  debugButton: {
    backgroundColor: "#FF9500",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 30,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 15,
    width: "100%",
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 15,
  },
  modalButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  savedFacesBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 110,
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
  savedFacesLabel: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  facesList: {
    flexDirection: "row",
  },
  faceItem: {
    alignItems: "center",
    marginRight: 15,
  },
  faceImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  faceName: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
});
