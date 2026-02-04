import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Typography } from '../components/Typography';
import { Colors } from '../theme/tokens';
import { VaultItemsRepo, LocalVaultItem } from '../../storage/VaultItemsRepo';
import { VaultSession } from '../../security/VaultSession';
import { SecurityLogger } from '../../utils/SecurityLogger';
import { useSync } from '../../hooks/useSync';

const CATEGORIES = ['All', 'password', 'secure_note', 'document', 'image'];
const ICONS: Record<string, string> = {
    password: '🔑',
    secure_note: '📝',
    document: '📄',
    image: '🖼️',
};

export const VaultListScreen = ({ navigation }: any) => {
    const [items, setItems] = useState<LocalVaultItem[]>([]);
    const [filter, setFilter] = useState('All');
    const [refreshing, setRefreshing] = useState(false);
    const { syncNow } = useSync('user-1'); // Mock user

    // Initial Load
    const loadItems = useCallback(() => {
        try {
            if (!VaultSession.isUnlocked()) return;
            const allItems = VaultItemsRepo.findAll('user-1');
            setItems(allItems);
        } catch (e) {
            SecurityLogger.error('VaultList', 'Failed to load items', e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [loadItems])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await syncNow();
        loadItems(); // Reload local DB after sync
        setRefreshing(false);
    };

    const filteredItems = filter === 'All'
        ? items
        : items.filter(i => i.kind === filter);

    const renderItem = ({ item }: { item: LocalVaultItem }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => navigation.navigate('ItemViewer', { itemId: item.id })}
        >
            <View style={styles.iconBox}>
                <Typography variant="h3">{ICONS[item.kind] || '📦'}</Typography>
            </View>
            <View style={{ flex: 1 }}>
                <Typography variant="h3" style={{ marginBottom: 4 }}>
                    {item.kind.toUpperCase()}
                </Typography>
                <Typography variant="caption" color={Colors.TextSecondary}>
                    {item.sync_state === 'dirty' ? 'Wait to Sync ☁️' : 'Synced ✅'}
                </Typography>
            </View>
        </TouchableOpacity>
    );

    return (
        <Screen style={{ padding: 16 }}>
            <View style={styles.header}>
                <Typography variant="h1">My Vault</Typography>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('RecoverySetup')}>
                        <Typography variant="h2">🛡️</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Wipe')}>
                        <Typography variant="h2">💀</Typography>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabs}>
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => setFilter(item)}
                            style={[
                                styles.tab,
                                filter === item && styles.activeTab
                            ]}
                        >
                            <Typography
                                variant="body"
                                color={filter === item ? Colors.TextInverse : Colors.TextSecondary}
                            >
                                {item === 'All' ? 'All Items' : item}
                            </Typography>
                        </Pressable>
                    )}
                />
            </View>

            <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={i => i.id!}
                contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.BrandPrimary} />
                }
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Typography variant="body" color={Colors.TextSecondary}>
                            No items found.
                        </Typography>
                    </View>
                }
            />

            {/* FAB */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, { marginBottom: 10, backgroundColor: Colors.BrandSecondary }]}
                    onPress={() => navigation.navigate('FilePicker')}
                >
                    <Typography variant="h2" color={Colors.TextInverse}>📄</Typography>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('ItemEditor')}
                >
                    <Typography variant="h1" color={Colors.TextInverse}>+</Typography>
                </TouchableOpacity>
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    tabs: {
        marginBottom: 16,
        height: 40,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: Colors.BgSurface,
        borderWidth: 1,
        borderColor: Colors.BorderSubtle,
    },
    activeTab: {
        backgroundColor: Colors.BrandPrimary,
        borderColor: Colors.BrandPrimary,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.BgSurface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.BorderSubtle,
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.BgElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        alignItems: 'center'
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.BrandPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: Colors.BrandPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    }
});
