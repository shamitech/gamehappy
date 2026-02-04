# 🚀 Open World Game - Launch Guide

## Step 1: Database Setup

The database schema needs to be run. You have two options:

### Option A: Using phpMyAdmin (Easiest)
1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select the `gamehappy` database
3. Go to "SQL" tab
4. Paste contents of `database-schema.sql`
5. Click "Go" to execute

### Option B: Using Command Line
```bash
mysql -u root gamehappy < gamehappy/gamehappy.app/openworld/database-schema.sql
```

**What this creates:**
- 8 new tables for the Open World system
- All ready for admin use

## Step 2: Access Admin Dashboard

### Prerequisites Checklist
✅ MySQL running (XAMPP server on)
✅ Database schema executed
✅ You're logged in as admin (username: `admin`, password: `admin123`)

### Launch URL
```
http://localhost/gamehappy/gamehappy.app/openworld/admin.html
```

### What You Should See
- Dark-themed dashboard
- Three tabs: Worlds, Places, Objects
- Welcome message if not logged in (redirect to login)

## Step 3: Test the System (5-Minute Tour)

### Test World Creation
1. Click **"Worlds"** tab
2. Enter name: `Test World`
3. Enter description: `My first Open World`
4. Click **"Create World"**
5. ✅ Should see success message
6. World appears in list below

### Test Place Creation
1. Click **"Places"** tab
2. Select `Test World` from dropdown
3. Enter place name: `Starting Room`
4. Click **"Create Place"**
5. ✅ Place appears in list

### Test Place Linking
1. Create another place: `Adjacent Room`
2. Scroll to **"Link Places"** section
3. Set:
   - From Place: `Starting Room`
   - Direction: `north`
   - To Place: `Adjacent Room`
4. Click **"Link Places"**
5. ✅ Places now connected

### Test Objects & Mechanics
1. Click **"Objects"** tab
2. Select `Starting Room` from dropdown
3. Create object: `Desk`
4. Click **"Add Mechanic"** button
5. Set:
   - Mechanic Type: `examine`
   - Name: `Look at desk`
   - Description: `A wooden desk`
6. Click **"Add Mechanic"**
7. ✅ Mechanic added

## Common Issues & Fixes

### "Unauthorized - Admin login required"
**Cause:** Session not active or user not logged in
**Fix:** 
1. Check browser console (F12) for errors
2. Clear browser cookies (Settings → Cookies)
3. Reload page and login again

### "Database connection failed"
**Cause:** MySQL not running or wrong credentials
**Fix:**
1. Start XAMPP Apache & MySQL services
2. Check in phpMyAdmin that `gamehappy` database exists
3. Verify credentials in `api.php` match your setup

### "World not found or access denied"
**Cause:** You're trying to access another admin's world
**Fix:** Only admin users can see their own worlds (by design)

### Page shows blank/white screen
**Cause:** JavaScript error
**Fix:**
1. Open browser console: F12 → Console tab
2. Look for red error messages
3. Check that `admin.html`, `admin.css`, `admin.js` all loaded

### Forms don't appear
**Cause:** World/Place not selected
**Fix:**
1. **Places Tab:** Select world first
2. **Objects Tab:** Select place first
3. Selectors have default "-- Select --" options

## Files Modified for Phase 1

✅ `admin.html` - Dashboard UI
✅ `admin.css` - Styling
✅ `admin.js` - Frontend logic
✅ `api.php` - **Updated with session-based auth**
✅ `database-schema.sql` - **Updated to use VARCHAR for usernames**

## API Configuration Summary

**Authentication Method:** Session-based via `$_SESSION['admin_logged_in']`
**Creator Field:** Now uses `admin_username` from session
**Database Field:** `created_by` columns changed from INT to VARCHAR(100)

The API now perfectly matches your existing auth system!

## Next Steps After Testing

Once you verify everything works:

1. **Customize Admin Credentials** (if desired)
   - Edit `gamehappy/gamehappy.app/auth/login.php`
   - Change `$valid_username` and `$valid_password`

2. **Start Building Your World**
   - Create a real world in the admin dashboard
   - Design your locations and connections
   - Add objects and mechanics

3. **Phase 2 (Player Interface)**
   - Player creation system coming next
   - Players create within assigned plots
   - Restricted mechanics for players

4. **Phase 3 (Exploration)**
   - Players navigate your world
   - Execute mechanics
   - Game state management

## Troubleshooting Checklist

- [ ] MySQL is running (check XAMPP)
- [ ] Database schema was executed
- [ ] Admin login works (`admin` / `admin123`)
- [ ] Browser console (F12) shows no errors
- [ ] API responses visible in Network tab (F12)
- [ ] Dark theme loads correctly
- [ ] Can create a test world
- [ ] Can create a test place
- [ ] Can link places

## Support Resources

**Documentation Files:**
- `INDEX.md` - Project overview
- `README.md` - Technical details
- `QUICK_REF.md` - API reference
- `ARCHITECTURE.md` - System diagrams

**For Developers:**
- Check `QUICK_REF.md` for API examples
- Check browser Network tab for API responses
- Check PHP error logs for backend issues

## Ready to Go! 🎉

Once the database is set up and you can access the dashboard:

1. You have a fully functional admin system
2. Create worlds, places, and objects
3. Configure mechanics for interactions
4. Build your collaborative world structure

**Estimated time to first world:** 5-10 minutes

---

**Current Status:** ✅ Ready for Launch
**Phase:** 1 - Admin World Creation
**Next:** Phase 2 - Player Creation Interface

Questions? Check the documentation files or review the architecture diagram in `ARCHITECTURE.md`.

Good luck building! 🌍
