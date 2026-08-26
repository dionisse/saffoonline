/*
# Add WhatsApp Notification Settings to store_settings

## Summary
Adds two new columns to the store_settings table to support automatic WhatsApp order notifications:

1. New Columns
   - `whatsapp_notify_number` (text, nullable): The WhatsApp phone number that receives order notifications (admin's number, international format e.g. +22997000000)
   - `callmebot_api_key` (text, nullable): The CallMeBot API key tied to the notification number, used to authenticate the free WhatsApp message sending service

## Notes
- CallMeBot is a free service that sends WhatsApp messages to a specific number; the admin must activate it by sending a message to the CallMeBot contact first.
- These settings are separate from the public-facing `whatsapp_number` field, so admins can route notifications to a different number than their public contact.
- No RLS changes needed; existing policies on store_settings already cover these columns.
*/

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS whatsapp_notify_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS callmebot_api_key text DEFAULT NULL;
