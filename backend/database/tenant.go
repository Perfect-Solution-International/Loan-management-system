package database

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"time"
)

const LegacyOrganization = "00000000-0000-0000-0000-000000000001"

// The control plane performs cross-tenant identity discovery and verified billing
// updates. Ordinary business repositories always use Tenant's restricted role.
func (db *DB) ValidateSaaS() error {
	var bypass bool
	if err := db.QueryRow(`SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user`).Scan(&bypass); err != nil {
		return err
	}
	if !bypass {
		return errors.New("the control-plane DB role requires BYPASSRLS; use a separate restricted psi_tenant role for tenant operations")
	}
	var table sql.NullString
	if err := db.QueryRow(`SELECT to_regclass('subscriptions')::text`).Scan(&table); err != nil {
		return err
	}
	if !table.Valid {
		return errors.New("apply versioned SaaS migrations before starting the server")
	}
	scoped, close, err := db.Tenant(context.Background(), LegacyOrganization)
	if err != nil {
		return err
	}
	defer close()
	var enabled bool
	if err = scoped.QueryRow(`SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class WHERE oid IN ('users'::regclass,'customers'::regclass,'loans'::regclass,'payments'::regclass,'online_payments'::regclass,'system_settings'::regclass,'audit_logs'::regclass,'loan_notes'::regclass)`).Scan(&enabled); err != nil {
		return err
	}
	if !enabled {
		return errors.New("row security is not enabled on all tenant tables")
	}
	return nil
}

// Tenant pins a physical connection for the entire request, including existing
// repayment transactions. Never SET a tenant on a pooled *sql.DB.
func (db *DB) Tenant(ctx context.Context, organization string) (*DB, func(), error) {
	conn, err := db.DB.Conn(ctx)
	if err != nil {
		return nil, nil, err
	}
	cleanup := func() {
		reset, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if _, e := conn.ExecContext(reset, "RESET ROLE; RESET app.organization_id"); e != nil {
			_ = conn.Raw(func(any) error { return driver.ErrBadConn })
		}
		_ = conn.Close()
	}
	if _, err = conn.ExecContext(ctx, "SET ROLE psi_tenant"); err != nil {
		cleanup()
		return nil, nil, err
	}
	var unsafe bool
	err = conn.QueryRowContext(ctx, `SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user`).Scan(&unsafe)
	if err != nil || unsafe {
		cleanup()
		return nil, nil, errors.New("unsafe tenant database role")
	}
	if _, err = conn.ExecContext(ctx, `SELECT set_config('app.organization_id',$1,false)`, organization); err != nil {
		cleanup()
		return nil, nil, err
	}
	return &DB{DB: db.DB, conn: conn, ctx: ctx}, cleanup, nil
}

func (db *DB) Query(query string, args ...any) (*sql.Rows, error) {
	if db.conn != nil {
		return db.conn.QueryContext(db.ctx, query, args...)
	}
	return db.DB.Query(query, args...)
}
func (db *DB) QueryRow(query string, args ...any) *sql.Row {
	if db.conn != nil {
		return db.conn.QueryRowContext(db.ctx, query, args...)
	}
	return db.DB.QueryRow(query, args...)
}
func (db *DB) Exec(query string, args ...any) (sql.Result, error) {
	if db.conn != nil {
		return db.conn.ExecContext(db.ctx, query, args...)
	}
	return db.DB.Exec(query, args...)
}
func (db *DB) Begin() (*sql.Tx, error) {
	if db.conn != nil {
		return db.conn.BeginTx(db.ctx, nil)
	}
	return db.DB.Begin()
}

// Context-aware and prepared operations must preserve the same connection too.
func (db *DB) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	if db.conn != nil {
		return db.conn.QueryContext(ctx, query, args...)
	}
	return db.DB.QueryContext(ctx, query, args...)
}
func (db *DB) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	if db.conn != nil {
		return db.conn.QueryRowContext(ctx, query, args...)
	}
	return db.DB.QueryRowContext(ctx, query, args...)
}
func (db *DB) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	if db.conn != nil {
		return db.conn.ExecContext(ctx, query, args...)
	}
	return db.DB.ExecContext(ctx, query, args...)
}
func (db *DB) BeginTx(ctx context.Context, options *sql.TxOptions) (*sql.Tx, error) {
	if db.conn != nil {
		return db.conn.BeginTx(ctx, options)
	}
	return db.DB.BeginTx(ctx, options)
}
func (db *DB) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	if db.conn != nil {
		return db.conn.PrepareContext(ctx, query)
	}
	return db.DB.PrepareContext(ctx, query)
}
func (db *DB) Prepare(query string) (*sql.Stmt, error) {
	if db.conn != nil {
		return db.conn.PrepareContext(db.ctx, query)
	}
	return db.DB.Prepare(query)
}
