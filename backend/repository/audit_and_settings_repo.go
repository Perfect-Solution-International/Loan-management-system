package repository

import (
	"database/sql"
	"fmt"

	"loan-management-backend/database"
	"loan-management-backend/models"
)

type AuditRepository struct {
	db *database.DB
}

func NewAuditRepository(db *database.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) GetAll(limit int) ([]models.AuditLog, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	query := `
		SELECT id, timestamp, user_name, user_role, action, module, details, ip_address, severity, created_at
		FROM audit_logs
		ORDER BY timestamp DESC
		LIMIT $1
	`
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		var ip *string
		err := rows.Scan(
			&l.ID, &l.Timestamp, &l.UserName, &l.UserRole, &l.Action, &l.Module, &l.Details, &ip, &l.Severity, &l.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if ip != nil {
			l.IPAddress = *ip
		}
		logs = append(logs, l)
	}

	return logs, rows.Err()
}

func (r *AuditRepository) Create(log *models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, details, ip_address, severity, created_at)
		VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, NOW())
	`
	_, err := r.db.Exec(query,
		log.ID, log.UserName, log.UserRole, log.Action, log.Module, log.Details, log.IPAddress, log.Severity,
	)
	return err
}

type SettingsRepository struct {
	db *database.DB
}

func NewSettingsRepository(db *database.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) Get() (*models.SystemSettings, error) {
	query := `
		SELECT 
			id, system_name, currency, default_monthly_rate, default_weekly_rate, default_daily_rate,
			default_capital_deduction_rate, default_interest_deduction_method, default_processing_fee,
			default_admin_fee, late_fee_percentage, grace_period_days, updated_at
		FROM system_settings
		WHERE id = 1
	`
	row := r.db.QueryRow(query)

	var s models.SystemSettings
	err := row.Scan(
		&s.ID, &s.SystemName, &s.Currency, &s.DefaultMonthlyRate, &s.DefaultWeeklyRate, &s.DefaultDailyRate,
		&s.DefaultCapitalDeductionRate, &s.DefaultInterestDeductionMethod, &s.DefaultProcessingFee,
		&s.DefaultAdminFee, &s.LateFeePercentage, &s.GracePeriodDays, &s.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// default fallback
			return &models.SystemSettings{
				ID: 1, SystemName: "PSI ONE Microfinance Solutions", Currency: "LKR",
				DefaultMonthlyRate: 3.0, DefaultWeeklyRate: 1.0, DefaultDailyRate: 0.5,
				DefaultProcessingFee: 500, DefaultAdminFee: 250, LateFeePercentage: 2.0, GracePeriodDays: 3,
			}, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepository) Update(s *models.SystemSettings) error {
	query := `
		UPDATE system_settings SET
			system_name = $1, currency = $2, default_monthly_rate = $3, default_weekly_rate = $4,
			default_daily_rate = $5, default_capital_deduction_rate = $6, default_interest_deduction_method = $7,
			default_processing_fee = $8, default_admin_fee = $9, late_fee_percentage = $10,
			grace_period_days = $11, updated_at = NOW()
		WHERE id = 1
	`
	_, err := r.db.Exec(query,
		s.SystemName, s.Currency, s.DefaultMonthlyRate, s.DefaultWeeklyRate,
		s.DefaultDailyRate, s.DefaultCapitalDeductionRate, s.DefaultInterestDeductionMethod,
		s.DefaultProcessingFee, s.DefaultAdminFee, s.LateFeePercentage, s.GracePeriodDays,
	)
	return err
}
