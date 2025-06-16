import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { firestoreDb } from "../../configs/FirebaseConfigs";

export default function Stats() {
  const [locations, setLocations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [email, setEmail] = useState(null);

  // 👤 Fetch user data + real-time theme updates
  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem("userData");
        console.log("📱 User data from AsyncStorage:", userDataJson);
        
        const localData = userDataJson ? JSON.parse(userDataJson) : null;
        const userEmail = localData?.email;

        if (!userEmail) {
          console.log("❌ No user email found in AsyncStorage");
          setRole("user");
          return;
        }

        setEmail(userEmail);
        console.log("📧 User email:", userEmail);
        
        // First, try to get the role directly from Firestore
        const userDocRef = doc(firestoreDb, "userdata", userEmail);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          console.log("🔥 User data from Firestore:", userData);
          setRole(userData.role || "user");
          setIsDark(userData.isDark === true);
          console.log("👑 User role set to:", userData.role || "user");
        } else {
          console.log("⚠️ User document does not exist in Firestore");
          setRole("user");
        }
        
        // Then set up real-time listener for updates
        const unsub = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const { role: roleFromDb, isDark: themeFromDb } = docSnap.data();
            console.log("🔄 Real-time update - Role:", roleFromDb);
            setRole(roleFromDb || "user");
            setIsDark(themeFromDb === true);
          } else {
            setRole("user");
          }
        });

        return () => unsub();
      } catch (err) {
        console.error("Error loading user data:", err);
        setRole("user");
      }
    };

    fetchUserTheme();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: isDark ? "#121212" : "#fff",
        },
        container: {
          flex: 1,
          padding: 20,
          backgroundColor: isDark ? "#121212" : "#f0f0f0",
        },
        header: {
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
          textAlign: "center",
          color: isDark ? "#fff" : "#000",
        },
        table: {
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 5,
          overflow: "hidden",
        },
        row: {
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: "#ccc",
        },
        evenRow: {
          backgroundColor: isDark ? "#1e1e1e" : "#f9f9f9",
        },
        oddRow: {
          backgroundColor: isDark ? "#2b2b2b" : "#fff",
        },
        cell: {
          flex: 1,
          padding: 10,
          textAlign: "center",
          fontSize: 16,
          color: isDark ? "#fff" : "#000",
        },
        headerCell: {
          fontWeight: "bold",
          backgroundColor: "#4CAF50",
          color: "#fff",
          fontSize: 18,
        },
        buttonContainer: {
          flexDirection: "row",
          justifyContent: "space-around",
          marginVertical: 20,
        },
        pdfButton: {
          backgroundColor: "red",
          paddingVertical: 15,
          paddingHorizontal: 25,
          borderRadius: 10,
        },
        pdfButtonText: {
          color: "white",
          fontSize: 16,
          fontWeight: "bold",
        },
        clearButton: {
          backgroundColor: "blue",
          paddingVertical: 15,
          paddingHorizontal: 25,
          borderRadius: 10,
        },
        clearButtonText: {
          color: "white",
          fontSize: 16,
          fontWeight: "bold",
        },
      }),
    [isDark]
  );

  const fetchLocations = useCallback(async () => {
    setRefreshing(true);
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "Locations"));
      const data = querySnapshot.docs
        .map((doc) => ({
          stopName: doc.id,
          time: doc.data().time,
          serialNumber: doc.data().serialNumber,
        }))
        .filter((item) => item.serialNumber !== undefined);
      data.sort((a, b) => a.serialNumber - b.serialNumber);
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const clearStats = async () => {
    try {
      const updatedLocations = await Promise.all(
        locations.map(async (location) => {
          const locationRef = doc(firestoreDb, "Locations", location.stopName);
          await updateDoc(locationRef, { time: null });
          return { ...location, time: null };
        })
      );
      setLocations(updatedLocations);
    } catch (error) {
      console.error("Error clearing stats:", error);
    }
  };

  useEffect(() => {
    if (role === "admin") fetchLocations();
  }, [fetchLocations, role]);

  const generatePdf = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid black; padding: 8px; text-align: center; }
              th { background-color: #4CAF50; color: white; }
            </style>
          </head>
          <body>
            <h1 style="text-align: center;">Bus Stop Stats</h1>
            <table>
              <thead>
                <tr><th>#</th><th>Stop Name</th><th>Time</th></tr>
              </thead>
              <tbody>
                ${locations
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.serialNumber}</td>
                    <td>${item.stopName}</td>
                    <td>${item.time}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const pdfUri = `${FileSystem.documentDirectory}BusStopStats.pdf`;
      await FileSystem.moveAsync({ from: uri, to: pdfUri });
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // 🔄 Loading
  if (role === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  // 🚫 Not admin
  if (role !== "admin") {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "red", marginBottom: 20 }}>
          ❌ You're a user. None of your business 😎
        </Text>
        
        <TouchableOpacity 
          style={{
            backgroundColor: '#2196F3',
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
          onPress={async () => {
            try {
              // Debug function to check user data
              const userDataJson = await AsyncStorage.getItem("userData");
              console.log("Debug - AsyncStorage userData:", userDataJson);
              
              if (email) {
                const userDocRef = doc(firestoreDb, "userdata", email);
                const docSnap = await getDoc(userDocRef);
                
                if (docSnap.exists()) {
                  console.log("Debug - Firestore userData:", docSnap.data());
                  Alert.alert(
                    "User Data", 
                    `Email: ${email}\nRole in Firestore: ${docSnap.data().role || "not set"}\nCurrent role state: ${role}`
                  );
                } else {
                  Alert.alert("Error", "User document not found in Firestore");
                }
              } else {
                Alert.alert("Error", "Email not set");
              }
            } catch (error) {
              console.error("Debug error:", error);
              Alert.alert("Error", error.message);
            }
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Debug User Role</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Admin view
  return (
    <>
      <FlatList
        style={styles.container}
        data={locations}
        keyExtractor={(item, index) => `${item.serialNumber}-${index}`}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.row,
              index % 2 === 0 ? styles.evenRow : styles.oddRow,
            ]}
          >
            <Text style={styles.cell}>{item.serialNumber}</Text>
            <Text style={styles.cell}>{item.stopName}</Text>
            <Text style={styles.cell}>{item.time}</Text>
          </View>
        )}
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Bus Stop Stats</Text>
            <View style={styles.table}>
              <View style={styles.row}>
                <Text style={[styles.cell, styles.headerCell]}>#</Text>
                <Text style={[styles.cell, styles.headerCell]}>Stop Name</Text>
                <Text style={[styles.cell, styles.headerCell]}>Time</Text>
              </View>
            </View>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchLocations} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.pdfButton} onPress={generatePdf}>
          <Text style={styles.pdfButtonText}>Save as PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={clearStats}>
          <Text style={styles.clearButtonText}>Clear Stats</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
