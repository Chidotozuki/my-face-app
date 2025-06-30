import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  // LogBox.ignoreLogs(["_WORKLET"]);

  // console.log("Hermes:", !!global.HermesInternal);
  // console.log("_WORKLET:", global._WORKLET);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="camera" size={80} color="#fff" />
        <Text style={styles.title}>Face Recognition</Text>
        <Text style={styles.subtitle}>Secure and Fast Face Detection</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/face-collection")}
        >
          <Ionicons name="person-add" size={32} color="#fff" />
          <Text style={styles.buttonText}>Face Collection</Text>
          <Text style={styles.buttonSubtext}>Add new faces to database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.verifyButton]}
          onPress={() => router.push("/face-verification")}
        >
          <Ionicons name="checkmark-circle" size={32} color="#fff" />
          <Text style={styles.buttonText}>Face Verification</Text>
          <Text style={styles.buttonSubtext}>Verify existing faces</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by React Native Vision Camera
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginTop: 10,
    textAlign: "center",
  },
  buttonContainer: {
    paddingHorizontal: 30,
    gap: 20,
  },
  button: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 120,
    justifyContent: "center",
  },
  verifyButton: {
    backgroundColor: "#2d5a2d",
    borderColor: "#4a7c4a",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  buttonSubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },
});
