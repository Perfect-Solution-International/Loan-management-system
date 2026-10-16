package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"loan-management-backend/models"
	"loan-management-backend/repository"
)

type AuditAndSettingsHandler struct {
	auditRepo    *repository.AuditRepository
	settingsRepo *repository.SettingsRepository
}

func NewAuditAndSettingsHandler(auditRepo *repository.AuditRepository, settingsRepo *repository.SettingsRepository) *AuditAndSettingsHandler {
	return &AuditAndSettingsHandler{
		auditRepo:    auditRepo,
		settingsRepo: settingsRepo,
	}
}

func (h *AuditAndSettingsHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	logs, err := h.auditRepo.GetAll(limit)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	sendJSON(w, http.StatusOK, logs)
}

func (h *AuditAndSettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsRepo.Get()
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, settings)
}

func (h *AuditAndSettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var s models.SystemSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if err := h.settingsRepo.Update(&s); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	sendJSON(w, http.StatusOK, s)
}

