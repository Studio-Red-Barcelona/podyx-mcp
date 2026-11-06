# Tool reference

Generated from the vendored Podyx OpenAPI snapshots in `spec/`. 150 tools; 65 enabled by default.

Arguments are grouped under `path`, `query`, and `body` according to the API contract. Writes additionally require `confirm: true` and a persisted UUID `idempotency_key`. Omit absent optional values; do not send null unless the schema permits it.

| Tool | Mode | API route |
|---|---|---|
| `podyx_addon_quote` | Read / preview | `POST /api/v2/addon-purchases/quotes` |
| `podyx_aftercare_accept_amendment` | Write (opt-in) | `POST /api/v2/sessions/{id}/amendments` |
| `podyx_aftercare_addon` | Read / preview | `GET /api/v2/addon-purchases/{id}` |
| `podyx_aftercare_amendment` | Read / preview | `GET /api/v2/amendments/{id}` |
| `podyx_aftercare_amendment_preview` | Read / preview | `POST /api/v2/sessions/{id}/amendments/quotes` |
| `podyx_aftercare_approve_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/approvals` |
| `podyx_aftercare_approve_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/approvals` |
| `podyx_aftercare_cancel_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/payment/cancellation-requests` |
| `podyx_aftercare_cancel_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/payment/cancellation-requests` |
| `podyx_aftercare_cancellation_preview` | Read / preview | `POST /api/v2/bookings/{id}/cancellations/quotes` |
| `podyx_aftercare_confirm_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/payment/confirmations` |
| `podyx_aftercare_confirm_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/payment/confirmations` |
| `podyx_aftercare_create_addon` | Write (opt-in) | `POST /api/v2/sessions/{id}/addon-purchases` |
| `podyx_aftercare_decline_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/declines` |
| `podyx_aftercare_decline_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/declines` |
| `podyx_aftercare_guests` | Read / preview | `GET /api/v2/sessions/{id}/guests` |
| `podyx_aftercare_invite_guest` | Write (opt-in) | `POST /api/v2/sessions/{id}/guests` |
| `podyx_aftercare_prepare_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/payment/preparations` |
| `podyx_aftercare_prepare_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/payment/preparations` |
| `podyx_aftercare_remove_guest` | Write (opt-in) | `DELETE /api/v2/sessions/{id}/guests/{guest_id}` |
| `podyx_aftercare_reschedule` | Write (opt-in) | `POST /api/v2/sessions/{id}/reschedules` |
| `podyx_aftercare_retry_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/payment/retries` |
| `podyx_aftercare_retry_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/payment/retries` |
| `podyx_aftercare_staff_reschedule` | Write (opt-in) | `POST /api/v2/sessions/{id}/staff-reschedules` |
| `podyx_aftercare_start_amendment` | Read / preview | `GET /api/v2/sessions/{id}/amendment-options` |
| `podyx_aftercare_submit_addon` | Write (opt-in) | `POST /api/v2/addon-purchases/{id}/payment/tokens` |
| `podyx_aftercare_submit_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/payment/tokens` |
| `podyx_aftercare_update_guest` | Write (opt-in) | `PATCH /api/v2/sessions/{id}/guests/{guest_id}` |
| `podyx_aftercare_withdraw_amendment` | Write (opt-in) | `POST /api/v2/amendments/{id}/withdrawals` |
| `podyx_archive_addon` | Write (opt-in) | `PUT /api/v2/addons/{id}/archival` |
| `podyx_archive_bundle_plan` | Write (opt-in) | `PUT /api/v2/bundle-plans/{id}/archival` |
| `podyx_archive_room` | Write (opt-in) | `PUT /api/v2/rooms/{id}/archival` |
| `podyx_archive_service` | Write (opt-in) | `PUT /api/v2/services/{id}/archival` |
| `podyx_archive_setup` | Write (opt-in) | `PUT /api/v2/setups/{id}/archival` |
| `podyx_archive_subscription_plan` | Write (opt-in) | `PUT /api/v2/subscription-plans/{id}/archival` |
| `podyx_booking_quote` | Read / preview | `POST /api/v2/bookings/quotes` |
| `podyx_bundle_quote` | Read / preview | `POST /api/v2/bundle-purchases/quotes` |
| `podyx_cancel_booking` | Write (opt-in) | `POST /api/v2/bookings/{id}/cancellations` |
| `podyx_cancel_checkout` | Write (opt-in) | `POST /api/v2/checkouts/{id}/payment/cancellation-requests` |
| `podyx_cancel_purchase` | Write (opt-in) | `POST /api/v2/purchases/{id}/payment/cancellation-requests` |
| `podyx_cancel_subscription` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/cancellations` |
| `podyx_checkout_booking` | Write (opt-in) | `POST /api/v2/bookings` |
| `podyx_checkout_tour` | Write (opt-in) | `POST /api/v2/studio-tours/{tour_id}/bookings` |
| `podyx_confirm_checkout` | Write (opt-in) | `POST /api/v2/checkouts/{id}/payment/confirmations` |
| `podyx_confirm_purchase` | Write (opt-in) | `POST /api/v2/purchases/{id}/payment/confirmations` |
| `podyx_create_addon` | Write (opt-in) | `POST /api/v2/addons` |
| `podyx_create_bundle_plan` | Write (opt-in) | `POST /api/v2/bundle-plans` |
| `podyx_create_client` | Write (opt-in) | `POST /api/v2/clients` |
| `podyx_create_external_checkout` | Write (opt-in) | `POST /api/v2/external-checkouts` |
| `podyx_create_private_offer_bundle_plan` | Write (opt-in) | `POST /api/v2/bundle-plans/private-offers` |
| `podyx_create_private_offer_subscription_plan` | Write (opt-in) | `POST /api/v2/subscription-plans/private-offers` |
| `podyx_create_room` | Write (opt-in) | `POST /api/v2/rooms` |
| `podyx_create_service` | Write (opt-in) | `POST /api/v2/services` |
| `podyx_create_setup` | Write (opt-in) | `POST /api/v2/setups` |
| `podyx_create_subscription_plan` | Write (opt-in) | `POST /api/v2/subscription-plans` |
| `podyx_customer_availability` | Read / preview | `GET /api/v2/rooms/availability` |
| `podyx_get_addon` | Read / preview | `GET /api/v2/addons/{id}` |
| `podyx_get_bundle_plan` | Read / preview | `GET /api/v2/bundle-plans/{id}` |
| `podyx_get_cancellation` | Read / preview | `GET /api/v2/cancellations/{id}` |
| `podyx_get_checkout` | Read / preview | `GET /api/v2/checkouts/{id}` |
| `podyx_get_client` | Read / preview | `GET /api/v2/clients/{id}` |
| `podyx_get_external_checkout` | Read / preview | `GET /api/v2/external-checkouts/{id}` |
| `podyx_get_external_payment_report` | Read / preview | `GET /api/v2/external-payment-reports/{id}` |
| `podyx_get_external_refund` | Read / preview | `GET /api/v2/external-refunds/{id}` |
| `podyx_get_external_subscription_cycle` | Read / preview | `GET /api/v2/subscription-cycles/{id}` |
| `podyx_get_member_bundle` | Read / preview | `GET /api/v2/member-bundles/{id}` |
| `podyx_get_published_tour` | Read / preview | `GET /api/v2/studio-tours/published` |
| `podyx_get_purchase` | Read / preview | `GET /api/v2/purchases/{id}` |
| `podyx_get_room` | Read / preview | `GET /api/v2/rooms/{id}` |
| `podyx_get_service` | Read / preview | `GET /api/v2/services/{id}` |
| `podyx_get_setup` | Read / preview | `GET /api/v2/setups/{id}` |
| `podyx_get_subscription_cancellation` | Read / preview | `GET /api/v2/subscriptions/{id}/cancellation` |
| `podyx_get_subscription_plan` | Read / preview | `GET /api/v2/subscription-plans/{id}` |
| `podyx_get_tour_availability` | Read / preview | `GET /api/v2/studio-tours/{id}/availability` |
| `podyx_list_addon` | Read / preview | `GET /api/v2/addons` |
| `podyx_list_bundle_plan` | Read / preview | `GET /api/v2/bundle-plans` |
| `podyx_list_external_refund_collections` | Read / preview | `GET /api/v2/external-checkouts/{id}/collections` |
| `podyx_list_room` | Read / preview | `GET /api/v2/rooms` |
| `podyx_list_service` | Read / preview | `GET /api/v2/services` |
| `podyx_list_setup` | Read / preview | `GET /api/v2/setups` |
| `podyx_list_subscription_plan` | Read / preview | `GET /api/v2/subscription-plans` |
| `podyx_packages_approve_bundle` | Write (opt-in) | `POST /api/v2/member-bundles/{id}/approvals` |
| `podyx_packages_approve_subscription` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/approvals` |
| `podyx_packages_bundle_quote` | Read / preview | `POST /api/v2/clients/{id}/bundle-redemptions/quotes` |
| `podyx_packages_bundle_redemption` | Read / preview | `GET /api/v2/bundle-redemptions/{id}` |
| `podyx_packages_bundle_rights` | Read / preview | `GET /api/v2/clients/{id}/bundle-rights` |
| `podyx_packages_decline_bundle` | Write (opt-in) | `POST /api/v2/member-bundles/{id}/declines` |
| `podyx_packages_decline_subscription` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/declines` |
| `podyx_packages_grant_sessions` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/session-grants` |
| `podyx_packages_manage_subscription` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/management-requests` |
| `podyx_packages_redeem_bundle` | Write (opt-in) | `POST /api/v2/clients/{id}/bundle-redemptions` |
| `podyx_packages_redeem_subscription` | Write (opt-in) | `POST /api/v2/clients/{id}/subscription-redemptions` |
| `podyx_packages_subscription_management` | Read / preview | `GET /api/v2/subscriptions/{id}/management-options` |
| `podyx_packages_subscription_quote` | Read / preview | `POST /api/v2/clients/{id}/subscription-redemptions/quotes` |
| `podyx_packages_subscription_redemption` | Read / preview | `GET /api/v2/subscription-redemptions/{id}` |
| `podyx_packages_subscription_rights` | Read / preview | `GET /api/v2/clients/{id}/subscription-rights` |
| `podyx_purchase_bundle` | Write (opt-in) | `POST /api/v2/bundle-purchases` |
| `podyx_purchase_external_bundle` | Write (opt-in) | `POST /api/v2/external-bundle-purchases` |
| `podyx_purchase_external_subscription` | Write (opt-in) | `POST /api/v2/external-subscription-purchases` |
| `podyx_purchase_subscription` | Write (opt-in) | `POST /api/v2/subscription-purchases` |
| `podyx_quote_tour` | Read / preview | `POST /api/v2/studio-tours/{id}/quotes` |
| `podyx_report_external_payable_outcome` | Write (opt-in) | `POST /api/v2/external-checkouts/{id}/outcomes` |
| `podyx_report_external_payment` | Write (opt-in) | `POST /api/v2/external-payment-reports` |
| `podyx_report_external_refund` | Write (opt-in) | `POST /api/v2/external-refunds/{id}/outcomes` |
| `podyx_report_external_subscription_cycle` | Write (opt-in) | `POST /api/v2/subscriptions/{id}/cycles` |
| `podyx_request_client_activation` | Write (opt-in) | `POST /api/v2/clients/{id}/activation-requests` |
| `podyx_request_external_refund` | Write (opt-in) | `POST /api/v2/external-refunds` |
| `podyx_request_payment_link_bundle_plan` | Write (opt-in) | `POST /api/v2/bundle-plans/{id}/payment-link-requests` |
| `podyx_request_payment_link_subscription_plan` | Write (opt-in) | `POST /api/v2/subscription-plans/{id}/payment-link-requests` |
| `podyx_resolve_external_payment_report` | Write (opt-in) | `POST /api/v2/external-payment-reports/{id}/resolutions` |
| `podyx_restore_addon` | Write (opt-in) | `DELETE /api/v2/addons/{id}/archival` |
| `podyx_restore_bundle_plan` | Write (opt-in) | `DELETE /api/v2/bundle-plans/{id}/archival` |
| `podyx_restore_room` | Write (opt-in) | `DELETE /api/v2/rooms/{id}/archival` |
| `podyx_restore_service` | Write (opt-in) | `DELETE /api/v2/services/{id}/archival` |
| `podyx_restore_setup` | Write (opt-in) | `DELETE /api/v2/setups/{id}/archival` |
| `podyx_restore_subscription_plan` | Write (opt-in) | `DELETE /api/v2/subscription-plans/{id}/archival` |
| `podyx_retry_checkout` | Write (opt-in) | `POST /api/v2/checkouts/{id}/payment/retries` |
| `podyx_retry_purchase` | Write (opt-in) | `POST /api/v2/purchases/{id}/payment/retries` |
| `podyx_submit_checkout_token` | Write (opt-in) | `POST /api/v2/checkouts/{id}/payment/tokens` |
| `podyx_submit_purchase_token` | Write (opt-in) | `POST /api/v2/purchases/{id}/payment/tokens` |
| `podyx_subscription_quote` | Read / preview | `POST /api/v2/subscription-purchases/quotes` |
| `podyx_update_addon` | Write (opt-in) | `PATCH /api/v2/addons/{id}` |
| `podyx_update_bundle_plan` | Write (opt-in) | `PATCH /api/v2/bundle-plans/{id}` |
| `podyx_update_client` | Write (opt-in) | `PATCH /api/v2/clients/{id}` |
| `podyx_update_private_offer_bundle_plan` | Write (opt-in) | `PATCH /api/v2/bundle-plans/{id}/private-offer` |
| `podyx_update_room` | Write (opt-in) | `PATCH /api/v2/rooms/{id}` |
| `podyx_update_service` | Write (opt-in) | `PATCH /api/v2/services/{id}` |
| `podyx_update_setup` | Write (opt-in) | `PATCH /api/v2/setups/{id}` |
| `podyx_update_subscription_plan` | Write (opt-in) | `PATCH /api/v2/subscription-plans/{id}` |
| `podyx_v1_get_api_key` | Read / preview | `GET /api/v1/key` |
| `podyx_v1_get_booking` | Read / preview | `GET /api/v1/bookings/{id}` |
| `podyx_v1_get_booking_availability` | Read / preview | `GET /api/v1/availability` |
| `podyx_v1_get_client` | Read / preview | `GET /api/v1/clients/{id}` |
| `podyx_v1_get_session` | Read / preview | `GET /api/v1/sessions/{id}` |
| `podyx_v1_get_studio` | Read / preview | `GET /api/v1/studio` |
| `podyx_v1_list_addons` | Read / preview | `GET /api/v1/addons` |
| `podyx_v1_list_bookings` | Read / preview | `GET /api/v1/bookings` |
| `podyx_v1_list_clients` | Read / preview | `GET /api/v1/clients` |
| `podyx_v1_list_rooms` | Read / preview | `GET /api/v1/rooms` |
| `podyx_v1_list_services` | Read / preview | `GET /api/v1/services` |
| `podyx_v1_list_sessions` | Read / preview | `GET /api/v1/sessions` |
| `podyx_v1_list_setups` | Read / preview | `GET /api/v1/setups` |
| `podyx_v1_reports_addons` | Read / preview | `GET /api/v1/reports/addons` |
| `podyx_v1_reports_capacity` | Read / preview | `GET /api/v1/reports/capacity` |
| `podyx_v1_reports_customers` | Read / preview | `GET /api/v1/reports/customers` |
| `podyx_v1_reports_evidence` | Read / preview | `GET /api/v1/reports/evidence` |
| `podyx_v1_reports_metrics` | Read / preview | `GET /api/v1/reports/metrics` |
| `podyx_v1_reports_packages` | Read / preview | `GET /api/v1/reports/packages` |
| `podyx_v1_reports_revenue` | Read / preview | `GET /api/v1/reports/revenue` |
| `podyx_v1_reports_summary` | Read / preview | `GET /api/v1/reports/summary` |
