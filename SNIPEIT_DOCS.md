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

## First-Time Snipe-IT Configuration
When running the Docker environment for the first time, the Snipe-IT database will be empty. The frontend reservation form will not appear unless there is at least one available asset in Snipe-IT.

Step-by-step initial setup:
- Access Snipe-IT: Open http://localhost:8000 in your browser.
- Run Setup: Complete the initial setup wizard to create your admin account.
- Create a Dummy Asset:
        - Go to Assets -> Create New.
        - Add a device (e.g., "Test Laptop").
Important: Set its Status to Ready to Deploy (the Next.js frontend only fetches assets with this specific status).
- Generate the API Key: Click on your admin profile (top right) -> Manage API Keys.
- Click Create New Token, copy it, and paste it into your .env file as the SNIPEIT_API_KEY.
- Restart Containers: Run docker compose up -d in the root folder to inject the new API token into the Next.js and Strapi containers.

## How to Test the Workflow
-Once you have an asset set as "Ready to Deploy" and the .env configured, follow these steps to test the full lifecycle:
- Frontend Request: Go to http://localhost:3000/equipment. You should now see the asset you created. Click on it to open the form and submit a reservation request.
- Strapi Approval: Open the Strapi Admin Panel (http://localhost:1337/strapi/admin). Navigate to the Reservations collection. You will see the new request with a pending status. Change the status to checked_out.
- Snipe-IT Verification: Go back to the Snipe-IT dashboard (http://localhost:8000). Find the asset and verify that its status has automatically synchronized and changed to Checked Out.
- Return Workflow: In the Strapi Admin Panel, change the reservation status to returned. Verify in Snipe-IT that the asset's status successfully reverted to Ready to Deploy.