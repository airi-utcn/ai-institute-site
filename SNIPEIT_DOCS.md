# Snipe-IT Integration Guide

This project integrates Strapi CMS with Snipe-IT for automated equipment management.

## Architecture
- **Frontend (Next.js):** Fetches available assets directly and submits reservation requests to Strapi.
- **Backend (Strapi):** Handles reservation lifecycles. When a reservation status changes to `checked_out` or `returned`, Strapi automatically triggers an API call to Snipe-IT to update the asset's status.
- **Snipe-IT Container:** Runs on the Docker internal network (`http://snipeit:80`) and maintains the actual hardware inventory.

## Setup Requirements
Ensure your `.env` file contains the following:
```env
SNIPEIT_URL=http://snipeit:80
SNIPEIT_API_KEY=your_snipeit_api_key_here
SNIPEIT_DB_DATABASE=snipeit_db
SNIPEIT_DB_USER=snipeit_user
SNIPEIT_DB_PASSWORD=your_secure_password
SNIPEIT_DB_ROOT_PASSWORD=your_secure_root_password

## How to Test the Workflow
- Frontend: Submit a reservation at http://localhost:3000/equipment.
- Strapi: Go to the Admin Panel -> Reservations. Change the status from pending to checked_out.
- Snipe-IT: Verify the asset is now marked as "Checked Out" under the user's name.
-Return: Change the status in Strapi to returned and verify it becomes "Ready to Deploy" in Snipe-IT.