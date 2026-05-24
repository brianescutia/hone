// Seed module. Exports `seedDatabase()` which (re)populates demo data.
// Used both by `npm run seed` (via seed.js) and auto-seeding the in-memory DB.

const User = require('./models/User');
const Listing = require('./models/Listing');
const Sublease = require('./models/Sublease');
const Review = require('./models/Review');
const Conversation = require('./models/Conversation');
const ManagerClaim = require('./models/ManagerClaim');

// Davis-area coordinates (UC Davis main quad ~ 38.5382, -121.7617)
const DAVIS_CENTER = { lat: 38.5449, lng: -121.7405 };

const photo = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

const APT_PHOTOS = [
  photo('1502672260266-1c1ef2d93688'),
  photo('1560448204-e02f11c3d0e2'),
  photo('1505691938895-1758d7feb511'),
  photo('1522708323590-d24dbb6b0267'),
  photo('1493809842364-78817add7ffb'),
  photo('1522156373667-4c7234bbd804'),
];

const LISTINGS = [
  {
    name: 'Almondwood Apartments',
    address: '1212 Alvarado Ave, Davis, CA 95616',
    location: { lat: 38.5611, lng: -121.7621 },
    description:
      'Looking for convenient UC Davis off-campus housing? Almondwood Apartments has you covered. Just a mile from campus, easy to bike or take a Unitrans bus to class. Shopping and dining across the street at MarketPlace Center, plus a pool, spa, gym, and clubhouse.',
    priceMin: 2150,
    priceMax: 3480,
    bedroomsMin: 1,
    bedroomsMax: 4,
    bathroomsMin: 1,
    bathroomsMax: 4.5,
    photos: APT_PHOTOS,
    amenities: [
      'In-unit washer & dryer',
      'Central air conditioning',
      'Community fitness center',
      'Swimming pool & spa',
      'Clubhouse',
      'Covered parking',
    ],
    feesAndPolicies: [
      'Application fee: $45',
      'Security deposit: $500–$1,000',
      'No smoking on premises',
    ],
    keyAmenities: ['Cat-friendly', 'Parking included'],
    tags: ['long term', 'pet-friendly', '4+ stars', '10 minute bus'],
    petFriendly: true,
    contactPhone: '(530) 753-2112',
    contactEmail: 'almondwood@davisapartmentsforrent.com',
    officeHours: 'Mon–Fri 10am–6pm · Sat/Sun closed',
    floorPlans: [
      {
        name: '2-Bedroom, 1.5-Bath Standard Unit',
        bedrooms: 2,
        bathrooms: 1.5,
        sqft: 684,
        price: 2150,
        deposit: 1000,
        specialAvailability: 'Immediate move-in',
        imageUrl: photo('1556909114-f6e7ad7d3136'),
      },
      {
        name: '1-Bedroom, 1-Bath',
        bedrooms: 1,
        bathrooms: 1,
        sqft: 540,
        price: 1750,
        deposit: 800,
        imageUrl: photo('1502673530728-f79b4cab31b1'),
      },
      {
        name: '3-Bedroom Townhouse',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1100,
        price: 2950,
        deposit: 1200,
        imageUrl: photo('1560185007-cde436f6a4d0'),
      },
    ],
    commute: {
      bus: { minutes: 7, line: 'G line', stops: 7 },
      car: { minutes: 8, miles: 2.1 },
      bike: { minutes: 11, miles: 2.0 },
      walk: { minutes: 46, miles: 2.1 },
    },
  },
  {
    name: 'The Colleges at La Rue',
    address: '164 Orchard Park Dr, Davis, CA 95616',
    location: { lat: 38.5478, lng: -121.7505 },
    description:
      'Walking-distance UC Davis student community with shared lounges and a study center.',
    priceMin: 1498,
    priceMax: 2200,
    bedroomsMin: 1,
    bedroomsMax: 4,
    bathroomsMin: 1,
    bathroomsMax: 2,
    photos: [APT_PHOTOS[1], APT_PHOTOS[2], APT_PHOTOS[0]],
    amenities: ['On-site management', 'Furnished options', 'Wi-Fi included', 'Study lounge'],
    feesAndPolicies: ['Per-bed lease available', 'Quiet hours after 10pm'],
    keyAmenities: ['Walk to campus', 'Furnished available'],
    tags: ['long term'],
    contactPhone: '(530) 750-1234',
    contactEmail: 'lease@collegesatlarue.com',
    officeHours: 'Mon–Sat 9am–6pm',
    floorPlans: [
      {
        name: '1-Bedroom, 1-Bath Furnished',
        bedrooms: 1,
        bathrooms: 1,
        sqft: 480,
        price: 1498,
        deposit: 700,
      },
    ],
    commute: {
      bus: { minutes: 5, line: 'P line', stops: 4 },
      car: { minutes: 4, miles: 1.0 },
      bike: { minutes: 5, miles: 0.9 },
      walk: { minutes: 18, miles: 0.9 },
    },
  },
  {
    name: 'Sycamore Lane Apartments',
    address: '614 Sycamore Ln, Davis, CA 95616',
    location: { lat: 38.5523, lng: -121.7706 },
    description:
      'Quiet, tree-lined community with a pool and easy bus access to UC Davis.',
    priceMin: 2195,
    priceMax: 2900,
    bedroomsMin: 2,
    bedroomsMax: 2,
    bathroomsMin: 2,
    bathroomsMax: 2,
    photos: [APT_PHOTOS[3], APT_PHOTOS[4], APT_PHOTOS[5]],
    amenities: ['Swimming pool', 'Assigned parking', 'On-site laundry'],
    feesAndPolicies: ['12-month lease standard'],
    keyAmenities: ['Pool', '10 min bus'],
    tags: ['long term', '4+ stars', '10 minute bus'],
    contactPhone: '(530) 758-4444',
    contactEmail: 'info@sycamorelaneapartments.com',
    officeHours: 'Mon–Fri 9am–5pm',
    floorPlans: [
      {
        name: '2-Bedroom, 2-Bath',
        bedrooms: 2,
        bathrooms: 2,
        sqft: 920,
        price: 2195,
        deposit: 900,
      },
    ],
    commute: {
      bus: { minutes: 10, line: 'G line', stops: 9 },
      car: { minutes: 9, miles: 2.3 },
      bike: { minutes: 12, miles: 2.2 },
      walk: { minutes: 50, miles: 2.3 },
    },
  },
  {
    name: 'Tanglewood Apartments',
    address: '1880 Cowell Blvd, Davis, CA 95618',
    location: { lat: 38.5345, lng: -121.7359 },
    description:
      'South Davis community known for affordable subleases and friendly residents.',
    priceMin: 1300,
    priceMax: 2200,
    bedroomsMin: 1,
    bedroomsMax: 3,
    bathroomsMin: 1,
    bathroomsMax: 2,
    photos: [APT_PHOTOS[4], APT_PHOTOS[0], APT_PHOTOS[2]],
    amenities: ['Furnished options', 'Hot tub', 'BBQ area', 'Bike storage'],
    feesAndPolicies: ['Sublease-friendly with landlord approval'],
    keyAmenities: ['Sublease friendly', 'Furnished'],
    tags: ['long term', 'sublease'],
    contactPhone: '(530) 753-9911',
    contactEmail: 'tanglewood@davishousing.com',
    officeHours: 'Mon–Fri 10am–6pm',
    floorPlans: [
      {
        name: '1-Bedroom Furnished',
        bedrooms: 1,
        bathrooms: 1,
        sqft: 520,
        price: 1300,
        deposit: 600,
      },
    ],
    commute: {
      bus: { minutes: 12, line: 'L line', stops: 8 },
      car: { minutes: 10, miles: 2.5 },
      bike: { minutes: 15, miles: 2.6 },
      walk: { minutes: 55, miles: 2.5 },
    },
  },
  {
    name: 'Fountain Circle Townhomes',
    address: '1313 Alvarado Ave, Davis, CA 95616',
    location: { lat: 38.5587, lng: -121.7649 },
    description:
      'Two- and three-bedroom townhomes ideal for groups of UC Davis upperclassmen.',
    priceMin: 2400,
    priceMax: 3200,
    bedroomsMin: 2,
    bedroomsMax: 3,
    bathroomsMin: 1.5,
    bathroomsMax: 2.5,
    photos: [APT_PHOTOS[5], APT_PHOTOS[3], APT_PHOTOS[1]],
    amenities: ['Patio / yard', 'In-unit laundry', 'Two-story floor plan'],
    feesAndPolicies: ['$50 application fee', 'Pets case-by-case'],
    keyAmenities: ['Townhome layout', 'Yard'],
    tags: ['long term', 'pet-friendly'],
    petFriendly: true,
    contactPhone: '(530) 758-2299',
    contactEmail: 'manager@fountaincircle.com',
    officeHours: 'Mon–Fri 9am–5pm',
    floorPlans: [
      {
        name: '3-Bedroom Townhome',
        bedrooms: 3,
        bathrooms: 2.5,
        sqft: 1280,
        price: 2950,
        deposit: 1500,
      },
    ],
    commute: {
      bus: { minutes: 9, line: 'G line', stops: 8 },
      car: { minutes: 7, miles: 1.9 },
      bike: { minutes: 10, miles: 1.8 },
      walk: { minutes: 42, miles: 1.9 },
    },
  },
  {
    name: 'Aggie Square Apartments',
    address: '405 Russell Blvd, Davis, CA 95616',
    location: { lat: 38.547, lng: -121.7569 },
    description:
      'Walk to campus from this newly remodeled student community in the heart of Davis.',
    priceMin: 1800,
    priceMax: 2600,
    bedroomsMin: 1,
    bedroomsMax: 2,
    bathroomsMin: 1,
    bathroomsMax: 2,
    photos: [APT_PHOTOS[0], APT_PHOTOS[2], APT_PHOTOS[4]],
    amenities: ['Fitness center', 'Game room', 'Free Wi-Fi', 'Bike repair station'],
    feesAndPolicies: ['Furnished options available'],
    keyAmenities: ['Walk to campus', 'Free Wi-Fi'],
    tags: ['long term', '4+ stars'],
    contactPhone: '(530) 752-1100',
    contactEmail: 'leasing@aggiesquare.com',
    officeHours: 'Mon–Fri 9am–7pm',
    floorPlans: [
      {
        name: '1-Bedroom Standard',
        bedrooms: 1,
        bathrooms: 1,
        sqft: 510,
        price: 1800,
        deposit: 700,
      },
    ],
    commute: {
      bus: { minutes: 4, line: 'P line', stops: 3 },
      car: { minutes: 3, miles: 0.6 },
      bike: { minutes: 4, miles: 0.5 },
      walk: { minutes: 12, miles: 0.5 },
    },
  },
  // External-import example. Hidden from the public list until admin verifies.
  {
    name: 'Greens at Cordova',
    address: '2200 Cowell Blvd, Davis, CA 95618',
    location: { lat: 38.5302, lng: -121.7411 },
    description:
      'Imported from a third-party listing aggregator. This listing has not been verified by hone yet — proceed with caution and confirm details with the management directly.',
    priceMin: 1750,
    priceMax: 2400,
    bedroomsMin: 1,
    bedroomsMax: 2,
    bathroomsMin: 1,
    bathroomsMax: 2,
    photos: [APT_PHOTOS[2]],
    amenities: ['Pool', 'On-site laundry'],
    feesAndPolicies: ['Lease term varies'],
    keyAmenities: ['South Davis'],
    tags: ['long term'],
    contactPhone: '',
    contactEmail: '',
    officeHours: '',
    floorPlans: [],
    commute: {
      bus: { minutes: 13, line: 'L line', stops: 10 },
      car: { minutes: 11, miles: 2.8 },
      bike: { minutes: 17, miles: 2.9 },
      walk: { minutes: 60, miles: 2.9 },
    },
    sourceType: 'external_import',
    sourceName: 'Apartments.com',
    sourceUrl: 'https://www.apartments.com/example',
    verificationStatus: 'pending_review',
    lastImportedAt: new Date(),
  },
];

async function seedDatabase() {
  console.log('[seed] wiping collections');
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    Sublease.deleteMany({}),
    Review.deleteMany({}),
    Conversation.deleteMany({}),
    ManagerClaim.deleteMany({}),
  ]);

  console.log('[seed] creating users');
  const passwordHash = await User.hashPassword('password123');

  const student = await User.create({
    name: 'Alex Aggie',
    email: 'student@ucdavis.edu',
    passwordHash,
    role: 'student',
    emailVerified: true,
    bio: 'Junior, Computer Science major, looking for a 2-bedroom near campus.',
  });

  const manager = await User.create({
    name: 'Erin Ong',
    email: 'manager@almondwood.com',
    passwordHash,
    role: 'manager',
    emailVerified: true,
    company: 'Almondwood Apartments',
    managerStatus: 'approved',
    workEmail: 'manager@almondwood.com',
    managerDomain: 'almondwood.com',
    managerVerifiedAt: new Date(),
  });

  const admin = await User.create({
    name: 'hone admin',
    email: 'admin@hone.local',
    passwordHash,
    role: 'admin',
    emailVerified: true,
  });

  // A couple extra students for reviews/conversations
  const jason = await User.create({
    name: 'Jason S.',
    email: 'jason@ucdavis.edu',
    passwordHash,
    role: 'student',
    emailVerified: true,
  });
  const clara = await User.create({
    name: 'Clara Y.',
    email: 'clara@ucdavis.edu',
    passwordHash,
    role: 'student',
    emailVerified: true,
  });
  const sophia = await User.create({
    name: 'Sophia M.',
    email: 'sophia@ucdavis.edu',
    passwordHash,
    role: 'student',
    emailVerified: true,
  });

  console.log('[seed] creating listings');
  const listings = await Listing.insertMany(LISTINGS);
  // Attach manager to Almondwood — set all claim fields consistently so the
  // public listing page, manager dashboard, and admin dashboard all agree
  // about its state. We also create the corresponding approved
  // ManagerClaim record so the audit trail isn't fictional.
  const almondwood = listings.find((l) => l.name === 'Almondwood Apartments');
  almondwood.manager = manager._id;
  almondwood.claimable = false;
  almondwood.claimedByManager = true;
  almondwood.claimedBy = manager._id;
  almondwood.claimStatus = 'claimed';
  almondwood.managerVerified = true;
  almondwood.officialManagerDomain = 'almondwood.com';
  almondwood.verificationStatus = 'claimed';
  await almondwood.save();

  // Belt-and-suspenders: ensure Almondwood remains fully claimed in the DB
  // even if insertMany/save/default behavior changes across Mongoose versions.
  await Listing.updateOne(
    { name: 'Almondwood Apartments' },
    {
      $set: {
        manager: manager._id,
        claimable: false,
        claimedByManager: true,
        claimedBy: manager._id,
        claimStatus: 'claimed',
        managerVerified: true,
        officialManagerDomain: 'almondwood.com',
        verificationStatus: 'claimed',
      },
    }
  );

  // Ensure the seeded external-import listing stays hidden from public listings
  // and appears in the admin pending-review queue.
  await Listing.updateOne(
    { name: 'Greens at Cordova' },
    {
      $set: {
        sourceType: 'external_import',
        verificationStatus: 'pending_review',
        lastImportedAt: new Date(),
      },
    }
  );

  // Mirror the listing relationship on the manager so /manager dashboard
  // and requireVerifiedManagerOfListing both see it.
  manager.verifiedManagerFor = [almondwood._id];
  manager.claimedListings = [almondwood._id];
  await manager.save();

  // Audit record for the approval. This matters because the admin UI
  // ("Pending manager claims (N)") only counts ManagerClaim docs — if we
  // didn't create one here, a fresh reseed would briefly look as if the
  // manager never actually claimed the listing.
  await ManagerClaim.create({
    manager: manager._id,
    listing: almondwood._id,
    propertyName: 'Almondwood Apartments',
    workEmail: 'manager@almondwood.com',
    emailDomain: 'almondwood.com',
    companyWebsite: 'https://almondwood.com',
    websiteDomain: 'almondwood.com',
    phoneNumber: '(530) 753-2112',
    roleTitle: 'Property Manager',
    confidence: 'high',
    confidenceReason: 'Work email domain matches the property website domain.',
    status: 'approved',
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });

  console.log('[seed] creating subleases');
  await Sublease.insertMany([
    {
      listing: almondwood._id,
      poster: sophia._id,
      title: 'Summer sublease — private room in 3BR',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: new Date('2026-06-18'),
      endDate: new Date('2026-08-18'),
      price: 1200,
      utilitiesIncluded: false,
      utilitiesEstimate: 80,
      roommates: 2,
      furnished: true,
      parking: true,
      petPolicy: 'No pets',
      genderPreference: 'female',
      description:
        'Sophomore, Communications major. Quiet apartment near MarketPlace Center, 10 minute bus to campus.',
      status: 'available',
      moderation: 'approved',
    },
    {
      listing: almondwood._id,
      poster: jason._id,
      title: 'Fall sublease — private room in 4BR',
      roomType: 'private room',
      bathroomType: 'shared',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-09-10'),
      price: 1300,
      utilitiesIncluded: false,
      utilitiesEstimate: 90,
      roommates: 3,
      furnished: false,
      parking: false,
      petPolicy: 'Cats okay',
      genderPreference: 'male',
      description: 'Junior, Biology. Easy bus to campus, kitchen recently remodeled.',
      status: 'available',
      moderation: 'approved',
    },
    {
      listing: listings.find((l) => l.name === 'Tanglewood Apartments')._id,
      poster: clara._id,
      title: 'Summer sublease — 1BR furnished',
      roomType: 'whole unit',
      bathroomType: 'private',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-09-01'),
      price: 1300,
      utilitiesIncluded: true,
      roommates: 0,
      furnished: true,
      parking: true,
      petPolicy: 'No pets',
      genderPreference: 'any',
      description: 'Cozy 1BR, all utilities included. Quiet South Davis location.',
      status: 'available',
      moderation: 'approved',
    },
    {
      listing: listings.find((l) => l.name === 'Sycamore Lane Apartments')._id,
      poster: student._id,
      title: 'Sublease — shared room, August only',
      roomType: 'shared room',
      bathroomType: 'shared',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-31'),
      price: 700,
      utilitiesIncluded: false,
      utilitiesEstimate: 60,
      roommates: 3,
      furnished: true,
      parking: false,
      petPolicy: 'No pets',
      description: 'Awaiting admin approval.',
      status: 'available',
      moderation: 'pending',
    },
  ]);

  console.log('[seed] creating reviews');
  const reviews = [
    {
      listing: almondwood._id,
      author: jason._id,
      overall: 5,
      management: 5,
      noise: 4,
      safety: 5,
      maintenance: 5,
      value: 4,
      commute: 5,
      body:
        'I loved my time at Almondwood. Great amenities and a direct bus route to campus. Very student-friendly — definitely recommend.',
    },
    {
      listing: almondwood._id,
      author: clara._id,
      overall: 3,
      management: 3,
      noise: 4,
      safety: 4,
      maintenance: 2,
      value: 3,
      commute: 5,
      body:
        'Right next to Safeway, which makes shopping easy. Management is friendly but slow — took two weeks to come look at a leaky faucet.',
    },
    {
      listing: listings.find((l) => l.name === 'The Colleges at La Rue')._id,
      author: sophia._id,
      overall: 4,
      management: 4,
      noise: 3,
      safety: 4,
      maintenance: 4,
      value: 5,
      commute: 5,
      body:
        'Walking distance to campus is unbeatable. Walls are thin so noise can be an issue during midterms.',
    },
    {
      listing: listings.find((l) => l.name === 'Sycamore Lane Apartments')._id,
      author: jason._id,
      overall: 4,
      management: 4,
      noise: 5,
      safety: 5,
      maintenance: 4,
      value: 4,
      commute: 4,
      body: 'Quiet community, good for grad students. Pool is a plus.',
      anonymous: true,
    },
    {
      listing: listings.find((l) => l.name === 'Tanglewood Apartments')._id,
      author: student._id,
      overall: 4,
      management: 5,
      noise: 4,
      safety: 4,
      maintenance: 4,
      value: 5,
      commute: 3,
      body: 'Great value for South Davis. Bus ride can be slow during rush hour.',
    },
    {
      listing: listings.find((l) => l.name === 'Fountain Circle Townhomes')._id,
      author: clara._id,
      overall: 5,
      management: 4,
      noise: 5,
      safety: 5,
      maintenance: 5,
      value: 4,
      commute: 4,
      body: 'Townhome layout is amazing for a group of 3. Yard is a huge plus.',
    },
    {
      listing: listings.find((l) => l.name === 'Aggie Square Apartments')._id,
      author: sophia._id,
      overall: 4,
      management: 4,
      noise: 3,
      safety: 5,
      maintenance: 4,
      value: 4,
      commute: 5,
      body: 'Cannot beat the location. Free Wi-Fi is reliable.',
    },
    {
      listing: almondwood._id,
      author: student._id,
      overall: 5,
      management: 5,
      noise: 5,
      safety: 5,
      maintenance: 5,
      value: 5,
      commute: 5,
      body: 'Living here was easily the best year of my Davis experience.',
    },
  ];

  for (const r of reviews) await Review.create(r);

  // Recompute denormalized ratings
  for (const l of listings) {
    const list = await Review.find({ listing: l._id, removed: false });
    const avg = list.length ? list.reduce((s, r) => s + r.overall, 0) / list.length : 0;
    l.rating = Math.round(avg * 10) / 10;
    l.reviewCount = list.length;
    await l.save();
  }

  console.log('[seed] creating conversations');
  await Conversation.create({
    participants: [student._id, manager._id],
    listing: almondwood._id,
    contextLabel: 'Verified Apartment Manager — Almondwood Apartments',
    messages: [
      {
        sender: manager._id,
        body:
          "Hi! I saw your request for a tour here at Almondwood Apartments, and it's great to see that you're interested. When would you be available for a tour?",
      },
      {
        sender: student._id,
        body: "Thanks for letting me tour the apartment! I'm available Friday, May 16th at 1:00 PM. Does that work?",
      },
    ],
  });

  await Conversation.create({
    participants: [student._id, jason._id],
    listing: almondwood._id,
    contextLabel: 'Verified Student Renter — Almondwood Apartments',
    messages: [
      {
        sender: student._id,
        body: "Hi! I'm thinking about renting at Almondwood next year and wanted to know more about what your experience was like.",
      },
      {
        sender: jason._id,
        body: 'Hey! Great choice. Do you have time to chat over the phone later this week? I would love to answer all your questions.',
      },
    ],
  });

  await Conversation.create({
    participants: [student._id, sophia._id],
    sublease: (await Sublease.findOne({ poster: sophia._id }))._id,
    listing: almondwood._id,
    contextLabel: 'Verified Student Subleaser — Almondwood Apartments',
    messages: [
      {
        sender: student._id,
        body: 'Hello! I was looking to sublease at Almondwood over the summer and was wondering if you could tell me more about your place.',
      },
      {
        sender: sophia._id,
        body:
          "Of course. I have a private room in a 4-bedroom apartment. The bathroom is shared but I don't think my housemates will be there over the summer. PG&E isn't included in the $1,200 — it's around $80 extra each month. Let me know if you have any other questions.",
      },
    ],
  });

  console.log('[seed] done');
}

module.exports = { seedDatabase };
