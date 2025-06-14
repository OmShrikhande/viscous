import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, Share } from 'react-native';
import { Colors } from '../../constants/Colors';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { firestoreDb } from '../../configs/FirebaseConfigs'; // Import Firestore config
import { doc, getDoc } from 'firebase/firestore'; // Firestore methods

export default function MenuList() {
    const { signOut } = useAuth();
    const [apkLink, setApkLink] = useState('');

    useEffect(() => {
        const fetchApkLink = async () => {
            try {
                const docRef = doc(firestoreDb, 'apklink', 'myapplink');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setApkLink(docSnap.data()['tracker app']);
                    console.log('APK Link:', docSnap.data()['tracker app']);
                } else {
                    console.error('No such document!');
                }
            } catch (error) {
                console.error('Error fetching APK link:', error);
            }
        };
        fetchApkLink();
    }, []);

    const menulist = [
        {
            id: 1,
            name: 'Share App',
            icon: require('../../assets/images/share.png'),
            path: 'share',
        },
        {
            id: 2,
            name: 'Logout',
            icon: require('../../assets/images/Logout.png'),
            path: 'logout',
        },
    ];

    const router = useRouter();

    const onMenuClick = (item) => {
        if (item.path == 'logout') {
            signOut();
            return;
        }
        if (item.path == 'share') {
            Share.share({
                message: `The S.B. Jain Bus Tracker App is a smart solution developed by Om Shrikhande 🎓, a 3rd-year CSE student, and Kuldeep Tiwari 🛠️, the IoT developer, to streamline institute transportation. With 🚌 Real-Time Bus Tracking, 📅 ETA updates, and 🗺️ Interactive Maps, the app ensures students and staff can track buses easily and plan commutes effectively. Its 🤝 User-Friendly Interface offers a seamless experience, making it a valuable tool for the S.B. Jain community. 🚀 Download the app here: ${apkLink || 'Link not available'}. If you are interested in Development contact us on LinkedIn.`,
            });
            return;
        }

        router.push(item.path);
    };

    return (
        <View>
            <FlatList
                data={menulist}
                numColumns={2}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => onMenuClick(item)}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            padding: 10,
                            flex: 1,
                            height: 100,
                            borderRadius: 15,
                            borderWidth: 2,
                            margin: 10,
                            borderColor: Colors.PRIMARY,
                        }}
                    >
                        <Image
                            source={item.icon}
                            style={{
                                width: 50,
                                height: 50,
                            }}
                        />

                        <Text
                            style={{
                                fontFamily: 'flux-medium',
                                fontSize: 16,
                                flex: 1,
                            }}
                        >
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            <Text
                style={{
                    fontSize: 18,
                    fontFamily: 'flux-bold',
                    color: Colors.PRIMARY,
                    marginVertical: 300,
                    textAlign: 'center',
                }}
            >
                Made with ❤️ by Om Shrikhande
            </Text>
        </View>
    );
}
