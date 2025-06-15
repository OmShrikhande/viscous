import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { firestoreDb } from "../../configs/FirebaseConfigs"; // Import Firestore
import { collection, getDocs, onSnapshot, updateDoc, doc } from "firebase/firestore"; // Firestore methods
import * as Print from "expo-print"; // For PDF generation
import * as Sharing from "expo-sharing"; // For sharing files
import * as FileSystem from "expo-file-system"; // For file handling
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Stats() {
  const [locations, setLocations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
  useEffect(() => {
    const checkAdmin = async () => {
      const role = await AsyncStorage.getItem('userRole'); // or however you check
      if (role !== 'admin') {
        router.replace('/home'); // Redirect non-admins
      }
    };

    checkAdmin();
  }, []);


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
          await updateDoc(locationRef, { time: null }); // Clear time on the server
          return { ...location, time: null }; // Clear time locally
        })
      );
      setLocations(updatedLocations);
    } catch (error) {
      console.error("Error clearing stats on the server:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        index % 2 === 0 ? styles.evenRow : styles.oddRow, // Alternate row colors
      ]}
    >
      <Text style={styles.cell}>{item.serialNumber?.toString()}</Text>
      <Text style={styles.cell}>{item.stopName}</Text>
      <Text style={styles.cell}>{item.time}</Text>
    </View>
  );

  const generatePdf = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: center;
              }
              th {
                background-color: #4CAF50;
                color: white;
              }
            </style>
          </head>
          <body>
            <h1 style="text-align: center;">Bus Stop Stats</h1>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stop Name</th>
                  <th>Time</th>
                </tr>
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
      console.log("PDF saved at:", pdfUri); // Print the file path
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <>
      <FlatList
        style={styles.container}
        data={locations}
        keyExtractor={(item, index) => `${item.serialNumber?.toString()}-${index}`}
        renderItem={renderItem}
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
        contentContainerStyle={styles.scrollContent} // Add padding at the bottom
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
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
    backgroundColor: "#f9f9f9", // Light background for even rows
  },
  oddRow: {
    backgroundColor: "#ffffff", // White background for odd rows
  },
  cell: {
    flex: 1,
    padding: 10,
    textAlign: "center",
    fontSize: 16, // Slightly larger font
  },
  headerCell: {
    fontWeight: "bold",
    backgroundColor: "#4CAF50", // Green header background
    color: "#fff", // White text for header
    fontSize: 18, // Larger font for header
  },
  scrollContent: {
    paddingBottom: 20, // Add padding at the bottom
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
    alignItems: "center",
  },
  pdfButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "blue", // Blue background for clear button
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
  },
  clearButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
