package handlers

import (
	"loan-management-backend/billing"
	"net/http"
)

func (h *BillingHandler) BillingContact(w http.ResponseWriter, r *http.Request) {
	c, err := h.repo.BillingContact(r.Context(), orgClaims(r).OrganizationID)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, c)
}

func (h *BillingHandler) SaveBillingContact(w http.ResponseWriter, r *http.Request) {
	var c billing.BillingContact
	if !decodeBilling(w, r, &c) {
		return
	}
	c, err := h.repo.SaveBillingContact(r.Context(), orgClaims(r).OrganizationID, c)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, c)
}
