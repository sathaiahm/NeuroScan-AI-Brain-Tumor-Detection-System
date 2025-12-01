# Brain Tumor Detection - Startup Scripts

## Quick Start Commands

### Local Development
```bash
# Start backend only
cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start frontend only  
cd frontend && npm start

# Start both (requires concurrently)
npm run dev
```

### Docker Deployment
```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Model Training
```bash
# Run the corrected training notebook
jupyter notebook brain-tumor-detection-corrected.ipynb

# Or run as Python script
python -c "
import subprocess
subprocess.run(['jupyter', 'nbconvert', '--execute', '--to', 'notebook', 'brain-tumor-detection-corrected.ipynb'])
"
```

### Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit with your OpenAI API key
nano .env

# Install Python dependencies
pip install -r backend/requirements.txt

# Install Node dependencies
cd frontend && npm install
```

## Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Troubleshooting
```bash
# Check if ports are available
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Check Docker containers
docker ps -a

# View container logs
docker logs <container_name>

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```
