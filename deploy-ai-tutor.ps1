
# PowerShell script to deploy AI Tutor Edge Function
# This script deploys the AI Tutor to Supabase with proper configuration

Write-Host ""
Write-Host "🚀 AI Tutor Deployment Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Function to check command existence
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Step 1: Check if Supabase CLI is installed
Write-Host "📋 Step 1: Checking Supabase CLI..." -ForegroundColor Yellow
if (-not (Test-Command "supabase")) {
    Write-Host "❌ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 To install Supabase CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "   Or using Scoop (Windows):" -ForegroundColor Yellow
    Write-Host "   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "   scoop install supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Step 2: Check if user is logged in
Write-Host "📋 Step 2: Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔐 To log in, run:" -ForegroundColor Yellow
    Write-Host "   supabase login" -ForegroundColor White
    Write-Host ""
    Write-Host "   This will open your browser to authenticate." -ForegroundColor Gray
    Write-Host ""
    exit 1
}
Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Step 3: Link to project (optional but recommended)
Write-Host "📋 Step 3: Checking project link..." -ForegroundColor Yellow
$projectId = "telrerkizvtzbxjdlyoj"
Write-Host "   Project ID: $projectId" -ForegroundColor Gray

# Try to link the project (this is idempotent)
$linkResult = supabase link --project-ref $projectId 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not link project (may already be linked)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Set environment variables
Write-Host "📋 Step 4: Setting environment variables..." -ForegroundColor Yellow
Write-Host ""

# Set GEMINI_API_KEY
Write-Host "   Setting GEMINI_API_KEY..." -ForegroundColor Cyan
$geminiResult = supabase secrets set GEMINI_API_KEY="AIzaSyBkxoU5csoLPsrnpkKpwy9X5Xw5gtu4PUo" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ GEMINI_API_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Warning: Could not set GEMINI_API_KEY via CLI" -ForegroundColor Yellow
    Write-Host "   Please set it manually in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   1. Go to Project Settings → Edge Functions" -ForegroundColor White
    Write-Host "   2. Add secret: GEMINI_API_KEY = AIzaSyBkxoU5csoLPsrnpkKpwy9X5Xw5gtu4PUo" -ForegroundColor White
}
Write-Host ""

# Set SUPABASE_SERVICE_ROLE_KEY
Write-Host "   Setting SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Cyan
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHJlcmtpenZ0emJ4amRseW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU1Nzg4NywiZXhwIjoyMDczMTMzODg3fQ.HkMiau2ZNlGrQUD8CKMYtCy5ythAIvY6ms96AH7wf78"
$serviceRoleResult = supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceRoleKey" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ SUPABASE_SERVICE_ROLE_KEY set successfully" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Warning: Could not set SUPABASE_SERVICE_ROLE_KEY via CLI" -ForegroundColor Yellow
    Write-Host "   Please set it manually in Supabase Dashboard" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Verify edge function file exists
Write-Host "📋 Step 5: Verifying edge function files..." -ForegroundColor Yellow
$functionPath = "supabase/functions/ai-tutor/index.ts"
if (Test-Path $functionPath) {
    Write-Host "✅ Edge function file found: $functionPath" -ForegroundColor Green
} else {
    Write-Host "❌ Edge function file not found: $functionPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please ensure the file exists before deploying." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host ""

# Step 6: Deploy the function
Write-Host "📋 Step 6: Deploying ai-tutor function..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   This may take a minute..." -ForegroundColor Gray
Write-Host ""

# Deploy without JWT verification (public mode)
$deployResult = supabase functions deploy ai-tutor --no-verify-jwt 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🎉 Your AI Tutor is now live!" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Open your Student Buddy app" -ForegroundColor White
    Write-Host "   2. Navigate to AI Tutor" -ForegroundColor White
    Write-Host "   3. Try asking a question or uploading a document" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Function URL:" -ForegroundColor Yellow
    Write-Host "   https://telrerkizvtzbxjdlyoj.supabase.co/functions/v1/ai-tutor" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Useful commands:" -ForegroundColor Yellow
    Write-Host "   View logs:    supabase functions logs ai-tutor" -ForegroundColor White
    Write-Host "   Test locally: supabase functions serve ai-tutor" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "   - The function is in public mode (no authentication required)" -ForegroundColor Gray
    Write-Host "   - You can ask questions or upload documents for analysis" -ForegroundColor Gray
    Write-Host "   - The AI will generate summaries, key points, and quizzes" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Error details:" -ForegroundColor Yellow
    Write-Host $deployResult -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check that you're logged in: supabase login" -ForegroundColor White
    Write-Host "   2. Verify project link: supabase link --project-ref $projectId" -ForegroundColor White
    Write-Host "   3. Check function file exists: $functionPath" -ForegroundColor White
    Write-Host "   4. Try deploying manually: supabase functions deploy ai-tutor --no-verify-jwt" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 For more help, visit:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/docs/guides/functions" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
