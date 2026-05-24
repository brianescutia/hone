// Davis-area apartment complexes — clean reference data for seed/import.
//
// This file replaces ad-hoc strings hard-coded in seedData.js with a
// structured list of well-known UC Davis-area properties. It is the
// SOURCE OF TRUTH for "what apartments do we know about", which means:
//
//   - Operator can edit one place to add a complex, not re-write seedData.
//   - Apify imports / manual-paste imports compare against this list to
//     deduplicate (matching by `name` + `address`).
//   - The optional `bootstrap-davis-apartments.js` script reads this and
//     inserts Listing rows for any complexes that don't already exist,
//     marked claimable=true and with sourceType='manual_seed'.
//
// DATA SOURCING NOTES
//
//   - Addresses, websites, phone numbers, operator names, and bedroom
//     ranges were verified against each property's own website or
//     Yelp/Apartments.com listing in May 2026. Where multiple sources
//     disagreed (e.g. operator switched between FPI and a sister
//     listing), the property's own website wins.
//
//   - Pet policies are recorded as `true` (cats and/or dogs welcome),
//     `false` (no cats or dogs — e.g. Sundance allows only small caged
//     animals, The Colleges at La Rue is no-pets), or `null` (unknown).
//
//   - Coordinates are approximate neighborhood centers. They're good
//     enough to put the map pin in the right neighborhood; managers can
//     refine after claiming. For two adjacent Davisville properties
//     (Almondwood + Fountain Circle on the same block of Alvarado), we
//     hard-code a specific lat/lng so they don't render on top of each
//     other on the map.
//
// IMPORTANT RULES
//
//   - Do NOT invent specific rent prices unless you have a current source
//     for them. `priceMin` / `priceMax` are nullable on purpose. Stale
//     rent numbers are worse than no numbers — students will not catch on
//     until they tour the unit.
//
//   - Do NOT inflate amenities. If you don't know whether a complex has
//     in-unit washer/dryer, leave it out of `amenities`. Better to ship
//     fewer fields than fake ones.
//
//   - `claimable: true` and `claimedByManager: false` are the right
//     defaults — these apartments are claimable by their managers via
//     the standard ManagerClaim flow. They must NOT be tied to a single
//     fake "demo manager" account in seed data.
//
//   - Photos: we ship empty `photos: []` for properties we don't have
//     official imagery for. The ListingImage placeholder component
//     renders gracefully. Adding stock photos that look like the property
//     but aren't would be misleading.
//
//   - The Green at West Village is UC Davis Student Housing and Dining
//     Services-managed (CHF-Davis I, LLC), primarily for transfer
//     students. It's accessed through the university's housing process,
//     not via market listings. It's kept here for discoverability but
//     the description should make that clear so students aren't confused.

// Approximate centers. These coordinates are good enough for the map to
// place the pin in the right neighborhood; the manager can refine them
// after claiming.
const C = Object.freeze({
  WEST_DAVIS: { lat: 38.5566, lng: -121.7820 },
  NORTH_DAVIS: { lat: 38.5645, lng: -121.7546 },
  CENTRAL_DAVIS: { lat: 38.5449, lng: -121.7405 },
  EAST_DAVIS: { lat: 38.5440, lng: -121.7152 },
  SOUTH_DAVIS: { lat: 38.5345, lng: -121.7359 },
  CAMPUS_EDGE: { lat: 38.5408, lng: -121.7647 },
  WEST_VILLAGE: { lat: 38.5345, lng: -121.7765 },
});

// Shape contract — fields are intentionally permissive (null where unknown).
// See backend/models/Listing.js for the canonical types.
const DAVIS_APARTMENTS = [
  {
    name: 'Almondwood Apartments',
    address: '1212 Alvarado Ave, Davis, CA 95616',
    area: 'North Davis',
    location: { lat: 38.5611, lng: -121.7621 },
    sourceUrl: 'https://www.davisapartmentsforrent.com/almondwood/',
    contactEmail: 'almondwood@davisapartmentsforrent.com',
    contactPhone: '(530) 753-2115',
    description:
      'North Davis apartment community across from the Marketplace Shopping Center, managed by Davisville Management Company. Built 1981. Unitrans G and J bus lines run from the curb to UC Davis.',
    bedroomsMin: 1,
    bedroomsMax: 4,
    bathroomsMin: 1,
    bathroomsMax: 4.5,
    priceMin: null,
    priceMax: null,
    amenities: ['Swimming pool', 'Hot tub', 'Clubhouse', 'Fitness center', 'Covered parking', 'Free WiFi'],
    keyAmenities: ['Pet-friendly', 'Parking included'],
    petFriendly: true,
    parking: true,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'G', minutes: 10 } },
    sourceType: 'manual_seed',
    verificationStatus: 'verified',
    claimable: true,
    claimStatus: 'unclaimed',
    claimedByManager: false,
    managerVerified: false,
    photos: [],
  },
  {
    name: 'The Colleges at La Rue',
    address: '164 Orchard Park Dr, Davis, CA 95616',
    area: 'Campus edge',
    location: C.CAMPUS_EDGE,
    sourceUrl: 'https://colleges.tandemproperties.com/',
    contactEmail: 'thecolleges@tandemproperties.com',
    contactPhone: '(877) 861-3594',
    description:
      'On-campus apartment community managed by Tandem Properties, open ONLY to UC Davis full-time continuing undergraduate, graduate, and transfer students. Located across La Rue Road from the UC Davis Activities and Recreation Center.',
    bedroomsMin: 1, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Furnished options', 'Study lounge', 'Free Wi-Fi', 'Free campus parking permit'],
    keyAmenities: ['Walk to campus', 'UC Davis students only'],
    petFriendly: false, parking: true,
    tags: ['long term', 'students only'],
    commute: { walk: { minutes: 5 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Tanglewood Apartments',
    address: '1880 Cowell Blvd, Davis, CA 95618',
    area: 'South Davis',
    location: C.SOUTH_DAVIS,
    sourceUrl: 'https://www.tanglewooddavisliving.com/',
    contactEmail: '',
    contactPhone: '',
    description:
      'South Davis apartment community managed by FPI Management, near the Pole Line/Cowell intersection. Two pools, 24-hour fitness center, study lounge with free Wi-Fi. Served by Unitrans M and W bus lines.',
    bedroomsMin: 1, bedroomsMax: 3, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Two swimming pools', '24-hour fitness center', 'Study lounge', 'In-unit washer/dryer'],
    keyAmenities: ['Pet-friendly', 'Two pools'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly', 'sublease'],
    commute: { bus: { line: 'M' } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Sycamore Lane Apartments',
    address: '614 Sycamore Ln, Davis, CA 95616',
    area: 'Central Davis',
    location: { lat: 38.5485, lng: -121.7621 },
    sourceUrl: 'https://www.sycamorelanedavis.com/',
    contactEmail: 'manager@sycamorelanedavis.com',
    contactPhone: '(530) 756-4186',
    description:
      'Central Davis apartment community across Russell Boulevard from UC Davis main campus, next to Trader Joe\'s and University Mall. 158 units in 1, 2, 4, and 5-bedroom flats and townhouses. Built 1969.',
    bedroomsMin: 1, bedroomsMax: 5, bathroomsMin: 1, bathroomsMax: 3,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', 'Exercise facility', 'BBQ area', 'In-unit laundry', 'Study area with free internet'],
    keyAmenities: ['Walk to campus', 'Pool'],
    petFriendly: false, parking: true,
    tags: ['long term'],
    commute: { bike: { minutes: 5 }, walk: { minutes: 15 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Fountain Circle Townhomes',
    address: '1213 Alvarado Ave, Davis, CA 95616',
    area: 'North Davis',
    location: { lat: 38.5613, lng: -121.7615 },
    sourceUrl: 'https://www.davisapartmentsforrent.com/fountaincircle/',
    contactEmail: 'fountaincircle@davisapartmentsforrent.com',
    contactPhone: '(530) 753-0408',
    description:
      'North Davis townhome community on Alvarado Avenue across from the Marketplace Shopping Center, managed by Davisville Management Company. 1- to 4-bedroom townhomes (570–1,849 sqft) with patios and in-unit AC. Sister property to Almondwood Apartments directly across the street.',
    bedroomsMin: 1, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 3,
    priceMin: null, priceMax: null,
    amenities: ['Pool and spa', 'Fitness center', 'Clubhouse', 'Free Wi-Fi', 'Free parking', 'Patios'],
    keyAmenities: ['Townhome layout', 'Pet-friendly'],
    petFriendly: true, parking: true,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'G' } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Aggie Square Apartments',
    address: '644 Alvarado Ave, Davis, CA 95616',
    area: 'North Davis',
    location: { lat: 38.5605, lng: -121.7563 },
    sourceUrl: 'https://www.davisapartmentsforrent.com/aggiesquare/',
    contactEmail: 'aggiesquare@davisapartmentsforrent.com',
    contactPhone: '(530) 758-4752',
    description:
      'North Davis apartment community on Alvarado Avenue across from Anderson Plaza shopping center, managed by Davisville Management Company. 1-, 2-, and 3-bedroom flats. Sister property to Almondwood and Fountain Circle. Unitrans F, G, and J bus lines run to the UC Davis MU and Silo.',
    bedroomsMin: 1, bedroomsMax: 3, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Pool and spa', 'BBQ area', 'Clubhouse', 'Fitness room', 'Free Wi-Fi'],
    keyAmenities: ['Pet-friendly', 'Free Wi-Fi'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'G' } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'University Court',
    address: '515 Sycamore Ln, Davis, CA 95616',
    area: 'Central Davis',
    location: { lat: 38.5489, lng: -121.7619 },
    sourceUrl: '',
    contactEmail: '',
    contactPhone: '',
    description:
      'Central Davis apartment community on Sycamore Lane next door to Trader Joe\'s, about a mile from the UC Davis campus. 161 fully-furnished 1- and 2-bedroom units with by-the-bed leasing available. Built 1964.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Furnished', 'Swimming pool', 'Fitness center', 'BBQ area', 'Fire pit', 'Free Wi-Fi'],
    keyAmenities: ['Furnished', 'By-the-bed leasing'],
    petFriendly: null, parking: null,
    tags: ['long term', 'furnished'],
    commute: { bike: { minutes: 7 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Pinecrest Apartments',
    address: '920 Cranbrook Ct, Davis, CA 95616',
    area: 'East Davis',
    location: C.EAST_DAVIS,
    sourceUrl: '',
    contactEmail: '',
    contactPhone: '(877) 528-1642',
    description:
      'East Davis apartment community on Cranbrook Court near East Covell Boulevard. 1- and 2-bedroom apartments (600–800 sqft) with common-area Wi-Fi, 24-hour fitness center, and pool. About a mile from UC Davis. Sister communities include Renaissance Park and Silverstone. Served by Unitrans E bus line.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', '24-hour fitness center', 'Common-area Wi-Fi'],
    keyAmenities: ['Pet-friendly'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'E' } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Anderson Place',
    address: '1850 Hanover Dr, Davis, CA 95616',
    area: 'Central Davis',
    location: { lat: 38.5550, lng: -121.7517 },
    sourceUrl: 'https://andersonplace.tandemproperties.com/',
    contactEmail: '',
    contactPhone: '',
    description:
      'Central Davis apartment community on Hanover Drive at the northern end of Central Davis, managed by Tandem Properties. Studio to 2-bedroom units (511–815 sqft) in a park-like setting next to Anderson Plaza shopping. About a mile from UC Davis. Unitrans F bus line on-site.',
    bedroomsMin: 0, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 1,
    priceMin: null, priceMax: null,
    amenities: ['Pool and spa', '24-hour fitness center', 'Cafe', 'Study lounge', 'Community garden', 'Free high-speed internet', 'Free parking'],
    keyAmenities: ['Pet-friendly', 'Free Wi-Fi'],
    petFriendly: true, parking: true,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'F' } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Arlington Farm',
    address: '2901 Portage Bay W, Davis, CA 95616',
    area: 'West Davis',
    location: C.WEST_DAVIS,
    sourceUrl: 'https://arlingtonfarm.tandemproperties.com/',
    contactEmail: '',
    contactPhone: '(866) 762-3576',
    description:
      'West Davis apartment community on Portage Bay West, tucked beyond Russell Boulevard, managed by Tandem Properties. 1-, 2-, 3-, and 4-bedroom apartments (1,008–1,752 sqft) across 41 buildings. Pool, four spas, fitness center. About 1.5 miles from UC Davis on Unitrans D and K bus lines.',
    bedroomsMin: 1, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', 'Four spas', 'Fitness center', 'Study room', 'On-site laundry', 'Covered parking'],
    keyAmenities: ['Pet-friendly', 'Spacious floor plans'],
    petFriendly: true, parking: true,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'D' }, bike: { minutes: 10 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Sorrento Apartments',
    address: '1540 Valdora St, Davis, CA 95618',
    area: 'South Davis',
    location: C.SOUTH_DAVIS,
    sourceUrl: 'https://www.livesorrentodavis.com/',
    contactEmail: '',
    contactPhone: '(530) 457-1939',
    description:
      'South Davis townhome-style apartment community on Valdora Street near Oakshade Town Center, managed by Asset Living. 2-, 3-, and 4-bedroom townhomes (850–1,600 sqft) with pool, spa, and covered parking. About a 10-minute bike ride to UC Davis. Built 1992.',
    bedroomsMin: 2, bedroomsMax: 4, bathroomsMin: 1.5, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', 'Hot tub', 'Fitness center', 'Covered parking', 'Bicycle storage', 'Optional washer/dryer'],
    keyAmenities: ['Townhome layout', 'Pet-friendly'],
    petFriendly: true, parking: true,
    tags: ['long term', 'pet-friendly'],
    commute: { bus: { line: 'W' }, bike: { minutes: 10 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Sundance Apartments',
    address: '510 Arthur St, Davis, CA 95616',
    area: 'West Davis',
    location: C.WEST_DAVIS,
    sourceUrl: 'https://sundance.tandemproperties.com/',
    contactEmail: '',
    contactPhone: '',
    description:
      'West Davis apartment community on Arthur Street, just off Russell Boulevard across from UC Davis West Village, managed by Tandem Properties. 1- and 2-bedroom apartments and townhouses with pool, spa, and dry saunas. No cats or dogs allowed — small caged animals, birds, and fish only. Unitrans D, K, and P/Q bus lines.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', 'Spa', 'Dry saunas', 'Covered parking', 'Central heat and air'],
    keyAmenities: ['Across from West Village', 'Pool and saunas'],
    petFriendly: false, parking: true,
    tags: ['long term'],
    commute: { bus: { line: 'P' }, bike: { minutes: 5 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Renaissance Park',
    address: '3000 Lillard Dr, Davis, CA 95618',
    area: 'South Davis',
    location: C.SOUTH_DAVIS,
    sourceUrl: 'https://www.renaissancepark-davis.com/',
    contactEmail: 'RenaissancePark@fpmgrp.com',
    contactPhone: '(530) 758-5620',
    description:
      'South Davis apartment community on Lillard Drive, managed by FPI Management. 1- and 2-bedroom apartments (675–837 sqft) with pool, 24-hour fitness center, and half-mile running path. About 10 minutes to UC Davis. Built 1973.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', '24-hour fitness center', 'Half-mile running path', 'BBQ/picnic area', 'In-unit washer/dryer (select units)'],
    keyAmenities: ['Pet-friendly', 'Running path'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly'],
    commute: { bike: { minutes: 10 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Adobe at Evergreen',
    address: '1500 Shasta Dr, Davis, CA 95616',
    area: 'West Davis',
    location: C.WEST_DAVIS,
    sourceUrl: 'https://adobe.tandemproperties.com/',
    contactEmail: '',
    contactPhone: '(530) 297-0342',
    description:
      'West Davis suite-style apartment community on Shasta Drive, managed by Tandem Properties and a UC Davis Housing Partner. 1- to 4-bedroom apartments with private bathrooms and per-bedroom mini fridge and microwave. 24-hour fitness center, study lounge, pool, and spa. Individual Lease Program available. Built 2000.',
    bedroomsMin: 1, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 4,
    priceMin: null, priceMax: null,
    amenities: ['Pool and spa', '24-hour fitness center', 'Study lounge', 'Suite-style rooms', 'Individual Lease Program'],
    keyAmenities: ['UC Davis Housing Partner', 'Pet-friendly'],
    petFriendly: true, parking: null,
    tags: ['long term', 'furnished', 'pet-friendly'],
    commute: { bike: { minutes: 10 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'The Spoke',
    address: '801 J St, Davis, CA 95616',
    area: 'Central Davis',
    location: C.CENTRAL_DAVIS,
    sourceUrl: 'https://www.apartments.com/the-spoke-student-living-davis-ca/n1kn94q/',
    contactEmail: '',
    contactPhone: '',
    description:
      'Central Davis student apartment community on J Street, about a mile from UC Davis. 1- and 2-bedroom apartments and townhomes with by-the-bed leasing and furniture packages. Pet-friendly with three pools, expanded fitness center, study lounge, two on-site Unitrans bus stops (E and L lines), and a dog park.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Three swimming pools', 'Fitness center', 'Study lounge', 'Dog park', 'On-site Unitrans stops', 'Bike maintenance station'],
    keyAmenities: ['Furnished', 'By-the-bed leasing', 'Pet-friendly'],
    petFriendly: true, parking: null,
    tags: ['long term', 'furnished', 'pet-friendly'],
    commute: { bus: { line: 'E' }, bike: { minutes: 7 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Identity Davis',
    address: '525 Oxford Cir, Davis, CA 95616',
    area: 'Central Davis',
    location: C.CENTRAL_DAVIS,
    sourceUrl: 'https://www.identitydavis.com/',
    contactEmail: '',
    contactPhone: '',
    description:
      'Central Davis luxury student apartment community on Oxford Circle, about 0.4 miles from UC Davis. Built 2021, 7 stories. 3-, 4-, and 5-bedroom fully-furnished apartments with private bedrooms and bathrooms, in-unit washer/dryer, quartz countertops, and stainless-steel appliances.',
    bedroomsMin: 3, bedroomsMax: 5, bathroomsMin: 3, bathroomsMax: 5,
    priceMin: null, priceMax: null,
    amenities: ['Resort-style swimming pool', 'Sky lounge', '24-hour fitness center', 'Yoga studio', 'Coffee bar', 'In-unit washer/dryer', 'Furnished'],
    keyAmenities: ['Walk to campus', 'Furnished', 'Pet-friendly'],
    petFriendly: true, parking: null,
    tags: ['long term', 'furnished', 'pet-friendly'],
    commute: { walk: { minutes: 8 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Sol at West Village',
    address: '1580 Jade St, Davis, CA 95616',
    area: 'West Village',
    location: C.WEST_VILLAGE,
    sourceUrl: 'https://solatwestvillage.com/',
    contactEmail: '',
    contactPhone: '(888) 413-6053',
    description:
      'West Village UC Davis student apartment community on Jade Street, managed by Landmark Properties. Largest planned zero-net-energy community in the United States. 683 units across 4 stories. 1-, 2-, 3-, and 4-bedroom fully-furnished apartments. Leases ONLY to UC Davis or Los Rios students, staff, or faculty. Built 2011. Unitrans V line.',
    bedroomsMin: 1, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 4,
    priceMin: null, priceMax: null,
    amenities: ['Two recreation pools', 'Heated lap pool and spa', '24/7 fitness center', 'Yoga studio', 'Furnished', 'Utilities included', 'In-unit washer/dryer'],
    keyAmenities: ['Walk to campus', 'Furnished', 'UC Davis students/staff only'],
    petFriendly: true, parking: null,
    tags: ['long term', 'furnished', 'pet-friendly', 'students only'],
    commute: { bus: { line: 'V' }, bike: { minutes: 8 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'The Green at West Village',
    address: '2228 Tilia St, Davis, CA 95616',
    area: 'West Village',
    location: C.WEST_VILLAGE,
    sourceUrl: 'https://housing.ucdavis.edu/apartments/the-green/',
    contactEmail: 'studenthousing@ucdavis.edu',
    contactPhone: '',
    description:
      'On-campus West Village apartments owned by CHF-Davis I, LLC and operated by UC Davis Student Housing and Dining Services. Largest net-zero-energy community in North America (3,290 beds across 1,247 units). Primarily houses UC Davis transfer students. Application is through the UC Davis student housing process — not external listings. Studio and apartment-style configurations. Unitrans V line.',
    bedroomsMin: 0, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 4,
    priceMin: null, priceMax: null,
    amenities: ['Full-size in-unit washer/dryer', 'Solar canopy parking', 'Sage Street Market & Cafe', 'Optional meal plans'],
    keyAmenities: ['UC Davis SHA-managed', 'UC Davis students only'],
    petFriendly: false, parking: true,
    tags: ['long term', 'students only', 'on-campus'],
    commute: { bus: { line: 'V' }, walk: { minutes: 15 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Axis at Davis',
    address: '2555 Research Park Dr, Davis, CA 95618',
    area: 'South Davis',
    location: C.SOUTH_DAVIS,
    sourceUrl: 'https://www.axisdavis.com/',
    contactEmail: 'AxisDavis@assetliving.com',
    contactPhone: '(530) 297-8580',
    description:
      'South Davis student apartment community on Research Park Drive, managed by Asset Living. New community opened Summer 2025. 1- and 2-bedroom apartments with rooftop lounge, fitness center, study spaces, pet park, and pet spa. About 7 minutes from UC Davis. Pet-friendly with central AC and in-unit laundry.',
    bedroomsMin: 1, bedroomsMax: 2, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Rooftop lounge', 'Fitness center', 'Study spaces', 'Pet park', 'Pet spa', 'Central AC', 'In-unit washer/dryer', '24-hour package locker'],
    keyAmenities: ['Pet-friendly', 'New construction'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly'],
    commute: { bike: { minutes: 7 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
  {
    name: 'Octave Apartments',
    address: '1659 Drew Cir, Davis, CA 95618',
    area: 'South Davis',
    location: C.SOUTH_DAVIS,
    sourceUrl: 'https://www.liveatoctaveindavis.com/',
    contactEmail: '',
    contactPhone: '(530) 750-2200',
    description:
      'South Davis townhome-style apartment community on Drew Circle, managed by FPI Management. 152 deluxe units in 2-, 3-, and 4-bedroom townhouses and flats. Pool, basketball court, clubhouse, and outdoor trails. Pet-friendly (deposit + monthly pet rent, breed/weight restrictions apply, two pets maximum). Built 2001.',
    bedroomsMin: 2, bedroomsMax: 4, bathroomsMin: 1, bathroomsMax: 2,
    priceMin: null, priceMax: null,
    amenities: ['Swimming pool', 'Basketball court', 'Clubhouse', 'Outdoor trails', 'Free Wi-Fi'],
    keyAmenities: ['Townhome layout', 'Pet-friendly'],
    petFriendly: true, parking: null,
    tags: ['long term', 'pet-friendly'],
    commute: { bike: { minutes: 8 } },
    sourceType: 'manual_seed', verificationStatus: 'verified',
    claimable: true, claimStatus: 'unclaimed', claimedByManager: false, managerVerified: false,
    photos: [],
  },
];

module.exports = {
  DAVIS_APARTMENTS,
  // Stable lookup helpers — used by import dedup logic and by the
  // bootstrap script.
  byName(name) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return DAVIS_APARTMENTS.find((a) => a.name.toLowerCase() === n) || null;
  },
  names: () => DAVIS_APARTMENTS.map((a) => a.name),
};