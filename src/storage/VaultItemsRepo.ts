import { db } from './db';
import { VaultItemDTO } from '../api/vaultApi';
import { SecurityLogger } from '../utils/SecurityLogger';

export interface LocalVaultItem extends VaultItemDTO {
    sync_state: 'clean' | 'dirty' | 'error';
}

export const VaultItemsRepo = {

    findAll(userId: string): LocalVaultItem[] {
        try {
            const results = db.execute(
                'SELECT * FROM vault_items WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC',
                [userId]
            );

            const items: LocalVaultItem[] = [];
            if (results.rows) {
                for (let i = 0; i < results.rows.length; i++) {
                    items.push(results.rows.item(i) as LocalVaultItem);
                }
            }
            return items;
        } catch (e) {
            SecurityLogger.error('VaultItemsRepo', 'findAll error', e);
            return [];
        }
    },

    findById(id: string): LocalVaultItem | null {
        try {
            const results = db.execute('SELECT * FROM vault_items WHERE id = ?', [id]);
            if (results.rows && results.rows.length > 0) {
                return results.rows.item(0) as LocalVaultItem;
            }
            return null;
        } catch (e) {
            SecurityLogger.error('VaultItemsRepo', 'findById error', e);
            return null;
        }
    },

    /**
     * Saves an item fully encrypted.
     * Marks as 'dirty' for sync.
     */
    save(item: LocalVaultItem) {
        try {
            db.execute(
                `INSERT OR REPLACE INTO vault_items (
           id, user_id, kind, ciphertext, nonce, 
           wrapped_dek, wrapped_dek_nonce, version, 
           deleted_at, file_ref, updated_at, sync_state
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.id, item.user_id, item.kind, item.ciphertext, item.nonce,
                    item.wrapped_dek, item.wrapped_dek_nonce, item.version,
                    item.deleted_at || null, item.file_ref || null, item.updated_at,
                    'dirty' // Always mark dirty on local save
                ]
            );
        } catch (e) {
            SecurityLogger.error('VaultItemsRepo', 'save error', e);
            throw e;
        }
    },

    /**
     * Updates sync state (e.g. after successful push).
     */
    updateSyncState(id: string, state: 'clean' | 'dirty' | 'error') {
        db.execute('UPDATE vault_items SET sync_state = ? WHERE id = ?', [state, id]);
    },

    /**
     * Soft delete
     */
    delete(id: string) {
        db.execute(
            "UPDATE vault_items SET deleted_at = ?, sync_state = 'dirty' WHERE id = ?",
            [new Date().toISOString(), id]
        );
    }
};
