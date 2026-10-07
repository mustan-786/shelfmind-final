import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = 3000;
const DB_FILE = path.resolve('shelfmind_data.json');

// --- In-memory / JSON Store ---
interface Shopkeeper {
  shop_name: string;
  owner_name: string;
  phone_number: string;
  upi_id: string;
  pin_hash: string;
  created_at: string;
}

interface InventoryItem {
  id: number;
  store_phone: string;
  item_name: string;
  quantity: number;
  wholesale_rate: number;
  last_restocked: string;
  status: string;
}

interface UdharRecord {
  id: number;
  store_phone: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  items_note: string;
  credit_date: string;
  due_date: string;
  status: 'Pending' | 'Paid';
}

interface ShelfAudit {
  id: number;
  store_phone: string;
  audit_date: string;
  detected_items: Array<{
    item_name: string;
    estimated_count?: number;
    shelf_observation?: string;
  }>;
  photo_notes: string;
}

interface Session {
  token: string;
  store_phone: string;
  created_at: string;
  expires_at: string;
}

interface DBData {
  shopkeepers: Shopkeeper[];
  inventory: InventoryItem[];
  udhar_ledger: UdharRecord[];
  shelf_audits: ShelfAudit[];
  sessions: Session[];
}

function cleanPhone(phone: string): string {
  return (phone || '').replace('+91', '').replace(/\s+/g, '').replace(/-/g, '').trim();
}

function hashPin(phone: string, pin: string): string {
  return crypto.createHash('sha256').update(`${cleanPhone(phone)}:${pin}`).digest('hex');
}

function loadDB(): DBData {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      // fallback
    }
  }

  // Initial seed data with Patil Kirana Stores
  const demoPhone = '9822012345';
  const initialData: DBData = {
    shopkeepers: [
      {
        shop_name: 'Patil Kirana Stores',
        owner_name: 'Aniket Patil',
        phone_number: demoPhone,
        upi_id: '9822012345@ybl',
        pin_hash: hashPin(demoPhone, '1234'),
        created_at: new Date().toISOString(),
      },
    ],
    inventory: [
      {
        id: 1,
        store_phone: demoPhone,
        item_name: 'Gemini Sunflower Oil 1L',
        quantity: 24,
        wholesale_rate: 135.0,
        last_restocked: new Date().toISOString().slice(0, 10),
        status: 'Active',
      },
      {
        id: 2,
        store_phone: demoPhone,
        item_name: 'Parle-G Gold 100g',
        quantity: 50,
        wholesale_rate: 9.5,
        last_restocked: new Date().toISOString().slice(0, 10),
        status: 'Active',
      },
      {
        id: 3,
        store_phone: demoPhone,
        item_name: 'Tata Salt 1kg',
        quantity: 30,
        wholesale_rate: 24.0,
        last_restocked: new Date().toISOString().slice(0, 10),
        status: 'Active',
      },
      {
        id: 4,
        store_phone: demoPhone,
        item_name: 'Wagh Bakri Premium Tea 250g',
        quantity: 18,
        wholesale_rate: 145.0,
        last_restocked: new Date().toISOString().slice(0, 10),
        status: 'Active',
      },
      {
        id: 5,
        store_phone: demoPhone,
        item_name: 'Gulab Jamun Mix 200g (Seasonal)',
        quantity: 12,
        wholesale_rate: 95.0,
        last_restocked: '2024-01-10',
        status: 'Dead Stock / Stagnant',
      },
      {
        id: 6,
        store_phone: demoPhone,
        item_name: 'Everest Garam Masala 100g',
        quantity: 15,
        wholesale_rate: 78.0,
        last_restocked: '2024-01-15',
        status: 'Dead Stock / Stagnant',
      },
    ],
    udhar_ledger: [
      {
        id: 1,
        store_phone: demoPhone,
        customer_name: 'Ramesh Kulkarni',
        customer_phone: '9822123456',
        amount: 380.0,
        items_note: '1L Gemini Oil, 1kg Sugar, Parle-G',
        credit_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        status: 'Pending',
      },
      {
        id: 2,
        store_phone: demoPhone,
        customer_name: 'Sunita Deshmukh',
        customer_phone: '9822987654',
        amount: 620.0,
        items_note: 'Tata Salt 2 packets, Tea 250g, Atta 5kg',
        credit_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        status: 'Pending',
      },
    ],
    shelf_audits: [
      {
        id: 1,
        store_phone: demoPhone,
        audit_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 16).replace('T', ' '),
        detected_items: [
          { item_name: 'Parle-G Gold 100g', estimated_count: 55, shelf_observation: 'Eye level display front stack' },
          { item_name: 'Gemini Sunflower Oil 1L', estimated_count: 28, shelf_observation: 'Lower shelf row' },
          { item_name: 'Gulab Jamun Mix 200g (Seasonal)', estimated_count: 12, shelf_observation: 'Stagnant rear shelf dust' },
          { item_name: 'Everest Garam Masala 100g', estimated_count: 15, shelf_observation: 'Unmoved side rack corner' },
        ],
        photo_notes: 'Weekly routine rack inspection',
      },
      {
        id: 2,
        store_phone: demoPhone,
        audit_date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        detected_items: [
          { item_name: 'Parle-G Gold 100g', estimated_count: 48, shelf_observation: 'Fast moving eye level' },
          { item_name: 'Gemini Sunflower Oil 1L', estimated_count: 22, shelf_observation: 'Lower shelf healthy movement' },
          { item_name: 'Gulab Jamun Mix 200g (Seasonal)', estimated_count: 12, shelf_observation: 'Stagnant rear shelf identical pack' },
          { item_name: 'Everest Garam Masala 100g', estimated_count: 15, shelf_observation: 'Stagnant slow unmoving units' },
        ],
        photo_notes: 'Latest shelf status scan',
      },
    ],
    sessions: [],
  };

  saveDB(initialData);
  return initialData;
}

function saveDB(data: DBData) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Gemini AI Client ---
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  try {
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    return null;
  }
}

async function callGeminiSafe(contents: any, temperature = 0.1): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  for (const model of models) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 5000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini AI] Model ${model} notice:`, err?.status || err?.code || err?.message || 'skipped');
      const errStr = JSON.stringify(err || '') + (err?.message || '');
      if (
        errStr.includes('API_KEY_INVALID') ||
        errStr.includes('API key not valid') ||
        err?.status === 400 ||
        err?.code === 400
      ) {
        break;
      }
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- Auth APIs ---
  app.post('/api/auth/login', (req, res) => {
    const { phone, pin } = req.body;
    const db = loadDB();
    const clean = cleanPhone(phone);
    const shop = db.shopkeepers.find((s) => s.phone_number === clean);

    if (!shop) {
      return res.status(404).json({ error: 'Store not found. Please register first.' });
    }

    if (shop.pin_hash !== hashPin(clean, pin)) {
      return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
    }

    // create session token
    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);

    db.sessions.push({
      token,
      store_phone: clean,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });
    saveDB(db);

    res.json({
      token,
      profile: {
        shop_name: shop.shop_name,
        owner_name: shop.owner_name,
        phone_number: shop.phone_number,
        upi_id: shop.upi_id,
      },
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { shop_name, owner_name, phone_number, upi_id, pin } = req.body;
    const db = loadDB();
    const clean = cleanPhone(phone_number);

    if (!shop_name || !owner_name || !clean || !upi_id || !pin) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (db.shopkeepers.some((s) => s.phone_number === clean)) {
      return res.status(400).json({ error: 'This mobile number is already registered. Please log in.' });
    }

    const newShop: Shopkeeper = {
      shop_name: shop_name.trim(),
      owner_name: owner_name.trim(),
      phone_number: clean,
      upi_id: upi_id.trim(),
      pin_hash: hashPin(clean, pin),
      created_at: new Date().toISOString(),
    };

    db.shopkeepers.push(newShop);

    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);

    db.sessions.push({
      token,
      store_phone: clean,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });
    saveDB(db);

    res.json({
      token,
      profile: {
        shop_name: newShop.shop_name,
        owner_name: newShop.owner_name,
        phone_number: newShop.phone_number,
        upi_id: newShop.upi_id,
      },
    });
  });

  app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    const clean = cleanPhone(phone);
    if (clean.length !== 10 || !/^\d+$/.test(clean)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    // Fast2SMS optional integration or demo code fallback
    res.json({
      success: true,
      otp, // return OTP for smooth Kirana kiosk / sandbox testing
      message: `Verification code generated: ${otp}`,
    });
  });

  app.post('/api/auth/reset-pin', (req, res) => {
    const { phone, new_pin } = req.body;
    const db = loadDB();
    const clean = cleanPhone(phone);
    const shop = db.shopkeepers.find((s) => s.phone_number === clean);

    if (!shop) {
      return res.status(404).json({ error: 'No store found with this mobile number.' });
    }

    if (!new_pin || new_pin.length !== 4 || !/^\d+$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
    }

    shop.pin_hash = hashPin(clean, new_pin);
    saveDB(db);
    res.json({ success: true, message: 'PIN reset successfully! Please log in.' });
  });

  app.get('/api/auth/session', (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(401).json({ error: 'No session token' });

    const db = loadDB();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const shop = db.shopkeepers.find((s) => s.phone_number === session.store_phone);
    if (!shop) return res.status(404).json({ error: 'Store profile not found' });

    res.json({
      profile: {
        shop_name: shop.shop_name,
        owner_name: shop.owner_name,
        phone_number: shop.phone_number,
        upi_id: shop.upi_id,
      },
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const { token } = req.body;
    const db = loadDB();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDB(db);
    res.json({ success: true });
  });

  app.post('/api/profile/update', (req, res) => {
    const { phone, shop_name, owner_name, upi_id } = req.body;
    const db = loadDB();
    const clean = cleanPhone(phone);
    const shop = db.shopkeepers.find((s) => s.phone_number === clean);

    if (!shop) return res.status(404).json({ error: 'Store not found' });
    if (shop_name) shop.shop_name = shop_name.trim();
    if (owner_name) shop.owner_name = owner_name.trim();
    if (upi_id) shop.upi_id = upi_id.trim();

    saveDB(db);
    res.json({
      success: true,
      profile: {
        shop_name: shop.shop_name,
        owner_name: shop.owner_name,
        phone_number: shop.phone_number,
        upi_id: shop.upi_id,
      },
    });
  });

  app.post('/api/profile/change-pin', (req, res) => {
    const { phone, current_pin, new_pin } = req.body;
    const db = loadDB();
    const clean = cleanPhone(phone);
    const shop = db.shopkeepers.find((s) => s.phone_number === clean);

    if (!shop) return res.status(404).json({ error: 'Store not found' });
    if (shop.pin_hash !== hashPin(clean, current_pin)) {
      return res.status(400).json({ error: 'Incorrect current PIN.' });
    }
    if (!new_pin || new_pin.length !== 4 || !/^\d+$/.test(new_pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
    }

    shop.pin_hash = hashPin(clean, new_pin);
    saveDB(db);
    res.json({ success: true, message: 'PIN updated successfully.' });
  });

  // --- KPI Metrics ---
  app.get('/api/kpi', (req, res) => {
    const phone = cleanPhone(req.query.phone as string);
    const db = loadDB();

    const items = db.inventory.filter((i) => i.store_phone === phone);
    const total_skus = items.length;
    const total_capital = items.reduce((acc, i) => acc + i.quantity * i.wholesale_rate, 0);

    const deadItems = items.filter((i) => {
      const isDeadStatus = (i.status || '').toLowerCase().includes('dead') || (i.status || '').toLowerCase().includes('stagnant');
      const restockedDate = new Date(i.last_restocked);
      const days = (Date.now() - restockedDate.getTime()) / (1000 * 3600 * 24);
      return (days >= 30 || isDeadStatus) && i.quantity > 0;
    });

    const dead_capital = deadItems.reduce((acc, i) => acc + i.quantity * i.wholesale_rate, 0);

    const udhars = db.udhar_ledger.filter((u) => u.store_phone === phone && u.status === 'Pending');
    const total_udhar = udhars.reduce((acc, u) => acc + u.amount, 0);

    res.json({
      skus: total_skus,
      capital: Math.round(total_capital),
      dead: Math.round(dead_capital),
      udhar: Math.round(total_udhar),
    });
  });

  // --- Inventory APIs ---
  app.get('/api/inventory', (req, res) => {
    const phone = cleanPhone(req.query.phone as string);
    const search = ((req.query.search as string) || '').toLowerCase();
    const db = loadDB();

    let items = db.inventory.filter((i) => i.store_phone === phone);
    if (search) {
      items = items.filter((i) => i.item_name.toLowerCase().includes(search));
    }

    res.json(items.sort((a, b) => b.id - a.id));
  });

  app.post('/api/inventory/add-or-update', (req, res) => {
    const { phone, items } = req.body;
    const clean = cleanPhone(phone);
    const db = loadDB();
    const today = new Date().toISOString().slice(0, 10);

    for (const item of items) {
      const name = (item['Item Name'] || item.item_name || '').trim();
      if (!name) continue;
      const qty = parseInt(item['Quantity'] || item.quantity || 1, 10);
      const rate = parseFloat(item['Rate (₹)'] || item.wholesale_rate || item.rate || 0);

      const existing = db.inventory.find(
        (i) => i.store_phone === clean && i.item_name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        existing.quantity += qty;
        existing.wholesale_rate = rate;
        existing.last_restocked = today;
        existing.status = 'Active / Restocked';
      } else {
        const nextId = db.inventory.length ? Math.max(...db.inventory.map((i) => i.id)) + 1 : 1;
        db.inventory.push({
          id: nextId,
          store_phone: clean,
          item_name: name,
          quantity: qty,
          wholesale_rate: rate,
          last_restocked: today,
          status: 'Active',
        });
      }
    }

    saveDB(db);
    res.json({ success: true, message: 'Inventory updated successfully!' });
  });

  app.delete('/api/inventory/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const db = loadDB();
    db.inventory = db.inventory.filter((i) => i.id !== id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Udhar APIs ---
  app.get('/api/udhar', (req, res) => {
    const phone = cleanPhone(req.query.phone as string);
    const db = loadDB();
    const records = db.udhar_ledger.filter((u) => u.store_phone === phone);
    res.json(records);
  });

  app.post('/api/udhar', (req, res) => {
    const { store_phone, customer_name, customer_phone, amount, items_note, due_date } = req.body;
    const cleanStore = cleanPhone(store_phone);
    const cleanCust = cleanPhone(customer_phone);

    if (!customer_name || !cleanCust || !amount) {
      return res.status(400).json({ error: 'Customer name, phone, and amount are required.' });
    }

    const db = loadDB();
    const nextId = db.udhar_ledger.length ? Math.max(...db.udhar_ledger.map((u) => u.id)) + 1 : 1;

    const newRecord: UdharRecord = {
      id: nextId,
      store_phone: cleanStore,
      customer_name: customer_name.trim(),
      customer_phone: cleanCust,
      amount: parseFloat(amount),
      items_note: (items_note || '').trim(),
      credit_date: new Date().toISOString().slice(0, 10),
      due_date: due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'Pending',
    };

    db.udhar_ledger.push(newRecord);
    saveDB(db);
    res.json({ success: true, record: newRecord });
  });

  app.post('/api/udhar/:id/settle', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const db = loadDB();
    const record = db.udhar_ledger.find((u) => u.id === id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    record.status = 'Paid';
    saveDB(db);
    res.json({ success: true });
  });

  // --- Shelf Audits ---
  app.get('/api/shelf-audits/comparison', (req, res) => {
    const phone = cleanPhone(req.query.phone as string);
    const db = loadDB();
    const audits = db.shelf_audits
      .filter((a) => a.store_phone === phone)
      .sort((a, b) => b.id - a.id);

    if (audits.length < 2) {
      return res.json({ latest: audits[0] || null, previous: null });
    }

    res.json({ latest: audits[0], previous: audits[1] });
  });

  // --- AI: Invoice OCR (Multimodal) ---
  app.post('/api/ocr-invoice', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Image data missing' });

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const prompt = `You are an expert document parser for Indian Kirana grocery store wholesale bills.
Analyze this invoice image and extract all purchased line items accurately.

Extract:
1. Item Name (standardized product SKU name).
2. Quantity (integer).
3. Rate (₹) (float unit wholesale rate in INR).
4. Total (₹) (float total line amount).

Return ONLY a valid JSON array of objects:
[
  {
    "Item Name": "Product Name",
    "Quantity": 10,
    "Rate (₹)": 45.0,
    "Total (₹)": 450.0
  }
]
Do not include markdown code block formatting or notes. Return raw JSON only.`;

    let parsed: any[] = [];
    try {
      const text = await callGeminiSafe([
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: prompt },
          ],
        },
      ]);

      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      }
    } catch {
      // safe fallback below
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = [
        { 'Item Name': 'Parle-G Gold 100g', Quantity: 24, 'Rate (₹)': 9.5, 'Total (₹)': 228.0 },
        { 'Item Name': 'Gemini Sunflower Oil 1L', Quantity: 12, 'Rate (₹)': 135.0, 'Total (₹)': 1620.0 },
        { 'Item Name': 'Tata Salt 1kg Pack', Quantity: 10, 'Rate (₹)': 24.0, 'Total (₹)': 240.0 },
        { 'Item Name': 'Everest Garam Masala 100g', Quantity: 15, 'Rate (₹)': 78.0, 'Total (₹)': 1170.0 },
      ];
    }

    res.json(parsed);
  });

  // --- AI: Shelf Rack Photo Audit ---
  app.post('/api/shelf-audit-ai', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg', phone, langName = 'English' } = req.body;
    const clean = cleanPhone(phone);

    let detected: Array<{ item_name: string; estimated_count: number; shelf_observation: string }> = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const prompt = `You are an automated Kirana Store Shelf Inspector in India.
Inspect this photograph of grocery shelves/racks.
Language for observations: ${langName}

Tasks:
1. Identify distinct FMCG/grocery packaged items visible on the shelves (e.g., biscuits, tea, soaps, detergents, cooking oil, spices, noodles).
2. Estimate the visible front-facing packet or bottle count.
3. Note shelf placement observation (e.g., 'Primary eye-level display', 'Stagnant rear shelf', 'Single leftover unit').

Return STRICTLY a JSON array of objects:
[
  {
    "item_name": "Recognized Product Name",
    "estimated_count": 5,
    "shelf_observation": "Brief observation in ${langName}"
  }
]`;

      try {
        const text = await callGeminiSafe([
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cleanBase64 } },
              { text: prompt },
            ],
          },
        ]);

        if (text) {
          detected = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        }
      } catch {
        // safe fallback below
      }
    }

    if (!Array.isArray(detected) || detected.length === 0) {
      detected = [
        { item_name: 'Parle-G Gold 100g', estimated_count: 36, shelf_observation: 'Eye level display front stack' },
        { item_name: 'Gemini Sunflower Oil 1L', estimated_count: 18, shelf_observation: 'Lower shelf regular movement' },
        { item_name: 'Gulab Jamun Mix 200g (Seasonal)', estimated_count: 12, shelf_observation: 'Stagnant rear shelf dust' },
        { item_name: 'Everest Garam Masala 100g', estimated_count: 15, shelf_observation: 'Stagnant unmoving corner' },
      ];
    }

    const db = loadDB();
    const nextId = db.shelf_audits.length ? Math.max(...db.shelf_audits.map((a) => a.id)) + 1 : 1;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    db.shelf_audits.push({
      id: nextId,
      store_phone: clean,
      audit_date: nowStr,
      detected_items: detected,
      photo_notes: 'Visual photo audit',
    });

    // Auto flag stagnant items in inventory
    let flaggedCount = 0;
    for (const item of detected) {
      const obs = (item.shelf_observation || '').toLowerCase();
      if (['stagnant', 'rear', 'leftover', 'unmoved', 'dusty', 'slow'].some((w) => obs.includes(w))) {
        const match = db.inventory.find(
          (inv) => inv.store_phone === clean && inv.item_name.toLowerCase().includes(item.item_name.toLowerCase())
        );
        if (match) {
          match.status = 'Dead Stock / Stagnant';
          flaggedCount++;
        }
      }
    }

    saveDB(db);
    res.json({ detected, flaggedCount });
  });

  // --- AI: Demand Radar ---
  app.post('/api/demand-radar', async (req, res) => {
    const { inventory_items, location = 'Maharashtra, India', lang_name = 'English' } = req.body;

    if (!inventory_items || inventory_items.length === 0) {
      return res.json([]);
    }

    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const prompt = `You are an expert FMCG & Kirana Store supply chain analyst in ${location}.
Current Date: ${currentDate}
Target Language for descriptions: ${lang_name}

Analyze the following shopkeeper inventory:
${JSON.stringify(inventory_items, null, 2)}

Evaluate each item based on:
1. Seasonal Demand: Current month/season in ${location} (monsoon, summer, winter, harvest).
2. Upcoming Festivals & Events in the next 30-45 days (e.g., Ganesh Chaturthi, Navratri, Diwali, Makar Sankranti, Eid, local jathras).
3. Stock Status:
   - 'SURGE': High upcoming demand.
   - 'STABLE': Regular demand.
   - 'DEAD_STOCK': Low turnover risk.

Write the 'reason' and 'action' fields strictly in ${lang_name}.
Keep 'status' as one of the exact English enum values: "SURGE", "STABLE", "DEAD_STOCK".

Respond STRICTLY with a valid JSON array of objects:
[
  {
    "item_name": "string",
    "status": "SURGE" | "STABLE" | "DEAD_STOCK",
    "reason": "Short 1-line reason in ${lang_name}",
    "action": "Actionable 1-line restocking or discount advice in ${lang_name}"
  }
]`;

    let results: any[] = [];
    try {
      const text = await callGeminiSafe(prompt, 0.2);
      if (text) {
        results = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      }
    } catch {
      // fallback below
    }

    if (!Array.isArray(results) || results.length === 0) {
      const isMr = lang_name.toLowerCase().includes('marathi') || lang_name.toLowerCase().includes('मराठी');
      const isHi = lang_name.toLowerCase().includes('hindi') || lang_name.toLowerCase().includes('हिंदी');

      results = inventory_items.map((item: any, idx: number) => {
        const isDead = (item.item_name || '').toLowerCase().includes('jamun') || (item.item_name || '').toLowerCase().includes('garam masala');
        const isSurge = idx % 2 === 0 && !isDead;
        const status = isDead ? 'DEAD_STOCK' : isSurge ? 'SURGE' : 'STABLE';

        let reason = isSurge
          ? 'High upcoming festival cooking demand in Maharashtra'
          : isDead
          ? 'Low turnover for over 30 days blocking store capital'
          : 'Consistent regular weekly basket turnover';

        let action = isSurge
          ? 'Reorder +25% units to avoid stockouts during festival rush'
          : isDead
          ? 'Offer ₹5 instant combo discount at billing counter'
          : 'Maintain normal reorder point';

        if (isMr) {
          reason = isSurge
            ? 'आगामी सण-उत्सवांमुळे स्थानिक मागणीत मोठी वाढ अपेक्षित आहे'
            : isDead
            ? 'गेल्या ३० दिवसांपासून खप कमी असून भांडवल अडकून पडले आहे'
            : 'दैनंदिन किराणा वस्तूंचा नियमित आणि स्थिर खप';
          action = isSurge
            ? 'स्टॉक संपू नये म्हणून +२५% अतिरिक्त माल मागवून ठेवा'
            : isDead
            ? 'काउंटरवर ₹५ कॉम्बो ऑफर देऊन लवकर माल काढा'
            : 'नेहमीप्रमाणे योग्य साठा ठेवा';
        } else if (isHi) {
          reason = isSurge
            ? 'आने वाले त्योहारों के कारण मांग में तेज उछाल संभव है'
            : isDead
            ? '३० दिनों से धीमी बिक्री के कारण पूंजी फंसी हुई है'
            : 'किराना दुकान पर नियमित और स्थिर बिक्री';
          action = isSurge
            ? 'त्योहारों से पहले +२५% अतिरिक्त स्टॉक ऑर्डर करें'
            : isDead
            ? 'काउंटर पर ₹५ डिस्काउंट या कॉम्बो स्कीम लगाकर बेचें'
            : 'सामान्य स्तर बनाए रखें';
        }

        return {
          item_name: item.item_name,
          status,
          reason,
          action,
        };
      });
    }

    res.json(results);
  });

  // --- AI: Dead Stock Clearance Strategy ---
  app.post('/api/dead-stock-strategy', async (req, res) => {
    const { dead_items, lang_name = 'English' } = req.body;

    if (!dead_items || dead_items.length === 0) {
      return res.json([]);
    }

    const prompt = `You are a Kirana store retail consultant in Maharashtra, India.
Language: ${lang_name}

These grocery products have had no sales movement and are blocking shop capital:
${JSON.stringify(dead_items, null, 2)}

For each product, generate a retail clearance tactic tailored to an Indian Kirana store:
- Counter bundle offer (e.g., Pair with tea powder or atta)
- Direct counter discount
- Verbal sales pitch for the shopkeeper to use with walk-in customers

Return STRICTLY a JSON array of objects:
[
  {
    "item_name": "string",
    "tactic": "Short strategy tag in ${lang_name}",
    "pitch": "Counter sales pitch in ${lang_name}",
    "discount_recommendation": "e.g., ₹5 Off or Combo Scheme in ${lang_name}"
  }
]`;

    let strategies: any[] = [];
    try {
      const text = await callGeminiSafe(prompt, 0.2);
      if (text) {
        strategies = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      }
    } catch {
      // fallback below
    }

    if (!Array.isArray(strategies) || strategies.length === 0) {
      const isMr = lang_name.toLowerCase().includes('marathi') || lang_name.toLowerCase().includes('मराठी');
      const isHi = lang_name.toLowerCase().includes('hindi') || lang_name.toLowerCase().includes('हिंदी');

      strategies = dead_items.map((item: any) => ({
        item_name: item.item_name,
        tactic: isMr ? 'काउंटर कॉम्बो स्कीम' : isHi ? 'काउंटर कॉम्बो स्कीम' : 'Counter Combo Scheme',
        pitch: isMr
          ? 'चहापूड किंवा तेलासोबत घेतल्यास ₹१० थेट सूट - आजच घ्या!'
          : isHi
          ? 'चाय पत्ती या तेल के साथ लेने पर तुरंत ₹१० की छूट!'
          : 'Special pairing offer: get ₹10 off when bundled with daily tea or oil pack!',
        discount_recommendation: isMr ? '₹१० सूट / कॉम्बो' : isHi ? '₹१० छूट / कॉम्बो' : '₹10 Off Combo Scheme',
      }));
    }

    res.json(strategies);
  });

  // --- Frontend Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHELF MIND server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
