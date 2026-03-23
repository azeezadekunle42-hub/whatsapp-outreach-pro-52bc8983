# WhatsApp Server for Render

## Deploy to Render

1. Push the `whatsapp-server/` folder to a **separate GitHub repo**
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your repo
4. Render will auto-detect `render.yaml` — or set manually:
   - **Build**: `npm install`
   - **Start**: `npm start`
   - **Plan**: Starter ($7/mo) — needs persistent disk for session
5. Add environment variable: `API_KEY` = a strong random string
6. **Add a Disk** (critical for session persistence):
   - Mount path: `/opt/render/.wwebjs_auth`
   - Size: 1 GB
7. Deploy!

## After Deploy

1. Copy your Render service URL (e.g. `https://whatsapp-server-xxxx.onrender.com`)
2. In Lovable, add it as a secret: `WHATSAPP_SERVER_URL`
3. Add your API_KEY as a secret: `WHATSAPP_API_KEY`
4. Call `POST /api/connect`, then `GET /api/status` to get the QR code
5. Scan the QR code with your phone's WhatsApp

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/status` | Connection status + QR code |
| POST | `/api/connect` | Initialize WhatsApp client |
| POST | `/api/disconnect` | Disconnect client |
| POST | `/api/send` | Send single message `{phone, message}` |
| POST | `/api/send-bulk` | Send bulk `{messages: [{phone, message}], delayMin, delayMax}` |
| GET | `/api/send-bulk/:batchId` | Check bulk progress |
| GET | `/api/replies?since=ISO` | Get recent replies |

All `/api/*` endpoints require `x-api-key` header.
