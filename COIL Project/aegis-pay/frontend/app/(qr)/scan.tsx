import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Flashlight, Image as ImageIcon, QrCode, ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={styles.blackBackground} />;
  
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera for QR scanning.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    Alert.alert(
      "Scan Successful",
      `QR Data: ${data}`,
      [
        { text: "Scan Again", onPress: () => setScanned(false), style: "cancel" },
        { text: "Continue", onPress: () => { setScanned(false); } }
      ]
    );
  };

  const pickImage = async () => {
    Alert.alert("Feature Offline", "Gallery scanning is currently in development.");
  };

  return (
    <View style={styles.blackBackground}>
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="white" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR</Text>
          <View style={{ width: 40 }} /> 
        </View>

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.footerControls}>
          <TouchableOpacity 
            onPress={() => setTorch(!torch)} 
            style={[styles.smallBtn, torch ? styles.smallBtnActive : styles.smallBtnInactive]}
          >
            <Flashlight color={torch ? "black" : "white"} size={24} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/my-qr')}
            style={styles.mainBtn}
          >
            <QrCode color="white" size={24} />
            <Text style={styles.mainBtnText}>My QR</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={pickImage} style={styles.smallBtnInactive}>
            <ImageIcon color="white" size={24} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  blackBackground: { flex: 1, backgroundColor: 'black' },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy, paddingHorizontal: 24 },
  permissionText: { color: 'white', marginBottom: 16, textAlign: 'center', fontSize: 16 },
  permissionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  permissionBtnText: { color: 'white', fontWeight: 'bold' },
  safeArea: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'rgba(0,0,0,0.4)', marginTop: 40 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  scannerOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerBox: { width: 256, height: 256, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', position: 'relative' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: 'white' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  footerControls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 48, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  smallBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  smallBtnActive: { backgroundColor: 'white' },
  smallBtnInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  mainBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 32, flexDirection: 'row' },
  mainBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
});