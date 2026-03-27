# Actor Verification Checklist

Use this checklist after restarting the backend and frontend. Log in once with each role and confirm the items below.

## Before Testing

- Confirm each test user has the correct `role`
- Confirm each test user is linked to an `employee` record where required
- Confirm `department_head` users have a valid `departmentId`
- Confirm `shift_supervisor` and `worker` users have schedule data in `work_schedules`
- Confirm leave types and leave balances exist
- Confirm `conversion_recommendations` exists
- Confirm `production_daily_summaries` exists if you want real production revenue data

## Director

- Login lands on `Dashboard`
- Sidebar shows:
  - `Dashboard`
  - `Employees`
  - `Attendance`
  - `Shifts`
  - `Leave`
  - `Recruitment`
  - `Training`
  - `Reports`
  - `System Settings`
  - `User Management`
- Dashboard shows staffing, present/absent, salary summary, attendance chart, production overview, recent activity
- Can add/edit/delete employees
- Can convert temporary to permanent
- Can view attendance reports and bonus/sanction data
- Can generate rotations and override schedules
- Can approve/reject any leave
- Can create/edit job postings and approve hiring
- Can create trainings and view enrollments
- Can access reports, settings, and user management
- Cannot access hidden/removed pages not listed in sidebar

## HR Manager

- Login lands on `Dashboard`
- Sidebar shows:
  - `Dashboard`
  - `Employees`
  - `Attendance`
  - `Shifts`
  - `Leave`
  - `Recruitment`
  - `Training`
  - `Reports`
- Sidebar does not show:
  - `System Settings`
  - `User Management`
- Dashboard shows staffing, department/line grouping, recent hires, pending leave, recruitment stats
- Can add employees
- Can edit employee information
- Can deactivate employees
- Cannot delete employees
- Can mark absent manually
- Can approve/reject leave
- Can view medical booklet paths on sick leave
- Can create training programs and sessions
- Can enroll employees in training
- Can access HR reports
- Cannot override shift schedules

## Production Manager

- Login lands on `Dashboard`
- Sidebar shows:
  - `Dashboard`
  - `Employees`
  - `Attendance`
  - `Shifts`
  - `Reports`
- Sidebar does not show:
  - `Leave`
  - `Recruitment`
  - `Training`
  - `System Settings`
- Employees page is view-only
- Dashboard shows employees by line, attendance by shift, weekly schedule, dry biscuit status, line efficiency
- Can verify attendance
- Can generate 3-week rotations
- Can generate schedules
- Can mark dry biscuit week
- Can assign workers to production lines
- Cannot edit employee personal data
- Cannot access leave, recruitment, training, or system settings directly by URL

## Shift Supervisor

- Login lands on `Dashboard`
- Sidebar shows:
  - `Dashboard`
  - `Attendance`
  - `My Schedule`
- Sidebar does not show:
  - `Employees`
  - `Leave`
  - `Recruitment`
  - `Training`
  - `Reports`
- Dashboard shows today, shift, expected, present, late, absent
- Quick check-in works by employee code
- Quick check-out works by employee code
- Attendance page shows only today/current shift scope
- My Schedule is view-only
- Cannot open employee list directly by URL
- Cannot modify schedules

## Department Head

- Login lands on `Dashboard`
- Sidebar shows:
  - `Dashboard`
  - `My Department`
  - `Training`
  - `Performance`
- Sidebar does not show:
  - `Payroll`
  - `Recruitment`
  - `Shifts`
- Dashboard shows department employees, training status, performance overview, pending conversions
- Employees page only shows employees from own department
- Cannot edit employee personal data
- Training page only shows own department data
- Can create training programs and sessions for own department
- Can update training completion and performance notes
- Performance page can rate employees 1-5
- Performance page can submit conversion recommendations
- Recommendation list only shows own department items
- Cannot access other department employee records by URL

## Employee (Worker)

- Login lands on `My Dashboard`
- Sidebar shows:
  - `My Dashboard`
  - `My Schedule`
  - `My Attendance`
  - `Leave Requests`
  - `Profile`
- Sidebar does not show:
  - `Employees`
  - `Training`
  - `Payroll`
  - `Reports`
  - `Recruitment`
- Dashboard shows:
  - welcome message
  - today's schedule
  - today's attendance
  - leave balance
  - monthly bonus
- My Schedule shows weekly shift times and production line
- My Attendance shows own history only
- Leave Requests can submit annual/sick/unpaid leave
- Sick leave requires medical booklet path or URL
- Leave page shows request status and leave balance
- Profile shows employee code, employment status, department, position, line
- Profile allows phone and emergency contact updates
- Cannot access company-wide pages directly by URL

## Route Blocking Checks

- Worker cannot open:
  - `/employees`
  - `/training`
  - `/payroll`
  - `/reports`
  - `/recruitment`
- Shift Supervisor cannot open:
  - `/employees`
  - `/leave`
  - `/training`
  - `/recruitment`
- Department Head cannot open:
  - `/recruitment`
  - `/payroll`
  - `/shifts`
- Production Manager cannot open:
  - `/leave`
  - `/training`
  - `/recruitment`
- HR cannot open:
  - `/system-settings`
  - `/user-management`

## Data Checks

- Saturday attendance for permanent worker adds `2000`
- Night shift attendance adds night bonus flag
- Late after 15 minutes becomes `late`
- More than 120 minutes late becomes `absent`
- Department Head recommendation creates a row in `conversion_recommendations`
- Worker sick leave stores `medical_booklet_path`

## Known Limits

- Full runtime verification was not completed inside this environment because local Node execution is still blocked by permission issues
- Production revenue cards need real `production_daily_summaries` rows to show business data
