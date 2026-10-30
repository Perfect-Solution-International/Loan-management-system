package repository

import (
	"context"
	"loan-management-backend/billing"
)

func (r *BillingRepository) BillingContact(ctx context.Context, org string) (billing.BillingContact, error) {
	var c billing.BillingContact
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(NULLIF(o.billing_contact_name,''),NULLIF(u.name,''),o.name),o.email,o.phone FROM organizations o LEFT JOIN users u ON u.id=o.owner_id AND u.organization_id=o.id WHERE o.id=$1`, org).Scan(&c.Name, &c.Email, &c.Phone)
	return c, err
}

func (r *BillingRepository) SaveBillingContact(ctx context.Context, org string, c billing.BillingContact) (billing.BillingContact, error) {
	c, err := c.Normalize()
	if err != nil {
		return c, err
	}
	result, err := r.db.ExecContext(ctx, `UPDATE organizations SET billing_contact_name=$2,email=$3,phone=$4 WHERE id=$1`, org, c.Name, c.Email, c.Phone)
	return c, affected(result, err)
}
