# DEPLOYMENT GUIDE — HUILERIE JEMAI ERP

This application is built for seamless deployment on **Vercel** or any standard **Node.js / Docker container** (such as Google Cloud Run).

---

## 1. Vercel Deployment (Recommended)

1. **Connect Git Repository**:
   - Push this codebase to your GitHub, GitLab, or Bitbucket account.
   - Import the repository into your Vercel Dashboard.

2. **Framework Preset**:
   - Vercel will automatically detect **Vite**.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Configure Environment Variables in Vercel**:
   In your Vercel project settings under **Settings > Environment Variables**, add:
   ```env
   VITE_SUPABASE_URL=https://vtyytslihvjmyelhahum.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_LXJ1R8X0W01sc44edNemwA_pjCRXt6j
   ```

4. **Deploy**:
   - Click **Deploy**.
   - Your application will be live with full offline caching and live Supabase synchronization.

---

## 2. Full-Stack / Node.js Deployment (Cloud Run, Railway, Render)

1. **Start Script**:
   - The project includes `server.ts` configured to run with `tsx server.ts` or `npm start`.
   - Build step: `npm run build`
   - Run command: `node server.ts` or `npm start`
   - Default Port: `3000` (or `PORT` provided by container environment).

---

## 3. Offline & PWA Usage in Mill Environment
- The app operates with an offline-first storage fallback.
- If internet connectivity drops at the mill, operators can continue recording olive weighings and production yields; data is preserved locally in browser storage and can be reconciled when connectivity resumes.
