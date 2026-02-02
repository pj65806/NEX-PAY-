# Deployment Checklist & Production Readiness

## 🔍 Pre-Deployment Verification

### Code Quality
- [ ] All linting issues resolved
- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] No console.log statements in production code
- [ ] Error handling comprehensive
- [ ] No hardcoded secrets in code

### Security
- [ ] JWT secrets are strong (32+ characters)
- [ ] Database passwords are strong
- [ ] CORS origin list is restricted
- [ ] Rate limiting is configured
- [ ] HTTPS enabled in production
- [ ] Helmet security headers active
- [ ] Environment variables all set
- [ ] No SQL injection vulnerabilities
- [ ] Input validation on all endpoints
- [ ] CSRF protection configured

### Database
- [ ] MongoDB connection pooling configured
- [ ] All indexes created
- [ ] Database backups automated
- [ ] Database password strong
- [ ] Database access restricted by IP
- [ ] MongoDB Compass or similar for monitoring

### Redis
- [ ] Redis cluster setup (if needed)
- [ ] Redis password configured
- [ ] Redis persistence enabled
- [ ] Memory limit set appropriately
- [ ] Eviction policy configured (allkeys-lru)
- [ ] Redis monitoring setup

### Infrastructure
- [ ] Server sizing appropriate for load
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Load balancing setup (if needed)
- [ ] Auto-scaling configured (if needed)
- [ ] Monitoring and alerting setup
- [ ] Log aggregation configured
- [ ] CDN configured (if needed)

### API Configuration
- [ ] Base URL updated for production
- [ ] API rate limits appropriate
- [ ] Payment limits set correctly
- [ ] Transaction timeouts configured
- [ ] Fee structures finalized
- [ ] Currency support verified
- [ ] Time zones handled correctly

---

## 📋 Environment Variables Checklist

### Required Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT` set correctly
- [ ] `MONGODB_URI` pointing to production DB
- [ ] `REDIS_HOST` and `REDIS_PORT` configured
- [ ] `JWT_SECRET` (32+ character strong key)
- [ ] `JWT_REFRESH_SECRET` (32+ character strong key)
- [ ] `ENCRYPTION_KEY` (32+ character strong key)
- [ ] `BLOCKCHAIN_NETWORK` set (mainnet/testnet)
- [ ] `INFURA_PROJECT_ID` configured
- [ ] `CORS_ORIGIN` restricted to your domains

### Optional but Recommended
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for emails)
- [ ] `SMS_API_KEY` (for 2FA/notifications)
- [ ] `LOG_LEVEL` set to `info` or `warn`
- [ ] `LOG_FILE` path configured

---

## 🗄️ Database Migration Checklist

### Before First Deploy
- [ ] Create MongoDB database
- [ ] Create database user with minimal required permissions
- [ ] Create all collections (auto-created by Mongoose)
- [ ] Verify all indexes created
- [ ] Test backup/restore process
- [ ] Setup automated backups

### Database Maintenance
- [ ] Regular backup schedule (daily minimum)
- [ ] Test restores from backups
- [ ] Monitor disk space
- [ ] Monitor query performance
- [ ] Setup slow query logging
- [ ] Monitor connection pool

---

## 🚀 Deployment Steps

### Step 1: Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install MongoDB (if local)
sudo apt install -y mongodb

# Install Redis (if local)
sudo apt install -y redis-server
```

### Step 2: Clone Repository
```bash
git clone <repository-url> /var/www/nexpay-backend
cd /var/www/nexpay-backend
```

### Step 3: Install Dependencies
```bash
npm ci --production  # Use ci instead of install for production
```

### Step 4: Configure Environment
```bash
cp .env.example .env
# Edit .env with production values
nano .env
```

### Step 5: Build Smart Contracts (if needed)
```bash
npm run compile-contracts
npm run deploy-contracts
```

### Step 6: Start Application
```bash
# Using PM2 for process management
pm2 start src/index.js --name "nexpay-backend"
pm2 startup
pm2 save

# Or using systemd
sudo systemctl enable nexpay-backend
sudo systemctl start nexpay-backend
```

### Step 7: Setup Reverse Proxy (Nginx)
```bash
# Install Nginx
sudo apt install -y nginx

# Create config file
sudo nano /etc/nginx/sites-available/nexpay-backend

# Add configuration:
```
```nginx
server {
    listen 80;
    server_name api.nexpay.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/nexpay-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Setup SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d api.nexpay.com

# Auto-renew setup (automatic with certbot)
sudo certbot renew --dry-run
```

### Step 9: Setup Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# View logs
pm2 logs nexpay-backend
```

---

## 📊 Post-Deployment Verification

### Health Checks
- [ ] Server running and accessible
- [ ] Health check endpoint responding (GET /health)
- [ ] Auth endpoints working
- [ ] Payment endpoints accessible
- [ ] Admin endpoints secured
- [ ] All routes returning proper responses

### Data Verification
- [ ] Database connected and accessible
- [ ] Redis connected and working
- [ ] Sample transactions complete successfully
- [ ] Logs being written
- [ ] Monitoring data being collected

### Security Verification
- [ ] HTTPS enabled and certificate valid
- [ ] CORS headers correct
- [ ] Rate limiting working
- [ ] Invalid requests rejected properly
- [ ] Auth tokens working
- [ ] Admin routes protected

### Performance Verification
- [ ] Response times acceptable (< 200ms)
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Database queries optimized
- [ ] Cache working
- [ ] Load testing passed

---

## 🔄 Monitoring & Maintenance

### Daily Tasks
- [ ] Check application logs for errors
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify backups completed
- [ ] Check server health

### Weekly Tasks
- [ ] Review security logs
- [ ] Check for updates
- [ ] Performance analysis
- [ ] Backup verification
- [ ] Capacity planning

### Monthly Tasks
- [ ] Security audit
- [ ] Database optimization
- [ ] Log analysis
- [ ] Compliance review
- [ ] Disaster recovery drill

---

## 🚨 Rollback Plan

### If Issues Arise
1. **Immediate**: Revert to previous version using git
2. **Database**: Restore from backup if data corrupted
3. **Configuration**: Verify all env variables
4. **Logs**: Check application and system logs
5. **Communication**: Notify stakeholders

### Rollback Commands
```bash
# Revert code
git revert HEAD

# Restart application
pm2 restart nexpay-backend

# Check status
pm2 status
pm2 logs nexpay-backend

# If database rollback needed
mongorestore <backup-path>
```

---

## 📞 Contacts & Escalation

### On-Call Support
- Primary: [Name] - [Phone/Email]
- Secondary: [Name] - [Phone/Email]
- Database Admin: [Name] - [Phone/Email]

### External Vendors
- MongoDB Atlas Support: [Contact]
- Cloud Provider Support: [Contact]
- Security Provider: [Contact]

---

## 📝 Documentation Updates

After deployment, update:
- [ ] API documentation with production URLs
- [ ] Deployment runbook
- [ ] Architecture documentation
- [ ] Security documentation
- [ ] Disaster recovery plan

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All endpoints responding correctly
- ✅ No errors in logs
- ✅ All tests passing
- ✅ Performance meets SLA
- ✅ Security audit passed
- ✅ Team trained and prepared
- ✅ Monitoring alerts configured
- ✅ Backup/restore tested

---

## 📌 Important Reminders

1. **Never** hardcode secrets in code
2. **Always** test in staging first
3. **Always** have a rollback plan
4. **Always** backup data before major changes
5. **Always** monitor after deployment
6. **Document** any changes made
7. **Keep** team informed of status
8. **Test** disaster recovery regularly

---

## 🎉 Deployment Complete!

Once all items are checked, you're ready for production!
