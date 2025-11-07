#!/bin/bash
# Quick start script for Vercel deployment

echo "============================================"
echo "  ATC Dashboard - Vercel Deployment Setup"
echo "============================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from: visualization/web/vercel-deployment/"
    exit 1
fi

echo "✓ In correct directory"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local..."
    cp .env.example .env.local
    echo "✓ .env.local created"
else
    echo "✓ .env.local already exists"
fi
echo ""

# Test build
echo "🔨 Testing build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed - please fix errors above"
    exit 1
fi

echo "✓ Build successful"
echo ""

echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start dev server:"
echo "     npm run dev"
echo ""
echo "  2. Open browser:"
echo "     http://localhost:3000?demo=true"
echo ""
echo "  3. Deploy to Vercel:"
echo "     npx vercel --prod"
echo ""
echo "  4. Or push to GitHub and connect Vercel"
echo ""
echo "Documentation:"
echo "  • Full docs:   README.md"
echo "  • Deploy guide: DEPLOY.md"
echo "  • Summary:     SUMMARY.md"
echo ""
