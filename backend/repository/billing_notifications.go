package repository

import (
	"context"
	"loan-management-backend/billing"
)

// DispatchNotification is optional infrastructure for a configured sender.
// SKIP LOCKED coordinates workers. Failed sends stay pending. The sender must
// deduplicate EventKey to cover a crash after delivery but before commit.
func (r *BillingRepository) DispatchNotification(ctx context.Context, sender billing.NotificationSender) (bool, error) {
	if sender == nil {
		return false, nil
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	rows, err := tx.QueryContext(ctx, `SELECT id,organization_id,event_key,event_type,message,created_at FROM billing_notifications WHERE delivered_at IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`)
	if err != nil {
		return false, err
	}
	if !rows.Next() {
		err = rows.Err()
		rows.Close()
		return false, err
	}
	var n billing.Notification
	err = rows.Scan(&n.ID, &n.OrganizationID, &n.EventKey, &n.EventType, &n.Message, &n.CreatedAt)
	rows.Close()
	if err != nil {
		return false, err
	}
	if err = sender.Send(ctx, n); err != nil {
		return false, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE billing_notifications SET delivered_at=NOW() WHERE id=$1`, n.ID); err != nil {
		return false, err
	}
	return true, tx.Commit()
}
