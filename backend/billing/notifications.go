package billing

import (
	"context"
	"time"
)

type Notification struct {
	ID             string
	OrganizationID string
	EventKey       string
	EventType      string
	Message        string
	CreatedAt      time.Time
}

type NotificationSender interface {
	Send(context.Context, Notification) error
}
