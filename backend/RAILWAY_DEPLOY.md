# Railway Backend Setup

## Start Command

Use:

```bash
npm start
```

## Required Environment Variables

Set these in Railway:

```env
PORT=5000
JWT_SECRET=your-strong-secret
JWT_EXPIRE=7d
```

For MySQL, this backend supports either:

### Option 1: connection URL

```env
DATABASE_URL=mysql://user:password@host:3306/database
```

### Option 2: Railway MySQL plugin variables

These are detected automatically if Railway provides them:

```env
MYSQLHOST
MYSQLPORT
MYSQLDATABASE
MYSQLUSER
MYSQLPASSWORD
MYSQL_URL
```

### Optional

```env
DB_SSL=false
```

Set `DB_SSL=true` only if your MySQL connection requires SSL.

## Notes

- Railway will provide `PORT` automatically in many cases, but keeping it set is fine.
- This backend already reads `process.env.PORT`.
- The server syncs only a few standalone tables on startup:
  - `complaints`
  - `system_settings`
  - `conversion_recommendations`
- Run your SQL manually first for any extra tables you created, such as:
  - `production_daily_summaries`

## Important File Storage Note

The current profile metadata logic writes to a local file in the backend container.
That works for development, but Railway filesystem storage is not a durable database.

For production, the safer long-term improvement is to move profile meta fields such as phone number into the database instead of local JSON file storage.
