package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"loan-management-backend/database"
	"loan-management-backend/models"
)

type UserRepository struct {
	db *database.DB
}

func NewUserRepository(db *database.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, branch, status, joined_date, permissions, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1) OR LOWER(id) = LOWER($1)
	`
	row := r.db.QueryRow(query, email)

	var u models.User
	var permsJSON []byte
	var joinedDate time.Time

	err := row.Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Branch, &u.Status,
		&joinedDate, &permsJSON, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}

	u.JoinedDate = joinedDate.Format("2006-01-02")
	if len(permsJSON) > 0 {
		_ = json.Unmarshal(permsJSON, &u.Permissions)
	}

	return &u, nil
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, branch, status, joined_date, permissions, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	row := r.db.QueryRow(query, id)

	var u models.User
	var permsJSON []byte
	var joinedDate time.Time

	err := row.Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Branch, &u.Status,
		&joinedDate, &permsJSON, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}

	u.JoinedDate = joinedDate.Format("2006-01-02")
	if len(permsJSON) > 0 {
		_ = json.Unmarshal(permsJSON, &u.Permissions)
	}

	return &u, nil
}

func (r *UserRepository) GetAll() ([]models.User, error) {
	query := `
		SELECT id, name, email, role, branch, status, joined_date, permissions, created_at, updated_at
		FROM users
		WHERE role IN ('Admin', 'Staff')
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		var permsJSON []byte
		var joinedDate time.Time

		err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.Role, &u.Branch, &u.Status,
			&joinedDate, &permsJSON, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		u.JoinedDate = joinedDate.Format("2006-01-02")
		if len(permsJSON) > 0 {
			_ = json.Unmarshal(permsJSON, &u.Permissions)
		}
		users = append(users, u)
	}

	return users, rows.Err()
}

func (r *UserRepository) Create(u *models.User) error {
	query := `
		INSERT INTO users (id, name, email, password_hash, role, branch, status, joined_date, permissions, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
	`
	permsJSON, _ := json.Marshal(u.Permissions)
	_, err := r.db.Exec(query, u.ID, u.Name, u.Email, u.PasswordHash, u.Role, u.Branch, u.Status, u.JoinedDate, permsJSON)
	return err
}
