# Railway Frontend Setup

## Build Command

```bash
npm run build
```

## Start Command

If you deploy the React app as a static site on Railway, use Railway's static hosting setup.

If you deploy it as a Node-served frontend separately, you will need a static file server.

## Required Environment Variable

Set this in Railway for the frontend service:

```env
REACT_APP_API_URL=https://your-backend-domain.up.railway.app/api
```

## Frontend API Behavior

The frontend now resolves the API base URL like this:

1. `REACT_APP_API_URL` if provided
2. `http://localhost:5000/api` in local development
3. `${window.location.origin}/api` in production if no env variable is set

## Recommended Railway Setup

Use two services:

- `backend`
- `frontend`

Set:

- frontend `REACT_APP_API_URL` to your Railway backend public URL plus `/api`
- backend `JWT_SECRET`, `JWT_EXPIRE`, and database variables

## Example

```env
REACT_APP_API_URL=https://nayafood-ems-backend.up.railway.app/api
```

## Important

After changing `REACT_APP_API_URL`, redeploy the frontend so the build picks up the new value.
