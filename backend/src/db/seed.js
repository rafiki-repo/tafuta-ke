import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

// All demo users share this password
const DEMO_PASSWORD = 'Demo1234!';

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const users = [
  {
    full_name: 'Admin Tafuta',
    nickname: 'Admin',
    phone: '+254700000001',
    email: 'admin@tafuta.ke',
    language: 'en',
    phone_verified: true,
    email_verified: true,
    verification_tier: 'premium',
    terms_version: '1.0',
    privacy_version: '1.0',
    isAdmin: true,
    adminRole: 'super_admin',
  },
  {
    full_name: 'John Kamau',
    nickname: 'JK',
    phone: '+254711100001',
    email: 'john.kamau@demo.tafuta.ke',
    language: 'en',
    phone_verified: true,
    email_verified: true,
    verification_tier: 'basic',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
  {
    full_name: 'Mary Wanjiku',
    nickname: 'Mary',
    phone: '+254711100002',
    email: 'mary.wanjiku@demo.tafuta.ke',
    language: 'en',
    phone_verified: true,
    email_verified: false,
    verification_tier: 'basic',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
  {
    full_name: 'Peter Otieno',
    nickname: 'Pete',
    phone: '+254711100003',
    email: 'peter.otieno@demo.tafuta.ke',
    language: 'en',
    phone_verified: true,
    email_verified: true,
    verification_tier: 'verified',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
  {
    full_name: 'Grace Akinyi',
    nickname: 'Grace',
    phone: '+254711100004',
    email: 'grace.akinyi@demo.tafuta.ke',
    language: 'sw',
    phone_verified: true,
    email_verified: false,
    verification_tier: 'basic',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
  {
    full_name: 'David Mwangi',
    nickname: 'Dave',
    phone: '+254711100005',
    email: 'david.mwangi@demo.tafuta.ke',
    language: 'en',
    phone_verified: false,
    email_verified: false,
    verification_tier: 'unverified',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
  {
    full_name: 'Fatuma Hassan',
    nickname: 'Fatu',
    phone: '+254711100006',
    email: 'fatuma.hassan@demo.tafuta.ke',
    language: 'sw',
    phone_verified: true,
    email_verified: true,
    verification_tier: 'basic',
    terms_version: '1.0',
    privacy_version: '1.0',
  },
];

// business_name → owner email
const businesses = [
  {
    business_name: "Mama Njeri Salon",
    category: 'salon',
    region: 'Machakos',
    status: 'active',
    verification_tier: 'verified',
    owner_email: 'mary.wanjiku@demo.tafuta.ke',
    content_json: {
      basic: { name: "Mama Njeri Salon", tagline: { en: "Look great, feel great", sw: "Angaza uzuri wako" } },
      contact: { phone: '+254711100002', whatsapp: '+254711100002', email: 'njeri.salon@demo.co.ke' },
      location: { address: 'Tom Mboya Street, Machakos Town', region: 'Machakos', coordinates: { lat: -1.5177, lng: 37.2634 } },
      hours: { mon: '08:00-19:00', tue: '08:00-19:00', wed: '08:00-19:00', thu: '08:00-19:00', fri: '08:00-19:00', sat: '08:00-18:00', sun: 'closed' },
      profile: {
        en: { description: 'Full-service hair salon offering braiding, relaxers, blow-dries, and nail care. Serving Machakos Town since 2018.' },
        sw: { description: 'Saluni kamili inayotoa huduma za nywele, misumari, na utunzaji wa uso. Tunahudumia Machakos tangu 2018.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 6 },
      { service_type: 'image_gallery', months_paid: 6 },
    ],
    transaction: { amount: 1200, months: 6 },
  },
  {
    business_name: 'Jua Kali Restaurant',
    category: 'restaurant',
    region: 'Machakos',
    status: 'active',
    verification_tier: 'basic',
    owner_email: 'john.kamau@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Jua Kali Restaurant', tagline: { en: 'Authentic Kenyan cuisine', sw: 'Vyakula vya asili vya Kenya' } },
      contact: { phone: '+254711100001', whatsapp: '+254711100001', email: '' },
      location: { address: 'Market Road, Machakos Town', region: 'Machakos', coordinates: { lat: -1.5190, lng: 37.2611 } },
      hours: { mon: '07:00-21:00', tue: '07:00-21:00', wed: '07:00-21:00', thu: '07:00-21:00', fri: '07:00-22:00', sat: '08:00-22:00', sun: '09:00-18:00' },
      profile: {
        en: { description: 'Family restaurant serving traditional Kenyan meals — nyama choma, ugali, sukuma wiki, and fresh juices at affordable prices.' },
        sw: { description: 'Mkahawa wa familia unaotoa vyakula vya kienyeji — nyama choma, ugali, sukuma wiki, na juisi safi kwa bei nafuu.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 3 },
    ],
    transaction: { amount: 600, months: 3 },
  },
  {
    business_name: 'TechHub Cyber Cafe',
    category: 'cyber',
    region: 'Ruiru',
    status: 'active',
    verification_tier: 'verified',
    owner_email: 'david.mwangi@demo.tafuta.ke',
    content_json: {
      basic: { name: 'TechHub Cyber Cafe', tagline: { en: 'Fast internet, affordable rates', sw: 'Intaneti ya haraka, bei nafuu' } },
      contact: { phone: '+254711100005', whatsapp: '+254711100005', email: 'techhub@demo.co.ke' },
      location: { address: 'Station Road, Ruiru Town', region: 'Ruiru', coordinates: { lat: -1.1477, lng: 36.9614 } },
      hours: { mon: '07:00-22:00', tue: '07:00-22:00', wed: '07:00-22:00', thu: '07:00-22:00', fri: '07:00-22:00', sat: '08:00-22:00', sun: '09:00-20:00' },
      profile: {
        en: { description: 'Ruiru\'s premier cyber cafe with 20 high-speed computers, printing, scanning, and M-Pesa services. WiFi hotspot available.' },
        sw: { description: 'Cyber cafe bora ya Ruiru yenye kompyuta 20 za haraka, uchapishaji, skanning, na huduma za M-Pesa. WiFi inapatikana.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 12 },
      { service_type: 'search_promotion', months_paid: 3 },
    ],
    transaction: { amount: 2850, months: 12 },
  },
  {
    business_name: 'Otieno Hardware & General Store',
    category: 'shop',
    region: 'Kisumu',
    status: 'active',
    verification_tier: 'basic',
    owner_email: 'peter.otieno@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Otieno Hardware & General Store', tagline: { en: 'Everything you need to build', sw: 'Vifaa vyote vya ujenzi' } },
      contact: { phone: '+254711100003', whatsapp: '+254711100003', email: 'otieno.hw@demo.co.ke' },
      location: { address: 'Oginga Odinga Street, Kisumu CBD', region: 'Kisumu', coordinates: { lat: -0.1022, lng: 34.7617 } },
      hours: { mon: '07:30-18:00', tue: '07:30-18:00', wed: '07:30-18:00', thu: '07:30-18:00', fri: '07:30-18:00', sat: '08:00-16:00', sun: 'closed' },
      profile: {
        en: { description: 'Your one-stop hardware and general store in Kisumu. We stock building materials, tools, paint, plumbing, and electrical supplies.' },
        sw: { description: 'Duka lako la vifaa na bidhaa za jumla Kisumu. Tuna vifaa vya ujenzi, zana, rangi, mabomba, na umeme.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 3 },
    ],
    transaction: { amount: 600, months: 3 },
  },
  {
    business_name: 'Milele Guesthouse & Hotel',
    category: 'hotel',
    region: 'Kisumu',
    status: 'active',
    verification_tier: 'premium',
    owner_email: 'peter.otieno@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Milele Guesthouse & Hotel', tagline: { en: 'Comfort by Lake Victoria', sw: 'Starehe karibu na Ziwa Victoria' } },
      contact: { phone: '+254711100003', whatsapp: '+254711100003', email: 'milele.hotel@demo.co.ke' },
      location: { address: 'Dunga Beach Road, Kisumu', region: 'Kisumu', coordinates: { lat: -0.1300, lng: 34.7450 } },
      hours: { mon: '00:00-24:00', tue: '00:00-24:00', wed: '00:00-24:00', thu: '00:00-24:00', fri: '00:00-24:00', sat: '00:00-24:00', sun: '00:00-24:00' },
      profile: {
        en: { description: 'Clean, affordable accommodation with lake views. Includes breakfast, free WiFi, and secure parking. Ideal for business and leisure travellers.' },
        sw: { description: 'Malazi safi na ya bei nafuu yenye mandhari ya ziwa. Pamoja na kiamsha kinywa, WiFi bure, na maegesho salama.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 6 },
      { service_type: 'image_gallery', months_paid: 6 },
      { service_type: 'search_promotion', months_paid: 6 },
    ],
    transaction: { amount: 2700, months: 6 },
  },
  {
    business_name: 'Grace Pharmacy',
    category: 'pharmacy',
    region: 'Kisumu',
    status: 'active',
    verification_tier: 'verified',
    owner_email: 'grace.akinyi@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Grace Pharmacy', tagline: { en: 'Your health, our priority', sw: 'Afya yako, kipaumbele chetu' } },
      contact: { phone: '+254711100004', whatsapp: '+254711100004', email: 'grace.pharmacy@demo.co.ke' },
      location: { address: 'Jomo Kenyatta Avenue, Kisumu', region: 'Kisumu', coordinates: { lat: -0.0958, lng: 34.7680 } },
      hours: { mon: '08:00-20:00', tue: '08:00-20:00', wed: '08:00-20:00', thu: '08:00-20:00', fri: '08:00-20:00', sat: '08:00-18:00', sun: '10:00-15:00' },
      profile: {
        en: { description: 'Licensed pharmacy stocking prescription and OTC medicines, supplements, baby products, and medical equipment. Pharmacist on duty always.' },
        sw: { description: 'Duka la dawa lililoidhinishwa lenye dawa za daktari na OTC, virutubisho, bidhaa za mtoto, na vifaa vya matibabu. Daktari wa dawa anahudhuria daima.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 6 },
    ],
    transaction: { amount: 1200, months: 6 },
  },
  {
    business_name: 'Ruiru Auto Garage',
    category: 'mechanic',
    region: 'Ruiru',
    status: 'active',
    verification_tier: 'basic',
    owner_email: 'john.kamau@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Ruiru Auto Garage', tagline: { en: 'Expert car repair and service', sw: 'Ukarabati wa gari wa kitaalamu' } },
      contact: { phone: '+254711100001', whatsapp: '+254711100001', email: '' },
      location: { address: 'Kiambu Road, Ruiru', region: 'Ruiru', coordinates: { lat: -1.1450, lng: 36.9580 } },
      hours: { mon: '07:00-18:00', tue: '07:00-18:00', wed: '07:00-18:00', thu: '07:00-18:00', fri: '07:00-18:00', sat: '08:00-16:00', sun: 'closed' },
      profile: {
        en: { description: 'Full-service auto garage in Ruiru. Engine diagnostics, oil changes, brake service, body work, and welding. All vehicle makes serviced.' },
        sw: { description: 'Gereji kamili ya magari Ruiru. Uchunguzi wa injini, mafuta, breki, kazi za mwili, na kuunga. Magari ya aina zote yanashughulikiwa.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 3 },
    ],
    transaction: { amount: 600, months: 3 },
  },
  {
    business_name: 'Sunrise Junior Academy',
    category: 'school',
    region: 'Ruiru',
    status: 'pending',
    verification_tier: 'basic',
    owner_email: 'david.mwangi@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Sunrise Junior Academy', tagline: { en: 'Nurturing tomorrow\'s leaders', sw: 'Kukuza viongozi wa kesho' } },
      contact: { phone: '+254711100005', whatsapp: '+254711100005', email: 'sunrise.academy@demo.co.ke' },
      location: { address: 'Eastern Bypass, Ruiru', region: 'Ruiru', coordinates: { lat: -1.1600, lng: 36.9700 } },
      hours: { mon: '06:30-17:00', tue: '06:30-17:00', wed: '06:30-17:00', thu: '06:30-17:00', fri: '06:30-17:00', sat: 'closed', sun: 'closed' },
      profile: {
        en: { description: 'CBC-compliant private school offering PP1 through Grade 9. Small class sizes, experienced teachers, and a safe learning environment.' },
        sw: { description: 'Shule ya binafsi inayofuata CBC kutoka PP1 hadi Darasa la 9. Madarasa madogo, walimu wenye uzoefu, na mazingira salama ya kujifunza.' },
      },
    },
    subscriptions: [],
    transaction: null,
  },
  {
    business_name: 'Faith Community Church',
    category: 'church',
    region: 'Machakos',
    status: 'active',
    verification_tier: 'basic',
    owner_email: 'fatuma.hassan@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Faith Community Church', tagline: { en: 'Growing together in faith', sw: 'Kukua pamoja katika imani' } },
      contact: { phone: '+254711100006', whatsapp: '+254711100006', email: 'faith.church@demo.co.ke' },
      location: { address: 'Muvuti Road, Machakos Town', region: 'Machakos', coordinates: { lat: -1.5210, lng: 37.2650 } },
      hours: { mon: 'closed', tue: 'closed', wed: '17:00-19:00', thu: 'closed', fri: 'closed', sat: '09:00-12:00', sun: '08:00-13:00' },
      profile: {
        en: { description: 'Non-denominational church welcoming all. Sunday services at 8am and 10:30am. Youth ministry, women\'s fellowship, and community outreach programs.' },
        sw: { description: 'Kanisa linalokaribisha wote. Ibada za Jumapili saa 2 na 4:30 asubuhi. Wizara ya vijana, ushirika wa wanawake, na mipango ya kufikia jamii.' },
      },
    },
    subscriptions: [
      { service_type: 'website_hosting', months_paid: 3 },
    ],
    transaction: { amount: 600, months: 3 },
  },
  {
    business_name: 'Nairobi Bites Fast Food',
    category: 'restaurant',
    region: 'Machakos',
    status: 'pending',
    verification_tier: 'basic',
    owner_email: 'fatuma.hassan@demo.tafuta.ke',
    content_json: {
      basic: { name: 'Nairobi Bites Fast Food', tagline: { en: 'Quick, tasty, affordable', sw: 'Haraka, kitamu, bei nafuu' } },
      contact: { phone: '+254711100006', whatsapp: '+254711100006', email: '' },
      location: { address: 'Bus Park Area, Machakos', region: 'Machakos', coordinates: { lat: -1.5200, lng: 37.2620 } },
      hours: { mon: '06:00-22:00', tue: '06:00-22:00', wed: '06:00-22:00', thu: '06:00-22:00', fri: '06:00-23:00', sat: '06:00-23:00', sun: '07:00-20:00' },
      profile: {
        en: { description: 'Fast food restaurant near the bus park. Serving chapati, mandazi, nyama choma, and cold drinks. Quick service for busy commuters.' },
        sw: { description: 'Mkahawa wa chakula cha haraka karibu na stendi ya basi. Tunatoa chapati, mandazi, nyama choma, na vinywaji baridi.' },
      },
    },
    subscriptions: [],
    transaction: null,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting demo seed...\n');

    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const now = new Date();

    // ── Users ──────────────────────────────────────────────────────────────
    console.log('  Inserting users...');
    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (
          full_name, nickname, phone, email, password_hash, language,
          verification_tier, status, phone_verified, email_verified,
          terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, last_login_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING user_id`,
        [
          u.full_name, u.nickname, u.phone, u.email, passwordHash,
          u.language, u.verification_tier,
          u.phone_verified, u.email_verified,
          u.terms_version, now, u.privacy_version, now, now,
        ]
      );
      userIds[u.email] = rows[0].user_id;
      console.log(`    ✓ ${u.full_name} (${u.email})`);
    }

    // ── Admin role ─────────────────────────────────────────────────────────
    console.log('\n  Setting up admin role...');
    const adminUser = users.find(u => u.isAdmin);
    await client.query(
      `INSERT INTO admin_users (user_id, role, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id) DO NOTHING`,
      [userIds[adminUser.email], adminUser.adminRole]
    );
    console.log(`    ✓ ${adminUser.full_name} → ${adminUser.adminRole}`);

    // ── Businesses ─────────────────────────────────────────────────────────
    console.log('\n  Inserting businesses...');
    const businessIds = {};
    const adminId = userIds[adminUser.email];

    for (const b of businesses) {
      const businessTag = slug(b.business_name);
      const approvedAt = b.status === 'active' ? now : null;
      const approvedBy = b.status === 'active' ? adminId : null;

      const { rows } = await client.query(
        `INSERT INTO businesses (
          business_name, category, region, business_tag, status, verification_tier,
          content_json, content_version, approved_by, approved_at, status_changed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10)
        ON CONFLICT (business_tag) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING business_id`,
        [
          b.business_name, b.category, b.region, businessTag,
          b.status, b.verification_tier,
          JSON.stringify(b.content_json),
          approvedBy, approvedAt,
          b.status === 'active' ? now : null,
        ]
      );
      businessIds[b.business_name] = rows[0].business_id;
      console.log(`    ✓ ${b.business_name} [${b.status}]`);
    }

    // ── Content history (one initial entry per business) ───────────────────
    console.log('\n  Inserting content history...');
    for (const b of businesses) {
      const ownerId = userIds[b.owner_email];
      await client.query(
        `INSERT INTO business_content_history (
          business_id, content_json, content_version, changed_by, change_type, change_summary
        ) VALUES ($1,$2,1,$3,'owner_edit','Initial content created during registration')`,
        [businessIds[b.business_name], JSON.stringify(b.content_json), ownerId]
      );
    }
    console.log(`    ✓ ${businesses.length} history entries`);

    // ── User-business roles ────────────────────────────────────────────────
    console.log('\n  Linking owners to businesses...');
    for (const b of businesses) {
      const ownerId = userIds[b.owner_email];
      await client.query(
        `INSERT INTO user_business_roles (user_id, business_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (user_id, business_id, role) DO NOTHING`,
        [ownerId, businessIds[b.business_name]]
      );
    }
    console.log(`    ✓ ${businesses.length} owner roles`);

    // ── Subscriptions & transactions ───────────────────────────────────────
    console.log('\n  Inserting subscriptions and transactions...');
    const vatRate = 0.16;
    for (const b of businesses) {
      if (!b.subscriptions.length) continue;

      const businessId = businessIds[b.business_name];
      const ownerId = userIds[b.owner_email];
      const expirationDate = new Date(now);
      expirationDate.setMonth(expirationDate.getMonth() + (b.transaction?.months ?? 3));

      for (const sub of b.subscriptions) {
        await client.query(
          `INSERT INTO service_subscriptions (business_id, service_type, months_paid, expiration_date, status)
           VALUES ($1,$2,$3,$4,'active')
           ON CONFLICT (business_id, service_type) DO NOTHING`,
          [businessId, sub.service_type, sub.months_paid, expirationDate]
        );
      }

      if (b.transaction) {
        const amount = b.transaction.amount;
        const vatAmount = parseFloat((amount * vatRate).toFixed(2));
        const totalAmount = parseFloat((amount + vatAmount).toFixed(2));
        const merchantRef = `DEMO-${Date.now()}-${slug(b.business_name).substring(0, 12)}`;

        await client.query(
          `INSERT INTO transactions (
            business_id, user_id, pesapal_merchant_reference, amount, vat_amount,
            total_amount, currency, status, payment_method, items, completed_at,
            receipt_number
          ) VALUES ($1,$2,$3,$4,$5,$6,'KES','completed','M-Pesa',$7,CURRENT_TIMESTAMP,
            'TFT-' || EXTRACT(YEAR FROM NOW())::text
            || '-' || LPAD(nextval('receipt_number_seq')::text, 5, '0'))`,
          [
            businessId, ownerId, merchantRef,
            amount, vatAmount, totalAmount,
            JSON.stringify(b.subscriptions.map(s => ({
              service_type: s.service_type,
              months: b.transaction.months,
            }))),
          ]
        );
      }
    }
    console.log('    ✓ Subscriptions and transactions inserted');

    await client.query('COMMIT');

    console.log('\n✅ Demo seed completed successfully!');
    console.log('\n📋 Demo credentials (password for all: Demo1234!)');
    console.log('─────────────────────────────────────────────────');
    console.log('  Super Admin : admin@tafuta.ke');
    for (const u of users.filter(u => !u.isAdmin)) {
      console.log(`  ${u.full_name.padEnd(16)}: ${u.email}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
