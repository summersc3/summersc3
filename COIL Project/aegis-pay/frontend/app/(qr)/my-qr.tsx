import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { X, Download, Wallet } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '@/hooks/use-auth';
import { Colors, BorderRadius } from '@/constants/theme';

export default function MyQRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const qrRef = useRef(null);

  const handleSaveQR = async () => {
    try {
      const currentPermission = await MediaLibrary.getPermissionsAsync();
      let status = currentPermission.status;

      if (status !== 'granted' && currentPermission.canAskAgain) {
        const newPermission = await MediaLibrary.requestPermissionsAsync();
        status = newPermission.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "AegisPay needs access to your photos to save your QR code. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const localUri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert("Success", "Saved to gallery!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save QR code.");
    }
  };

  const displayName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Unknown User';
  const displayPhone = user?.phone ?? 'NO_PHONE_LINKED';
  const qrData = `aegispay://transfer/${displayPhone}`;

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <X color="black" size={32} />
      </TouchableOpacity>

      <View ref={qrRef} collapsable={false} style={styles.qrContainer}>
        <Text style={styles.scanSubtitle}>Scan to pay</Text>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userPhone}>{displayPhone}</Text>

        <View style={styles.qrBox}>
          <QRCode
            value={qrData}
            size={220}
            color="black"
            backgroundColor="white"
          />
        </View>

        <View style={styles.brandBox}>
          <Wallet color={Colors.primary} size={48} strokeWidth={2.5} />
          <Text style={styles.brandText}>
            Aegis<Text style={styles.brandTextDark}>Pay</Text>
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSaveQR} style={styles.saveBtn}>
          <Download color="white" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.beige, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  closeBtn: { alignSelf: 'flex-start', padding: 8, marginLeft: -8, marginBottom: 16 },
  qrContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.beige },
  scanSubtitle: { color: Colors.darkGray, fontSize: 16, marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: 'bold', color: Colors.navy, marginBottom: 4 },
  userPhone: { color: 'gray', marginBottom: 32 },
  qrBox: { backgroundColor: 'white', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, elevation: 10, marginBottom: 48 },
  brandBox: { alignItems: 'center', marginBottom: 48 },
  brandText: { color: Colors.primary, fontWeight: 'bold', fontSize: 20, marginTop: 8 },
  brandTextDark: { color: Colors.navy },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: 'white', borderColor: '#E5E7EB', borderWidth: 1, paddingVertical: 16, borderRadius: BorderRadius.lg, marginRight: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.navy, fontWeight: 'bold', fontSize: 16 },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.lg, marginLeft: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});