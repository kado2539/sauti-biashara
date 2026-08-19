# Founder Portal - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Restart Your Backend
The founder account will be auto-created on startup.

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Look for this in the logs (on startup):
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Access the Founder Portal

#### Via Login Page
1. Go to `http://localhost:3000/login`
2. Click **"Founder Portal"** link at the bottom
3. OR direct URL: `http://localhost:3000/founder/login`

#### Sign In
- **Email**: `founder@sauti-biashara.local`
- **Password**: `FounderSecurePass123!`

You're now in the founder dashboard!

## 🎯 Common Tasks

### View All Users
1. Click **"Users"** tab
2. See all registered users with:
   - Name and email
   - Current subscription plan (Freemium/Premium)
   - Sales count
   - Total revenue
   - Account status

### Upgrade a User to Premium
1. Go to **Users** tab
2. Find the user in the table
3. Click **"Upgrade"** button
4. Or click **"View"** to open detailed profile
5. Click **"Upgrade to Premium"** button
6. ✅ User now has premium features!

### Downgrade a Premium User
1. Same as upgrade, but click **"Downgrade"** instead
2. User loses premium features immediately

### Deactivate/Activate an Account
1. Go to Users tab
2. Click **"View"** on any user
3. Click **"Deactivate Account"** (or "Activate" if inactive)
4. User can no longer login

### Check System Analytics
1. Click **"Analytics"** tab
2. View:
   - Total users and premium % conversion
   - Revenue per user
   - Total sales and system revenue
   - Revenue breakdown by plan
   - Inventory SKU count

### Search for a Specific User
1. Go to **Users** tab
2. Use the search box at the top
3. Type email, name, or phone
4. Results filter in real-time

### Filter Users by Plan
1. Use buttons below search box:
   - **All Plans** - show everyone
   - **Premium Only** - premium subscribers
   - **Freemium Only** - free tier users

## 📊 Understanding the Overview Tab

The **Overview** tab shows real-time system metrics:

| Metric | Meaning |
|--------|---------|
| Total Users | How many users are in the system |
| Premium Active | How many users are on premium plan |
| Total Sales | All transactions ever recorded |
| Inventory Items | Total SKUs managed by all users |
| Revenue by Plan | Breakdown of sales and revenue by plan type |

## 👤 User Detail Modal

Click **"View"** on any user to see their full profile:

**Profile Section**:
- Email, phone, name
- Plan status (Premium/Freemium)
- Account status (Active/Inactive)
- When they joined

**Activity Section**:
- Total sales made
- Total revenue generated
- Inventory items they created
- KPI entries they recorded
- Last time they used the system

**Subscription Management**:
- Buttons to upgrade/downgrade plan
- Buttons to activate/deactivate account
- Changes take effect immediately

## 🔧 Customizing Founder Credentials

To use different login credentials, set environment variables in `.env`:

```env
FOUNDER_EMAIL=your-email@company.com
FOUNDER_PASSWORD=YourNewPassword123!
```

Then restart the backend. The new founder account will be created on next startup.

## 🛡️ Security Tips

- ✅ Always logout when done
- ✅ Use a strong founder password
- ✅ Don't share founder login credentials
- ✅ Log changes for compliance/audit
- ✅ Monitor founder access regularly

## 🐛 Troubleshooting

**Q: Can't login to founder portal**
- A: Check default credentials: `founder@sauti-biashara.local` / `FounderSecurePass123!`
- A: Make sure backend is running on port 8000
- A: Check browser console for network errors

**Q: No users showing up**
- A: You need regular user accounts first. Register some users at `/register`
- A: Founder portal only shows users with role='user'

**Q: Can't find a specific user**
- A: Use the search box - it searches email, name, phone
- A: Check the filter buttons (All Plans, Premium, Freemium)

**Q: Plan changes not working**
- A: Refresh the page after making changes
- A: Check browser console for errors
- A: Make sure backend is responding

**Q: Lost founder login**
- A: Restart backend to reset founder account to defaults
- A: Or set FOUNDER_EMAIL and FOUNDER_PASSWORD in .env before restart

## 📱 Mobile Access

The founder portal is fully mobile-responsive! 

Access from tablet/phone:
1. Open `http://<your-computer-ip>:3000/founder/login`
2. Login with founder credentials
3. All features work on mobile (responsive layout)

## 🎓 Learning Path

1. **Day 1**: Login, explore Overview & Users tabs
2. **Day 2**: Upgrade a test user to premium
3. **Day 3**: Review Analytics tab and revenue metrics
4. **Day 4**: Use search/filter features
5. **Day 5**: Manage user accounts (activate/deactivate)

## 🚀 Next Steps

After getting comfortable with the founder portal:

1. **Register test users**: Go to `/register` and create sample accounts
2. **Generate test data**: Have test users record sales and KPIs
3. **Try upgrades**: Upgrade some test users to premium
4. **Review analytics**: Check how metrics change
5. **Plan production**: Set founder credentials for production

## 📚 Full Documentation

For complete documentation, see:
- `docs/FOUNDER_PORTAL.md` - Complete feature documentation
- `docs/FOUNDER_PORTAL_IMPLEMENTATION.md` - Technical details & recommendations

## ❓ Questions?

### Common Questions

**Q: Can I have multiple founders?**
- A: Currently supports one founder. Multi-founder support is a planned enhancement.

**Q: What happens when I downgrade a premium user?**
- A: They lose access to premium features immediately. They can still use freemium features.

**Q: Can users re-upgrade themselves?**
- A: No, only the founder can upgrade/downgrade plans through this portal.

**Q: Is there a payment integration?**
- A: The founder portal is manual plan management. Payment integration is a future enhancement.

**Q: Can I see who made changes?**
- A: Activity tracking/audit log is a planned feature. Currently changes are immediate but not logged.

---

**Enjoy your Founder Portal! 🎉**

Questions? Check the full documentation or review the code in:
- Backend: `backend/app/main.py` (founder endpoints)
- Frontend: `frontend/app/founder/` (portal UI)
