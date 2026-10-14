Register the new profile router in `backend/src/routes/index.js`:

```js
const profileRoutes = require('./profileRoutes');
// Alongside the other router registrations:
router.use('/profile', profileRoutes);
```

The frontend calls `GET /api/profile` and `PATCH /api/profile`. Keep your existing API prefix configuration.
