# Subscription Expiration Reminder Feature

## Overview
This feature provides automatic reminders to users when their subscription is about to expire, helping to improve renewal rates and prevent service interruptions.

## Features

### 1. **Visual Notification Banner**
- Prominent banner displayed at the top of the page
- Three severity levels with distinct colors and animations:
  - **Info (14-8 days)**: Blue gradient banner
  - **Warning (7-4 days)**: Orange gradient banner  
  - **Critical (3-0 days)**: Red pulsing banner with animation
  - **Expired**: Red critical banner

### 2. **Automatic Status Checking**
- Checks subscription status on page load
- Automatically rechecks every 5 minutes
- Supports both API and localStorage fallback

### 3. **Backend API Endpoints**

#### `POST /api/subscription`
Create or update a user subscription
```json
{
  "user_id": "demo_user",
  "plan_id": 1,
  "duration_days": 30
}
```

#### `GET /api/subscription/{user_id}`
Get subscription status for a user
```json
{
  "user_id": "demo_user",
  "plan_id": 1,
  "expires_at": 1735948800,
  "is_active": true,
  "days_remaining": 5,
  "hours_remaining": 120,
  "expired": false,
  "needs_reminder": true
}
```

#### `DELETE /api/subscription/{user_id}`
Cancel a user subscription

## Testing the Feature

### Method 1: Using the API (Recommended)
1. Start the Python API:
   ```powershell
   cd src/python_api
   .\run.ps1
   ```

2. Open browser console on the frontend page

3. Create a subscription that expires in 5 days:
   ```javascript
   createSubscription('demo_user', 1, 5)
   ```

4. Create a critical subscription (expires in 2 days):
   ```javascript
   createSubscription('demo_user', 1, 2)
   ```

### Method 2: Using localStorage (Offline)
1. Open browser console

2. Set a subscription expiring in 5 days:
   ```javascript
   setMockSubscription(5)
   ```

3. Set a critical subscription (2 days):
   ```javascript
   setMockSubscription(2)
   ```

4. Clear the subscription:
   ```javascript
   clearSubscription()
   ```

## Reminder Display Logic

| Days Remaining | Banner Type | Color | Animation |
|---------------|-------------|-------|-----------|
| 14-8 days | Info | Blue | Slide down |
| 7-4 days | Warning | Orange | Slide down |
| 3-1 days | Critical | Red | Pulse |
| 0 or expired | Critical | Red | Pulse |

## Integration with Blockchain

Currently, the feature uses a local SQLite database for demo purposes. In production:

1. Replace API calls with blockchain queries to the Move smart contract
2. Query the `UserSubscription` struct for `expires_at` timestamp
3. Use the same display logic based on days remaining
4. The blockchain integration would look like:
   ```typescript
   // Example blockchain query (pseudo-code)
   const subscription = await aptos.view({
     function: "subscription::get_subscription",
     type_arguments: [],
     arguments: [userAddress]
   });
   ```

## Files Modified

### Frontend
- [src/frontend/index.html](../src/frontend/index.html)
  - Added subscription reminder banner HTML
  - Added CSS styles for notification levels
  - Added JavaScript functions for status checking
  - Integrated with API endpoints

### Backend
- [src/python_api/app/main.py](../src/python_api/app/main.py)
  - Added subscription database table
  - Created subscription CRUD endpoints
  - Added expiration calculation logic

## Future Enhancements

1. **Email Notifications**: Send email reminders at specific intervals
2. **SMS Alerts**: Critical reminders via SMS
3. **Push Notifications**: Browser push notifications
4. **Grace Period**: Allow limited access for X days after expiration
5. **Auto-renewal**: Opt-in automatic subscription renewal
6. **Custom Reminder Preferences**: Let users configure when they want reminders
7. **Discount Offers**: Show special renewal discounts in reminder banners
