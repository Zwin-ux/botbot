# 🚀 Quick Deploy to Vercel

## Option 1: One-Click Deploy (Easiest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ATC)

Click the button above to deploy instantly to Vercel.

## Option 2: Manual Deploy (3 Steps)

### Step 1: Install Dependencies

```bash
cd visualization/web/vercel-deployment
npm install
```

### Step 2: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000?demo=true to see the demo.

### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Your account
- **Link to existing project**: No
- **Project name**: atc-viz-dashboard
- **Directory**: `./` (current directory)
- **Override settings**: No

Your app will be live at: `https://atc-viz-dashboard.vercel.app`

## Option 3: GitHub Integration (Recommended)

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel deployment"
   git push
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `visualization/web/vercel-deployment`
   - Click "Deploy"

3. **Auto-deploy enabled**: Every push to `main` will automatically deploy!

## Configuration

### Environment Variables

In Vercel dashboard, add these environment variables:

```
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
PYTHON_BACKEND_URL=https://your-backend.com (optional)
```

### Custom Domain

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your custom domain (e.g., `atc-dashboard.yourdomain.com`)
3. Update DNS records as instructed

## Features in Production

✅ **SSE Streaming**: Real-time aircraft updates  
✅ **Auto-reconnect**: Handles connection drops  
✅ **Demo Mode**: Works without backend  
✅ **Edge Functions**: Fast response times  
✅ **Global CDN**: Assets served from nearest location  

## Troubleshooting

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Deployment fails

Check the build logs in Vercel dashboard. Common fixes:
- Ensure all dependencies are in `package.json`
- Check that TypeScript compiles: `npm run build`
- Verify environment variables are set

### SSE stream not working

- Check browser console for errors
- Verify `/api/stream?demo=true` endpoint works
- Check Vercel function logs

## Performance Tips

1. **Enable caching**: Add ISR to static pages
2. **Optimize images**: Use Next.js Image component
3. **Code splitting**: Import heavy libraries dynamically
4. **Monitor usage**: Check Vercel Analytics

## Cost

**Free Tier Limits**:
- 100 GB bandwidth/month
- 100 GB-hours serverless execution
- Unlimited deployments

**Estimated usage** (1000 monthly users):
- Bandwidth: ~50 GB
- Functions: ~30 GB-hours
- **Cost: $0** (well within free tier)

## Next Steps

- [ ] Add authentication (Vercel Auth, Clerk, Auth0)
- [ ] Connect to real Python backend
- [ ] Add Vercel KV for historical data storage
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Add CI/CD tests before deployment

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Issues: Create an issue in your GitHub repo

---

**Need help?** Check the main [README.md](./README.md) for detailed architecture and API documentation.
