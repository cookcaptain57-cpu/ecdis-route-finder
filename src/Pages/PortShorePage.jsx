/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';

// ─── PORT INFO (60 ports) ─────────────────────────────────────────────────────
const PORT_INFO = [
  { id:1,  name:'Singapore',        country:'Singapore',   code:'SGSIN', timezone:'UTC+8',    type:'Mega Hub',     depth:'22m',   berths:55,  lat:1.2897,  lng:103.8501, notes:'World\'s 2nd busiest port. PSA operated. 24hr ops.' },
  { id:2,  name:'Rotterdam',        country:'Netherlands', code:'NLRTM', timezone:'UTC+1',    type:'Mega Hub',     depth:'24m',   berths:67,  lat:51.9225, lng:4.4792,   notes:'Europe\'s largest port. Rhine-Meuse delta.' },
  { id:3,  name:'Shanghai',         country:'China',       code:'CNSHA', timezone:'UTC+8',    type:'Mega Hub',     depth:'17m',   berths:125, lat:31.2304, lng:121.4737, notes:'World\'s busiest container port.' },
  { id:4,  name:'Port Klang',       country:'Malaysia',    code:'MYPKG', timezone:'UTC+8',    type:'Hub',          depth:'16m',   berths:38,  lat:3.0000,  lng:101.4000, notes:'Malaysia\'s primary port gateway.' },
  { id:5,  name:'Colombo',          country:'Sri Lanka',   code:'LKCMB', timezone:'UTC+5:30', type:'Hub',          depth:'18m',   berths:22,  lat:6.9271,  lng:79.8612,  notes:'South Asia transhipment hub.' },
  { id:6,  name:'Jebel Ali',        country:'UAE',         code:'AEJEA', timezone:'UTC+4',    type:'Mega Hub',     depth:'17m',   berths:67,  lat:24.9857, lng:55.0272,  notes:'Middle East\'s largest port. JAFZA free zone.' },
  { id:7,  name:'Hamburg',          country:'Germany',     code:'DEHAM', timezone:'UTC+1',    type:'Hub',          depth:'15.6m', berths:40,  lat:53.5753, lng:9.9752,   notes:'Germany\'s gateway. River Elbe port.' },
  { id:8,  name:'Busan',            country:'South Korea', code:'KRBSN', timezone:'UTC+9',    type:'Mega Hub',     depth:'18m',   berths:30,  lat:35.1796, lng:129.0756, notes:'NE Asia hub. HPNT & PNIT terminals.' },
  { id:9,  name:'Durban',           country:'South Africa',code:'ZADUR', timezone:'UTC+2',    type:'Regional Hub', depth:'12.8m', berths:20,  lat:-29.8587,lng:31.0218,  notes:'Africa\'s busiest port.' },
  { id:10, name:'Houston',          country:'USA',         code:'USHOU', timezone:'UTC-6',    type:'Hub',          depth:'14.6m', berths:150, lat:29.7604, lng:-95.3698, notes:'US Gulf Coast energy hub.' },
  { id:11, name:'Antwerp',          country:'Belgium',     code:'BEANR', timezone:'UTC+1',    type:'Mega Hub',     depth:'16m',   berths:60,  lat:51.2213, lng:4.4051,   notes:'Europe\'s 2nd largest. Diamond & chemical hub.' },
  { id:12, name:'Manila',           country:'Philippines', code:'PHMNL', timezone:'UTC+8',    type:'Hub',          depth:'14m',   berths:18,  lat:14.5995, lng:120.9842, notes:'Philippines main gateway. MICT & South Harbour.' },
  { id:13, name:'Los Angeles',      country:'USA',         code:'USLAX', timezone:'UTC-8',    type:'Mega Hub',     depth:'15.2m', berths:270, lat:33.7395, lng:-118.262, notes:'Busiest US container port. San Pedro Bay.' },
  { id:14, name:'Long Beach',       country:'USA',         code:'USLGB', timezone:'UTC-8',    type:'Mega Hub',     depth:'15.2m', berths:80,  lat:33.7542, lng:-118.217, notes:'2nd busiest US port. Adjacent to LA.' },
  { id:15, name:'Tianjin',          country:'China',       code:'CNTXG', timezone:'UTC+8',    type:'Mega Hub',     depth:'21m',   berths:159, lat:38.9842, lng:117.7403, notes:'Northern China\'s main port. Serves Beijing.' },
  { id:16, name:'Qingdao',          country:'China',       code:'CNTAO', timezone:'UTC+8',    type:'Mega Hub',     depth:'20m',   berths:76,  lat:36.0671, lng:120.3826, notes:'Major Chinese port on Yellow Sea.' },
  { id:17, name:'Ningbo-Zhoushan',  country:'China',       code:'CNNGB', timezone:'UTC+8',    type:'Mega Hub',     depth:'20.4m', berths:600, lat:29.8683, lng:121.5440, notes:'World\'s busiest port by tonnage.' },
  { id:18, name:'Guangzhou',        country:'China',       code:'CNGZH', timezone:'UTC+8',    type:'Mega Hub',     depth:'17m',   berths:360, lat:23.1291, lng:113.2644, notes:'Pearl River Delta hub.' },
  { id:19, name:'Hong Kong',        country:'Hong Kong',   code:'HKHKG', timezone:'UTC+8',    type:'Mega Hub',     depth:'15.5m', berths:24,  lat:22.3193, lng:114.1694, notes:'Kwai Chung container terminals.' },
  { id:20, name:'Kaohsiung',        country:'Taiwan',      code:'TWKHH', timezone:'UTC+8',    type:'Hub',          depth:'16m',   berths:109, lat:22.6273, lng:120.3014, notes:'Taiwan\'s largest port.' },
  { id:21, name:'Tokyo',            country:'Japan',       code:'JPTYO', timezone:'UTC+9',    type:'Hub',          depth:'15m',   berths:88,  lat:35.6762, lng:139.6503, notes:'Japan\'s capital port. Aomi & Oi terminals.' },
  { id:22, name:'Yokohama',         country:'Japan',       code:'JPYOK', timezone:'UTC+9',    type:'Hub',          depth:'16m',   berths:90,  lat:35.4437, lng:139.6380, notes:'Japan\'s 2nd city port. Honmoku terminal.' },
  { id:23, name:'Nagoya',           country:'Japan',       code:'JPNGO', timezone:'UTC+9',    type:'Hub',          depth:'14m',   berths:290, lat:35.0450, lng:136.8813, notes:'Japan\'s largest trading port by value.' },
  { id:24, name:'Kobe',             country:'Japan',       code:'JPUKB', timezone:'UTC+9',    type:'Hub',          depth:'15m',   berths:100, lat:34.6901, lng:135.1955, notes:'Major Japanese hub. Rokko Island terminal.' },
  { id:25, name:'Port Said',        country:'Egypt',       code:'EGPSD', timezone:'UTC+2',    type:'Hub',          depth:'16m',   berths:28,  lat:31.2564, lng:32.2841,  notes:'Northern entrance of Suez Canal.' },
  { id:26, name:'Suez',             country:'Egypt',       code:'EGSUZ', timezone:'UTC+2',    type:'Anchorage',    depth:'18m',   berths:12,  lat:29.9668, lng:32.5498,  notes:'Southern entrance of Suez Canal.' },
  { id:27, name:'Piraeus',          country:'Greece',      code:'GRPIR', timezone:'UTC+2',    type:'Hub',          depth:'15m',   berths:58,  lat:37.9477, lng:23.6477,  notes:'Mediterranean\'s busiest port. COSCO operated.' },
  { id:28, name:'Valencia',         country:'Spain',       code:'ESVLC', timezone:'UTC+1',    type:'Hub',          depth:'16m',   berths:35,  lat:39.4561, lng:-0.3311,  notes:'Spain\'s largest container port.' },
  { id:29, name:'Algeciras',        country:'Spain',       code:'ESALG', timezone:'UTC+1',    type:'Hub',          depth:'18m',   berths:24,  lat:36.1285, lng:-5.4530,  notes:'Gateway to Mediterranean. Near Gibraltar.' },
  { id:30, name:'Felixstowe',       country:'UK',          code:'GBFXT', timezone:'UTC+0',    type:'Hub',          depth:'16m',   berths:36,  lat:51.9612, lng:1.3512,   notes:'UK\'s largest container port.' },
  { id:31, name:'Southampton',      country:'UK',          code:'GBSOU', timezone:'UTC+0',    type:'Hub',          depth:'12.5m', berths:22,  lat:50.9098, lng:-1.4044,  notes:'UK major cruise & container port.' },
  { id:32, name:'Le Havre',         country:'France',      code:'FRLEH', timezone:'UTC+1',    type:'Hub',          depth:'15m',   berths:30,  lat:49.4938, lng:0.1077,   notes:'France\'s largest port. Seine estuary.' },
  { id:33, name:'Marseille',        country:'France',      code:'FRMRS', timezone:'UTC+1',    type:'Hub',          depth:'15m',   berths:40,  lat:43.2965, lng:5.3698,   notes:'France\'s oldest & 2nd largest port.' },
  { id:34, name:'Genoa',            country:'Italy',       code:'ITGOA', timezone:'UTC+1',    type:'Hub',          depth:'14m',   berths:30,  lat:44.4056, lng:8.9463,   notes:'Italy\'s busiest port. Ligurian Sea.' },
  { id:35, name:'Barcelona',        country:'Spain',       code:'ESBCN', timezone:'UTC+1',    type:'Hub',          depth:'16m',   berths:27,  lat:41.3851, lng:2.1734,   notes:'NW Mediterranean hub. Cruise port.' },
  { id:36, name:'Mumbai',           country:'India',       code:'INBOM', timezone:'UTC+5:30', type:'Hub',          depth:'14m',   berths:54,  lat:18.9388, lng:72.8354,  notes:'India\'s largest port. JNPT nearby.' },
  { id:37, name:'Chennai',          country:'India',       code:'INMAA', timezone:'UTC+5:30', type:'Hub',          depth:'14m',   berths:24,  lat:13.0827, lng:80.2707,  notes:'India\'s 2nd largest container port.' },
  { id:38, name:'Nhava Sheva',      country:'India',       code:'INNSA', timezone:'UTC+5:30', type:'Hub',          depth:'14m',   berths:20,  lat:18.9500, lng:72.9500,  notes:'JNPT — India\'s busiest container port.' },
  { id:39, name:'Karachi',          country:'Pakistan',    code:'PKKAR', timezone:'UTC+5',    type:'Hub',          depth:'14m',   berths:33,  lat:24.8607, lng:67.0011,  notes:'Pakistan\'s main port & economic hub.' },
  { id:40, name:'Chittagong',       country:'Bangladesh',  code:'BDCGP', timezone:'UTC+6',    type:'Hub',          depth:'9.5m',  berths:19,  lat:22.3419, lng:91.8325,  notes:'Bangladesh\'s main seaport.' },
  { id:41, name:'Laem Chabang',     country:'Thailand',    code:'THLCH', timezone:'UTC+7',    type:'Hub',          depth:'14.5m', berths:20,  lat:13.0857, lng:100.8997, notes:'Thailand\'s main deep-sea container port.' },
  { id:42, name:'Ho Chi Minh City', country:'Vietnam',     code:'VNSGN', timezone:'UTC+7',    type:'Hub',          depth:'12m',   berths:50,  lat:10.8231, lng:106.6297, notes:'Cat Lai is largest terminal. Saigon Port.' },
  { id:43, name:'Haiphong',         country:'Vietnam',     code:'VNHPH', timezone:'UTC+7',    type:'Hub',          depth:'8.4m',  berths:26,  lat:20.8449, lng:106.6881, notes:'Northern Vietnam gateway.' },
  { id:44, name:'Jakarta',          country:'Indonesia',   code:'IDJKT', timezone:'UTC+7',    type:'Hub',          depth:'10m',   berths:56,  lat:-6.1945, lng:106.8227, notes:'Tanjung Priok — Indonesia\'s largest port.' },
  { id:45, name:'Surabaya',         country:'Indonesia',   code:'IDSUB', timezone:'UTC+7',    type:'Hub',          depth:'10m',   berths:38,  lat:-7.2575, lng:112.7521, notes:'Tanjung Perak port. Eastern Java hub.' },
  { id:46, name:'Mombasa',          country:'Kenya',       code:'KEMBA', timezone:'UTC+3',    type:'Regional Hub', depth:'13m',   berths:20,  lat:-4.0435, lng:39.6682,  notes:'East Africa\'s main port. Gateway to landlocked nations.' },
  { id:47, name:'Lagos',            country:'Nigeria',     code:'NGLOS', timezone:'UTC+1',    type:'Regional Hub', depth:'12m',   berths:23,  lat:6.4541,  lng:3.3947,   notes:'West Africa\'s busiest port. Apapa terminals.' },
  { id:48, name:'Dakar',            country:'Senegal',     code:'SNDKR', timezone:'UTC+0',    type:'Regional Hub', depth:'13.5m', berths:15,  lat:14.6928, lng:-17.4467, notes:'West Africa hub. Dakar Autonomous Port.' },
  { id:49, name:'Cape Town',        country:'South Africa',code:'ZACPT', timezone:'UTC+2',    type:'Hub',          depth:'13m',   berths:18,  lat:-33.9249,lng:18.4241,  notes:'Gateway to southern Africa.' },
  { id:50, name:'Santos',           country:'Brazil',      code:'BRSSZ', timezone:'UTC-3',    type:'Hub',          depth:'15m',   berths:80,  lat:-23.9618,lng:-46.3322, notes:'Latin America\'s largest port.' },
  { id:51, name:'Buenos Aires',     country:'Argentina',   code:'ARBUE', timezone:'UTC-3',    type:'Hub',          depth:'10.4m', berths:47,  lat:-34.6037,lng:-58.3816, notes:'Exolgan & TRP terminals. Rio de la Plata.' },
  { id:52, name:'Callao',           country:'Peru',        code:'PECLL', timezone:'UTC-5',    type:'Hub',          depth:'16m',   berths:18,  lat:-12.0464,lng:-77.1428, notes:'Peru\'s main port. DP World operated.' },
  { id:53, name:'Vancouver',        country:'Canada',      code:'CAVAN', timezone:'UTC-8',    type:'Hub',          depth:'17m',   berths:30,  lat:49.2827, lng:-123.121, notes:'Canada\'s largest port by tonnage.' },
  { id:54, name:'New York',         country:'USA',         code:'USNYC', timezone:'UTC-5',    type:'Hub',          depth:'15.2m', berths:100, lat:40.7128, lng:-74.0060, notes:'US East Coast major hub. Port Newark.' },
  { id:55, name:'Savannah',         country:'USA',         code:'USSAV', timezone:'UTC-5',    type:'Hub',          depth:'16m',   berths:26,  lat:32.0835, lng:-81.0998, notes:'Fastest growing US port. GPA operated.' },
  { id:56, name:'Baltimore',        country:'USA',         code:'USBLT', timezone:'UTC-5',    type:'Hub',          depth:'15.2m', berths:32,  lat:39.2904, lng:-76.6122, notes:'Major US East Coast auto & ro-ro port.' },
  { id:57, name:'Bremerhaven',      country:'Germany',     code:'DEBRV', timezone:'UTC+1',    type:'Hub',          depth:'16.5m', berths:16,  lat:53.5396, lng:8.5806,   notes:'Europe\'s 3rd largest container port.' },
  { id:58, name:'Gothenburg',       country:'Sweden',      code:'SEGOT', timezone:'UTC+1',    type:'Hub',          depth:'16m',   berths:28,  lat:57.7089, lng:11.9746,  notes:'Scandinavia\'s largest port.' },
  { id:59, name:'Tallinn',          country:'Estonia',     code:'EETLL', timezone:'UTC+2',    type:'Regional Hub', depth:'14m',   berths:18,  lat:59.4370, lng:24.7536,  notes:'Baltic Sea gateway. Muuga Harbour.' },
  { id:60, name:'Dar es Salaam',    country:'Tanzania',    code:'TZDAR', timezone:'UTC+3',    type:'Regional Hub', depth:'11m',   berths:15,  lat:-6.8161, lng:39.2803,  notes:'Tanzania\'s main port. East Africa gateway.' },
];

// ─── SEAFARERS CLUBS (55 entries) ─────────────────────────────────────────────
const SEAFARERS_CLUBS = [
  { id:1,  name:'Sailors\' Society Singapore',             port:'Singapore',        country:'Singapore',    address:'96 Tanjong Pagar Road, Singapore 088513',           phone:'+65 6222 1221',    hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel','Counselling'],            lat:1.2789,  lng:103.8434 },
  { id:2,  name:'Seafarers Centre Singapore (MtS)',        port:'Singapore',        country:'Singapore',    address:'Keppel Distripark Blk 20, Harbour Drive',           phone:'+65 6273 0225',    hours:'Daily 09:00-22:00',   services:['WiFi','Recreation','Counselling','Transport'],      lat:1.2654,  lng:103.8198 },
  { id:3,  name:'International Seafarers Centre Rotterdam',port:'Rotterdam',        country:'Netherlands',  address:'Conradstraat 8, 3013 AP Rotterdam',                 phone:'+31 10 413 4800',  hours:'Daily 10:00-22:00',   services:['WiFi','Bar','Recreation','Chapel'],                 lat:51.9073, lng:4.4413  },
  { id:4,  name:'International Seafarers\' Centre Hamburg',port:'Hamburg',          country:'Germany',      address:'Ditmar-Koel-Str. 2, 20459 Hamburg',                 phone:'+49 40 317 56 10', hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Chapel','Counselling','SIM'],      lat:53.5441, lng:9.9686  },
  { id:5,  name:'Stella Maris Seafarers Centre Dubai',     port:'Jebel Ali',        country:'UAE',          address:'Jebel Ali Free Zone, Gate 5, Dubai',                phone:'+971 4 883 6620',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel','Counselling'],            lat:24.9959, lng:55.0551 },
  { id:6,  name:'Busan Seafarers Welfare Centre',          port:'Busan',            country:'South Korea',  address:'34 Jungang-daero, Jung-gu, Busan 48941',            phone:'+82 51 462 6681',  hours:'Daily 08:00-22:00',   services:['WiFi','Recreation','Medical','SIM'],                lat:35.1069, lng:129.036 },
  { id:7,  name:'Durban International Seafarers Centre',   port:'Durban',           country:'South Africa', address:'19 Mahatma Gandhi Road, Durban 4001',               phone:'+27 31 301 4085',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel','SIM','Transport'],        lat:-29.8688,lng:31.0336 },
  { id:8,  name:'Filipino Seafarers\' Centre Manila',      port:'Manila',           country:'Philippines',  address:'South Harbour Complex, Port Area, Manila',          phone:'+63 2 8527 8000',  hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Recreation','Counselling'],        lat:14.5800, lng:120.9700},
  { id:9,  name:'Houston International Seafarers Center',  port:'Houston',          country:'USA',          address:'3a La Porte Freeway, Bayport TX 77507',             phone:'+1 713 672 0708',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel','Transport'],              lat:29.7355, lng:-95.2615},
  { id:10, name:'Antwerp Seafarers\' Centre',              port:'Antwerp',          country:'Belgium',      address:'Jordaenskaai 24, 2000 Antwerp',                     phone:'+32 3 232 01 01',  hours:'Daily 09:00-22:00',   services:['WiFi','Bar','Chapel','Counselling'],                lat:51.2257, lng:4.4046  },
  { id:11, name:'Seafarers Centre Felixstowe',             port:'Felixstowe',       country:'UK',           address:'Langer Road, Felixstowe IP11 2EB',                  phone:'+44 1394 670 900', hours:'Daily 09:00-21:00',   services:['WiFi','Canteen','Recreation','SIM'],                lat:51.9500, lng:1.3300  },
  { id:12, name:'Southampton Seafarers Centre',            port:'Southampton',      country:'UK',           address:'Canute Road, Southampton SO14 3FJ',                 phone:'+44 2380 631 613', hours:'Daily 08:00-20:00',   services:['WiFi','Canteen','Chapel','Counselling'],            lat:50.8966, lng:-1.4043 },
  { id:13, name:'Port of London Seafarers Centre',         port:'London (Tilbury)', country:'UK',           address:'Tilbury Docks, Essex RM18 7EH',                     phone:'+44 1375 843 761', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Recreation','Chapel','Transport'],           lat:51.4563, lng:0.3560  },
  { id:14, name:'Liverpool Seafarers Centre',              port:'Liverpool',        country:'UK',           address:'Regent Road, Liverpool L3 7BY',                     phone:'+44 151 207 2040', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Chapel','Counselling'],            lat:53.4408, lng:-3.0055 },
  { id:15, name:'Le Havre Seafarers\' Centre',             port:'Le Havre',         country:'France',       address:'76600 Le Havre, Bassin de la Citadelle',            phone:'+33 2 35 42 03 09',hours:'Mon-Sat 10:00-20:00', services:['WiFi','Canteen','Recreation'],                      lat:49.4938, lng:0.1077  },
  { id:16, name:'Marseille Seafarers Centre',              port:'Marseille',        country:'France',       address:'23 Place de la Joliette, 13002 Marseille',          phone:'+33 4 91 90 57 55',hours:'Mon-Fri 09:00-18:00', services:['WiFi','Bar','Counselling'],                         lat:43.3004, lng:5.3688  },
  { id:17, name:'Genoa International Seafarers Centre',    port:'Genoa',            country:'Italy',        address:'Via Milano 88/R, 16126 Genoa',                      phone:'+39 010 261 6661', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Chapel','Recreation'],             lat:44.4081, lng:8.9286  },
  { id:18, name:'Piraeus Seafarers Club',                  port:'Piraeus',          country:'Greece',       address:'Akti Miaouli 7, 185 35 Piraeus',                    phone:'+30 210 422 6620', hours:'Daily 09:00-22:00',   services:['WiFi','Bar','Recreation','Chapel'],                 lat:37.9477, lng:23.6431 },
  { id:19, name:'Barcelona Seafarers Centre',              port:'Barcelona',        country:'Spain',        address:'Moll de la Costa s/n, 08039 Barcelona',             phone:'+34 93 221 2248',  hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Counselling'],                     lat:41.3751, lng:2.1864  },
  { id:20, name:'Algeciras Seafarers Centre',              port:'Algeciras',        country:'Spain',        address:'Muelle de Poniente, 11201 Algeciras',               phone:'+34 956 654 445',  hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Chapel'],                          lat:36.1285, lng:-5.4530 },
  { id:21, name:'Seafarers Centre Mumbai',                 port:'Mumbai',           country:'India',        address:'Sailors\' Home, Merewether Road, Colaba',           phone:'+91 22 2202 1225', hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Recreation','Chapel'],             lat:18.9153, lng:72.8355 },
  { id:22, name:'Chennai Seafarers Centre',                port:'Chennai',          country:'India',        address:'Rajaji Salai, Chennai Harbour',                     phone:'+91 44 2523 4576', hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','SIM','Counselling'],               lat:13.1067, lng:80.2980 },
  { id:23, name:'Kochi Seafarers Centre',                  port:'Kochi',            country:'India',        address:'Willingdon Island, Kochi Port 682009',              phone:'+91 484 266 6101', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Chapel'],                          lat:9.9312,  lng:76.2673 },
  { id:24, name:'Colombo Seafarers\' Centre',              port:'Colombo',          country:'Sri Lanka',    address:'Bank of Ceylon Mawatha, Colombo 1',                 phone:'+94 11 243 2988',  hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Chapel','Recreation'],             lat:6.9400,  lng:79.8500 },
  { id:25, name:'Kaohsiung Seafarers Service Centre',      port:'Kaohsiung',        country:'Taiwan',       address:'9 Xinyi 3rd Rd, Lingya District, Kaohsiung',        phone:'+886 7 521 7310',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Recreation','Medical'],                      lat:22.6200, lng:120.290 },
  { id:26, name:'Tokyo Seafarers Club',                    port:'Tokyo',            country:'Japan',        address:'2-7-9 Kaigan, Minato-ku, Tokyo 108-0022',           phone:'+81 3 3433 6595',  hours:'Daily 09:00-21:00',   services:['WiFi','Canteen','Recreation'],                      lat:35.6479, lng:139.757 },
  { id:27, name:'Yokohama Seafarers Centre',               port:'Yokohama',         country:'Japan',        address:'1-1-4 Kaigan-dori, Naka-ku, Yokohama',              phone:'+81 45 201 8779',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel'],                          lat:35.4437, lng:139.638 },
  { id:28, name:'Nagoya Seafarers Centre',                 port:'Nagoya',           country:'Japan',        address:'2-1 Irifune, Minato-ku, Nagoya 455-0032',           phone:'+81 52 652 4800',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Recreation'],                      lat:35.0800, lng:136.870 },
  { id:29, name:'Shanghai Seafarers\' Club',               port:'Shanghai',         country:'China',        address:'1 Zhongshan E 2nd Rd, Huangpu, Shanghai',           phone:'+86 21 6329 7050', hours:'Daily 09:00-22:00',   services:['WiFi','Canteen','Bar','Recreation'],                lat:31.2420, lng:121.490 },
  { id:30, name:'Hong Kong Seafarers\' Club',              port:'Hong Kong',        country:'Hong Kong',    address:'11 Middle Road, Tsim Sha Tsui, Kowloon',            phone:'+852 2369 9431',   hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Bar','Recreation'],                lat:22.2988, lng:114.172 },
  { id:31, name:'Mombasa Seafarers Welfare Centre',        port:'Mombasa',          country:'Kenya',        address:'Kilindini Harbour, Mombasa 80100',                  phone:'+254 41 222 2177', hours:'Daily 09:00-21:00',   services:['WiFi','Canteen','Chapel','SIM'],                    lat:-4.0600, lng:39.6600 },
  { id:32, name:'Dar es Salaam Seafarers Centre',          port:'Dar es Salaam',    country:'Tanzania',     address:'Bandari Road, Dar es Salaam Harbour',               phone:'+255 22 211 6200', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Counselling'],                     lat:-6.8161, lng:39.2803 },
  { id:33, name:'Lagos Seafarers Centre',                  port:'Lagos',            country:'Nigeria',      address:'Apapa Wharf Road, Apapa, Lagos',                    phone:'+234 1 545 2288',  hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Counselling'],                     lat:6.4470,  lng:3.3724  },
  { id:34, name:'Cape Town Seafarers Centre',              port:'Cape Town',        country:'South Africa', address:'Duncan Dock, V&A Waterfront, Cape Town 8001',       phone:'+27 21 421 2618',  hours:'Daily 09:00-21:00',   services:['WiFi','Bar','Chapel','Recreation'],                 lat:-33.9058,lng:18.4224 },
  { id:35, name:'Santos Seafarers\' Club AMEM',            port:'Santos',           country:'Brazil',       address:'Rua Amador Bueno 187, Santos SP 11013',             phone:'+55 13 3232 6500', hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Chapel','Recreation'],             lat:-23.9618,lng:-46.3322},
  { id:36, name:'Buenos Aires Seafarers Centre',           port:'Buenos Aires',     country:'Argentina',    address:'Av. Antártida Argentina 1445, CABA',                phone:'+54 11 4312 5100', hours:'Mon-Fri 08:00-18:00', services:['WiFi','Canteen','Counselling'],                     lat:-34.5872,lng:-58.3723},
  { id:37, name:'Vancouver Seafarers Mission',             port:'Vancouver',        country:'Canada',       address:'517 Powell St, Vancouver BC V6A 1G8',               phone:'+1 604 681 2533',  hours:'Daily 09:00-21:00',   services:['WiFi','Canteen','Chapel','Transport'],              lat:49.2813, lng:-123.095},
  { id:38, name:'New York Seamen\'s Church Institute',     port:'New York',         country:'USA',          address:'241 Water Street, New York NY 10038',               phone:'+1 212 269 2710',  hours:'Mon-Fri 09:00-17:00', services:['WiFi','Counselling','Chapel','Legal Aid'],          lat:40.7075, lng:-74.0036},
  { id:39, name:'Los Angeles Seafarers Center',            port:'Los Angeles',      country:'USA',          address:'1014 S Seaside Ave, San Pedro CA 90731',            phone:'+1 310 519 1220',  hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Chapel','Transport','SIM'],        lat:33.7331, lng:-118.283},
  { id:40, name:'Baltimore Seafarers Center',              port:'Baltimore',        country:'USA',          address:'2800 Broening Hwy, Baltimore MD 21222',             phone:'+1 410 631 6111',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Recreation','Transport'],          lat:39.2551, lng:-76.5596},
  { id:41, name:'Savannah Seafarers Center',               port:'Savannah',         country:'USA',          address:'28 Drayton St, Savannah GA 31401',                  phone:'+1 912 233 2266',  hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel'],                          lat:32.0816, lng:-81.0917},
  { id:42, name:'Bremerhaven Seamen\'s Mission',           port:'Bremerhaven',      country:'Germany',      address:'Georgstraße 25, 27570 Bremerhaven',                 phone:'+49 471 92 39 250',hours:'Daily 09:00-21:00',   services:['WiFi','Bar','Recreation','Chapel'],                 lat:53.5396, lng:8.5806  },
  { id:43, name:'Gothenburg Seamen\'s Church',             port:'Gothenburg',       country:'Sweden',       address:'Majorsgatan 5, 414 55 Gothenburg',                  phone:'+46 31 775 4400',  hours:'Daily 10:00-20:00',   services:['WiFi','Canteen','Chapel','Recreation'],             lat:57.7000, lng:11.9700 },
  { id:44, name:'Tallinn Seamen\'s Club',                  port:'Tallinn',          country:'Estonia',      address:'Lootsi 4, 10151 Tallinn',                           phone:'+372 641 8800',    hours:'Mon-Sat 09:00-20:00', services:['WiFi','Bar','Recreation'],                          lat:59.4450, lng:24.7475 },
  { id:45, name:'Port Klang Seafarers Centre',             port:'Port Klang',       country:'Malaysia',     address:'Jalan Pelabuhan Utama, 42000 Port Klang',           phone:'+60 3 3168 7222',  hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','SIM','Transport'],                 lat:2.9978,  lng:101.384 },
  { id:46, name:'Penang Seafarers Centre',                 port:'Penang',           country:'Malaysia',     address:'Pengkalan Weld, 10300 George Town, Penang',         phone:'+60 4 261 9229',   hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Recreation'],                      lat:5.4164,  lng:100.333 },
  { id:47, name:'Ho Chi Minh City Seafarers Club',         port:'Ho Chi Minh City', country:'Vietnam',      address:'Nguyen Tat Thanh St, District 4, HCMC',             phone:'+84 28 3940 4060', hours:'Daily 08:00-22:00',   services:['WiFi','Canteen','Recreation','SIM'],                lat:10.7525, lng:106.708 },
  { id:48, name:'Jakarta Seafarers Centre',                port:'Jakarta',          country:'Indonesia',    address:'Tanjung Priok Port Area, Jakarta 14310',            phone:'+62 21 4393 8011', hours:'Daily 08:00-21:00',   services:['WiFi','Canteen','Chapel','SIM'],                    lat:-6.1044, lng:106.875 },
  { id:49, name:'Karachi Seafarers Welfare Centre',        port:'Karachi',          country:'Pakistan',     address:'West Wharf Road, Karachi Harbour 74000',            phone:'+92 21 3561 5200', hours:'Daily 08:00-20:00',   services:['WiFi','Canteen','Recreation','Chapel'],             lat:24.8413, lng:67.0099 },
  { id:50, name:'Chittagong Seafarers Centre',             port:'Chittagong',       country:'Bangladesh',   address:'Port Connecting Road, Chittagong 4100',             phone:'+880 31 712 888',  hours:'Daily 08:00-20:00',   services:['WiFi','Canteen','Counselling'],                     lat:22.3419, lng:91.8325 },
  { id:51, name:'Bangkok Seamen\'s Mission',               port:'Bangkok',          country:'Thailand',     address:'1 Klong Toey Port Area, Bangkok 10110',             phone:'+66 2 249 2388',   hours:'Mon-Sat 09:00-21:00', services:['WiFi','Canteen','Chapel','Recreation'],             lat:13.6982, lng:100.575 },
  { id:52, name:'Port Said Seamen\'s Club',                port:'Port Said',        country:'Egypt',        address:'Port Fouad, Port Said Governorate 42511',           phone:'+20 66 322 3455',  hours:'Daily 09:00-22:00',   services:['WiFi','Bar','Recreation','SIM'],                    lat:31.2564, lng:32.2841 },
  { id:53, name:'Callao Seafarers Centre',                 port:'Callao',           country:'Peru',         address:'Av. Óscar R. Benavides s/n, Callao',                phone:'+51 1 429 7700',   hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Counselling'],                     lat:-12.0620,lng:-77.138 },
  { id:54, name:'Dakar Seafarers Centre',                  port:'Dakar',            country:'Senegal',      address:'Port Autonome de Dakar, Dakar 18524',               phone:'+221 33 849 4500', hours:'Mon-Sat 09:00-20:00', services:['WiFi','Canteen','Counselling'],                     lat:14.6928, lng:-17.447},
  { id:55, name:'Tianjin Seafarers Centre',                port:'Tianjin',          country:'China',        address:'Tianjin International Port, Tanggu District',       phone:'+86 22 2576 6100', hours:'Daily 08:00-21:00',   services:['WiFi','Canteen','SIM'],                             lat:38.9842, lng:117.740 },
];

// ─── MISSION TO SEAFARERS (42 centres) ───────────────────────────────────────
const MISSION_CENTRES = [
  { id:1,  port:'Singapore',        country:'Singapore',    address:'Keppel Distripark, Blk 20 Harbour Drive',             phone:'+65 6273 0225',    email:'singapore@missiontoseafarers.org',      lat:1.2654,  lng:103.820 },
  { id:2,  port:'Rotterdam',        country:'Netherlands',  address:'Vasteland 49, 3011 BL Rotterdam',                     phone:'+31 10 414 2220',  email:'rotterdam@missiontoseafarers.org',      lat:51.9157, lng:4.4772  },
  { id:3,  port:'Hamburg',          country:'Germany',      address:'Ditmar-Koel-Straße 2, 20459 Hamburg',                 phone:'+49 40 317 56 10', email:'hamburg@missiontoseafarers.org',        lat:53.5441, lng:9.9686  },
  { id:4,  port:'Jebel Ali',        country:'UAE',          address:'Jebel Ali Port Gate 1, Dubai',                        phone:'+971 4 883 6620',  email:'dubai@missiontoseafarers.org',          lat:24.9959, lng:55.0551 },
  { id:5,  port:'Busan',            country:'South Korea',  address:'34 Jungang-daero, Jung-gu, Busan 48941',              phone:'+82 51 462 6681',  email:'busan@missiontoseafarers.org',          lat:35.1069, lng:129.036 },
  { id:6,  port:'Manila',           country:'Philippines',  address:'Pier 15, South Harbour, Port Area, Manila',           phone:'+63 2 8527 7900',  email:'manila@missiontoseafarers.org',         lat:14.5800, lng:120.970 },
  { id:7,  port:'Houston',          country:'USA',          address:'3a La Porte Freeway, Bayport TX 77507',               phone:'+1 713 672 0708',  email:'houston@missiontoseafarers.org',        lat:29.7355, lng:-95.262},
  { id:8,  port:'Durban',           country:'South Africa', address:'Fisher Street, Point, Durban 4001',                   phone:'+27 31 301 4085',  email:'durban@missiontoseafarers.org',         lat:-29.8688,lng:31.0336 },
  { id:9,  port:'Antwerp',          country:'Belgium',      address:'Jordaenskaai 24, 2000 Antwerp',                       phone:'+32 3 232 01 01',  email:'antwerp@missiontoseafarers.org',        lat:51.2257, lng:4.4046  },
  { id:10, port:'Felixstowe',       country:'UK',           address:'Langer Road, Felixstowe IP11 2EB',                    phone:'+44 1394 670 900', email:'felixstowe@missiontoseafarers.org',     lat:51.9500, lng:1.3300  },
  { id:11, port:'Southampton',      country:'UK',           address:'Canute Road, Southampton SO14 3FJ',                   phone:'+44 2380 631 613', email:'southampton@missiontoseafarers.org',    lat:50.8966, lng:-1.4043 },
  { id:12, port:'London (Tilbury)', country:'UK',           address:'Tilbury Docks, Essex RM18 7EH',                       phone:'+44 1375 843 761', email:'tilbury@missiontoseafarers.org',        lat:51.4563, lng:0.3560  },
  { id:13, port:'Liverpool',        country:'UK',           address:'Regent Road, Liverpool L3 7BY',                       phone:'+44 151 207 2040', email:'liverpool@missiontoseafarers.org',      lat:53.4408, lng:-3.0055 },
  { id:14, port:'Colombo',          country:'Sri Lanka',    address:'Bandar Port, Colombo Harbour 00100',                  phone:'+94 11 243 5000',  email:'colombo@missiontoseafarers.org',        lat:6.9271,  lng:79.8612 },
  { id:15, port:'Mumbai',           country:'India',        address:'Merewether Road, Colaba, Mumbai 400005',              phone:'+91 22 2202 1225', email:'mumbai@missiontoseafarers.org',         lat:18.9153, lng:72.8355 },
  { id:16, port:'Chennai',          country:'India',        address:'Rajaji Salai, Chennai Harbour 600001',                phone:'+91 44 2523 4576', email:'chennai@missiontoseafarers.org',        lat:13.1067, lng:80.2980 },
  { id:17, port:'Kolkata',          country:'India',        address:'Strand Road, Kolkata Port 700001',                    phone:'+91 33 2248 1211', email:'kolkata@missiontoseafarers.org',        lat:22.5744, lng:88.3629 },
  { id:18, port:'Kochi',            country:'India',        address:'Willingdon Island, Kochi Port 682009',                phone:'+91 484 266 6101', email:'kochi@missiontoseafarers.org',          lat:9.9312,  lng:76.2673 },
  { id:19, port:'Port Klang',       country:'Malaysia',     address:'Jalan Pelabuhan Utama, 42000 Port Klang',             phone:'+60 3 3168 7222',  email:'portklang@missiontoseafarers.org',      lat:2.9978,  lng:101.384 },
  { id:20, port:'Jakarta',          country:'Indonesia',    address:'Tanjung Priok Port Area, Jakarta 14310',              phone:'+62 21 4393 8011', email:'jakarta@missiontoseafarers.org',        lat:-6.1044, lng:106.875 },
  { id:21, port:'Hong Kong',        country:'Hong Kong',    address:'Kwai Chung Container Terminal, NT',                   phone:'+852 2366 6011',   email:'hongkong@missiontoseafarers.org',       lat:22.3615, lng:114.131 },
  { id:22, port:'Tokyo',            country:'Japan',        address:'2-7-9 Kaigan, Minato-ku, Tokyo 108-0022',             phone:'+81 3 3433 6595',  email:'tokyo@missiontoseafarers.org',          lat:35.6479, lng:139.757 },
  { id:23, port:'Kaohsiung',        country:'Taiwan',       address:'9 Xinyi 3rd Rd, Lingya District, Kaohsiung',          phone:'+886 7 521 7310',  email:'kaohsiung@missiontoseafarers.org',      lat:22.6200, lng:120.290 },
  { id:24, port:'Mombasa',          country:'Kenya',        address:'Kilindini Harbour, Mombasa 80100',                    phone:'+254 41 222 2177', email:'mombasa@missiontoseafarers.org',        lat:-4.0600, lng:39.6600 },
  { id:25, port:'Dar es Salaam',    country:'Tanzania',     address:'Bandari College Road, Dar es Salaam',                 phone:'+255 22 211 6200', email:'daressalaam@missiontoseafarers.org',    lat:-6.8161, lng:39.2803 },
  { id:26, port:'Lagos',            country:'Nigeria',      address:'Apapa Wharf Road, Apapa, Lagos',                      phone:'+234 1 545 2288',  email:'lagos@missiontoseafarers.org',          lat:6.4470,  lng:3.3724  },
  { id:27, port:'Cape Town',        country:'South Africa', address:'Duncan Dock, V&A Waterfront, Cape Town 8001',         phone:'+27 21 421 2618',  email:'capetown@missiontoseafarers.org',       lat:-33.9058,lng:18.4224 },
  { id:28, port:'Port Said',        country:'Egypt',        address:'Port Fouad, Port Said Governorate 42511',             phone:'+20 66 322 3455',  email:'portsaid@missiontoseafarers.org',       lat:31.2564, lng:32.2841 },
  { id:29, port:'Piraeus',          country:'Greece',       address:'Akti Miaouli 7, 185 35 Piraeus',                      phone:'+30 210 422 6620', email:'piraeus@missiontoseafarers.org',        lat:37.9477, lng:23.6431 },
  { id:30, port:'Le Havre',         country:'France',       address:'76600 Le Havre, Bassin de la Citadelle',              phone:'+33 2 35 42 03 09',email:'lehavre@missiontoseafarers.org',        lat:49.4938, lng:0.1077  },
  { id:31, port:'Marseille',        country:'France',       address:'23 Place de la Joliette, 13002 Marseille',            phone:'+33 4 91 90 57 55',email:'marseille@missiontoseafarers.org',      lat:43.3004, lng:5.3688  },
  { id:32, port:'Genoa',            country:'Italy',        address:'Via Milano 88/R, 16126 Genoa',                        phone:'+39 010 261 6661', email:'genoa@missiontoseafarers.org',          lat:44.4081, lng:8.9286  },
  { id:33, port:'Barcelona',        country:'Spain',        address:'Moll de la Costa s/n, 08039 Barcelona',               phone:'+34 93 221 2248',  email:'barcelona@missiontoseafarers.org',      lat:41.3751, lng:2.1864  },
  { id:34, port:'Algeciras',        country:'Spain',        address:'Muelle de Poniente, 11201 Algeciras',                 phone:'+34 956 654 445',  email:'algeciras@missiontoseafarers.org',      lat:36.1285, lng:-5.4530 },
  { id:35, port:'Vancouver',        country:'Canada',       address:'517 Powell St, Vancouver BC V6A 1G8',                 phone:'+1 604 681 2533',  email:'vancouver@missiontoseafarers.org',      lat:49.2813, lng:-123.095},
  { id:36, port:'New York',         country:'USA',          address:'241 Water Street, New York NY 10038',                 phone:'+1 212 269 2710',  email:'newyork@missiontoseafarers.org',        lat:40.7075, lng:-74.0036},
  { id:37, port:'Los Angeles',      country:'USA',          address:'1014 S Seaside Ave, San Pedro CA 90731',              phone:'+1 310 519 1220',  email:'losangeles@missiontoseafarers.org',     lat:33.7331, lng:-118.283},
  { id:38, port:'Baltimore',        country:'USA',          address:'2800 Broening Hwy, Baltimore MD 21222',               phone:'+1 410 631 6111',  email:'baltimore@missiontoseafarers.org',      lat:39.2551, lng:-76.5596},
  { id:39, port:'Santos',           country:'Brazil',       address:'Rua Carvalho de Mendonça 16, Santos SP',              phone:'+55 13 3219 4200', email:'santos@missiontoseafarers.org',         lat:-23.9554,lng:-46.3228},
  { id:40, port:'Gothenburg',       country:'Sweden',       address:'Majorsgatan 5, 414 55 Gothenburg',                    phone:'+46 31 775 4400',  email:'gothenburg@missiontoseafarers.org',     lat:57.7000, lng:11.9700 },
  { id:41, port:'Bremerhaven',      country:'Germany',      address:'Georgstraße 25, 27570 Bremerhaven',                   phone:'+49 471 92 39 250',email:'bremerhaven@missiontoseafarers.org',    lat:53.5396, lng:8.5806  },
  { id:42, port:'Karachi',          country:'Pakistan',     address:'West Wharf Road, Karachi Harbour 74000',              phone:'+92 21 3561 5200', email:'karachi@missiontoseafarers.org',        lat:24.8413, lng:67.0099 },
];

// ─── STELLA MARIS (42 locations) ─────────────────────────────────────────────
const STELLA_MARIS = [
  { id:1,  port:'Singapore',        country:'Singapore',    address:'47 Tanjong Pagar Road, Singapore 088464',             phone:'+65 6222 1221',    email:'singapore@stellamaris.org.sg',          lat:1.2789,  lng:103.843 },
  { id:2,  port:'Rotterdam',        country:'Netherlands',  address:'Conradstraat 8, 3013 AP Rotterdam',                   phone:'+31 10 413 4800',  email:'rotterdam@apostleshipofthesea.net',     lat:51.9073, lng:4.4413  },
  { id:3,  port:'Antwerp',          country:'Belgium',      address:'Italielei 229, 2000 Antwerp',                         phone:'+32 3 227 27 46',  email:'antwerp@apostleshipofthesea.net',       lat:51.2199, lng:4.4072  },
  { id:4,  port:'Hamburg',          country:'Germany',      address:'Johannisbollwerk 20, 20459 Hamburg',                  phone:'+49 40 317 30 60', email:'hamburg@stella-maris.de',               lat:53.5441, lng:9.9686  },
  { id:5,  port:'Jebel Ali',        country:'UAE',          address:'Jebel Ali Free Zone, Gate 5, Dubai',                  phone:'+971 4 883 7800',  email:'dubai@stellamaris.org',                 lat:25.0100, lng:55.0800 },
  { id:6,  port:'Manila',           country:'Philippines',  address:'Pier 5, North Harbour, Manila 1012',                  phone:'+63 2 8245 1234',  email:'manila@stellamaris.ph',                 lat:14.6100, lng:120.960 },
  { id:7,  port:'Durban',           country:'South Africa', address:'19 Mahatma Gandhi Road, Durban 4001',                 phone:'+27 31 301 4085',  email:'durban@stellamaris.org.za',             lat:-29.8688,lng:31.0336 },
  { id:8,  port:'Houston',          country:'USA',          address:'2200 Strang Road, La Marque TX 77568',                phone:'+1 409 938 4343',  email:'houston@stellamaris.org',               lat:29.3600, lng:-94.980},
  { id:9,  port:'Colombo',          country:'Sri Lanka',    address:'Bandar Port, Colombo Harbour 00100',                  phone:'+94 11 243 5000',  email:'colombo@stellamaris.lk',                lat:6.9450,  lng:79.8426 },
  { id:10, port:'Mumbai',           country:'India',        address:'Seafarers\' House, Merewether Road, Mumbai 400005',   phone:'+91 22 2216 0047', email:'mumbai@stellamaris.in',                 lat:18.9153, lng:72.8355 },
  { id:11, port:'Chennai',          country:'India',        address:'Rajaji Salai, Chennai Port 600001',                   phone:'+91 44 2522 6868', email:'chennai@stellamaris.in',                lat:13.1067, lng:80.2980 },
  { id:12, port:'Goa',              country:'India',        address:'Mormugao Harbour, Vasco da Gama, Goa 403802',         phone:'+91 832 252 4500', email:'goa@stellamaris.in',                    lat:15.3832, lng:73.8188 },
  { id:13, port:'Kochi',            country:'India',        address:'Willingdon Island, Kochi Port 682009',                phone:'+91 484 266 6101', email:'kochi@stellamaris.in',                  lat:9.9312,  lng:76.2673 },
  { id:14, port:'Piraeus',          country:'Greece',       address:'Plateia Karaiskaki 3, 185 35 Piraeus',                phone:'+30 210 429 4000', email:'piraeus@apostleshipofthesea.gr',        lat:37.9430, lng:23.6470 },
  { id:15, port:'Genoa',            country:'Italy',        address:'Via Balbi 5, 16126 Genoa',                            phone:'+39 010 246 5410', email:'genoa@stellamaris.it',                  lat:44.4165, lng:8.9306  },
  { id:16, port:'Naples',           country:'Italy',        address:'Via Amerigo Vespucci 9, 80142 Naples',                phone:'+39 081 206 5000', email:'naples@stellamaris.it',                 lat:40.8518, lng:14.2681 },
  { id:17, port:'Civitavecchia',    country:'Italy',        address:'Via Aurelia 2, 00053 Civitavecchia',                  phone:'+39 0766 25 200',  email:'civitavecchia@stellamaris.it',          lat:42.0934, lng:11.7965 },
  { id:18, port:'Marseille',        country:'France',       address:'23 Place de la Joliette, 13002 Marseille',            phone:'+33 4 91 90 57 55',email:'marseille@stellamaris.fr',              lat:43.3004, lng:5.3688  },
  { id:19, port:'Barcelona',        country:'Spain',        address:'Moll de la Costa s/n, 08039 Barcelona',               phone:'+34 93 221 2248',  email:'barcelona@stellamaris.es',              lat:41.3751, lng:2.1864  },
  { id:20, port:'Algeciras',        country:'Spain',        address:'C/ Emilio Santacana 5, 11201 Algeciras',              phone:'+34 956 660 805',  email:'algeciras@stellamaris.es',              lat:36.1285, lng:-5.4530 },
  { id:21, port:'Bilbao',           country:'Spain',        address:'Muelle de Ripa 2, 48001 Bilbao',                      phone:'+34 94 415 2210',  email:'bilbao@stellamaris.es',                 lat:43.2630, lng:-2.9350 },
  { id:22, port:'Felixstowe',       country:'UK',           address:'Langer Road, Felixstowe IP11 2EB',                    phone:'+44 1394 284 180', email:'felixstowe@apostleshipofthesea.org.uk', lat:51.9500, lng:1.3300  },
  { id:23, port:'Southampton',      country:'UK',           address:'Canute Road, Southampton SO14 3FJ',                   phone:'+44 2380 631 613', email:'southampton@apostleshipofthesea.org.uk',lat:50.8966, lng:-1.4043 },
  { id:24, port:'Liverpool',        country:'UK',           address:'Regent Road, Liverpool L3 7BY',                       phone:'+44 151 207 2040', email:'liverpool@apostleshipofthesea.org.uk',  lat:53.4408, lng:-3.0055 },
  { id:25, port:'Glasgow',          country:'UK',           address:'Plantation Quay, Glasgow G51 1BG',                    phone:'+44 141 427 0220', email:'glasgow@apostleshipofthesea.org.uk',    lat:55.8600, lng:-4.2900 },
  { id:26, port:'Mombasa',          country:'Kenya',        address:'Kilindini Harbour, Mombasa 80100',                    phone:'+254 41 222 2177', email:'mombasa@stellamaris.or.ke',             lat:-4.0600, lng:39.6600 },
  { id:27, port:'Dar es Salaam',    country:'Tanzania',     address:'Bandari College Road, Dar es Salaam',                 phone:'+255 22 211 6200', email:'daressalaam@stellamaris.or.tz',         lat:-6.8161, lng:39.2803 },
  { id:28, port:'Cape Town',        country:'South Africa', address:'Duncan Dock, V&A Waterfront, Cape Town 8001',         phone:'+27 21 421 2618',  email:'capetown@stellamaris.org.za',           lat:-33.9058,lng:18.4224 },
  { id:29, port:'Santos',           country:'Brazil',       address:'Rua Amador Bueno 187, Santos SP 11013',               phone:'+55 13 3232 6500', email:'santos@stellamaris.org.br',             lat:-23.9618,lng:-46.3322},
  { id:30, port:'Rio de Janeiro',   country:'Brazil',       address:'Porto do Rio, Praça Mauá 1, RJ 20081',                phone:'+55 21 2203 3900', email:'rio@stellamaris.org.br',                lat:-22.8935,lng:-43.1854},
  { id:31, port:'Buenos Aires',     country:'Argentina',    address:'Av. Antártida Argentina 1445, Buenos Aires',          phone:'+54 11 4312 5100', email:'buenosaires@stellamaris.org.ar',        lat:-34.5872,lng:-58.3723},
  { id:32, port:'Callao',           country:'Peru',         address:'Av. Óscar R. Benavides, Callao 07011',                phone:'+51 1 429 7700',   email:'callao@stellamaris.org.pe',             lat:-12.0620,lng:-77.138 },
  { id:33, port:'Vancouver',        country:'Canada',       address:'517 Powell St, Vancouver BC V6A 1G8',                 phone:'+1 604 681 2533',  email:'vancouver@apostleshipofthesea.ca',      lat:49.2813, lng:-123.095},
  { id:34, port:'New York',         country:'USA',          address:'241 Water Street, New York NY 10038',                 phone:'+1 212 269 2710',  email:'newyork@apostleshipofthesea.us',        lat:40.7075, lng:-74.0036},
  { id:35, port:'Los Angeles',      country:'USA',          address:'1014 S Seaside Ave, San Pedro CA 90731',              phone:'+1 310 519 1220',  email:'losangeles@stellamaris.org',            lat:33.7331, lng:-118.283},
  { id:36, port:'Port Said',        country:'Egypt',        address:'Port Fouad, Port Said Governorate 42511',             phone:'+20 66 322 3455',  email:'portsaid@stellamaris.org',              lat:31.2564, lng:32.2841 },
  { id:37, port:'Gothenburg',       country:'Sweden',       address:'Majorsgatan 5, 414 55 Gothenburg',                    phone:'+46 31 775 4400',  email:'gothenburg@stellamaris.se',             lat:57.7000, lng:11.9700 },
  { id:38, port:'Bremerhaven',      country:'Germany',      address:'Georgstraße 25, 27570 Bremerhaven',                   phone:'+49 471 920 3050', email:'bremerhaven@stella-maris.de',           lat:53.5396, lng:8.5806  },
  { id:39, port:'Karachi',          country:'Pakistan',     address:'West Wharf Road, Karachi Harbour 74000',              phone:'+92 21 3561 5200', email:'karachi@stellamaris.org.pk',            lat:24.8413, lng:67.0099 },
  { id:40, port:'Hong Kong',        country:'Hong Kong',    address:'8 Minden Ave, Tsim Sha Tsui, Kowloon',                phone:'+852 2366 6011',   email:'hongkong@stellamaris.org.hk',           lat:22.2988, lng:114.172 },
  { id:41, port:'Jakarta',          country:'Indonesia',    address:'Tanjung Priok Port Area, Jakarta 14310',              phone:'+62 21 4393 8011', email:'jakarta@stellamaris.org.id',            lat:-6.1044, lng:106.875 },
  { id:42, port:'Bangkok',          country:'Thailand',     address:'1 Klong Toey Port Area, Bangkok 10110',               phone:'+66 2 249 2388',   email:'bangkok@stellamaris.or.th',             lat:13.6982, lng:100.575 },
];

// ─── SIM GUIDES (35 countries) ───────────────────────────────────────────────
const SIM_GUIDES = [
  { id:1,  country:'Singapore',    flag:'🇸🇬', carriers:['Singtel','StarHub','M1'],                  bestFor:'Singtel Tourist SIM',       cost:'SGD 15–30',          data:'20–100GB',      validity:'7–30 days',  coverage:'Excellent 5G',  buyAt:'Changi Airport, 7-Eleven, port convenience stores',       tip:'Singtel has best coverage in all port areas.' },
  { id:2,  country:'UAE',          flag:'🇦🇪', carriers:['Etisalat (e&)','du'],                       bestFor:'Etisalat Visitor SIM',      cost:'AED 49–99',          data:'5–30GB',        validity:'7–30 days',  coverage:'Excellent 5G',  buyAt:'Dubai Airport, Carrefour, ENOC stations near Jebel Ali',  tip:'WhatsApp voice calls allowed on UAE SIMs.' },
  { id:3,  country:'Netherlands',  flag:'🇳🇱', carriers:['KPN','Vodafone NL','Tele2'],               bestFor:'KPN Prepaid',               cost:'€10–25',             data:'3–20GB',        validity:'14–30 days', coverage:'Excellent',     buyAt:'Schiphol Airport, AH supermarkets, KPN shops',            tip:'EU SIM roams across all Schengen ports.' },
  { id:4,  country:'South Korea',  flag:'🇰🇷', carriers:['SK Telecom','KT','LG U+'],                 bestFor:'KT Tourist SIM',            cost:'KRW 15,000–30,000',  data:'5–30GB',        validity:'5–30 days',  coverage:'Excellent 5G',  buyAt:'Incheon/Busan Airport, convenience stores (GS25, CU)',    tip:'Korea has world-class 5G. SIM comes ready-activated.' },
  { id:5,  country:'Malaysia',     flag:'🇲🇾', carriers:['Maxis','CelcomDigi','U Mobile'],           bestFor:'Maxis HotLink Tourist',     cost:'MYR 15–40',          data:'10–50GB',       validity:'7–30 days',  coverage:'Very Good 4G',  buyAt:'KLIA Airport, 7-Eleven, port kiosks at Port Klang',       tip:'CelcomDigi offers cheapest unlimited plans.' },
  { id:6,  country:'Sri Lanka',    flag:'🇱🇰', carriers:['Dialog','Mobitel','Airtel LK'],            bestFor:'Dialog Prepaid',            cost:'LKR 500–1,500',      data:'3–15GB',        validity:'30 days',    coverage:'Good 4G',       buyAt:'BIA Airport, Dialog stores near Colombo port',            tip:'Dialog has best Colombo port coverage.' },
  { id:7,  country:'Philippines',  flag:'🇵🇭', carriers:['Globe','Smart/TNT','DITO'],                bestFor:'Globe Tourist SIM',         cost:'PHP 99–299',         data:'3–30GB',        validity:'7–30 days',  coverage:'Good',          buyAt:'NAIA Airport, SM Malls, 7-Eleven, port area kiosks',      tip:'DITO offers best value — unlimited social media included.' },
  { id:8,  country:'Germany',      flag:'🇩🇪', carriers:['Telekom','Vodafone DE','O2'],              bestFor:'Telekom Prepaid',           cost:'€10–30',             data:'5–25GB',        validity:'28 days',    coverage:'Very Good',     buyAt:'Frankfurt Airport, Saturn, MediaMarkt stores',            tip:'Telekom has best Hamburg & Bremerhaven port signal.' },
  { id:9,  country:'South Africa', flag:'🇿🇦', carriers:['Vodacom','MTN','Cell C'],                  bestFor:'Vodacom Tourist',           cost:'ZAR 149–349',        data:'2–10GB',        validity:'30 days',    coverage:'Good (urban)',  buyAt:'OR Tambo Airport, Vodacom stores near Durban port',        tip:'Buy extra bundles — standard data depletes fast.' },
  { id:10, country:'USA',          flag:'🇺🇸', carriers:['T-Mobile','AT&T','Verizon'],               bestFor:'T-Mobile Tourist Plan',     cost:'USD 30–50',          data:'5–50GB',        validity:'30 days',    coverage:'Excellent 5G',  buyAt:'Airport stores, T-Mobile shops, Walmart',                 tip:'T-Mobile has best coverage near Houston, LA & NY ports.' },
  { id:11, country:'Japan',        flag:'🇯🇵', carriers:['NTT Docomo','SoftBank','au (KDDI)'],       bestFor:'IIJmio / Docomo Data SIM',  cost:'¥2,000–5,000',       data:'3–20GB',        validity:'15–30 days', coverage:'Excellent 5G',  buyAt:'Narita/Kansai Airport vending machines',                  tip:'Data-only SIMs widely available. Voice SIM needs passport.' },
  { id:12, country:'China',        flag:'🇨🇳', carriers:['China Mobile','China Unicom','Telecom'],   bestFor:'China Unicom Tourist',      cost:'CNY 50–150',         data:'5–30GB',        validity:'15–30 days', coverage:'Good',          buyAt:'Airport kiosks at PVG/CAN/PEK',                           tip:'VPN needed for Google/WhatsApp. Buy before arrival.' },
  { id:13, country:'Hong Kong',    flag:'🇭🇰', carriers:['3 HK','SmarTone','CMHK'],                 bestFor:'3 HK Tourist SIM',          cost:'HKD 48–128',         data:'4–50GB',        validity:'5–30 days',  coverage:'Excellent 5G',  buyAt:'HKIA Airport, 7-Eleven, Circle K',                        tip:'HK SIM works in mainland China on CMHK plans.' },
  { id:14, country:'Taiwan',       flag:'🇹🇼', carriers:['Chunghwa Telecom','Far EasTone','TWM'],    bestFor:'Chunghwa Tourist SIM',      cost:'TWD 300–700',        data:'5–30GB',        validity:'5–30 days',  coverage:'Excellent',     buyAt:'Taoyuan Airport, convenience stores (7-Eleven/OK/Hi-Life)',tip:'Pick up at airport arrivals — fastest option.' },
  { id:15, country:'Thailand',     flag:'🇹🇭', carriers:['AIS','DTAC/True','NT Mobile'],             bestFor:'AIS SIM2Fly',               cost:'THB 299–599',        data:'30GB–Unlimited', validity:'30 days',   coverage:'Very Good',     buyAt:'Suvarnabhumi Airport, 7-Eleven, AIS shops',               tip:'AIS SIM2Fly gives 15-country Asia roaming.' },
  { id:16, country:'Indonesia',    flag:'🇮🇩', carriers:['Telkomsel','XL Axiata','Indosat'],         bestFor:'Telkomsel Simpati',         cost:'IDR 50,000–150,000', data:'5–30GB',        validity:'30 days',    coverage:'Good',          buyAt:'Soekarno-Hatta Airport, Alfamart, Indomaret',             tip:'Tanjung Priok port area: Telkomsel best coverage.' },
  { id:17, country:'Vietnam',      flag:'🇻🇳', carriers:['Viettel','Mobifone','Vinaphone'],          bestFor:'Viettel Tourist SIM',       cost:'VND 100,000–250,000',data:'4–30GB',        validity:'30 days',    coverage:'Good',          buyAt:'SGN/HAN Airport, convenience stores',                     tip:'Register with passport at purchase. Very affordable.' },
  { id:18, country:'India',        flag:'🇮🇳', carriers:['Jio','Airtel','Vi (Vodafone Idea)'],       bestFor:'Airtel Tourist SIM',        cost:'INR 200–600',        data:'1–3GB/day',     validity:'28–84 days', coverage:'Very Good',     buyAt:'Airport counters, Airtel stores near port areas',          tip:'Jio best value. SIM requires passport registration.' },
  { id:19, country:'Pakistan',     flag:'🇵🇰', carriers:['Jazz','Telenor PK','Zong','Ufone'],        bestFor:'Jazz Super 4G',             cost:'PKR 300–800',        data:'5–30GB',        validity:'30 days',    coverage:'Good',          buyAt:'JIAP Airport, Jazz franchise stores near port',           tip:'Registration via CNIC/passport at point of sale.' },
  { id:20, country:'Bangladesh',   flag:'🇧🇩', carriers:['Grameenphone','Robi','Banglalink'],        bestFor:'Grameenphone Prepaid',      cost:'BDT 200–600',        data:'3–15GB',        validity:'30 days',    coverage:'Good',          buyAt:'ZIA Airport, Grameenphone service centres',               tip:'Chittagong port area has decent Grameenphone coverage.' },
  { id:21, country:'Egypt',        flag:'🇪🇬', carriers:['Vodafone EG','Orange EG','Etisalat EG'],   bestFor:'Vodafone Egypt Tourist',    cost:'EGP 100–300',        data:'5–20GB',        validity:'30 days',    coverage:'Good',          buyAt:'Cairo Airport, Vodafone stores near Canal Zone',          tip:'Buy in Port Said for Canal transit calls.' },
  { id:22, country:'Greece',       flag:'🇬🇷', carriers:['Cosmote','Vodafone GR','Wind Hellas'],     bestFor:'Cosmote Tourist',           cost:'€10–25',             data:'5–20GB',        validity:'30 days',    coverage:'Good',          buyAt:'Athens Airport, Cosmote shops, Piraeus kiosks',           tip:'EU roaming applies. Cosmote best Piraeus coverage.' },
  { id:23, country:'Spain',        flag:'🇪🇸', carriers:['Movistar','Vodafone ES','Orange ES'],      bestFor:'Movistar Prepago',          cost:'€10–30',             data:'5–30GB',        validity:'30 days',    coverage:'Excellent',     buyAt:'MAD/BCN Airport, El Corte Inglés, phone shops',           tip:'EU SIM works at all Spanish ports.' },
  { id:24, country:'France',       flag:'🇫🇷', carriers:['Orange FR','SFR','Bouygues','Free'],       bestFor:'Orange Holiday Europe',     cost:'€30–50',             data:'20–60GB',       validity:'14–21 days', coverage:'Excellent',     buyAt:'CDG Airport, Orange stores, FNAC',                        tip:'Works across EU. Good at Le Havre & Marseille ports.' },
  { id:25, country:'Italy',        flag:'🇮🇹', carriers:['TIM','Vodafone IT','WindTre'],             bestFor:'TIM Tourist SIM',           cost:'€15–30',             data:'10–30GB',       validity:'30 days',    coverage:'Very Good',     buyAt:'FCO Airport, TIM stores, Esselunga supermarkets',         tip:'EU SIM works across all Italian ports.' },
  { id:26, country:'UK',           flag:'🇬🇧', carriers:['EE','Vodafone UK','Three UK','O2 UK'],     bestFor:'Three UK Tourist PAYG',     cost:'£10–30',             data:'5–30GB',        validity:'30 days',    coverage:'Very Good',     buyAt:'Heathrow Airport, Three/EE stores, WHSmith',              tip:'Three best at Felixstowe. EE best at Southampton.' },
  { id:27, country:'Belgium',      flag:'🇧🇪', carriers:['Proximus','Orange BE','Base'],             bestFor:'Proximus Tourist',          cost:'€15–25',             data:'5–20GB',        validity:'15–30 days', coverage:'Very Good',     buyAt:'BRU Airport, Proximus shops near Antwerp port',           tip:'EU roaming. Proximus best near Antwerp docks.' },
  { id:28, country:'Kenya',        flag:'🇰🇪', carriers:['Safaricom','Airtel KE','Telkom KE'],       bestFor:'Safaricom Tourist',         cost:'KES 500–1,500',      data:'5–30GB',        validity:'30 days',    coverage:'Very Good',     buyAt:'JKIA Airport, Safaricom shops in Mombasa',                tip:'Safaricom M-PESA essential for payments near port.' },
  { id:29, country:'Nigeria',      flag:'🇳🇬', carriers:['MTN NG','Airtel NG','Glo','9mobile'],      bestFor:'MTN Nigeria Prepaid',       cost:'NGN 1,000–5,000',    data:'5–30GB',        validity:'30 days',    coverage:'Good',          buyAt:'Murtala Airport, MTN stores near Apapa port',             tip:'MTN has best Lagos port/Apapa area coverage.' },
  { id:30, country:'Brazil',       flag:'🇧🇷', carriers:['Vivo','Claro BR','TIM BR','Oi'],           bestFor:'Vivo Tourist Chip',         cost:'BRL 30–100',         data:'5–30GB',        validity:'30 days',    coverage:'Good',          buyAt:'GRU Airport, Vivo stores, Santos convenience stores',     tip:'Register with passport at purchase in Brazil.' },
  { id:31, country:'Canada',       flag:'🇨🇦', carriers:['Rogers','Bell','Telus','Freedom'],         bestFor:'Freedom Mobile Prepaid',    cost:'CAD 30–60',          data:'10–50GB',       validity:'30 days',    coverage:'Very Good',     buyAt:'YVR Airport, Rogers/Bell stores, Vancouver port area',    tip:'Canada expensive — Freedom Mobile best value.' },
  { id:32, country:'Australia',    flag:'🇦🇺', carriers:['Telstra','Optus','Vodafone AU'],           bestFor:'Telstra Prepaid',           cost:'AUD 30–50',          data:'20–80GB',       validity:'28–35 days', coverage:'Very Good',     buyAt:'SYD/MEL Airport, Woolworths, 7-Eleven',                   tip:'Telstra best rural & port coverage Australia-wide.' },
  { id:33, country:'Argentina',    flag:'🇦🇷', carriers:['Personal','Claro AR','Movistar AR'],       bestFor:'Personal Prepago',          cost:'ARS 3,000–8,000',    data:'5–20GB',        validity:'30 days',    coverage:'Good',          buyAt:'EZE Airport, Personal stores near Buenos Aires port',      tip:'Buy USD-equivalent plans to beat devaluation impact.' },
  { id:34, country:'Peru',         flag:'🇵🇪', carriers:['Claro PE','Entel PE','Bitel'],             bestFor:'Claro Peru Prepago',        cost:'PEN 25–75',          data:'5–20GB',        validity:'30 days',    coverage:'Good (Lima)',   buyAt:'LIM Airport, Claro shops near Callao port',               tip:'Claro best near Callao. Entel good for data speeds.' },
  { id:35, country:'Sweden',       flag:'🇸🇪', carriers:['Telia','Tele2 SE','Tre SE'],               bestFor:'Telia Prepaid Turbo',       cost:'SEK 150–400',        data:'10–50GB',       validity:'30 days',    coverage:'Excellent 5G',  buyAt:'ARN Airport, Telia stores, Gothenburg port area',         tip:'EU roaming. Telia best near Gothenburg docks.' },
];

// ─── MONEY EXCHANGE (42 offices) ─────────────────────────────────────────────
const EXCHANGE_OFFICES = [
  { id:1,  port:'Singapore',        country:'Singapore',    name:'Raffles Money Exchange',              address:'252 North Bridge Rd, Raffles City',                  phone:'+65 6336 0006',    hours:'Daily 09:00-21:00',   rate:'Competitive',       lat:1.2933,  lng:103.855 },
  { id:2,  port:'Singapore',        country:'Singapore',    name:'Lucky Plaza Money Changer',           address:'304 Orchard Rd #B1-15, Lucky Plaza',                 phone:'+65 6737 3878',    hours:'Mon-Sat 10:00-20:00', rate:'Best in city',      lat:1.3049,  lng:103.832 },
  { id:3,  port:'Singapore',        country:'Singapore',    name:'Mustafa Centre Forex',                address:'145 Syed Alwi Road, Little India',                   phone:'+65 6295 5855',    hours:'Daily 24 hours',      rate:'Very competitive',  lat:1.3064,  lng:103.855 },
  { id:4,  port:'Rotterdam',        country:'Netherlands',  name:'GWK Travelex Rotterdam CS',           address:'Centraal Station, Rotterdam',                        phone:'+31 900 0566',     hours:'Mon-Fri 08:00-20:00', rate:'Standard',          lat:51.9249, lng:4.4684  },
  { id:5,  port:'Antwerp',          country:'Belgium',      name:'Travelex Antwerp',                    address:'Luchthavenlei, 2100 Antwerp Airport',                phone:'+32 3 285 6500',   hours:'Daily 06:00-22:00',   rate:'Standard',          lat:51.1895, lng:4.4600  },
  { id:6,  port:'Hamburg',          country:'Germany',      name:'ReiseBank Hamburg Hbf',               address:'Hamburg Hauptbahnhof, 20099 Hamburg',                phone:'+49 40 328 16810', hours:'Daily 07:30-22:00',   rate:'Competitive',       lat:53.5530, lng:10.0064 },
  { id:7,  port:'Jebel Ali',        country:'UAE',          name:'Al Ansari Exchange JA',               address:'Ibn Battuta Mall, Jebel Ali, Dubai',                 phone:'+971 4 368 5454',  hours:'Daily 10:00-22:00',   rate:'Best in UAE',       lat:25.0432, lng:55.1177 },
  { id:8,  port:'Jebel Ali',        country:'UAE',          name:'Al Fardan Exchange Dubai',            address:'Sheikh Zayed Road, Al Quoz, Dubai',                  phone:'+971 4 320 0100',  hours:'Daily 08:00-22:00',   rate:'Very competitive',  lat:25.1400, lng:55.2100 },
  { id:9,  port:'Busan',            country:'South Korea',  name:'Hana Bank Busan Station',             address:'Busan Station, Jungang-daero, Jung-gu',              phone:'+82 51 463 2000',  hours:'Mon-Fri 09:00-16:00', rate:'Bank rate',         lat:35.1148, lng:129.042 },
  { id:10, port:'Manila',           country:'Philippines',  name:'Metrobank Money Exchange',            address:'Robinsons Place Manila, Pedro Gil',                  phone:'+63 2 8870 0700',  hours:'Daily 10:00-21:00',   rate:'Competitive',       lat:14.5802, lng:120.990 },
  { id:11, port:'Manila',           country:'Philippines',  name:'BDO Forex Ermita',                    address:'1319 Roxas Blvd, Ermita, Manila',                    phone:'+63 2 8631 8000',  hours:'Mon-Fri 09:00-17:00', rate:'Bank rate',         lat:14.5689, lng:120.982 },
  { id:12, port:'Colombo',          country:'Sri Lanka',    name:'Commercial Bank Exchange',            address:'Commercial Bank Building, Colombo 1',                phone:'+94 11 248 3100',  hours:'Mon-Fri 09:00-17:00', rate:'Bank rate',         lat:6.9344,  lng:79.8428 },
  { id:13, port:'Colombo',          country:'Sri Lanka',    name:'Peoples Bank Forex',                  address:'Sir Chittampalam A Gardiner Mw, Colombo 1',          phone:'+94 11 232 3232',  hours:'Mon-Fri 09:00-15:00', rate:'Competitive',       lat:6.9290,  lng:79.8480 },
  { id:14, port:'Mumbai',           country:'India',        name:'Thomas Cook India Mumbai',            address:'Thomas Cook Building, DN Road, Fort Mumbai',         phone:'+91 22 6160 1400', hours:'Mon-Sat 09:30-18:00', rate:'Competitive',       lat:18.9338, lng:72.8358 },
  { id:15, port:'Chennai',          country:'India',        name:'UAE Exchange Chennai',                address:'Rajaji Salai, near Chennai Port',                    phone:'+91 44 4299 7755', hours:'Mon-Sat 09:00-18:00', rate:'Competitive',       lat:13.0922, lng:80.2888 },
  { id:16, port:'Durban',           country:'South Africa', name:'Bidvest Bank Forex Durban',           address:'The Pavilion Mall, Westville, Durban',               phone:'+27 31 265 0700',  hours:'Mon-Sat 09:00-17:00', rate:'Competitive',       lat:-29.8413,lng:30.9401 },
  { id:17, port:'Cape Town',        country:'South Africa', name:'Travelex V&A Waterfront',             address:'V&A Waterfront, Cape Town 8001',                     phone:'+27 21 418 3800',  hours:'Daily 09:00-21:00',   rate:'Standard',          lat:-33.9028,lng:18.4191 },
  { id:18, port:'Houston',          country:'USA',          name:'Travelex Houston IAH',                address:'George Bush Intercontinental Airport',               phone:'+1 713 230 3710',  hours:'Daily 07:00-21:00',   rate:'Standard',          lat:29.9902, lng:-95.337},
  { id:19, port:'Los Angeles',      country:'USA',          name:'Travelex LAX Airport',                address:'Los Angeles International Airport',                  phone:'+1 310 646 2261',  hours:'Daily 06:00-22:00',   rate:'Standard',          lat:33.9416, lng:-118.408},
  { id:20, port:'New York',         country:'USA',          name:'Travelex JFK Airport',                address:'JFK International Airport, Terminal 4',              phone:'+1 718 656 2988',  hours:'Daily 06:00-22:00',   rate:'Standard',          lat:40.6413, lng:-73.778},
  { id:21, port:'Vancouver',        country:'Canada',       name:'ICE Currency Exchange Vancouver',     address:'Granville Island, Vancouver BC',                     phone:'+1 604 681 0611',  hours:'Daily 09:00-18:00',   rate:'Competitive',       lat:49.2712, lng:-123.134},
  { id:22, port:'Le Havre',         country:'France',       name:'Bureau de Change Le Havre',           address:'34 Rue de Paris, 76600 Le Havre',                    phone:'+33 2 35 42 01 10',hours:'Mon-Sat 09:00-18:30', rate:'Competitive',       lat:49.4985, lng:0.1075  },
  { id:23, port:'Marseille',        country:'France',       name:'Travelex Marseille Prado',            address:'Centre Commercial Prado, 13008 Marseille',           phone:'+33 4 91 25 55 22',hours:'Mon-Sat 10:00-19:00', rate:'Standard',          lat:43.2612, lng:5.3987  },
  { id:24, port:'Genoa',            country:'Italy',        name:'Forexchange Genova',                  address:'Via XX Settembre 19, 16121 Genoa',                   phone:'+39 010 570 1830', hours:'Mon-Sat 09:00-19:30', rate:'Competitive',       lat:44.4074, lng:8.9340  },
  { id:25, port:'Barcelona',        country:'Spain',        name:'Exact Change Barcelona Port',         address:'Moll de la Fusta, 08039 Barcelona',                  phone:'+34 93 221 0001',  hours:'Mon-Sat 09:00-20:00', rate:'Competitive',       lat:41.3751, lng:2.1834  },
  { id:26, port:'Piraeus',          country:'Greece',       name:'Eurochange Piraeus',                  address:'Karaiskaki Square, 185 35 Piraeus',                  phone:'+30 210 428 5000', hours:'Mon-Sat 09:00-21:00', rate:'Competitive',       lat:37.9439, lng:23.6459 },
  { id:27, port:'Felixstowe',       country:'UK',           name:'Post Office Felixstowe',              address:'55 Hamilton Road, Felixstowe IP11 7AQ',              phone:'+44 1394 270 291', hours:'Mon-Sat 09:00-17:30', rate:'Standard',          lat:51.9637, lng:1.3514  },
  { id:28, port:'Southampton',      country:'UK',           name:'Travelex Southampton Airport',        address:'Southampton Airport, Hampshire SO18 2NL',            phone:'+44 2380 623 800', hours:'Daily 05:30-22:00',   rate:'Standard',          lat:50.9503, lng:-1.3562 },
  { id:29, port:'Mombasa',          country:'Kenya',        name:'Standard Chartered Mombasa',          address:'Treasury Square, Nkrumah Road, Mombasa',            phone:'+254 20 329 3900', hours:'Mon-Fri 09:00-15:00', rate:'Bank rate',         lat:-4.0636, lng:39.6682 },
  { id:30, port:'Lagos',            country:'Nigeria',      name:'Bureau de Change Apapa',              address:'Wharf Road, Apapa, Lagos',                           phone:'+234 1 271 6666',  hours:'Mon-Sat 08:00-18:00', rate:'Market rate',       lat:6.4470,  lng:3.3724  },
  { id:31, port:'Santos',           country:'Brazil',       name:'Ourominas Câmbio Santos',             address:'Rua XV de Novembro 73, Santos SP',                   phone:'+55 13 3222 3200', hours:'Mon-Fri 09:00-17:00', rate:'Competitive',       lat:-23.9411,lng:-46.3282},
  { id:32, port:'Buenos Aires',     country:'Argentina',    name:'Cambio Oficial Buenos Aires',         address:'Florida 302, Microcentro, Buenos Aires',             phone:'+54 11 4311 4100', hours:'Mon-Fri 09:00-18:00', rate:'Official rate',     lat:-34.6058,lng:-58.3782},
  { id:33, port:'Port Klang',       country:'Malaysia',     name:'Maybank Port Klang Branch',           address:'Jalan Pelabuhan Utama, 42000 Port Klang',            phone:'+60 3 3168 0888',  hours:'Mon-Thu 09:00-16:00', rate:'Bank rate',         lat:2.9978,  lng:101.384 },
  { id:34, port:'Ho Chi Minh City', country:'Vietnam',      name:'Vietcombank Saigon Port Branch',      address:'29 Ben Chuong Duong, District 1, HCMC',             phone:'+84 28 3829 7245', hours:'Mon-Fri 07:30-16:00', rate:'Bank rate',         lat:10.7769, lng:106.703 },
  { id:35, port:'Bangkok',          country:'Thailand',     name:'SuperRich Thailand Klong Toey',       address:'Klong Toey Port Area, Bangkok 10110',                phone:'+66 2 251 2007',   hours:'Daily 08:30-20:00',   rate:'Best in Bangkok',   lat:13.6982, lng:100.575 },
  { id:36, port:'Jakarta',          country:'Indonesia',    name:'Bank BNI Tanjung Priok',              address:'Jl. Enggano No.1, Tanjung Priok, Jakarta',          phone:'+62 21 4393 3838', hours:'Mon-Fri 08:00-15:00', rate:'Bank rate',         lat:-6.1044, lng:106.875 },
  { id:37, port:'Port Said',        country:'Egypt',        name:'Banque Misr Port Said Branch',        address:'Port Said Corniche, Port Said Governorate',          phone:'+20 66 322 5000',  hours:'Sun-Thu 09:00-14:00', rate:'Official rate',     lat:31.2630, lng:32.2740 },
  { id:38, port:'Gothenburg',       country:'Sweden',       name:'Forex Bank Gothenburg Central',       address:'Drottningtorget 7, 411 03 Gothenburg',               phone:'+46 31 15 65 25',  hours:'Mon-Fri 08:00-18:00', rate:'Competitive',       lat:57.7074, lng:11.9735 },
  { id:39, port:'Karachi',          country:'Pakistan',     name:'Habib Bank Forex Karachi',            address:'I.I. Chundrigar Road, Karachi 74000',                phone:'+92 21 3241 7000', hours:'Mon-Fri 09:00-17:00', rate:'Bank rate',         lat:24.8607, lng:67.0011 },
  { id:40, port:'Chittagong',       country:'Bangladesh',   name:'Sonali Bank Forex Chittagong',        address:'Agrabad Commercial Area, Chittagong',                phone:'+880 31 717 900',  hours:'Sun-Thu 09:00-16:00', rate:'Bank rate',         lat:22.3300, lng:91.8300 },
  { id:41, port:'Dar es Salaam',    country:'Tanzania',     name:'CRDB Bank Forex Dar es Salaam',       address:'Kivukoni Front, Dar es Salaam CBD',                  phone:'+255 22 211 7000', hours:'Mon-Fri 08:00-16:00', rate:'Competitive',       lat:-6.8184, lng:39.2903 },
  { id:42, port:'Callao',           country:'Peru',         name:'BCP Banco Callao',                    address:'Av. Juan Pablo II, Callao 07001',                    phone:'+51 1 311 9898',   hours:'Mon-Fri 09:00-18:00', rate:'Bank rate',         lat:-12.0570,lng:-77.148 },
];

// ─── HOSPITALS (53 entries) ───────────────────────────────────────────────────
const HOSPITALS = [
  { id:1,  port:'Singapore',        country:'Singapore',    name:'Singapore General Hospital',                    type:'Government',             address:'Outram Rd, Singapore 169608',                          phone:'+65 6222 3322',    emergency:'995',              distance:'8km from PSA',         lat:1.2794,  lng:103.835 },
  { id:2,  port:'Singapore',        country:'Singapore',    name:'Raffles Hospital',                              type:'Private',                address:'585 North Bridge Rd, Singapore 188770',                phone:'+65 6311 1111',    emergency:'+65 6311 2111',    distance:'12km from PSA',        lat:1.3000,  lng:103.856 },
  { id:3,  port:'Singapore',        country:'Singapore',    name:'National University Hospital',                  type:'Government',             address:'5 Lower Kent Ridge Road, Singapore 119074',            phone:'+65 6779 5555',    emergency:'995',              distance:'14km from PSA',        lat:1.2940,  lng:103.783 },
  { id:4,  port:'Rotterdam',        country:'Netherlands',  name:'Erasmus MC',                                    type:'University Hospital',    address:'Dr. Molewaterplein 40, 3015 GD Rotterdam',             phone:'+31 10 704 0704',  emergency:'112',              distance:'6km from port',        lat:51.9101, lng:4.4681  },
  { id:5,  port:'Rotterdam',        country:'Netherlands',  name:'Ikazia Ziekenhuis',                             type:'General Hospital',       address:'Montessoriweg 1, 3083 AN Rotterdam',                   phone:'+31 10 297 7777',  emergency:'112',              distance:'5km from port',        lat:51.8924, lng:4.4748  },
  { id:6,  port:'Hamburg',          country:'Germany',      name:'UKE Hamburg',                                   type:'University Hospital',    address:'Martinistraße 52, 20246 Hamburg',                      phone:'+49 40 7410 0',    emergency:'112',              distance:'10km from port',       lat:53.5895, lng:9.9755  },
  { id:7,  port:'Hamburg',          country:'Germany',      name:'AK Altona Asklepios',                           type:'General Hospital',       address:'Paul-Ehrlich-Str. 1, 22763 Hamburg',                  phone:'+49 40 1818 81 0', emergency:'112',              distance:'6km from port',        lat:53.5600, lng:9.9200  },
  { id:8,  port:'Jebel Ali',        country:'UAE',          name:'NMC Royal Hospital Jebel Ali',                  type:'Private',                address:'Dubai Investments Park, Dubai 38555',                  phone:'+971 4 883 0000',  emergency:'999',              distance:'5km from port',        lat:24.9730, lng:55.1693 },
  { id:9,  port:'Jebel Ali',        country:'UAE',          name:'Mediclinic Jebel Ali',                          type:'Private Clinic',         address:'Jebel Ali Village, Dubai 14666',                       phone:'+971 4 881 4000',  emergency:'999',              distance:'3km from port',        lat:24.9938, lng:55.0609 },
  { id:10, port:'Busan',            country:'South Korea',  name:'Pusan National University Hospital',            type:'University Hospital',    address:'179 Gudeok-ro, Seo-gu, Busan 49241',                  phone:'+82 51 240 7000',  emergency:'119',              distance:'8km from port',        lat:35.1027, lng:129.020 },
  { id:11, port:'Busan',            country:'South Korea',  name:'Dong-A University Hospital',                    type:'University Hospital',    address:'26 Daesingongwon-ro, Seo-gu, Busan',                  phone:'+82 51 240 2000',  emergency:'119',              distance:'6km from port',        lat:35.1024, lng:129.023 },
  { id:12, port:'Colombo',          country:'Sri Lanka',    name:'National Hospital Sri Lanka',                   type:'Government',             address:'Regent St, Colombo 00700',                             phone:'+94 11 269 1111',  emergency:'1990',             distance:'4km from port',        lat:6.9213,  lng:79.8644 },
  { id:13, port:'Colombo',          country:'Sri Lanka',    name:'Nawaloka Hospital',                             type:'Private',                address:'23 Deshamanya H K Dharmadasa Mw, Colombo 2',           phone:'+94 11 254 4444',  emergency:'+94 11 254 4444',  distance:'5km from port',        lat:6.9127,  lng:79.8553 },
  { id:14, port:'Durban',           country:'South Africa', name:'Inkosi Albert Luthuli Hospital',                type:'Government',             address:'800 Bellair Rd, Cato Manor, Durban 4091',              phone:'+27 31 240 1000',  emergency:'10177',            distance:'12km from port',       lat:-29.9028,lng:30.9733 },
  { id:15, port:'Durban',           country:'South Africa', name:'Entabeni Hospital',                             type:'Private',                address:'148 South Ridge Road, Berea, Durban 4001',             phone:'+27 31 204 1300',  emergency:'+27 31 204 1300',  distance:'8km from port',        lat:-29.8509,lng:31.0024 },
  { id:16, port:'Houston',          country:'USA',          name:'Memorial Hermann Texas Medical Center',         type:'Major Hospital',         address:'6411 Fannin St, Houston TX 77030',                     phone:'+1 713 704 4000',  emergency:'911',              distance:'25km from port',       lat:29.7076, lng:-95.398},
  { id:17, port:'Houston',          country:'USA',          name:'Houston Methodist Hospital',                    type:'Major Hospital',         address:'6565 Fannin St, Houston TX 77030',                     phone:'+1 713 790 3311',  emergency:'911',              distance:'25km from port',       lat:29.7089, lng:-95.397},
  { id:18, port:'Manila',           country:'Philippines',  name:'Philippine General Hospital',                   type:'Government',             address:'Taft Ave, Ermita, Manila 1000',                        phone:'+63 2 8554 8400',  emergency:'911',              distance:'5km from port',        lat:14.5783, lng:120.985},
  { id:19, port:'Manila',           country:'Philippines',  name:'Manila Doctors Hospital',                       type:'Private',                address:'667 United Nations Ave, Ermita, Manila',               phone:'+63 2 8558 0888',  emergency:'+63 2 8558 0888',  distance:'4km from port',        lat:14.5747, lng:120.987},
  { id:20, port:'Antwerp',          country:'Belgium',      name:'UZA Antwerp University Hospital',               type:'University Hospital',    address:'Drie Eikenstraat 655, 2650 Edegem',                    phone:'+32 3 821 3000',   emergency:'112',              distance:'14km from port',       lat:51.1639, lng:4.4133  },
  { id:21, port:'Antwerp',          country:'Belgium',      name:'ZNA Middelheim Antwerp',                        type:'General Hospital',       address:'Lindendreef 1, 2020 Antwerp',                          phone:'+32 3 280 3011',   emergency:'112',              distance:'6km from port',        lat:51.2067, lng:4.4188  },
  { id:22, port:'Los Angeles',      country:'USA',          name:'Harbor-UCLA Medical Center',                    type:'Government',             address:'1000 W Carson St, Torrance CA 90502',                  phone:'+1 310 222 2345',  emergency:'911',              distance:'15km from port',       lat:33.8655, lng:-118.297},
  { id:23, port:'New York',         country:'USA',          name:'Staten Island University Hospital',             type:'Major Hospital',         address:'475 Seaview Ave, Staten Island NY 10305',              phone:'+1 718 226 9000',  emergency:'911',              distance:'20km from port',       lat:40.6035, lng:-74.0848},
  { id:24, port:'Le Havre',         country:'France',       name:'Groupe Hospitalier du Havre',                   type:'Government',             address:'55 bis rue Gustave Flaubert, 76600 Le Havre',          phone:'+33 2 32 73 32 32',emergency:'15 / 112',        distance:'5km from port',        lat:49.5100, lng:0.1280  },
  { id:25, port:'Marseille',        country:'France',       name:'AP-HM Hôpital de la Timone',                    type:'University Hospital',    address:'264 Rue Saint-Pierre, 13385 Marseille',                phone:'+33 4 91 38 00 00',emergency:'15 / 112',        distance:'4km from port',        lat:43.2965, lng:5.3869  },
  { id:26, port:'Genoa',            country:'Italy',        name:'Ospedale Policlinico San Martino',              type:'University Hospital',    address:'Largo Rosanna Benzi 10, 16132 Genoa',                  phone:'+39 010 555 1',    emergency:'118',              distance:'5km from port',        lat:44.4091, lng:8.9533  },
  { id:27, port:'Barcelona',        country:'Spain',        name:'Hospital del Mar Barcelona',                    type:'Government',             address:'Passeig Marítim de la Barceloneta 25-29',              phone:'+34 93 248 3000',  emergency:'112',              distance:'3km from port',        lat:41.3871, lng:2.1936  },
  { id:28, port:'Piraeus',          country:'Greece',       name:'Tzanio General Hospital Piraeus',               type:'Government',             address:'Afendouli 1 & Zanni, 185 36 Piraeus',                  phone:'+30 210 459 3000', emergency:'166',              distance:'2km from port',        lat:37.9388, lng:23.6450 },
  { id:29, port:'Felixstowe',       country:'UK',           name:'Ipswich Hospital NHS Trust',                    type:'NHS',                    address:'Heath Road, Ipswich IP4 5PD',                          phone:'+44 1473 712233',  emergency:'999',              distance:'20km from port',       lat:52.0643, lng:1.1920  },
  { id:30, port:'Southampton',      country:'UK',           name:'Southampton General Hospital',                  type:'NHS',                    address:'Tremona Road, Southampton SO16 6YD',                   phone:'+44 2380 777222',  emergency:'999',              distance:'5km from port',        lat:50.9339, lng:-1.4353 },
  { id:31, port:'Mumbai',           country:'India',        name:'KEM Hospital',                                  type:'Government',             address:'Acharya Donde Marg, Parel, Mumbai 400012',             phone:'+91 22 2413 6051', emergency:'102',              distance:'7km from port',        lat:19.0011, lng:72.8413 },
  { id:32, port:'Mumbai',           country:'India',        name:'Lilavati Hospital',                             type:'Private',                address:'A-791, Bandra Reclamation, Bandra West',               phone:'+91 22 2675 1000', emergency:'+91 22 2675 1000', distance:'20km from port',       lat:19.0549, lng:72.8225 },
  { id:33, port:'Chennai',          country:'India',        name:'Rajiv Gandhi Government Hospital',              type:'Government',             address:'Park Town, Chennai 600003',                            phone:'+91 44 2530 5000', emergency:'108',              distance:'3km from port',        lat:13.0877, lng:80.2785 },
  { id:34, port:'Nhava Sheva',      country:'India',        name:'Wockhardt Hospital Navi Mumbai',                type:'Private',                address:'Sector 5, Plot 33, Kharghar, Navi Mumbai',             phone:'+91 22 7143 7000', emergency:'+91 22 7143 7000', distance:'10km from JNPT',       lat:19.0551, lng:73.0725 },
  { id:35, port:'Port Klang',       country:'Malaysia',     name:'Hospital Tengku Ampuan Rahimah',                type:'Government',             address:'Jalan Langat, 41200 Klang, Selangor',                  phone:'+60 3 3375 5000',  emergency:'999',              distance:'8km from port',        lat:3.0439,  lng:101.444 },
  { id:36, port:'Jakarta',          country:'Indonesia',    name:'RS Pelabuhan Jakarta',                          type:'Government',             address:'Jl. Sunter Jaya Raya No.1, Tanjung Priok',            phone:'+62 21 4300 898',  emergency:'119',              distance:'1km from port',        lat:-6.1100, lng:106.880 },
  { id:37, port:'Jakarta',          country:'Indonesia',    name:'RS Pantai Indah Kapuk',                         type:'Private',                address:'Jl. Pantai Indah Utara 3, Jakarta Utara',             phone:'+62 21 5696 0555', emergency:'+62 21 5696 0555', distance:'15km from port',       lat:-6.1182, lng:106.753 },
  { id:38, port:'Bangkok',          country:'Thailand',     name:'Bumrungrad International Hospital',             type:'Private (International)',address:'33 Sukhumvit Soi 3, Bangkok 10110',                    phone:'+66 2 066 8888',   emergency:'+66 2 066 8888',   distance:'20km from port',       lat:13.7430, lng:100.556 },
  { id:39, port:'Ho Chi Minh City', country:'Vietnam',      name:'Cho Ray Hospital',                              type:'Government',             address:'201B Nguyen Chi Thanh, District 5, HCMC',             phone:'+84 28 3855 4269', emergency:'115',              distance:'12km from port',       lat:10.7573, lng:106.667 },
  { id:40, port:'Ho Chi Minh City', country:'Vietnam',      name:'FV Hospital HCMC',                              type:'Private (International)',address:'6 Nguyen Luong Bang, District 7, HCMC',                phone:'+84 28 5411 3333', emergency:'+84 28 5411 3333', distance:'15km from port',       lat:10.7315, lng:106.719 },
  { id:41, port:'Mombasa',          country:'Kenya',        name:'Aga Khan Hospital Mombasa',                     type:'Private',                address:'Vanga Road, Tudor, Mombasa 80100',                     phone:'+254 41 222 7710', emergency:'+254 41 222 7710', distance:'5km from port',        lat:-4.0610, lng:39.6648 },
  { id:42, port:'Cape Town',        country:'South Africa', name:'Groote Schuur Hospital',                        type:'Government',             address:'Main Road, Observatory, Cape Town 7925',               phone:'+27 21 404 9111',  emergency:'10177',            distance:'10km from port',       lat:-33.9402,lng:18.4644 },
  { id:43, port:'Santos',           country:'Brazil',       name:'Hospital Ana Costa Santos',                     type:'Private',                address:'Rua Pedro Américo 60, Santos SP 11045',                phone:'+55 13 3202 1000', emergency:'192',              distance:'3km from port',        lat:-23.9549,lng:-46.3361},
  { id:44, port:'Buenos Aires',     country:'Argentina',    name:'Hospital Italiano de Buenos Aires',             type:'Private',                address:'Gascon 450, CABA, Buenos Aires',                        phone:'+54 11 4959 0200', emergency:'107',              distance:'15km from port',       lat:-34.6090,lng:-58.4307},
  { id:45, port:'Vancouver',        country:'Canada',       name:'St Paul\'s Hospital Vancouver',                 type:'Major Hospital',         address:'1081 Burrard St, Vancouver BC V6Z 1Y6',                phone:'+1 604 682 2344',  emergency:'911',              distance:'12km from port',       lat:49.2814, lng:-123.130},
  { id:46, port:'Port Said',        country:'Egypt',        name:'Port Said General Hospital',                    type:'Government',             address:'Al Gomhoreya Street, Port Said 42511',                 phone:'+20 66 322 4400',  emergency:'123',              distance:'3km from port',        lat:31.2653, lng:32.2836 },
  { id:47, port:'Karachi',          country:'Pakistan',     name:'Aga Khan University Hospital Karachi',          type:'Private (Teaching)',     address:'Stadium Road, Karachi 74800',                          phone:'+92 21 3486 1000', emergency:'+92 21 3486 1000', distance:'12km from port',       lat:24.9206, lng:67.0800 },
  { id:48, port:'Chittagong',       country:'Bangladesh',   name:'Chittagong Medical College Hospital',           type:'Government',             address:'K.B. Fazlul Kader Road, Chittagong 4203',              phone:'+880 31 630 723',  emergency:'999',              distance:'5km from port',        lat:22.3724, lng:91.7992 },
  { id:49, port:'Gothenburg',       country:'Sweden',       name:'Sahlgrenska University Hospital',               type:'University Hospital',    address:'Blå Stråket 5, 413 45 Gothenburg',                    phone:'+46 31 342 1000',  emergency:'112',              distance:'6km from port',        lat:57.6840, lng:11.9730 },
  { id:50, port:'Tallinn',          country:'Estonia',      name:'North Estonia Medical Centre',                  type:'University Hospital',    address:'J. Sütiste tee 19, 13419 Tallinn',                    phone:'+372 617 1111',    emergency:'112',              distance:'8km from Muuga',       lat:59.4130, lng:24.6710 },
  { id:51, port:'Lagos',            country:'Nigeria',      name:'Lagos University Teaching Hospital',            type:'Government',             address:'Ishaga Road, Idi-Araba, Lagos 102215',                 phone:'+234 1 774 0053',  emergency:'199',              distance:'15km from Apapa',      lat:6.5152,  lng:3.3609  },
  { id:52, port:'Dar es Salaam',    country:'Tanzania',     name:'Muhimbili National Hospital',                   type:'Government',             address:'United Nations Road, Dar es Salaam',                   phone:'+255 22 215 0610', emergency:'114',              distance:'6km from port',        lat:-6.8003, lng:39.2715 },
  { id:53, port:'Dakar',            country:'Senegal',      name:'Hôpital Principal de Dakar',                    type:'Government',             address:'Avenue Nelson Mandela, Dakar 18524',                   phone:'+221 33 839 5050', emergency:'15',               distance:'5km from port',        lat:14.6886, lng:-17.4413},
];

// ─── CURRENCY LIST ────────────────────────────────────────────────────────────
const CURRENCY_LIST = [
  { code:'USD', name:'US Dollar',            flag:'🇺🇸' },
  { code:'EUR', name:'Euro',                 flag:'🇪🇺' },
  { code:'GBP', name:'British Pound',        flag:'🇬🇧' },
  { code:'SGD', name:'Singapore Dollar',     flag:'🇸🇬' },
  { code:'AED', name:'UAE Dirham',           flag:'🇦🇪' },
  { code:'JPY', name:'Japanese Yen',         flag:'🇯🇵' },
  { code:'CNY', name:'Chinese Yuan',         flag:'🇨🇳' },
  { code:'KRW', name:'South Korean Won',     flag:'🇰🇷' },
  { code:'MYR', name:'Malaysian Ringgit',    flag:'🇲🇾' },
  { code:'PHP', name:'Philippine Peso',      flag:'🇵🇭' },
  { code:'LKR', name:'Sri Lankan Rupee',     flag:'🇱🇰' },
  { code:'ZAR', name:'South African Rand',   flag:'🇿🇦' },
  { code:'THB', name:'Thai Baht',            flag:'🇹🇭' },
  { code:'IDR', name:'Indonesian Rupiah',    flag:'🇮🇩' },
  { code:'INR', name:'Indian Rupee',         flag:'🇮🇳' },
  { code:'BRL', name:'Brazilian Real',       flag:'🇧🇷' },
  { code:'NOK', name:'Norwegian Krone',      flag:'🇳🇴' },
  { code:'DKK', name:'Danish Krone',         flag:'🇩🇰' },
  { code:'SEK', name:'Swedish Krona',        flag:'🇸🇪' },
  { code:'HKD', name:'Hong Kong Dollar',     flag:'🇭🇰' },
  { code:'AUD', name:'Australian Dollar',    flag:'🇦🇺' },
  { code:'CAD', name:'Canadian Dollar',      flag:'🇨🇦' },
  { code:'NZD', name:'New Zealand Dollar',   flag:'🇳🇿' },
  { code:'CHF', name:'Swiss Franc',          flag:'🇨🇭' },
  { code:'TWD', name:'Taiwan Dollar',        flag:'🇹🇼' },
  { code:'VND', name:'Vietnamese Dong',      flag:'🇻🇳' },
  { code:'PKR', name:'Pakistani Rupee',      flag:'🇵🇰' },
  { code:'BDT', name:'Bangladeshi Taka',     flag:'🇧🇩' },
  { code:'EGP', name:'Egyptian Pound',       flag:'🇪🇬' },
  { code:'KES', name:'Kenyan Shilling',      flag:'🇰🇪' },
  { code:'NGN', name:'Nigerian Naira',       flag:'🇳🇬' },
  { code:'ARS', name:'Argentine Peso',       flag:'🇦🇷' },
  { code:'PEN', name:'Peruvian Sol',         flag:'🇵🇪' },
  { code:'CLP', name:'Chilean Peso',         flag:'🇨🇱' },
  { code:'COP', name:'Colombian Peso',       flag:'🇨🇴' },
];

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id:'portinfo', label:'Port Info',       icon:'⚓' },
  { id:'clubs',    label:'Seafarers Clubs', icon:'🏠' },
  { id:'mission',  label:'Mission',         icon:'✝'  },
  { id:'stella',   label:'Stella Maris',    icon:'⭐' },
  { id:'sim',      label:'SIM Guide',       icon:'📱' },
  { id:'currency', label:'Currency',        icon:'💱' },
  { id:'exchange', label:'Exchange',        icon:'🏦' },
  { id:'hospital', label:'Hospital',        icon:'🏥' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const gmaps = (lat, lng, name) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&center=${lat},${lng}`;

const ServiceBadge = ({ label }) => (
  <span style={{
    display:'inline-block', padding:'2px 8px', borderRadius:20,
    fontSize:'0.62rem', fontWeight:600, letterSpacing:'0.04em',
    background:'rgba(0,180,216,0.13)', color:'var(--cyan)',
    border:'1px solid rgba(0,180,216,0.25)', marginRight:4, marginBottom:4
  }}>{label}</span>
);

const PortBadge = ({ label, color='cyan' }) => {
  const colors = {
    cyan:   { bg:'rgba(0,180,216,0.12)',  text:'var(--cyan)',   border:'rgba(0,180,216,0.25)'  },
    gold:   { bg:'rgba(240,165,0,0.12)',  text:'var(--gold)',   border:'rgba(240,165,0,0.25)'  },
    green:  { bg:'rgba(0,200,150,0.12)',  text:'var(--green)',  border:'rgba(0,200,150,0.25)'  },
    red:    { bg:'rgba(255,71,87,0.12)',  text:'var(--red)',    border:'rgba(255,71,87,0.25)'  },
    purple: { bg:'rgba(124,58,237,0.12)', text:'var(--purple)', border:'rgba(124,58,237,0.25)' },
  };
  const c = colors[color] || colors.cyan;
  return (
    <span style={{
      padding:'2px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700,
      letterSpacing:'0.05em', background:c.bg, color:c.text, border:`1px solid ${c.border}`
    }}>{label}</span>
  );
};

const MapBtn = ({ lat, lng, name }) => (
  <a href={gmaps(lat, lng, name)} target="_blank" rel="noopener noreferrer"
    style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px',
      background:'rgba(0,180,216,0.1)', border:'1px solid rgba(0,180,216,0.3)',
      borderRadius:8, color:'var(--cyan)', fontSize:'0.68rem', fontWeight:600,
      textDecoration:'none', transition:'all 0.2s', cursor:'pointer', letterSpacing:'0.03em',
      flexShrink:0
    }}
    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,180,216,0.22)'; e.currentTarget.style.borderColor='var(--cyan)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,180,216,0.1)';  e.currentTarget.style.borderColor='rgba(0,180,216,0.3)'; }}
  >📍 Map</a>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div style={{ position:'relative', marginBottom:'0.75rem' }}>
    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:'0.85rem', opacity:0.45, pointerEvents:'none' }}>🔍</span>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{
        width:'100%', padding:'10px 14px 10px 36px',
        background:'rgba(11,29,53,0.8)', border:'1px solid var(--border)',
        borderRadius:10, color:'var(--text)', fontSize:'0.8rem',
        outline:'none', transition:'border-color 0.2s', fontFamily:'inherit'
      }}
      onFocus={e=>{ e.target.style.borderColor='var(--cyan)'; }}
      onBlur={e=>{  e.target.style.borderColor='var(--border)'; }}
    />
  </div>
);

const ResultCount = ({ count, total }) => (
  <div style={{ fontSize:'0.67rem', color:'var(--text3)', marginBottom:'0.6rem', letterSpacing:'0.03em' }}>
    Showing <span style={{ color:'var(--cyan)', fontWeight:700 }}>{count}</span> of {total}
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{
    background:'var(--card)', border:'1px solid var(--border)',
    borderRadius:14, padding:'0.9rem 1rem', marginBottom:'0.65rem',
    transition:'border-color 0.2s, transform 0.18s, box-shadow 0.18s', ...style
  }}
    onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 18px rgba(0,0,0,0.3)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)';  e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='none'; }}
  >{children}</div>
);

const InfoBanner = ({ color='cyan', children }) => {
  const bg   = color==='gold' ? 'rgba(240,165,0,0.07)'   : color==='red' ? 'rgba(255,71,87,0.07)'   : 'rgba(0,180,216,0.07)';
  const bdr  = color==='gold' ? 'rgba(240,165,0,0.2)'    : color==='red' ? 'rgba(255,71,87,0.2)'    : 'rgba(0,180,216,0.2)';
  return (
    <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:10, padding:'10px 14px', marginBottom:'0.85rem', fontSize:'0.74rem', color:'var(--text2)', lineHeight:1.6 }}>
      {children}
    </div>
  );
};

// ─── TAB COMPONENTS ───────────────────────────────────────────────────────────

function PortInfoTab() {
  const [search, setSearch] = useState('');
  const filtered = PORT_INFO.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.country.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );
  const typeColor = { 'Mega Hub':'gold', 'Hub':'cyan', 'Regional Hub':'green', 'Anchorage':'purple' };
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search port name, country or LOCODE…" />
      <ResultCount count={filtered.length} total={PORT_INFO.length} />
      {filtered.map(p => (
        <Card key={p.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.86rem', fontWeight:700, color:'var(--text)' }}>{p.name}</span>
                <PortBadge label={p.type} color={typeColor[p.type]||'cyan'} />
              </div>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginBottom:5 }}>
                {p.country}&nbsp;·&nbsp;<span style={{ color:'var(--cyan)', fontFamily:'monospace', fontWeight:700 }}>{p.code}</span>&nbsp;·&nbsp;{p.timezone}
              </div>
              <div style={{ display:'flex', gap:14, fontSize:'0.71rem', color:'var(--text2)', flexWrap:'wrap', marginBottom:5 }}>
                <span>⚓ Depth: <b style={{ color:'var(--text)' }}>{p.depth}</b></span>
                <span>🏗 Berths: <b style={{ color:'var(--text)' }}>{p.berths}</b></span>
              </div>
              <div style={{ fontSize:'0.69rem', color:'var(--text3)', fontStyle:'italic', lineHeight:1.5 }}>{p.notes}</div>
            </div>
            <MapBtn lat={p.lat} lng={p.lng} name={p.name+' Port'} />
          </div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No ports found</div>}
    </div>
  );
}

function ClubsTab() {
  const [search, setSearch] = useState('');
  const filtered = SEAFARERS_CLUBS.filter(c =>
    c.port.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search port, country or club name…" />
      <ResultCount count={filtered.length} total={SEAFARERS_CLUBS.length} />
      {filtered.map(c => (
        <Card key={c.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.86rem', color:'var(--text)', marginBottom:4 }}>{c.name}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <PortBadge label={c.port} color="green" />
                <PortBadge label={c.country} color="cyan" />
              </div>
            </div>
            <MapBtn lat={c.lat} lng={c.lng} name={c.name} />
          </div>
          <div style={{ fontSize:'0.71rem', color:'var(--text2)', marginBottom:4 }}>📍 {c.address}</div>
          <div style={{ display:'flex', gap:'1rem', fontSize:'0.71rem', color:'var(--text2)', flexWrap:'wrap', marginBottom:7 }}>
            <span>📞 <a href={`tel:${c.phone}`} style={{ color:'var(--cyan)', textDecoration:'none' }}>{c.phone}</a></span>
            <span>⏰ {c.hours}</span>
          </div>
          <div>{c.services.map(s => <ServiceBadge key={s} label={s} />)}</div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No clubs found</div>}
    </div>
  );
}

function MissionTab() {
  const [search, setSearch] = useState('');
  const filtered = MISSION_CENTRES.filter(m =>
    m.port.toLowerCase().includes(search.toLowerCase()) ||
    m.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <InfoBanner color="cyan">✝ Providing chaplaincy, welfare and practical support to seafarers of all faiths worldwide since 1856.</InfoBanner>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by port or country…" />
      <ResultCount count={filtered.length} total={MISSION_CENTRES.length} />
      {filtered.map(m => (
        <Card key={m.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <PortBadge label={m.port} color="cyan" />
              <PortBadge label={m.country} color="green" />
            </div>
            <MapBtn lat={m.lat} lng={m.lng} name={'Mission to Seafarers '+m.port} />
          </div>
          <div style={{ fontSize:'0.71rem', color:'var(--text2)', marginBottom:5 }}>📍 {m.address}</div>
          <div style={{ display:'flex', gap:'1rem', fontSize:'0.71rem', color:'var(--text2)', flexWrap:'wrap' }}>
            <span>📞 <a href={`tel:${m.phone}`} style={{ color:'var(--cyan)', textDecoration:'none' }}>{m.phone}</a></span>
            <span>✉️ <a href={`mailto:${m.email}`} style={{ color:'var(--cyan)', textDecoration:'none', wordBreak:'break-all' }}>{m.email}</a></span>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No centres found</div>}
    </div>
  );
}

function StellaTab() {
  const [search, setSearch] = useState('');
  const filtered = STELLA_MARIS.filter(s =>
    s.port.toLowerCase().includes(search.toLowerCase()) ||
    s.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <InfoBanner color="gold">⭐ Catholic welfare organisation supporting mariners in ports worldwide since 1922.</InfoBanner>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by port or country…" />
      <ResultCount count={filtered.length} total={STELLA_MARIS.length} />
      {filtered.map(s => (
        <Card key={s.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <PortBadge label={s.port} color="gold" />
              <PortBadge label={s.country} color="green" />
            </div>
            <MapBtn lat={s.lat} lng={s.lng} name={'Stella Maris '+s.port} />
          </div>
          <div style={{ fontSize:'0.71rem', color:'var(--text2)', marginBottom:5 }}>📍 {s.address}</div>
          <div style={{ display:'flex', gap:'1rem', fontSize:'0.71rem', color:'var(--text2)', flexWrap:'wrap' }}>
            <span>📞 <a href={`tel:${s.phone}`} style={{ color:'var(--gold)', textDecoration:'none' }}>{s.phone}</a></span>
            <span>✉️ <a href={`mailto:${s.email}`} style={{ color:'var(--gold)', textDecoration:'none', wordBreak:'break-all' }}>{s.email}</a></span>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No locations found</div>}
    </div>
  );
}

function SimTab() {
  const [search, setSearch] = useState('');
  const filtered = SIM_GUIDES.filter(s =>
    s.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by country…" />
      <ResultCount count={filtered.length} total={SIM_GUIDES.length} />
      {filtered.map(s => (
        <Card key={s.id}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:'1.8rem', lineHeight:1, flexShrink:0 }}>{s.flag}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text)' }}>{s.country}</div>
              <div style={{ fontSize:'0.69rem', color:'var(--text2)' }}>Best pick: <span style={{ color:'var(--cyan)', fontWeight:600 }}>{s.bestFor}</span></div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 14px', fontSize:'0.71rem', color:'var(--text2)', marginBottom:7 }}>
            <span>💰 <b style={{ color:'var(--text)' }}>{s.cost}</b></span>
            <span>📶 <b style={{ color:'var(--text)' }}>{s.data}</b></span>
            <span>📅 <b style={{ color:'var(--text)' }}>{s.validity}</b></span>
            <span>📡 <b style={{ color:'var(--green)' }}>{s.coverage}</b></span>
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text2)', marginBottom:5 }}>🛒 <span style={{ color:'var(--text)' }}>{s.buyAt}</span></div>
          <div style={{ fontSize:'0.69rem', color:'var(--gold)', fontStyle:'italic', marginBottom:6 }}>💡 {s.tip}</div>
          <div>{s.carriers.map(c => <ServiceBadge key={c} label={c} />)}</div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No country found</div>}
    </div>
  );
}

function CurrencyTab() {
  const [amount, setAmount]       = useState('100');
  const [from,   setFrom]         = useState('USD');
  const [to,     setTo]           = useState('SGD');
  const [rates,  setRates]        = useState(null);
  const [loading,setLoading]      = useState(false);
  const [error,  setError]        = useState('');
  const [updated,setUpdated]      = useState('');

  const fetchRates = useCallback(async (base) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      if (data.result === 'success') {
        setRates(data.rates);
        setUpdated(new Date(data.time_last_update_utc).toUTCString().slice(0,25));
      } else { setError('Could not fetch rates. Check connection.'); }
    } catch { setError('Network error. Please check connectivity.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchRates(from); }, [from]);

  const converted = rates && to && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) * rates[to]).toFixed(4) : '—';

  const selStyle = {
    padding:'9px 12px', background:'rgba(11,29,53,0.9)',
    border:'1px solid var(--border)', borderRadius:10,
    color:'var(--text)', fontSize:'0.78rem', outline:'none',
    width:'100%', fontFamily:'inherit', cursor:'pointer'
  };

  const quickCurrencies = ['USD','EUR','GBP','SGD','AED','JPY','MYR','PHP','INR','AUD','KRW','HKD'].filter(c=>c!==from);

  return (
    <div>
      <Card style={{ marginBottom:'1.1rem' }}>
        <div style={{ display:'grid', gap:'0.7rem' }}>
          <div>
            <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>Amount</div>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} min="0"
              style={{ padding:'9px 12px', background:'rgba(11,29,53,0.9)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:'0.8rem', outline:'none', width:'100%', fontFamily:'inherit' }}
              onFocus={e=>{e.target.style.borderColor='var(--cyan)';}}
              onBlur={e=> {e.target.style.borderColor='var(--border)';}}
            />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>From</div>
              <select value={from} onChange={e=>setFrom(e.target.value)} style={selStyle}>
                {CURRENCY_LIST.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code} – {c.name}</option>)}
              </select>
            </div>
            <button onClick={()=>{ const t=from; setFrom(to); setTo(t); }}
              style={{ marginTop:18, width:36, height:36, borderRadius:'50%', background:'rgba(0,180,216,0.12)', border:'1px solid rgba(0,180,216,0.3)', color:'var(--cyan)', fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,180,216,0.28)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,180,216,0.12)';}}
            >⇄</button>
            <div>
              <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>To</div>
              <select value={to} onChange={e=>setTo(e.target.value)} style={selStyle}>
                {CURRENCY_LIST.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code} – {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ marginTop:'1rem', padding:'1rem', background:'rgba(0,180,216,0.06)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:10, textAlign:'center' }}>
          {loading ? (
            <div style={{ color:'var(--text3)', fontSize:'0.8rem' }}>⏳ Fetching live rates…</div>
          ) : error ? (
            <div style={{ color:'var(--red)', fontSize:'0.78rem' }}>{error}</div>
          ) : (
            <>
              <div style={{ fontSize:'0.73rem', color:'var(--text3)', marginBottom:4 }}>{amount} {from} =</div>
              <div style={{ fontSize:'2rem', fontWeight:700, fontFamily:"'Orbitron',monospace", color:'var(--cyan)', letterSpacing:'0.04em' }}>{converted}</div>
              <div style={{ fontSize:'0.73rem', color:'var(--text2)', marginTop:4 }}>{to}</div>
              {updated && <div style={{ fontSize:'0.61rem', color:'var(--text3)', marginTop:8 }}>Rates updated: {updated}</div>}
            </>
          )}
        </div>
      </Card>
      {rates && (
        <>
          <div style={{ fontSize:'0.68rem', color:'var(--text3)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:7 }}>Common port currencies vs {from}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {quickCurrencies.map(c => {
              const curr = CURRENCY_LIST.find(x=>x.code===c);
              const big  = ['JPY','KRW','IDR','VND'];
              const val  = rates[c] ? (1*rates[c]).toFixed(big.includes(c)?1:4) : '—';
              return (
                <div key={c} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.71rem', color:'var(--text2)' }}>{curr?.flag} {c}</span>
                  <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text)', fontFamily:'monospace' }}>{val}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ExchangeTab() {
  const [search, setSearch] = useState('');
  const filtered = EXCHANGE_OFFICES.filter(e =>
    e.port.toLowerCase().includes(search.toLowerCase()) ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search port, country or office name…" />
      <ResultCount count={filtered.length} total={EXCHANGE_OFFICES.length} />
      {filtered.map(e => (
        <Card key={e.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.86rem', color:'var(--text)', marginBottom:4 }}>{e.name}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <PortBadge label={e.port} color="cyan" />
                <PortBadge label={e.country} color="green" />
              </div>
            </div>
            <MapBtn lat={e.lat} lng={e.lng} name={e.name} />
          </div>
          <div style={{ fontSize:'0.71rem', color:'var(--text2)', marginBottom:5 }}>📍 {e.address}</div>
          <div style={{ display:'flex', gap:'1rem', fontSize:'0.71rem', color:'var(--text2)', flexWrap:'wrap' }}>
            <span>📞 <a href={`tel:${e.phone}`} style={{ color:'var(--cyan)', textDecoration:'none' }}>{e.phone}</a></span>
            <span>⏰ {e.hours}</span>
            <span>💱 <span style={{ color:'var(--green)' }}>{e.rate}</span></span>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No offices found</div>}
    </div>
  );
}

function HospitalTab() {
  const [search, setSearch] = useState('');
  const filtered = HOSPITALS.filter(h =>
    h.port.toLowerCase().includes(search.toLowerCase()) ||
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.country.toLowerCase().includes(search.toLowerCase())
  );
  const typeColor = {
    'Government':'green', 'Private':'cyan', 'University Hospital':'purple',
    'Major Hospital':'gold', 'NHS':'green', 'Private (International)':'cyan',
    'Private (Teaching)':'purple', 'Private Clinic':'cyan', 'General Hospital':'cyan'
  };
  return (
    <div>
      <InfoBanner color="red">🚨 Always dial the local emergency number shown on each card in an emergency situation.</InfoBanner>
      <SearchBar value={search} onChange={setSearch} placeholder="Search port, country or hospital name…" />
      <ResultCount count={filtered.length} total={HOSPITALS.length} />
      {filtered.map(h => (
        <Card key={h.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.84rem', color:'var(--text)', marginBottom:4 }}>{h.name}</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                <PortBadge label={h.port} color="cyan" />
                <PortBadge label={h.country} color="green" />
                <PortBadge label={h.type} color={typeColor[h.type]||'cyan'} />
              </div>
            </div>
            <MapBtn lat={h.lat} lng={h.lng} name={h.name} />
          </div>
          <div style={{ fontSize:'0.71rem', color:'var(--text2)', marginBottom:6 }}>📍 {h.address}</div>
          <div style={{ display:'flex', gap:'0.8rem', fontSize:'0.71rem', flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ color:'var(--text2)' }}>📞 <a href={`tel:${h.phone}`} style={{ color:'var(--cyan)', textDecoration:'none' }}>{h.phone}</a></span>
            <span style={{ background:'rgba(255,71,87,0.15)', border:'1px solid rgba(255,71,87,0.35)', color:'var(--red)', padding:'2px 9px', borderRadius:6, fontSize:'0.67rem', fontWeight:700, flexShrink:0 }}>🚨 {h.emergency}</span>
            <span style={{ color:'var(--text3)', fontSize:'0.69rem' }}>📏 {h.distance}</span>
          </div>
        </Card>
      ))}
      {filtered.length===0 && <div style={{ textAlign:'center', color:'var(--text3)', padding:'2rem', fontSize:'0.8rem' }}>No hospitals found</div>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PortShorePage({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('portinfo');

  if (!user) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem', gap:'1rem' }}>
        <div style={{ fontSize:'2.5rem' }}>⚓</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'1rem', fontWeight:700, color:'var(--text)', textAlign:'center' }}>PORT &amp; SHORE</div>
        <div style={{ fontSize:'0.8rem', color:'var(--text3)', textAlign:'center', maxWidth:260, lineHeight:1.7 }}>
          Please log in to access port information, welfare centres and shore services.
        </div>
        <button onClick={()=>onNavigate&&onNavigate('login')}
          style={{ padding:'10px 28px', background:'linear-gradient(135deg,var(--cyan),var(--blue))', border:'none', borderRadius:10, color:'#fff', fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.04em' }}>
          Log In
        </button>
      </div>
    );
  }

  const tabContent = {
    portinfo: <PortInfoTab />,
    clubs:    <ClubsTab />,
    mission:  <MissionTab />,
    stella:   <StellaTab />,
    sim:      <SimTab />,
    currency: <CurrencyTab />,
    exchange: <ExchangeTab />,
    hospital: <HospitalTab />,
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>

      {/* PAGE HEADER */}
      <div style={{ padding:'0.85rem 1.2rem 0.7rem', borderBottom:'1px solid var(--border)', background:'rgba(7,20,40,0.65)', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#1565C0,#00B4D8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', boxShadow:'0 0 14px rgba(0,180,216,0.35)', flexShrink:0 }}>⚓</div>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.84rem', fontWeight:700, letterSpacing:'0.06em' }}>PORT &amp; SHORE</div>
            <div style={{ fontSize:'0.6rem', color:'var(--cyan)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Seafarer Shore Services Directory</div>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ overflowX:'auto', display:'flex', borderBottom:'1px solid var(--border)', background:'rgba(4,12,26,0.92)', WebkitOverflowScrolling:'touch', flexShrink:0, scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{
              flexShrink:0, padding:'10px 13px', background:'transparent',
              border:'none', borderBottom:activeTab===t.id?'2px solid var(--cyan)':'2px solid transparent',
              color:activeTab===t.id?'var(--cyan)':'var(--text3)',
              fontSize:'0.67rem', fontWeight:activeTab===t.id?700:400,
              cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.18s',
              fontFamily:'inherit', letterSpacing:'0.03em',
              display:'flex', alignItems:'center', gap:5
            }}>
            <span style={{ fontSize:'0.78rem' }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:'auto', padding:'0.9rem 0.9rem', scrollbarWidth:'thin' }}>
        {tabContent[activeTab]}
        <div style={{ height:24 }} />
      </div>

    </div>
  );
}
