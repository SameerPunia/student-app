
#!/bin/bash

echo "🚀 Deploying AI Tutor Edge Function"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "📦 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "🔐 Please run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Set the API key
echo "🔑 Setting GEMINI_API_KEY..."
supabase secrets set GEMINI_API_KEY=AIzaSyBkxoU5csoLPsrnpkKpwy9X5Xw5gtu4PUo

if [ $? -eq 0 ]; then
    echo "✅ API key set successfully"
else
    echo "⚠️  Warning: Could not set API key via CLI"
    echo "   Please set it manually in the Supabase dashboard"
fi

echo ""

# Deploy the function
echo "📤 Deploying ai-tutor function..."
supabase functions deploy ai-tutor

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your AI Tutor is now live!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open your app"
    echo "   2. Navigate to AI Tutor"
    echo "   3. Try asking a question"
    echo ""
    echo "📊 View logs with: supabase functions logs ai-tutor"
else
    echo ""
    echo "❌ Deployment failed"
    echo "   Please check the error messages above"
    exit 1
fi
