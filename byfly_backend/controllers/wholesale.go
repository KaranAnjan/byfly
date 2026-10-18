package controllers

import (
	"net/http"
	"strings"

	"github.com/byfly/byfly-backend/auth"
	"github.com/go-chi/chi/v5"
)

func (s *Controller) WholesaleAccounts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT wa.user_id,wa.business_name,wa.is_active,wa.created_at,COALESCE(u.name,''),u.email,COALESCE(u.phone,'') FROM wholesale_accounts wa JOIN users u ON u.id=wa.user_id ORDER BY wa.created_at DESC`)
	if err != nil {
		Error(w, 500, "could not load wholesale accounts")
		return
	}
	defer rows.Close()
	accounts := []map[string]any{}
	for rows.Next() {
		var id, business, name, email, phone string
		var active bool
		var created any
		if rows.Scan(&id, &business, &active, &created, &name, &email, &phone) == nil {
			accounts = append(accounts, map[string]any{"id": id, "user_id": id, "business_name": business, "is_active": active, "wholesale_enabled": active, "created_at": created, "name": name, "email": email, "phone": phone})
		}
	}
	JSON(w, 200, map[string]any{"accounts": accounts, "recent_logins": []any{}})
}

func (s *Controller) CreateWholesaleAccount(w http.ResponseWriter, r *http.Request) {
	var in struct{ Name, BusinessName, Email, Phone, Password string }
	if decode(r, &in) != nil || strings.TrimSpace(in.Email) == "" {
		Error(w, 400, "email is required")
		return
	}
	if in.Password == "" {
		in.Password = "admin123"
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		Error(w, 500, "could not secure password")
		return
	}
	tx, err := s.DB.Begin(r.Context())
	if err != nil {
		Error(w, 500, "could not create account")
		return
	}
	defer tx.Rollback(r.Context())
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var id string
	// If this Firebase/customer account already exists, approve that same
	// account instead of trying to create a duplicate user.
	err = tx.QueryRow(r.Context(), `SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1`, email).Scan(&id)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE users SET name=COALESCE(NULLIF($1,''),name), phone=COALESCE(NULLIF($2,''),phone), updated_at=now() WHERE id=$3`, strings.TrimSpace(in.Name), strings.TrimSpace(in.Phone), id)
	} else {
		err = tx.QueryRow(r.Context(), `INSERT INTO users(id,email,name,phone,password_hash,role) VALUES(gen_random_uuid()::text,$1,$2,$3,$4,'customer') RETURNING id`, email, strings.TrimSpace(in.Name), strings.TrimSpace(in.Phone), hash).Scan(&id)
	}
	if err != nil {
		Error(w, 409, "could not find or create customer account")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO wholesale_accounts(user_id,business_name,is_active) VALUES($1,$2,true) ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,is_active=true,updated_at=now()`, id, strings.TrimSpace(in.BusinessName)); err != nil {
		Error(w, 400, "could not create wholesale access")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		Error(w, 500, "could not finalize account")
		return
	}
	JSON(w, 201, map[string]any{"id": id, "message": "wholesale access enabled"})
}

func (s *Controller) ToggleWholesaleAccount(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Active bool `json:"active"`
	}
	if decode(r, &in) != nil {
		Error(w, 400, "invalid active value")
		return
	}
	if _, err := s.DB.Exec(r.Context(), `UPDATE wholesale_accounts SET is_active=$1,updated_at=now() WHERE user_id=$2`, in.Active, chi.URLParam(r, "id")); err != nil {
		Error(w, 400, "could not update wholesale access")
		return
	}
	w.WriteHeader(204)
}
