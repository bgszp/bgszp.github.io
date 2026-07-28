FROM node:18-slim

# Menginstal dependensi wajib agar Google Chrome/Puppeteer bisa berjalan di Linux
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates libx11-xcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxi-dev libxtst6 libnss3 libcups2 libxss1 libxrandr2 \
    libasound2 libatk1.0-0 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 \
    libgdk-pixbuf2.0-0 libgtk-3-0 libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Menyalin informasi library
COPY package*.json ./

# Menginstal library Node.js
RUN npm install

# Menyalin semua sisa file (termasuk index.js)
COPY . .

# Menjalankan bot
CMD ["node", "index.js"]

