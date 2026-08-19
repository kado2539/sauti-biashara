# Founder Portal Documentation

## Overview

The Founder Portal is an administrative interface for system-wide management of the Sauti Biashara POS application. It provides comprehensive tools for:

- **User Management**: View all users, manage subscriptions, and control access
- **Subscription Control**: Upgrade/downgrade users between Freemium and Premium plans
- **System Analytics**: Monitor business metrics across all users
- **Account Management**: Activate/deactivate user accounts

## Access

### Login
- **URL**: `/founder/login`
- **Default Credentials** (configurable via environment variables):
  - Email: `founder@sauti-biashara.local`
  - Password: `FounderSecurePass123!`

### Configuration
Set custom founder credentials using environment variables:
```env
FOUNDER_EMAIL=your-email@domain.com
FOUNDER_PASSWORD=your-secure-password
```

## Features

### 1. Overview Tab
Displays system-wide metrics at a glance:
- **Total Users**: Active users in the system
- **Premium Active**: Number of premium subscribers with percentage
- **Total Sales**: Transaction count and aggregate revenue
- **Inventory Items**: Total SKUs managed across all users
- **Revenue Breakdown**: Sales and revenue split by plan type

### 2. Users Tab
Comprehensive user management interface:

**Search & Filter**:
- Search by email, name, or phone number
- Filter by plan type (All, Premium, Freemium)

**User Table**:
- Lists all users with key metrics
- Shows plan status, sales count, and revenue per user
- Click on any user to view detailed profile

**Quick Actions**:
- **Upgrade/Downgrade**: Toggle user between Premium and Freemium plans
- **Activate/Deactivate**: Control account access
- **View**: Open detailed user profile modal

### 3. Analytics Tab
In-depth system analytics:

**Key Metrics**:
- Total active users and conversion rate to premium
- Average revenue per user
- Total transactions and system revenue
- Inventory SKU count

**Revenue Analysis**:
- Revenue by plan type
- Sales count per plan
- Per-user average revenue by plan

### 4. User Details Modal
Access detailed information about any user:

**Profile Information**:
- Email, phone, full name
- Current subscription plan
- Account status (Active/Inactive)
- Member since date

**Activity Metrics**:
- Total sales count and revenue
- Inventory items created
- KPI entries recorded
- Last activity timestamp

**Subscription Management**:
- Direct plan upgrade/downgrade
- Account activation/deactivation

## API Endpoints

### Founder Authentication
```
POST /founder/login
Content-Type: application/x-www-form-urlencoded
Body: username=email&password=password
Response: { access_token, token_type }
```

### User Management
```
GET /founder/users
Authorization: Bearer <founder_token>
Response: { users: [...], total_count: number }
```

```
GET /founder/users/{user_id}
Authorization: Bearer <founder_token>
Response: { id, email, phone, full_name, plan, sales, inventory_items, kpi_entries, ... }
```

```
POST /founder/users/{user_id}/plan
Authorization: Bearer <founder_token>
Content-Type: application/json
Body: { plan: "freemium" | "premium" }
Response: Updated user object
```

```
POST /founder/users/{user_id}/toggle-active
Authorization: Bearer <founder_token>
Response: { success: true, user_id, is_active }
```

### Analytics
```
GET /founder/analytics
Authorization: Bearer <founder_token>
Response: { total_users, premium_users, freemium_users, total_sales, ... }
```

## Security Features

1. **Role-Based Access Control**: Only users with "founder" role can access admin endpoints
2. **JWT Authentication**: Secure token-based authentication with configurable expiry (120 minutes)
3. **Founder-Only Routes**: All founder endpoints validate user role before processing
4. **Data Isolation**: Founder cannot modify other founder accounts or system-level settings

## Workflow Examples

### Upgrade a User to Premium
1. Navigate to Users tab
2. Search for the user by email or name
3. Click "Upgrade" button in their row, or
4. Click "View" to open details modal
5. Click "Upgrade to Premium" button
6. User gains immediate access to premium features

### Deactivate an Account
1. Navigate to Users tab
2. Find the user and click "View"
3. Click "Deactivate Account" in the modal
4. User loses access to their dashboard

### Analyze Revenue Trends
1. Navigate to Analytics tab
2. Review revenue breakdown by plan type
3. Compare conversion metrics
4. Check per-user average revenue

### Monitor System Health
1. Check Overview tab for current metrics
2. Verify premium conversion rate
3. Monitor total transaction volume
4. Track inventory adoption

## Best Practices

- **Regular Audits**: Check analytics weekly for business insights
- **Plan Management**: Monitor conversion and upgrade users strategically
- **Account Health**: Deactivate inactive accounts to maintain data cleanliness
- **Documentation**: Keep notes on plan changes for business analysis

## Troubleshooting

**Cannot login to founder portal**:
- Verify credentials are correct
- Check that founder account exists in database
- Ensure role is set to "founder"

**Cannot see users**:
- Confirm founder token is valid
- Check that users exist in database with role="user"
- Verify no CORS or network issues

**Plan updates not reflecting**:
- Refresh the users list
- Check browser console for API errors
- Verify backend is running and accessible

## Future Enhancements

Recommended features for future versions:
- Batch user management (bulk upgrade/downgrade)
- User analytics export (CSV/PDF)
- Revenue forecasting
- Premium feature recommendations engine
- Founder activity audit log
- API key management for integrations
- Custom business rule automation
