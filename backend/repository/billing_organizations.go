package repository

import (
	"context"
	"errors"
)

// Suspension holds new lending without erasing paid time, resetting a trial or
// blocking existing financial records. Resuming uses the original expiry dates.
func (r *BillingRepository) SetOrganizationStatus(ctx context.Context, org, status, actor string) error {
	if status != "active" && status != "suspended" {
		return errors.New("organization status must be active or suspended")
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	s, err := scanSubscription(tx.QueryRow(`SELECT `+subscriptionColumns+` FROM subscriptions WHERE organization_id=$1 FOR UPDATE`, org))
	if err != nil {
		return err
	}
	var previous string
	if err = tx.QueryRow(`SELECT status FROM organizations WHERE id=$1 FOR UPDATE`, org).Scan(&previous); err != nil {
		return err
	}
	if previous == status {
		return nil
	}
	if _, err = tx.Exec(`UPDATE organizations SET status=$2 WHERE id=$1`, org, status); err != nil {
		return err
	}
	var version string
	if err = tx.QueryRow(`SELECT NOW()::text`).Scan(&version); err != nil {
		return err
	}
	message := "Your organization's new lending access was restored, subject to its original subscription dates."
	if status == "suspended" {
		message = "New lending is suspended. Existing records and repayment recordkeeping remain available. Contact platform support."
	}
	if err = billingEvent(tx, org, s.ID, "", "organization_"+status, s.ID+":"+status+":"+version, message, actor); err != nil {
		return err
	}
	return tx.Commit()
}
