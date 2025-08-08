# Convertio - Modern File Converter

🚀 **Modern online file converter** powered by CloudConvert API. Convert images, videos, audio files, documents and more with a beautiful, responsive interface.

## ✨ Features

- **300+ Format Support** - Convert between 300+ file formats
- **Modern UI** - Beautiful, responsive design with progress tracking
- **Fast Conversion** - Powered by CloudConvert API
- **Secure** - Files are processed securely and deleted after conversion
- **Free** - No registration required for basic usage
- **Mobile-Friendly** - Works perfectly on all devices

## 🎯 Supported Formats

### Images
PNG, JPG, JPEG, GIF, BMP, WEBP, SVG, ICO, TIFF, PSD, AVIF

### Videos  
MP4, AVI, MOV, MKV, WMV, FLV, WEBM, 3GP, M4V

### Audio
MP3, WAV, FLAC, AAC, OGG, M4A, WMA, AIFF

### Documents
PDF, DOCX, DOC, TXT, RTF, ODT, XLSX, XLS, PPTX, PPT

### Archives
ZIP, RAR, 7Z, TAR, GZ, BZ2

## 🚀 Quick Deploy to Render

### Prerequisites
- GitHub account
- CloudConvert API key ([Get one here](https://cloudconvert.com/api/v2))

### Step-by-Step Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Render**
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name**: `convertio-app`
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm ci`
     - **Start Command**: `npm start`
     - **Instance Type**: `Free`

3. **Set Environment Variables**
   In Render dashboard, add:
   ```
   CLOUDCONVERT_KEY=your_actual_cloudconvert_api_key
   NODE_ENV=production
   ```

4. **Deploy** 🚀
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Your app will be available at: `https://your-app-name.onrender.com`

## 🔧 Local Development

```bash
# Clone and install
git clone <your-repo>
cd convertio
npm install

# Configure environment
cp .env.example .env
# Edit .env with your CloudConvert API key

# Start development server
npm run dev
# Open http://localhost:3004
```

## 📁 Project Structure

```
convertio/
├── public/           # Frontend (HTML, CSS, JS)
├── simple_server.js  # Main server file
├── package.json      # Dependencies & scripts
├── render.yaml       # Render deployment config
├── .env.example      # Environment variables template
└── .gitignore        # Git ignore rules
```

## 🛠 API Endpoints

- `GET /api/health` - Health check
- `POST /api/start-conversion` - Start file conversion
- `GET /api/conversion-status/:id` - Check conversion status

## 🔒 Security & Performance

- ✅ 100MB file size limit
- ✅ Memory-based file processing
- ✅ Auto cleanup of temporary files
- ✅ CORS protection
- ✅ Error handling & logging
- ✅ Health monitoring

## 🐛 Troubleshooting

### Common Deploy Issues

1. **Build fails**: Check Node.js version (use 18+)
2. **"CloudConvert key not configured"**: Add `CLOUDCONVERT_KEY` to environment variables
3. **File upload fails**: Check file size (<100MB) and format support

### Monitoring

Health check: `https://your-app.onrender.com/api/health`

## 💡 CloudConvert API Setup

1. Visit [cloudconvert.com/api/v2](https://cloudconvert.com/api/v2)
2. Sign up / Log in
3. Go to Dashboard → API Keys
4. Create new API key
5. Copy the key to Render environment variables

## 🎉 Ready for Production!

Your Convertio app is now:
- ✅ Deployed on Render Free tier
- ✅ Using CloudConvert for conversions
- ✅ Serving files via CDN
- ✅ Auto-scaling ready
- ✅ Mobile-optimized
- ✅ Secure and fast

**Live URL**: `https://your-app-name.onrender.com`

---

**Made with ❤️ for seamless file conversion**